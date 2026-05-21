/**
 * Polls the `get_leaderboard` RPC on an interval. Polling (rather than
 * Supabase Realtime) is the right pattern here because the underlying
 * `challenge_attempts` and `question_progress` tables have per-attendee
 * RLS scoping — a Realtime subscription would only deliver the caller's
 * own rows, which defeats the "whole-room leaderboard" feature.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface LeaderboardRow {
  attendee_id: string;
  name: string;
  questions_complete: number;
  hints_used: number;
  c1_elapsed_ms: number | null;
  c2_elapsed_ms: number | null;
  total_ms: number | null;
  wrong_count: number;
}

interface Options {
  pollIntervalMs?: number;
}

export function useLeaderboard({ pollIntervalMs = 1500 }: Options = {}) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | undefined;

    async function tick() {
      const { data, error } = await supabase.rpc("get_leaderboard");
      if (!mounted) return;
      if (error) {
        setError(error.message);
        setStatus("error");
      } else {
        setRows((data as LeaderboardRow[]) ?? []);
        setStatus("live");
        setLastUpdated(Date.now());
        setError(null);
      }
      timeoutId = window.setTimeout(tick, pollIntervalMs);
    }

    tick();
    return () => {
      mounted = false;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [pollIntervalMs]);

  return { rows, status, error, lastUpdated };
}
