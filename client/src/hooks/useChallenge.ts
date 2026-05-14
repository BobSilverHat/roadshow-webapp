import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ChallengeMeta {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
}

export interface ChallengeQuestion {
  id: string;
  order_idx: number;
  prompt: string;
}

export interface ChallengeState {
  started_at: string | null;
  completed_at: string | null;
  wrong_count: number;
}

export type ChallengeStatus =
  | "loading"
  | "ready" // attendee registered but hasn't clicked Begin
  | "in_progress"
  | "complete"
  | "error";

export interface SubmitResult {
  ok: boolean;
  correct?: boolean;
  error?: string;
  challenge_complete?: boolean;
}

interface UseChallengeOptions {
  challengeId: number;
  attendeeId: string | null;
}

async function fetchMeta(challengeId: number): Promise<ChallengeMeta | null> {
  const { data, error } = await supabase
    .from("challenges")
    .select("id, slug, title, subtitle")
    .eq("id", challengeId)
    .maybeSingle();
  if (error) throw error;
  return (data as ChallengeMeta | null) ?? null;
}

async function fetchQuestions(challengeId: number): Promise<ChallengeQuestion[]> {
  const { data, error } = await supabase
    .from("questions_public")
    .select("id, order_idx, prompt")
    .eq("challenge_id", challengeId)
    .order("order_idx");
  if (error) throw error;
  return (data as ChallengeQuestion[]) ?? [];
}

async function fetchAttempt(
  challengeId: number,
  attendeeId: string,
): Promise<ChallengeState | null> {
  const { data, error } = await supabase
    .from("challenge_attempts")
    .select("started_at, completed_at, wrong_count")
    .eq("challenge_id", challengeId)
    .eq("attendee_id", attendeeId)
    .maybeSingle();
  if (error) throw error;
  return (data as ChallengeState | null) ?? null;
}

async function fetchProgress(
  challengeId: number,
  attendeeId: string,
): Promise<Set<string>> {
  // Join questions → question_progress to filter to this challenge's solved rows.
  const { data, error } = await supabase
    .from("question_progress")
    .select("question_id, questions!inner(challenge_id)")
    .eq("attendee_id", attendeeId)
    .eq("questions.challenge_id", challengeId);
  if (error) throw error;
  return new Set((data ?? []).map((r: { question_id: string }) => r.question_id));
}

function deriveStatus(state: ChallengeState | null): ChallengeStatus {
  if (!state || !state.started_at) return "ready";
  if (state.completed_at) return "complete";
  return "in_progress";
}

export function useChallenge({ challengeId, attendeeId }: UseChallengeOptions) {
  const [meta, setMeta] = useState<ChallengeMeta | null>(null);
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
  const [state, setState] = useState<ChallengeState | null>(null);
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<ChallengeStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attendeeId) return;
    let mounted = true;
    (async () => {
      try {
        setStatus("loading");
        const [metaRow, questionRows, attemptRow, progressSet] = await Promise.all([
          fetchMeta(challengeId),
          fetchQuestions(challengeId),
          fetchAttempt(challengeId, attendeeId),
          fetchProgress(challengeId, attendeeId),
        ]);
        if (!mounted) return;
        setMeta(metaRow);
        setQuestions(questionRows);
        setState(attemptRow);
        setProgress(progressSet);
        setStatus(deriveStatus(attemptRow));
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [challengeId, attendeeId]);

  const submit = useCallback(
    async (questionId: string, submission: string): Promise<SubmitResult> => {
      const { data, error: rpcError } = await supabase.rpc("submit_answer", {
        p_question_id: questionId,
        p_submission: submission,
      });
      if (rpcError) return { ok: false, error: rpcError.message };
      if (!data?.ok) return { ok: false, error: data?.error ?? "submit_failed" };

      if (data.correct) {
        setProgress((prev) => new Set(prev).add(questionId));
      } else {
        setState((prev) =>
          prev
            ? { ...prev, wrong_count: (prev.wrong_count ?? 0) + 1 }
            : prev,
        );
      }
      if (data.challenge_complete) {
        setState((prev) =>
          prev ? { ...prev, completed_at: new Date().toISOString() } : prev,
        );
        setStatus("complete");
      }
      return {
        ok: true,
        correct: !!data.correct,
        challenge_complete: !!data.challenge_complete,
      };
    },
    [],
  );

  const totalQuestions = questions.length;
  const solvedCount = useMemo(
    () => questions.filter((q) => progress.has(q.id)).length,
    [questions, progress],
  );

  return {
    meta,
    questions,
    state,
    progress,
    status,
    error,
    totalQuestions,
    solvedCount,
    submit,
  };
}
