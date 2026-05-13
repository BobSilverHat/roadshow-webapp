/**
 * useWorkshop — single source of truth for the shared 35-minute timer
 * spanning both challenges. Returns startedAt/expiresAt, a derived
 * status enum, a live-ticked remainingMs, per-challenge completion
 * flags, and a beginWorkshop() action that stamps both attempts.
 *
 * Server (begin_workshop, submit_answer, leaderboard view) is the
 * authoritative source of expiry. Client countdown is UX-only.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WORKSHOP_DURATION_MS } from "@shared/const";

export type WorkshopStatus =
  | "loading"
  | "ready"        // attendee registered but workshop not begun
  | "in_progress"
  | "expired"
  | "complete";

interface AttemptRow {
  challenge_id: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkshopState {
  startedAt: string | null;
  expiresAt: string | null;
  status: WorkshopStatus;
  remainingMs: number;
  c1Completed: boolean;
  c2Completed: boolean;
  error: string | null;
  beginWorkshop: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

interface Options {
  attendeeId: string | null;
}

export function useWorkshop({ attendeeId }: Options): WorkshopState {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [c1Completed, setC1Completed] = useState(false);
  const [c2Completed, setC2Completed] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const attendeeIdRef = useRef(attendeeId);
  useEffect(() => {
    attendeeIdRef.current = attendeeId;
  }, [attendeeId]);

  const refresh = useCallback(async () => {
    const id = attendeeIdRef.current;
    if (!id) return;
    const { data, error: fetchError } = await supabase
      .from("challenge_attempts")
      .select("challenge_id, started_at, completed_at")
      .eq("attendee_id", id)
      .in("challenge_id", [1, 2]);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    const rows = (data as AttemptRow[]) ?? [];
    const c1 = rows.find((r) => r.challenge_id === 1);
    const c2 = rows.find((r) => r.challenge_id === 2);
    setStartedAt(c1?.started_at ?? c2?.started_at ?? null);
    setC1Completed(!!c1?.completed_at);
    setC2Completed(!!c2?.completed_at);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!attendeeId) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      await refresh();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [attendeeId, refresh]);

  // Derived values
  const expiresAt = startedAt
    ? new Date(new Date(startedAt).getTime() + WORKSHOP_DURATION_MS).toISOString()
    : null;
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const isExpired = expiresAt ? now > expiresAtMs : false;
  const isComplete = c1Completed && c2Completed;

  let status: WorkshopStatus;
  if (loading) status = "loading";
  else if (!startedAt) status = "ready";
  else if (isComplete) status = "complete";
  else if (isExpired) status = "expired";
  else status = "in_progress";

  const remainingMs = expiresAt ? Math.max(0, expiresAtMs - now) : 0;

  // Live ticker — runs only while in_progress
  useEffect(() => {
    if (status !== "in_progress") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const beginWorkshop = useCallback(async (): Promise<boolean> => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("begin_workshop");
    if (rpcError) {
      setError(rpcError.message);
      return false;
    }
    if (!data?.ok) {
      setError(data?.error ?? "begin_failed");
      return false;
    }
    setStartedAt(data.started_at);
    setNow(Date.now());
    return true;
  }, []);

  return {
    startedAt,
    expiresAt,
    status,
    remainingMs,
    c1Completed,
    c2Completed,
    error,
    beginWorkshop,
    refresh,
  };
}
