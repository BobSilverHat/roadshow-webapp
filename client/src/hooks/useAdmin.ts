import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AdminStatus {
  review_mode: boolean;
  counts: { registered: number; begun: number; finished_both: number };
  attendees: { id: string; name: string; email: string; created_at: string; begun: boolean;
    questions_complete: number; total_ms: number | null; wrong_count: number | null; hints_used: number | null }[];
}

async function call(fn: string, args: Record<string, unknown>): Promise<{ ok: boolean; error?: string; [k: string]: unknown }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc(fn as any, args);
  if (error) return { ok: false, error: error.message };
  return (data as { ok: boolean; error?: string }) ?? { ok: false, error: "no_data" };
}

export function useAdmin(open: boolean) {
  const [pin, setPin] = useState<string | null>(null);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [stale, setStale] = useState(false);
  const pinRef = useRef<string | null>(null);
  pinRef.current = pin;

  const fetchStatus = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const p = pinRef.current;
    if (!p) return { ok: false, error: "no_pin" };
    const res = await call("admin_get_status", { p_pin: p });
    if (res.ok) { setStatus(res as unknown as AdminStatus); setStale(false); }
    else setStale(true);
    return res;
  }, []);

  const unlock = useCallback(async (candidate: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc("admin_get_status" as any, { p_pin: candidate });
    if (error) return { ok: false, error: error.message };
    const r = data as { ok: boolean; error?: string };
    if (r?.ok) { setPin(candidate); setStatus(r as unknown as AdminStatus); return { ok: true }; }
    return { ok: false, error: r?.error ?? "unauthorized" };
  }, []);

  const lock = useCallback(() => { setPin(null); setStatus(null); setStale(false); }, []);

  useEffect(() => {
    if (!open || !pin) return;
    fetchStatus();
    const id = window.setInterval(fetchStatus, 3000);
    return () => window.clearInterval(id);
  }, [open, pin, fetchStatus]);

  useEffect(() => { if (!open) lock(); }, [open, lock]);

  const act = useCallback(async (fn: string, extra: Record<string, unknown> = {}) => {
    const p = pinRef.current; if (!p) return { ok: false, error: "locked" };
    const res = await call(fn, { p_pin: p, ...extra });
    if (res.ok) fetchStatus();
    return res;
  }, [fetchStatus]);

  return {
    unlocked: !!pin, status, stale, unlock, lock, refresh: fetchStatus,
    openChallenge: () => act("admin_open_challenge"),
    closeChallenge: () => act("admin_close_challenge"),
    endWorkshop: () => act("admin_end_workshop"),
    setReviewMode: (on: boolean) => act("admin_set_review_mode", { p_on: on }),
    setNexusOpen: (on: boolean) => act("admin_set_nexus_open", { p_on: on }),
    setDefaultLocale: (loc: string) => act("admin_set_default_locale", { p_locale: loc }),
    setDuration: (min: number) => act("admin_set_duration", { p_minutes: min }),
    restartTimer: () => act("admin_restart_timer"),
    adjustTimer: (delta: number) => act("admin_adjust_timer", { p_delta_min: delta }),
    clearData: () => act("admin_clear_data"),
    changePin: (oldp: string, newp: string) => call("admin_change_pin", { p_old_pin: oldp, p_new_pin: newp }),
  };
}
