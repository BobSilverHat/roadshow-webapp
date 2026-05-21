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
  hint_count: number;
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
    .select("id, order_idx, prompt, hint_count")
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

async function fetchProgress(attendeeId: string): Promise<Set<string>> {
  // Fetch all solved question IDs for this attendee — no join with
  // `questions`. The questions table has RLS enabled with no SELECT
  // policy (intentional, so answer_hash never leaks), which silently
  // returns 0 rows from any inner-join through PostgREST. We filter by
  // this challenge's question IDs client-side via `progress.has(q.id)`.
  const { data, error } = await supabase
    .from("question_progress")
    .select("question_id")
    .eq("attendee_id", attendeeId);
  if (error) throw error;
  return new Set((data ?? []).map((r: { question_id: string }) => r.question_id));
}

// Map of question_id → user's normalized correct submission. Pulled from
// answer_attempts (correct=true rows) so solved cards can display the
// answer the attendee submitted, even after a page reload. Multi-value
// answers come back in alphabetized form (post-normalize_answer); that
// matches what the user effectively submitted after canonicalization.
// As with fetchProgress, no join with `questions` — RLS on that table
// would zero out the join. Client filters by question id naturally.
async function fetchSolvedAnswers(
  attendeeId: string,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("answer_attempts")
    .select("question_id, submission_raw")
    .eq("attendee_id", attendeeId)
    .eq("correct", true);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of (data ?? []) as { question_id: string; submission_raw: string | null }[]) {
    if (row.submission_raw) map.set(row.question_id, row.submission_raw);
  }
  return map;
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
  const [solvedAnswers, setSolvedAnswers] = useState<Map<string, string>>(new Map());
  const [status, setStatus] = useState<ChallengeStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attendeeId) return;
    let mounted = true;
    (async () => {
      try {
        setStatus("loading");
        const [metaRow, questionRows, attemptRow, progressSet, answersMap] = await Promise.all([
          fetchMeta(challengeId),
          fetchQuestions(challengeId),
          fetchAttempt(challengeId, attendeeId),
          fetchProgress(attendeeId),
          fetchSolvedAnswers(attendeeId),
        ]);
        if (!mounted) return;
        setMeta(metaRow);
        setQuestions(questionRows);
        setState(attemptRow);
        setProgress(progressSet);
        setSolvedAnswers(answersMap);
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
        // Capture the (post-normalize) canonical form for solved display.
        const normalized = submission.toLowerCase().trim();
        setSolvedAnswers((prev) => {
          if (prev.has(questionId)) return prev;
          const next = new Map(prev);
          next.set(questionId, normalized);
          return next;
        });
      } else {
        // Track the local wrong-count bump. State may still be null at
        // this point — useChallenge fetched its attempt row before
        // beginWorkshop ran, so we synthesize one if needed.
        setState((prev) =>
          prev
            ? { ...prev, wrong_count: (prev.wrong_count ?? 0) + 1 }
            : {
                started_at: new Date().toISOString(),
                completed_at: null,
                wrong_count: 1,
              },
        );
      }
      if (data.challenge_complete) {
        // Set completed_at unconditionally — even if `prev` is null
        // (state hadn't yet been refetched after beginWorkshop). Without
        // this fallback the AnimatePresence celebration card never sees
        // a truthy completedAt prop and stays hidden until a page reload.
        setState((prev) => ({
          started_at: prev?.started_at ?? new Date().toISOString(),
          completed_at: new Date().toISOString(),
          wrong_count: prev?.wrong_count ?? data.wrong_count ?? 0,
        }));
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
    solvedAnswers,
    status,
    error,
    totalQuestions,
    solvedCount,
    submit,
  };
}
