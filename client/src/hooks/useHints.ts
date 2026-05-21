/**
 * Hint state for the current attendee. Fetches the user's hint ledger
 * (hint_idx tuples, no text) on mount, and exposes a `requestHint`
 * function that calls the gated request_hint RPC — the only path that
 * returns hint text. Re-opening the modal on a question with prior
 * usage replays request_hint for each paid hint_idx; the RPC returns
 * `already_charged: true` so no new penalty is recorded.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type HintError =
  | "not_registered"
  | "question_not_found"
  | "hint_out_of_range"
  | "already_solved"
  | "challenge_not_begun"
  | "challenge_locked"
  | "time_expired"
  | "rpc_failed";

export interface HintReveal {
  idx: number;
  text: string;
}

export interface HintState {
  /** Indices the user has paid for (durable). */
  paidIdxs: Set<number>;
  /** Indices for which we have the text in memory (post-modal-open). */
  revealed: Map<number, string>;
}

interface UseHintsOptions {
  attendeeId: string | null;
}

interface RequestResult {
  ok: boolean;
  hint?: string;
  alreadyCharged?: boolean;
  error?: HintError;
}

export function useHints({ attendeeId }: UseHintsOptions) {
  // Map<questionId, HintState>
  const [byQuestion, setByQuestion] = useState<Map<string, HintState>>(
    new Map(),
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!attendeeId) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("hint_usage")
        .select("question_id, hint_idx")
        .eq("attendee_id", attendeeId);
      if (!mounted) return;
      const next = new Map<string, HintState>();
      for (const row of (data ?? []) as {
        question_id: string;
        hint_idx: number;
      }[]) {
        const slot = next.get(row.question_id) ?? {
          paidIdxs: new Set<number>(),
          revealed: new Map<number, string>(),
        };
        slot.paidIdxs.add(row.hint_idx);
        next.set(row.question_id, slot);
      }
      setByQuestion(next);
      setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, [attendeeId]);

  const getState = useCallback(
    (questionId: string): HintState =>
      byQuestion.get(questionId) ?? {
        paidIdxs: new Set<number>(),
        revealed: new Map<number, string>(),
      },
    [byQuestion],
  );

  const requestHint = useCallback(
    async (questionId: string, idx: number): Promise<RequestResult> => {
      const { data, error } = await supabase.rpc("request_hint", {
        p_question_id: questionId,
        p_hint_idx: idx,
      });
      if (error) return { ok: false, error: "rpc_failed" };
      if (!data?.ok)
        return { ok: false, error: (data?.error ?? "rpc_failed") as HintError };
      setByQuestion((prev) => {
        const next = new Map(prev);
        const slot = next.get(questionId) ?? {
          paidIdxs: new Set<number>(),
          revealed: new Map<number, string>(),
        };
        const paidIdxs = new Set(slot.paidIdxs);
        paidIdxs.add(idx);
        const revealed = new Map(slot.revealed);
        revealed.set(idx, data.hint as string);
        next.set(questionId, { paidIdxs, revealed });
        return next;
      });
      return {
        ok: true,
        hint: data.hint as string,
        alreadyCharged: !!data.already_charged,
      };
    },
    [],
  );

  return { getState, requestHint, loaded };
}
