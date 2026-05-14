/**
 * useWorkshop — single source of truth for the shared 35-minute timer
 * spanning both challenges. Returns startedAt/expiresAt, a derived
 * status enum, a live-ticked remainingMs, per-challenge completion
 * flags, and a beginWorkshop() action that stamps both attempts.
 *
 * Also owns the admin-gate state: polls workshop_config.challenge_open
 * every 3s while pre-begin so the WaitingOverlay fades within ~3s of
 * the admin opening the gate. Polling stops once the workshop is begun.
 *
 * Server (begin_workshop, submit_answer, leaderboard view) is the
 * authoritative source of expiry AND the admin gate. Client values are
 * UX-only.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WORKSHOP_DURATION_MS } from "@shared/const";

export type WorkshopStatus =
  | "loading"
  | "locked"       // admin gate closed; cannot begin yet
  | "ready"        // attendee registered, gate open, not yet begun
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

const GATE_POLL_INTERVAL_MS = 3000;

export function useWorkshop({ attendeeId }: Options): WorkshopState {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [c1Completed, setC1Completed] = useState(false);
  const [c2Completed, setC2Completed] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState<boolean>(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const attendeeIdRef = useRef(attendeeId);
  useEffect(() => {
    attendeeIdRef.current = attendeeId;
  }, [attendeeId]);

  const fetchGate = useCallback(async () => {
    const { data, error: gateError } = await supabase
      .from("workshop_config")
      .select("challenge_open, opened_at")
      .eq("id", 1)
      .maybeSingle();
    if (gateError) {
      // Surface but don't block — a missing gate row means default-closed.
      setError(gateError.message);
      return;
    }
    setChallengeOpen(!!data?.challenge_open);
    setOpenedAt(data?.opened_at ?? null);
  }, []);

  const refresh = useCallback(async () => {
    const id = attendeeIdRef.current;
    if (!id) return;
    const [{ data: attempts, error: fetchError }] = await Promise.all([
      supabase
        .from("challenge_attempts")
        .select("challenge_id, started_at, completed_at")
        .eq("attendee_id", id)
        .in("challenge_id", [1, 2]),
      fetchGate(),
    ]);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    const rows = (attempts as AttemptRow[]) ?? [];
    const c1 = rows.find((r) => r.challenge_id === 1);
    const c2 = rows.find((r) => r.challenge_id === 2);
    setStartedAt(c1?.started_at ?? c2?.started_at ?? null);
    setC1Completed(!!c1?.completed_at);
    setC2Completed(!!c2?.completed_at);
  }, [fetchGate]);

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

  // Derived values — GLOBAL expiry. The 35-minute window is anchored on
  // workshop_config.opened_at (set when the admin opens the gate), not the
  // user's individual started_at. Late joiners get a shortened window.
  const expiresAt = openedAt
    ? new Date(new Date(openedAt).getTime() + WORKSHOP_DURATION_MS).toISOString()
    : null;
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const isExpired = expiresAt ? now > expiresAtMs : false;
  const isComplete = c1Completed && c2Completed;

  // Status precedence: loading > complete > expired > locked > ready > in_progress.
  // "expired" can fire whether or not this user clicked Begin — the global
  // clock locks everyone out at the same wall-clock moment.
  let status: WorkshopStatus;
  if (loading) status = "loading";
  else if (isComplete) status = "complete";
  else if (isExpired) status = "expired";
  else if (!startedAt && !challengeOpen) status = "locked";
  else if (!startedAt) status = "ready";
  else status = "in_progress";

  const remainingMs = expiresAt ? Math.max(0, expiresAtMs - now) : 0;

  // Live ticker — runs only while in_progress
  useEffect(() => {
    if (status !== "in_progress") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  // Gate poll — runs only while pre-begin (locked or ready). Once the
  // user starts the workshop, the gate flag no longer affects anything.
  useEffect(() => {
    if (status !== "locked" && status !== "ready") return;
    const id = window.setInterval(() => {
      fetchGate();
    }, GATE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [status, fetchGate]);

  const beginWorkshop = useCallback(async (): Promise<boolean> => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("begin_workshop");
    if (rpcError) {
      setError(rpcError.message);
      return false;
    }
    if (!data?.ok) {
      // challenge_locked is an expected state — the user raced the poll
      // (clicked Begin in the 3s window after admin closed the gate). Flip
      // the gate flag so status transitions to "locked" and the WaitingOverlay
      // re-appears. Do NOT surface as workshop.error (that would trip the
      // fatal-error branch in ChallengePage).
      if (data?.error === "challenge_locked") {
        setChallengeOpen(false);
        return false;
      }
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
