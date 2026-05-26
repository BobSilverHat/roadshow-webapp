/**
 * useWorkshopClock — global workshop clock, attendee-agnostic.
 *
 * Reads workshop_config (the same singleton row that drives the admin
 * gate) and exposes the shared 35-minute countdown. Used by the navbar
 * to render the "CHALLENGE IN PROGRESS" pill on every page so that
 * even users who've finished can see the global remaining time.
 *
 * Independent of useWorkshop's attendee-specific state — this hook
 * doesn't need to know who's signed in, so the navbar can render the
 * timer before/after RegistrationGate and on visitor-mode pages.
 *
 * Polls workshop_config every 3s while pre-expiry. Live-ticks every 1s
 * while the workshop is in progress so the countdown counts down.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WORKSHOP_DURATION_MS } from "@shared/const";

export type WorkshopClockStatus = "closed" | "in_progress" | "expired";

export interface WorkshopClock {
  openedAt: string | null;
  expiresAt: string | null;
  status: WorkshopClockStatus;
  remainingMs: number;
  /** Separate admin gate for the post-challenge Salt Nexus phase. */
  nexusOpen: boolean;
  /** When true, the 35-minute timer is disabled — submissions never
   *  expire, status never flips to "expired", and clients should render
   *  "REVIEW MODE" in place of the countdown. */
  reviewMode: boolean;
}

const POLL_INTERVAL_MS = 3000;

export function useWorkshopClock(): WorkshopClock {
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const [challengeOpen, setChallengeOpen] = useState<boolean>(false);
  const [nexusOpen, setNexusOpen] = useState<boolean>(false);
  const [reviewMode, setReviewMode] = useState<boolean>(false);
  const [now, setNow] = useState<number>(() => Date.now());

  const fetchConfig = useCallback(async () => {
    const { data, error } = await supabase
      .from("workshop_config")
      .select("challenge_open, opened_at, nexus_open, review_mode")
      .eq("id", 1)
      .maybeSingle();
    if (error) return;
    setOpenedAt(data?.opened_at ?? null);
    setChallengeOpen(!!data?.challenge_open);
    setNexusOpen(!!data?.nexus_open);
    setReviewMode(!!data?.review_mode);
  }, []);

  // Initial fetch + poll
  useEffect(() => {
    let mounted = true;
    fetchConfig();
    const pollId = window.setInterval(() => {
      if (mounted) fetchConfig();
    }, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      window.clearInterval(pollId);
    };
  }, [fetchConfig]);

  // Derived values
  const openedAtMs = openedAt ? new Date(openedAt).getTime() : 0;
  const expiresAtMs = openedAt ? openedAtMs + WORKSHOP_DURATION_MS : 0;
  const expiresAt = openedAt
    ? new Date(expiresAtMs).toISOString()
    : null;

  let status: WorkshopClockStatus;
  if (!challengeOpen || !openedAt) status = "closed";
  else if (!reviewMode && now > expiresAtMs) status = "expired";
  else status = "in_progress";

  const remainingMs = openedAt ? Math.max(0, expiresAtMs - now) : 0;

  // Live ticker — only runs while in_progress so a finished workshop
  // doesn't keep re-rendering every second.
  useEffect(() => {
    if (status !== "in_progress") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  return { openedAt, expiresAt, status, remainingMs, nexusOpen, reviewMode };
}
