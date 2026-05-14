import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AttendeeStatus = "loading" | "anonymous" | "registered" | "error";

export interface Attendee {
  id: string;
  name: string;
  email: string;
}

export interface RegisterResult {
  ok: boolean;
  error?: string;
}

async function fetchAttendee(authUid: string): Promise<Attendee | null> {
  const { data, error } = await supabase
    .from("attendees")
    .select("id, name, email")
    .eq("auth_uid", authUid)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Attendee | null) ?? null;
}

export function useAttendee() {
  const [status, setStatus] = useState<AttendeeStatus>("loading");
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (!session) {
          setStatus("anonymous");
          return;
        }
        const row = await fetchAttendee(session.user.id);
        if (!mounted) return;
        if (row) {
          setAttendee(row);
          setStatus("registered");
        } else {
          setStatus("anonymous");
        }
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function ensureFreshSession() {
    // Sign out any existing session, then mint a fresh anonymous user.
    // Used both for first-time registration and for recovery from a
    // stale JWT (e.g., workshop reset wiped auth.users).
    await supabase.auth.signOut();
    const { data: signIn, error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError || !signIn.session) {
      return { ok: false as const, error: signInError?.message ?? "anonymous_signin_failed" };
    }
    return { ok: true as const, session: signIn.session };
  }

  async function register(name: string, email: string): Promise<RegisterResult> {
    setError(null);

    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data: signIn, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError || !signIn.session) {
        const msg = signInError?.message ?? "anonymous_signin_failed";
        setError(msg);
        return { ok: false, error: msg };
      }
      session = signIn.session;
    }

    let { data, error: rpcError } = await supabase.rpc("register_attendee", {
      p_name: name,
      p_email: email,
    });

    // Stale-session recovery: the existing JWT's auth.uid() no longer
    // exists in auth.users (e.g., the workshop tree was reset). Drop the
    // JWT, mint a fresh anonymous user, and retry once.
    if (data?.ok === false && data?.error === "stale_session") {
      const fresh = await ensureFreshSession();
      if (!fresh.ok) {
        setError(fresh.error);
        return { ok: false, error: fresh.error };
      }
      session = fresh.session;
      ({ data, error: rpcError } = await supabase.rpc("register_attendee", {
        p_name: name,
        p_email: email,
      }));
    }

    if (rpcError) {
      setError(rpcError.message);
      return { ok: false, error: rpcError.message };
    }
    if (!data?.ok) {
      const err = data?.error ?? "registration_failed";
      setError(err);
      return { ok: false, error: err };
    }

    const row = await fetchAttendee(session.user.id);
    if (!row) {
      setError("attendee_fetch_failed");
      return { ok: false, error: "attendee_fetch_failed" };
    }
    setAttendee(row);
    setStatus("registered");
    return { ok: true };
  }

  return { status, attendee, error, register };
}
