# Shared 35-Minute Workshop Timer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-challenge timers with one shared 35-minute window spanning both challenges. Server-enforced expiry, auto-navigate to a tiered Completed screen, deterministic leaderboard ranking for partial finishers.

**Architecture:** One SQL migration adds a new `begin_workshop()` RPC, a `time_expired` guard inside `submit_answer`, and a rewritten `leaderboard` view that settles `total_ms` for timed-out attendees. Client gains a new `useWorkshop` hook that becomes the single source of truth for shared timer state. Existing `useChallenge` keeps per-challenge concerns. `ChallengePage` consumes both and handles begin-gating, C2-redirect, the time-up overlay, and auto-navigate. `Completed.tsx` grows a tier matrix (Champion / Runner-up / Third / Round Complete / Time's Up).

**Tech Stack:**
- **Supabase** (Postgres) via the Supabase MCP — `apply_migration`, `execute_sql`.
- **React 18** + **wouter** routing + **framer-motion** + **TypeScript**.
- **No test framework installed.** Verification per task = `pnpm check` (TS type-check, the only repo command for code correctness) + the spec's manual verification checklist for behavior.

**Source-of-truth spec:** `docs/superpowers/specs/2026-05-13-shared-workshop-timer-design.md`

---

## File structure

**New files:**
- `supabase/migrations/016_shared_workshop_timer.sql`
- `client/src/hooks/useWorkshop.ts`

**Modified files:**
- `shared/const.ts` — add `WORKSHOP_DURATION_MS`.
- `client/src/components/QuestionCard.tsx` — new `locked?: boolean` prop.
- `client/src/components/ChallengeHeader.tsx` — countdown display + color tiers.
- `client/src/components/ChallengeIntro.tsx` — copy + button label.
- `client/src/components/ChallengePage.tsx` — wire `useWorkshop`; Begin gating; C2 redirect; expiry overlay; auto-navigate.
- `client/src/hooks/useChallenge.ts` — drop `begin` (cleanup); harmless for `time_expired` error pass-through.
- `client/src/pages/Completed.tsx` — tier matrix render with timed-out variant.
- `client/src/pages/Leaderboard.tsx` — footer copy refresh.

---

## Verification convention

Every code-touching task ends with:

```bash
cd /Users/brandons/Documents/roadshow-webapp && pnpm check
```

Expected: no output (success — `tsc --noEmit` runs clean).

After Task 7 (ChallengePage), the dev server is suitable for manual smoke testing. Task 10 walks the full spec verification checklist.

---

## Task 1: Database migration — `begin_workshop`, `submit_answer` expiry guard, `leaderboard` view

**Files:**
- Create: `supabase/migrations/016_shared_workshop_timer.sql`

- [ ] **Step 1: Write the migration file**

Write `/Users/brandons/Documents/roadshow-webapp/supabase/migrations/016_shared_workshop_timer.sql` with this exact content:

```sql
-- 016_shared_workshop_timer.sql
-- Adds shared 35-minute workshop timer model:
--   1. New RPC begin_workshop() — stamps both challenge_attempts rows
--      atomically with the same started_at. Idempotent.
--   2. Updates submit_answer() to reject submissions past
--      started_at + 35 minutes with error:'time_expired'.
--   3. Rewrites public.leaderboard view so total_ms settles when both
--      challenges are completed OR the workshop window has expired,
--      enabling deterministic ranking for partial finishers.

-- ---------------------------------------------------------------------
-- 1. begin_workshop()
-- ---------------------------------------------------------------------
create or replace function public.begin_workshop()
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attendee_id uuid;
  v_started_at  timestamptz;
begin
  select id into v_attendee_id
  from public.attendees
  where auth_uid = auth.uid();

  if v_attendee_id is null then
    return json_build_object('ok', false, 'error', 'not_registered');
  end if;

  -- Atomic: both rows get the same started_at, preserving any pre-existing
  -- value via coalesce in the conflict clause (idempotent on repeat calls).
  insert into public.challenge_attempts (attendee_id, challenge_id, started_at)
  values
    (v_attendee_id, 1, now()),
    (v_attendee_id, 2, now())
  on conflict (attendee_id, challenge_id) do update
    set started_at = coalesce(public.challenge_attempts.started_at, excluded.started_at);

  -- Read back the canonical started_at (challenge 1's row).
  select started_at into v_started_at
  from public.challenge_attempts
  where attendee_id = v_attendee_id and challenge_id = 1;

  return json_build_object(
    'ok', true,
    'started_at', v_started_at,
    'expires_at', v_started_at + interval '35 minutes'
  );
end;
$$;

revoke execute on function public.begin_workshop() from public;
revoke execute on function public.begin_workshop() from anon;
grant  execute on function public.begin_workshop() to authenticated;

-- ---------------------------------------------------------------------
-- 2. submit_answer() — adds time_expired guard
--    Full body rewritten so the diff is reviewable in one place.
-- ---------------------------------------------------------------------
create or replace function public.submit_answer(
  p_question_id uuid,
  p_submission  text
)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_attendee_id         uuid;
  v_challenge_id        int;
  v_challenge_started   timestamptz;
  v_expected_hash       text;
  v_normalized          text;
  v_submitted_hash      text;
  v_correct             boolean;
  v_wrong_count         int;
  v_total_correct       int;
  v_required_count      int;
  v_challenge_complete  boolean := false;
begin
  select id into v_attendee_id
  from public.attendees
  where auth_uid = auth.uid();

  if v_attendee_id is null then
    return json_build_object('ok', false, 'error', 'not_registered');
  end if;

  if exists (
    select 1 from public.question_progress
    where attendee_id = v_attendee_id and question_id = p_question_id
  ) then
    return json_build_object('ok', false, 'error', 'already_answered');
  end if;

  select answer_hash, challenge_id
  into v_expected_hash, v_challenge_id
  from public.questions
  where id = p_question_id;

  if v_expected_hash is null then
    return json_build_object('ok', false, 'error', 'question_not_found');
  end if;

  select started_at into v_challenge_started
  from public.challenge_attempts
  where attendee_id = v_attendee_id and challenge_id = v_challenge_id;

  if v_challenge_started is null then
    return json_build_object('ok', false, 'error', 'challenge_not_begun');
  end if;

  -- NEW: hard lock past the 35-minute workshop window. No writes.
  if now() > v_challenge_started + interval '35 minutes' then
    return json_build_object('ok', false, 'error', 'time_expired');
  end if;

  v_normalized     := lower(trim(coalesce(p_submission, '')));
  v_submitted_hash := encode(extensions.digest(v_normalized, 'sha256'), 'hex');
  v_correct        := v_submitted_hash = v_expected_hash;

  insert into public.answer_attempts (attendee_id, question_id, correct, submission_raw)
  values (v_attendee_id, p_question_id, v_correct, left(v_normalized, 200));

  if v_correct then
    insert into public.question_progress (attendee_id, question_id)
    values (v_attendee_id, p_question_id)
    on conflict (attendee_id, question_id) do nothing;
  else
    update public.challenge_attempts
      set wrong_count = wrong_count + 1
    where attendee_id = v_attendee_id and challenge_id = v_challenge_id;
  end if;

  select count(*) into v_total_correct
  from public.question_progress qp
  join public.questions q on q.id = qp.question_id
  where qp.attendee_id = v_attendee_id and q.challenge_id = v_challenge_id;

  select count(*) into v_required_count
  from public.questions
  where challenge_id = v_challenge_id;

  if v_required_count > 0 and v_total_correct >= v_required_count then
    update public.challenge_attempts
      set completed_at = coalesce(completed_at, now())
    where attendee_id = v_attendee_id and challenge_id = v_challenge_id;
    v_challenge_complete := true;
  end if;

  select wrong_count into v_wrong_count
  from public.challenge_attempts
  where attendee_id = v_attendee_id and challenge_id = v_challenge_id;

  return json_build_object(
    'ok',                 true,
    'correct',            v_correct,
    'wrong_count',        coalesce(v_wrong_count, 0),
    'total_correct',      v_total_correct,
    'required_count',     v_required_count,
    'challenge_complete', v_challenge_complete
  );
end;
$$;

revoke execute on function public.submit_answer(uuid, text) from public;
revoke execute on function public.submit_answer(uuid, text) from anon;
grant  execute on function public.submit_answer(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. leaderboard view — settle total_ms on completion OR expiry
-- ---------------------------------------------------------------------
create or replace view public.leaderboard as
with q as (
  select attendee_id, count(*)::int as n
  from public.question_progress
  group by attendee_id
)
select
  a.id                                       as attendee_id,
  a.name,
  coalesce(q.n, 0)                           as questions_complete,
  case
    when c1.completed_at is not null and c1.started_at is not null
    then (extract(epoch from (c1.completed_at - c1.started_at)) * 1000)::bigint
  end                                        as c1_elapsed_ms,
  case
    when c2.completed_at is not null and c2.started_at is not null
    then (extract(epoch from (c2.completed_at - c2.started_at)) * 1000)::bigint
  end                                        as c2_elapsed_ms,
  case
    -- Both completed → contiguous workshop window
    when c1.completed_at is not null and c2.completed_at is not null
     and c1.started_at  is not null
    then (extract(epoch from (greatest(c1.completed_at, c2.completed_at) - c1.started_at)) * 1000)::bigint
         + (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0)) * 15000
    -- Workshop expired without both completed → cap at 35 minutes
    when c1.started_at is not null
     and now() > c1.started_at + interval '35 minutes'
    then 2100000::bigint
         + (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0)) * 15000
    -- Still actively running
    else null
  end                                        as total_ms,
  (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0))::int as wrong_count
from public.attendees a
left join public.challenge_attempts c1 on c1.attendee_id = a.id and c1.challenge_id = 1
left join public.challenge_attempts c2 on c2.attendee_id = a.id and c2.challenge_id = 2
left join q on q.attendee_id = a.id;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the Supabase MCP `apply_migration` tool with `name: "016_shared_workshop_timer"` and the full SQL above as the `query`.

Expected: success, no error.

- [ ] **Step 3: Verify the RPC and view exist**

Run via Supabase MCP `execute_sql`:

```sql
select
  proname,
  proargnames
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('begin_workshop', 'submit_answer');
```

Expected: two rows — `begin_workshop` (no args), `submit_answer` (args `p_question_id`, `p_submission`).

Then:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'leaderboard'
order by ordinal_position;
```

Expected: columns `attendee_id`, `name`, `questions_complete`, `c1_elapsed_ms`, `c2_elapsed_ms`, `total_ms`, `wrong_count` with types `uuid, text, integer, bigint, bigint, bigint, integer`.

- [ ] **Step 4: Spot-check the expiry guard works for a synthetic stale attempt**

Run via `execute_sql` (read-only — uses the view, no writes):

```sql
-- Confirm view's total_ms CASE branches compile and run.
select count(*) as row_count from public.leaderboard;
```

Expected: row count returned without error (matches `attendees` row count).

- [ ] **Step 5: Commit**

```bash
cd /Users/brandons/Documents/roadshow-webapp && git add supabase/migrations/016_shared_workshop_timer.sql && git commit -m "$(cat <<'EOF'
Add shared workshop timer migration

- begin_workshop() RPC stamps both challenge_attempts rows atomically.
- submit_answer rejects past started_at + 35min with time_expired.
- leaderboard view settles total_ms on completion or expiry, so
  partial finishers rank deterministically.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `WORKSHOP_DURATION_MS` to `shared/const.ts`

**Files:**
- Modify: `shared/const.ts`

- [ ] **Step 1: Edit the file**

The current file contents are:

```ts
export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
```

Append:

```ts

// Shared workshop window: one 35-minute timer covers both challenges.
// Source of truth for expiry lives server-side (begin_workshop,
// submit_answer, leaderboard view all use interval '35 minutes').
// This constant is for client display only — the server is authoritative.
export const WORKSHOP_DURATION_MS = 35 * 60 * 1000;
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/brandons/Documents/roadshow-webapp && pnpm check
```

Expected: clean, no output.

- [ ] **Step 3: Commit**

```bash
cd /Users/brandons/Documents/roadshow-webapp && git add shared/const.ts && git commit -m "$(cat <<'EOF'
Add WORKSHOP_DURATION_MS constant

Client-side mirror of the server's 35-minute workshop window.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create `useWorkshop` hook

**Files:**
- Create: `client/src/hooks/useWorkshop.ts`

- [ ] **Step 1: Write the hook**

Write `/Users/brandons/Documents/roadshow-webapp/client/src/hooks/useWorkshop.ts`:

```ts
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
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/brandons/Documents/roadshow-webapp && pnpm check
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /Users/brandons/Documents/roadshow-webapp && git add client/src/hooks/useWorkshop.ts && git commit -m "$(cat <<'EOF'
Add useWorkshop hook for shared 35-min timer

Reads both challenge_attempts rows, derives shared status enum
(ready | in_progress | expired | complete), live-ticks remainingMs
while in progress, exposes beginWorkshop() and refresh() actions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add `locked` prop to `QuestionCard`

**Files:**
- Modify: `client/src/components/QuestionCard.tsx`

- [ ] **Step 1: Add `locked` to the `Props` interface**

Find this block in `QuestionCard.tsx` (lines ~10-19):

```ts
interface Props {
  orderIdx: number;
  questionId: string;
  prompt: string;
  isSolved: boolean;
  onSubmit: (
    questionId: string,
    submission: string,
  ) => Promise<{ ok: boolean; correct?: boolean; error?: string }>;
}
```

Replace with:

```ts
interface Props {
  orderIdx: number;
  questionId: string;
  prompt: string;
  isSolved: boolean;
  locked?: boolean;
  onSubmit: (
    questionId: string,
    submission: string,
  ) => Promise<{ ok: boolean; correct?: boolean; error?: string }>;
}
```

- [ ] **Step 2: Destructure `locked` in the component**

Find:

```ts
export default function QuestionCard({
  orderIdx,
  questionId,
  prompt,
  isSolved,
  onSubmit,
}: Props) {
```

Replace with:

```ts
export default function QuestionCard({
  orderIdx,
  questionId,
  prompt,
  isSolved,
  locked = false,
  onSubmit,
}: Props) {
```

- [ ] **Step 3: Insert the locked-card branch**

Find this block (just after the solved-locked view's closing brace, before `const flashWrong = ...`):

```ts
  // Solved-locked view
  if (isSolved) {
    return (
      // ... existing solved JSX ...
    );
  }

  const flashWrong = status === "wrong";
```

Insert a new `if (locked)` branch between them — after the solved block, before `const flashWrong`:

```ts
  // Solved takes precedence (above). Otherwise, time-up locks the card.
  if (locked) {
    return (
      <div
        style={{
          position: "relative",
          padding: "1.25rem 1.35rem",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "6px",
          background: "rgba(255,255,255,0.015)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          opacity: 0.55,
        }}
      >
        <div style={cardHeaderStyle}>
          <span className="section-label">Question {pad(orderIdx)}</span>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.25em",
              color: "rgba(200,200,220,0.5)",
            }}
          >
            LOCKED
          </span>
        </div>
        <p style={{ ...promptStyle, opacity: 0.7, marginBottom: 0 }}>{prompt}</p>
      </div>
    );
  }
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/brandons/Documents/roadshow-webapp && pnpm check
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/brandons/Documents/roadshow-webapp && git add client/src/components/QuestionCard.tsx && git commit -m "$(cat <<'EOF'
QuestionCard: add locked prop for time-up lockout

Locked state shows a dim 'LOCKED' card with the prompt visible but no
input. Solved state takes precedence so already-correct cards stay
green even after the timer expires.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Convert `ChallengeHeader` to countdown display with color tiers

**Files:**
- Modify: `client/src/components/ChallengeHeader.tsx`

- [ ] **Step 1: Replace the `Props` interface**

Find:

```ts
interface Props {
  title: string;
  startedAt: string | null;
  completedAt: string | null;
  wrongCount: number;
  attendeeName: string;
  solvedCount: number;
  totalQuestions: number;
}
```

Replace with:

```ts
interface Props {
  title: string;
  remainingMs: number;
  isComplete: boolean;
  isExpired: boolean;
  wrongCount: number;
  attendeeName: string;
  solvedCount: number;
  totalQuestions: number;
}
```

- [ ] **Step 2: Replace the function body's elapsed-time computation**

Find this block:

```ts
export default function ChallengeHeader({
  title,
  startedAt,
  completedAt,
  wrongCount,
  attendeeName,
  solvedCount,
  totalQuestions,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || completedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, completedAt]);

  let elapsedLabel = "--:--";
  if (startedAt) {
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : now;
    elapsedLabel = formatMs(end - start + wrongCount * PENALTY_PER_WRONG_MS);
  }
```

Replace with:

```ts
export default function ChallengeHeader({
  title,
  remainingMs,
  isComplete,
  isExpired,
  wrongCount,
  attendeeName,
  solvedCount,
  totalQuestions,
}: Props) {
  const remainingLabel = formatMs(remainingMs);

  // Color tier — drives the timer color
  let timerColor = "rgba(232,232,240,0.97)";
  let timerShadow = "none";
  if (isComplete) {
    timerColor = "oklch(0.72 0.28 290)";
    timerShadow = "0 0 16px oklch(0.52 0.28 290 / 0.5)";
  } else if (isExpired) {
    timerColor = "oklch(0.7 0.2 25)";
    timerShadow = "0 0 16px oklch(0.5 0.2 25 / 0.4)";
  } else if (remainingMs < 60_000) {
    timerColor = "oklch(0.7 0.2 25)";
    timerShadow = "0 0 12px oklch(0.5 0.2 25 / 0.35)";
  } else if (remainingMs < 5 * 60_000) {
    timerColor = "oklch(0.78 0.18 75)";
    timerShadow = "0 0 12px oklch(0.55 0.18 75 / 0.35)";
  }
```

- [ ] **Step 3: Remove the now-unused `useState` / `useEffect` imports and state**

The replaced body above no longer uses `now` or the local interval. Remove the `useState` / `useEffect` imports from the top of the file:

Find:

```ts
import { useEffect, useState } from "react";
```

Replace with: delete the line entirely (no React imports needed).

- [ ] **Step 4: Update the JSX `elapsedLabel` reference to `remainingLabel`**

Find:

```tsx
        <span
          style={{
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: "1.3rem",
            fontWeight: 500,
            color: completedAt
              ? "oklch(0.72 0.28 290)"
              : "rgba(232,232,240,0.97)",
            letterSpacing: "0.05em",
            textShadow: completedAt
              ? "0 0 16px oklch(0.52 0.28 290 / 0.5)"
              : "none",
          }}
        >
          {elapsedLabel}
        </span>
```

Replace with:

```tsx
        <span
          style={{
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: "1.3rem",
            fontWeight: 500,
            color: timerColor,
            letterSpacing: "0.05em",
            textShadow: timerShadow,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {remainingLabel}
        </span>
```

- [ ] **Step 5: Update file header comment**

Find:

```ts
/**
 * Sticky top strip for the challenge pages. Shows the challenge title,
 * the running wall-clock timer (`mm:ss`), the penalty tally (+15s × N),
 * and the attendee's name. Timer is purely derived from started_at +
 * wall clock — no server polling needed for display.
 */
```

Replace with:

```ts
/**
 * Sticky top strip for the challenge pages. Shows the challenge title,
 * the shared 35-minute countdown (mm:ss remaining), the penalty tally
 * (+15s × N), and the attendee's name. Countdown is derived from the
 * useWorkshop hook upstream — this component is a presentational view
 * over the props passed in.
 */
```

- [ ] **Step 6: Run typecheck**

```bash
cd /Users/brandons/Documents/roadshow-webapp && pnpm check
```

Expected: clean. (Note: `PENALTY_PER_WRONG_MS` is no longer referenced in this file — leave the constant in place; it's used by `ChallengePage.tsx`. Or remove it if unused here. If TS complains about unused const, delete the line `const PENALTY_PER_WRONG_MS = 15_000;` from this file.)

- [ ] **Step 7: Commit**

```bash
cd /Users/brandons/Documents/roadshow-webapp && git add client/src/components/ChallengeHeader.tsx && git commit -m "$(cat <<'EOF'
ChallengeHeader: switch to countdown display

Header now consumes remainingMs/isComplete/isExpired props from
useWorkshop instead of computing elapsed time locally. Adds amber
under 5min, red under 1min color tiers; purple on completion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update `ChallengeIntro` copy and button label

**Files:**
- Modify: `client/src/components/ChallengeIntro.tsx`

- [ ] **Step 1: Update the file header comment**

Find:

```ts
/**
 * Pre-Begin intro block for a challenge page. Shows challenge metadata
 * plus the Begin Challenge button that starts the wall-clock timer.
 */
```

Replace with:

```ts
/**
 * Pre-Begin intro block for Challenge 1. Shows workshop metadata plus
 * the Begin Workshop button that starts the shared 35-minute timer
 * covering BOTH challenges. Only rendered on /challenge/1 when the
 * workshop hasn't begun; /challenge/2 in the same state redirects to
 * /challenge/1 (see ChallengePage).
 */
```

- [ ] **Step 2: Rewrite the body paragraphs**

Find this block:

```tsx
      <p
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.875rem",
          fontWeight: 300,
          lineHeight: 1.65,
          color: "rgba(200,200,220,0.85)",
          marginBottom: "1rem",
        }}
      >
        Every answer lives inside the Salt platform. Open it in another tab, hunt through
        the UI, submit each flag here. Your timer starts the moment you click Begin.
        Wrong guesses add <span className="accent-link">+15 seconds</span> each, so take
        the time to get it right.
      </p>
```

Replace with:

```tsx
      <p
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.875rem",
          fontWeight: 300,
          lineHeight: 1.65,
          color: "rgba(200,200,220,0.85)",
          marginBottom: "1rem",
        }}
      >
        You have <span className="accent-link">35 minutes</span> total to complete both
        challenges. Starting Challenge 1 unlocks Challenge 2 — work them in any order, and
        switch between them at will. When the timer hits zero, submissions lock and you'll
        be taken to your results.
      </p>
      <p
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.875rem",
          fontWeight: 300,
          lineHeight: 1.65,
          color: "rgba(200,200,220,0.85)",
          marginBottom: "1rem",
        }}
      >
        Every answer lives inside the Salt platform. Open it in another tab, hunt through
        the UI, submit each flag here. Wrong guesses add{" "}
        <span className="accent-link">+15 seconds</span> each, so take the time to get it
        right.
      </p>
```

- [ ] **Step 3: Update the button label**

Find:

```tsx
        <span style={{ position: "relative", zIndex: 1 }}>
          {submitting ? "Starting…" : "Begin Challenge"}
        </span>
```

Replace with:

```tsx
        <span style={{ position: "relative", zIndex: 1 }}>
          {submitting ? "Starting…" : "Begin Workshop"}
        </span>
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/brandons/Documents/roadshow-webapp && pnpm check
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/brandons/Documents/roadshow-webapp && git add client/src/components/ChallengeIntro.tsx && git commit -m "$(cat <<'EOF'
ChallengeIntro: update copy for shared workshop timer

Button renamed to 'Begin Workshop'. Lead paragraph spells out the
35-minute shared window across both challenges and the lock behavior
at expiry.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Rewire `ChallengePage` — workshop status branching, C2 redirect, expiry overlay, auto-navigate

**Files:**
- Modify: `client/src/components/ChallengePage.tsx`

This is the biggest single edit. Re-read the file once before editing so you can confirm the structure.

- [ ] **Step 1: Update imports**

Find:

```ts
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import ChallengeHeader from "@/components/ChallengeHeader";
import ChallengeIntro from "@/components/ChallengeIntro";
import QuestionCard from "@/components/QuestionCard";
import MagicRingsButton from "@/components/MagicRingsButton";
import { useChallenge } from "@/hooks/useChallenge";
import { supabase } from "@/lib/supabase";
```

Replace with:

```ts
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import ChallengeHeader from "@/components/ChallengeHeader";
import ChallengeIntro from "@/components/ChallengeIntro";
import QuestionCard from "@/components/QuestionCard";
import MagicRingsButton from "@/components/MagicRingsButton";
import { useChallenge } from "@/hooks/useChallenge";
import { useWorkshop } from "@/hooks/useWorkshop";
import { supabase } from "@/lib/supabase";
```

- [ ] **Step 2: Replace the hook calls + add workshop wiring**

Find this block (just inside the component body):

```ts
  const [, navigate] = useLocation();
  const {
    meta,
    questions,
    state,
    progress,
    status,
    error,
    solvedCount,
    totalQuestions,
    begin,
    submit,
  } = useChallenge({ challengeId, attendeeId: attendee.id });
  const [revealed, setRevealed] = useState(false);
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
```

Replace with:

```ts
  const [, navigate] = useLocation();
  const workshop = useWorkshop({ attendeeId: attendee.id });
  const {
    meta,
    questions,
    state,
    progress,
    status,
    error,
    solvedCount,
    totalQuestions,
    submit,
  } = useChallenge({ challengeId, attendeeId: attendee.id });
  const [revealed, setRevealed] = useState(false);
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const timeUpHandledRef = useRef(false);
```

(Note: `begin` is dropped from the destructure; the workshop owns the Begin action now. If `useChallenge` still exports it post-Task 9 cleanup, the extra field is ignored.)

- [ ] **Step 3: Add the C2-redirect effect, the workshop-refresh-on-challenge-complete effect, and the expiry-handler effect**

Find:

```ts
  // When the hook transitions to "complete", raise the reveal overlay
  // and take a one-shot snapshot of the leaderboard for the top-3 peek.
  useEffect(() => {
    if (status !== "complete") return;
    setRevealed(true);
```

Insert these three effects ABOVE the `useEffect(() => { if (status !== "complete") return; ... })`:

```ts
  // Direct nav to /challenge/2 before the workshop is begun → bounce to C1.
  useEffect(() => {
    if (challengeId !== 2) return;
    if (workshop.status !== "ready") return;
    navigate("/challenge/1", { replace: true });
  }, [challengeId, workshop.status, navigate]);

  // When THIS challenge transitions to completed_at, refresh workshop
  // so it sees the new completion flag (useWorkshop polls neither
  // Supabase realtime nor a timer — explicit sync keeps it cheap).
  const completedAtSig = state?.completed_at ?? null;
  useEffect(() => {
    if (!completedAtSig) return;
    workshop.refresh();
  }, [completedAtSig, workshop]);

  // Time's-up handler: one-shot. Fades in the overlay, then auto-navs.
  useEffect(() => {
    if (workshop.status !== "expired") return;
    if (timeUpHandledRef.current) return;
    timeUpHandledRef.current = true;
    setShowTimeUp(true);
    const t = window.setTimeout(() => {
      navigate("/completed", { replace: true });
    }, 2500);
    return () => window.clearTimeout(t);
  }, [workshop.status, navigate]);

```

- [ ] **Step 4: Update the loading/error branches to also handle the workshop loading state**

Find:

```ts
  if (status === "loading") {
    return (
```

Replace with:

```ts
  if (status === "loading" || workshop.status === "loading") {
    return (
```

(The rest of the loading return block stays unchanged.)

- [ ] **Step 5: Replace the "ready" branch with a workshop-aware Begin gate**

Find:

```ts
  // Pre-Begin: just the intro block.
  if (status === "ready") {
    return (
      <ChallengeIntro
        number={challengeNumber}
        title={titleWithoutPrefix(meta?.title ?? `Challenge ${challengeNumber}`)}
        subtitle={meta?.subtitle ?? null}
        onBegin={begin}
      />
    );
  }
```

Replace with:

```ts
  // Pre-Begin: only Challenge 1 shows the intro/Begin gate. /challenge/2
  // in the ready state hits the redirect effect above and renders nothing.
  if (workshop.status === "ready") {
    if (challengeId !== 1) return null; // redirecting
    return (
      <ChallengeIntro
        number={challengeNumber}
        title={titleWithoutPrefix(meta?.title ?? `Challenge ${challengeNumber}`)}
        subtitle={meta?.subtitle ?? null}
        onBegin={workshop.beginWorkshop}
      />
    );
  }
```

- [ ] **Step 6: Replace the `ChallengeHeader` call site**

Find:

```tsx
      <ChallengeHeader
        title={title}
        startedAt={beganAt}
        completedAt={completedAt}
        wrongCount={wrongCount}
        attendeeName={attendee.name}
        solvedCount={solvedCount}
        totalQuestions={totalQuestions}
      />
```

Replace with:

```tsx
      <ChallengeHeader
        title={title}
        remainingMs={workshop.remainingMs}
        isComplete={workshop.status === "complete"}
        isExpired={workshop.status === "expired"}
        wrongCount={wrongCount}
        attendeeName={attendee.name}
        solvedCount={solvedCount}
        totalQuestions={totalQuestions}
      />
```

- [ ] **Step 7: Thread `locked` through to every `QuestionCard` instance**

The file has six `<QuestionCard />` call sites (five inside the 5-question grid, one in the fallback `.map()`). For each one, add `locked={workshop.status === "expired"}` as a prop.

Find each occurrence pattern:

```tsx
          <QuestionCard
            key={questions[N].id}
            orderIdx={questions[N].order_idx}
            questionId={questions[N].id}
            prompt={questions[N].prompt}
            isSolved={progress.has(questions[N].id)}
            onSubmit={submit}
          />
```

Replace with:

```tsx
          <QuestionCard
            key={questions[N].id}
            orderIdx={questions[N].order_idx}
            questionId={questions[N].id}
            prompt={questions[N].prompt}
            isSolved={progress.has(questions[N].id)}
            locked={workshop.status === "expired"}
            onSubmit={submit}
          />
```

And the `.map()` site:

```tsx
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              orderIdx={q.order_idx}
              questionId={q.id}
              prompt={q.prompt}
              isSolved={progress.has(q.id)}
              onSubmit={submit}
            />
          ))}
```

Replace with:

```tsx
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              orderIdx={q.order_idx}
              questionId={q.id}
              prompt={q.prompt}
              isSolved={progress.has(q.id)}
              locked={workshop.status === "expired"}
              onSubmit={submit}
            />
          ))}
```

- [ ] **Step 8: Add the Time's Up overlay at the bottom of the JSX**

Find the closing `</AnimatePresence>` near the end of the JSX (just before the final `</>`). After the existing `</AnimatePresence>` block, but still inside the fragment, insert:

```tsx
      <AnimatePresence>
        {showTimeUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(10,10,15,0.85)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <span
                className="section-label"
                style={{ display: "block", marginBottom: "0.75rem" }}
              >
                Workshop Closed
              </span>
              <h2
                style={{
                  fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                  fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "rgba(232,232,240,0.97)",
                  margin: "0 0 0.5rem",
                }}
              >
                Time's{" "}
                <span
                  style={{
                    color: "oklch(0.7 0.2 25)",
                    textShadow: "0 0 24px oklch(0.5 0.2 25 / 0.5)",
                  }}
                >
                  Up
                </span>
              </h2>
              <p
                style={{
                  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  fontSize: "0.875rem",
                  color: "rgba(200,200,220,0.7)",
                  margin: 0,
                }}
              >
                Locking submissions · routing to your results…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
```

- [ ] **Step 9: Run typecheck**

```bash
cd /Users/brandons/Documents/roadshow-webapp && pnpm check
```

Expected: clean. If TS complains that `begin` is no longer returned by `useChallenge`, that's expected — confirm by re-reading the destructure block in Step 2. If TS complains that `state.completed_at` types don't line up with the `completedAt` local, check that the `beganAt = state?.started_at ?? null` and `completedAt = state?.completed_at ?? null` lines below the hooks are unchanged.

- [ ] **Step 10: Manual smoke test in the browser**

The dev server is already running on port 3000. Open `http://localhost:3000/challenge/1` while signed in as a registered attendee with NO prior `challenge_attempts` row (or use a fresh attendee).

Confirm visually:
- `/challenge/1` shows the intro with "Begin Workshop" button.
- Direct nav to `/challenge/2` redirects to `/challenge/1` (browser URL flips, back button doesn't return).
- After clicking Begin: both `/challenge/1` and `/challenge/2` show the question grid with the countdown ticking down from ~34:59.

(Server expiry, auto-nav, and completed-page tiers tested in Task 10.)

- [ ] **Step 11: Commit**

```bash
cd /Users/brandons/Documents/roadshow-webapp && git add client/src/components/ChallengePage.tsx && git commit -m "$(cat <<'EOF'
ChallengePage: wire useWorkshop, C2 redirect, expiry overlay

- Workshop status now drives Begin gating + redirect from /challenge/2
  when not yet started.
- ChallengeHeader receives remainingMs / isComplete / isExpired props.
- QuestionCards receive locked prop on expiry.
- Time's-up overlay fades in for 2.5s then auto-navs to /completed
  via a one-shot ref guard.
- Workshop refreshes when this challenge's completed_at flips so the
  shared status can transition to 'complete' across both challenges.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Rank-tier render in `Completed.tsx` with timed-out variant

**Files:**
- Modify: `client/src/pages/Completed.tsx`

- [ ] **Step 1: Add tier helper at the top of the file**

Find the existing helpers `rankAccent` / `rankLabel` near the top of the file (around lines 34-49):

```ts
function rankAccent(rank: number): string {
  if (rank === 1) return "oklch(0.82 0.18 85)"; // gold
  if (rank === 2) return "oklch(0.78 0.04 260)"; // silver
  if (rank === 3) return "oklch(0.6 0.12 45)"; // bronze
  return "oklch(0.65 0.25 290)";
}

function rankLabel(rank: number): string {
  if (rank === 1) return "Champion";
  if (rank === 2) return "Runner-up";
  if (rank === 3) return "Third Place";
  const suffix = ["th", "st", "nd", "rd"][
    rank % 100 > 10 && rank % 100 < 14 ? 0 : Math.min(rank % 10, 3)
  ];
  return `${rank}${suffix} Place`;
}
```

After these, add:

```ts
type FinishTier = "champion" | "runner-up" | "third" | "completed" | "timed-out";

function tierFor(rank: number, finishedNaturally: boolean): FinishTier {
  if (rank === 1) return "champion";
  if (rank === 2) return "runner-up";
  if (rank === 3) return "third";
  return finishedNaturally ? "completed" : "timed-out";
}
```

- [ ] **Step 2: Derive `finishedNaturally` and `tier` in the component body**

Find this block in the `Completed()` function (around lines 56-67):

```ts
  const myRow = useMemo(
    () => (attendee ? rows.find((r) => r.attendee_id === attendee.id) ?? null : null),
    [rows, attendee],
  );
  const myRank = useMemo(() => {
    if (!attendee) return null;
    const idx = rows.findIndex((r) => r.attendee_id === attendee.id);
    return idx >= 0 ? idx + 1 : null;
  }, [rows, attendee]);

  const finished = myRow !== null && myRow.total_ms !== null;
```

Replace with:

```ts
  const myRow = useMemo(
    () => (attendee ? rows.find((r) => r.attendee_id === attendee.id) ?? null : null),
    [rows, attendee],
  );
  const myRank = useMemo(() => {
    if (!attendee) return null;
    const idx = rows.findIndex((r) => r.attendee_id === attendee.id);
    return idx >= 0 ? idx + 1 : null;
  }, [rows, attendee]);

  // A row is "settled" once total_ms is non-null (both done, or expired).
  // "Finished naturally" = both challenges have a completed_at milestone.
  const finished = myRow !== null && myRow.total_ms !== null;
  const finishedNaturally =
    myRow !== null && myRow.c1_elapsed_ms !== null && myRow.c2_elapsed_ms !== null;
  const tier: FinishTier | null =
    finished && myRank !== null ? tierFor(myRank, finishedNaturally) : null;
```

- [ ] **Step 3: Replace the headline render with tier-aware copy**

Find:

```tsx
            <h1
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "rgba(232,232,240,0.97)",
                margin: 0,
              }}
            >
              {finished ? (
                <>
                  {rankLabel(myRank ?? 0).split(" ")[0]}{" "}
                  <span
                    style={{
                      color: rankAccent(myRank ?? 0),
                      textShadow: `0 0 30px ${rankAccent(myRank ?? 0)}`,
                    }}
                  >
                    {(rankLabel(myRank ?? 0).split(" ").slice(1).join(" ") || "Finisher")}
                  </span>
                </>
              ) : (
                <>
                  Workshop{" "}
                  <span
                    style={{
                      color: "oklch(0.72 0.28 290)",
                      textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                    }}
                  >
                    Complete
                  </span>
                </>
              )}
            </h1>
```

Replace with:

```tsx
            <h1
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "rgba(232,232,240,0.97)",
                margin: 0,
              }}
            >
              {tier === "champion" && (
                <>
                  Workshop{" "}
                  <span
                    style={{
                      color: rankAccent(1),
                      textShadow: `0 0 36px ${rankAccent(1)}`,
                    }}
                  >
                    Champion
                  </span>
                </>
              )}
              {tier === "runner-up" && (
                <>
                  Runner-
                  <span
                    style={{
                      color: rankAccent(2),
                      textShadow: `0 0 30px ${rankAccent(2)}`,
                    }}
                  >
                    up
                  </span>
                </>
              )}
              {tier === "third" && (
                <>
                  <span
                    style={{
                      color: rankAccent(3),
                      textShadow: `0 0 30px ${rankAccent(3)}`,
                    }}
                  >
                    Third
                  </span>{" "}
                  Place
                </>
              )}
              {tier === "completed" && (
                <>
                  Round{" "}
                  <span
                    style={{
                      color: "oklch(0.72 0.28 290)",
                      textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                    }}
                  >
                    Complete
                  </span>
                </>
              )}
              {tier === "timed-out" && (
                <>
                  Time's{" "}
                  <span
                    style={{
                      color: "oklch(0.7 0.2 25)",
                      textShadow: "0 0 30px oklch(0.5 0.2 25 / 0.4)",
                    }}
                  >
                    Up
                  </span>
                </>
              )}
              {tier === null && (
                <>
                  Workshop{" "}
                  <span
                    style={{
                      color: "oklch(0.72 0.28 290)",
                      textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                    }}
                  >
                    Complete
                  </span>
                </>
              )}
            </h1>
```

- [ ] **Step 4: Replace the result-card body so the timed-out variant gets distinct content**

Find this block (the existing 3-stat grid wrapped in the `motion.div` result card, around lines 137-219):

```tsx
          {/* Performance card for finished attendees */}
          {finished && myRow && myRank !== null && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
            >
              <div
                style={{
                  padding: "2rem",
                  marginBottom: "2.5rem",
                  border: `1px solid ${rankAccent(myRank)}`,
                  borderRadius: "8px",
                  background: "rgba(10,10,15,0.55)",
                  boxShadow: `0 0 40px ${rankAccent(myRank)} 22`.replace(/ 22$/, "33"),
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: rankAccent(myRank),
                    }}
                  >
                    Your Result
                  </span>
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(200,200,220,0.6)",
                    }}
                  >
                    Rank {myRank.toString().padStart(2, "0")} of {rows.length}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "1rem",
                  }}
                >
                  <Stat label="Challenge 1" value={formatMs(myRow.c1_elapsed_ms)} />
                  <Stat label="Challenge 2" value={formatMs(myRow.c2_elapsed_ms)} />
                  <Stat
                    label="Total"
                    value={formatMs(myRow.total_ms)}
                    accent={rankAccent(myRank)}
                  />
                </div>
                <div
                  style={{
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                    fontSize: "0.8rem",
                    color: "rgba(200,200,220,0.7)",
                  }}
                >
                  {myRow.wrong_count > 0
                    ? `${myRow.wrong_count} wrong guess${myRow.wrong_count === 1 ? "" : "es"} · +${myRow.wrong_count * 15}s penalty baked into total`
                    : "Clean run — no wrong guesses."}
                </div>
              </div>
            </motion.div>
          )}
```

Replace with:

```tsx
          {/* Performance card for settled attendees */}
          {tier && myRow && myRank !== null && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
            >
              <div
                style={{
                  padding: "2rem",
                  marginBottom: "2.5rem",
                  border: `1px solid ${tier === "timed-out" ? "oklch(0.55 0.2 25 / 0.5)" : rankAccent(myRank)}`,
                  borderRadius: "8px",
                  background: "rgba(10,10,15,0.55)",
                  boxShadow:
                    tier === "timed-out"
                      ? "0 0 28px oklch(0.5 0.2 25 / 0.22)"
                      : `0 0 40px ${rankAccent(myRank)}33`,
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color:
                        tier === "timed-out"
                          ? "oklch(0.7 0.2 25)"
                          : rankAccent(myRank),
                    }}
                  >
                    {tier === "timed-out" ? "Did Not Finish" : "Your Result"}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(200,200,220,0.6)",
                    }}
                  >
                    Rank {myRank.toString().padStart(2, "0")} of {rows.length}
                  </span>
                </div>

                {tier === "timed-out" ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: "1rem",
                      alignItems: "end",
                    }}
                  >
                    <Stat
                      label="Solved"
                      value={`${myRow.questions_complete} / 10`}
                      accent="oklch(0.7 0.2 25)"
                    />
                    <Stat
                      label="Final Score"
                      value={formatMs(myRow.total_ms)}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1rem",
                    }}
                  >
                    <Stat
                      label="Challenge 1 done"
                      value={formatMs(myRow.c1_elapsed_ms)}
                    />
                    <Stat
                      label="Challenge 2 done"
                      value={formatMs(myRow.c2_elapsed_ms)}
                    />
                    <Stat
                      label="Total"
                      value={formatMs(myRow.total_ms)}
                      accent={rankAccent(myRank)}
                    />
                  </div>
                )}

                <div
                  style={{
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                    fontSize: "0.8rem",
                    color: "rgba(200,200,220,0.7)",
                  }}
                >
                  {tier === "timed-out"
                    ? `Workshop timer expired. ${myRow.questions_complete} of 10 questions solved${myRow.wrong_count > 0 ? ` · ${myRow.wrong_count} wrong (+${myRow.wrong_count * 15}s)` : ""}.`
                    : myRow.wrong_count > 0
                      ? `${myRow.wrong_count} wrong guess${myRow.wrong_count === 1 ? "" : "es"} · +${myRow.wrong_count * 15}s penalty baked into total`
                      : "Clean run — no wrong guesses."}
                </div>
              </div>
            </motion.div>
          )}
```

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/brandons/Documents/roadshow-webapp && pnpm check
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
cd /Users/brandons/Documents/roadshow-webapp && git add client/src/pages/Completed.tsx && git commit -m "$(cat <<'EOF'
Completed: tier-aware result screens

Rank 1 → Workshop Champion (gold). Rank 2/3 → podium tiers. Rank 4+
naturally finished → Round Complete (purple). Rank 4+ timed out →
Time's Up with N/10 solved + final-score framing. Visitors and
in-progress users still fall back to the existing scenario recap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Refresh Leaderboard footer copy + drop `useChallenge.begin` dead code

**Files:**
- Modify: `client/src/pages/Leaderboard.tsx`
- Modify: `client/src/hooks/useChallenge.ts`

- [ ] **Step 1: Update the leaderboard footer copy**

In `client/src/pages/Leaderboard.tsx`, find:

```tsx
              Sort order: questions solved (desc), total time (asc), wrong guesses
              (asc). Wrong answers add 15 seconds to your total. Total time only
              populates once both challenges are complete.
```

Replace with:

```tsx
              Sort order: questions solved (desc), total time (asc), wrong guesses
              (asc). Wrong answers add 15 seconds to your total. Total time
              populates once both challenges are complete, or once the 35-minute
              workshop timer expires.
```

- [ ] **Step 2: Drop the dead `begin` function from `useChallenge`**

In `client/src/hooks/useChallenge.ts`, find this block:

```ts
  const begin = useCallback(async (): Promise<boolean> => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("begin_challenge", {
      p_challenge_id: challengeId,
    });
    if (rpcError) {
      setError(rpcError.message);
      return false;
    }
    if (!data?.ok) {
      setError(data?.error ?? "begin_failed");
      return false;
    }
    setState((prev) => ({
      started_at: data.started_at,
      completed_at: prev?.completed_at ?? null,
      wrong_count: prev?.wrong_count ?? 0,
    }));
    setStatus("in_progress");
    return true;
  }, [challengeId]);
```

Delete it entirely.

Then find the return block:

```ts
  return {
    meta,
    questions,
    state,
    progress,
    status,
    error,
    totalQuestions,
    solvedCount,
    begin,
    submit,
  };
```

Replace with:

```ts
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
```

If `useCallback` becomes unused after this deletion, leave it — `submit` still uses it.

- [ ] **Step 3: Run typecheck**

```bash
cd /Users/brandons/Documents/roadshow-webapp && pnpm check
```

Expected: clean. (If TS complains about anything still referencing `begin`, grep the codebase: `grep -rn "useChallenge" client/src` should show only `ChallengePage` consuming it, and `ChallengePage` was updated in Task 7 to drop `begin` from its destructure.)

- [ ] **Step 4: Commit**

```bash
cd /Users/brandons/Documents/roadshow-webapp && git add client/src/pages/Leaderboard.tsx client/src/hooks/useChallenge.ts && git commit -m "$(cat <<'EOF'
Leaderboard copy + drop useChallenge.begin

Leaderboard footer mentions the 35-min expiry trigger for total_ms.
useChallenge.begin is no longer called (replaced by
useWorkshop.beginWorkshop); removing keeps the hook focused on
per-challenge state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Manual verification — walk the spec's checklist end-to-end

**Files:** none modified. This task is the spec's verification checklist applied to the running app.

The dev server is on `http://localhost:3000`. Sign in as a registered attendee. To reset an attendee for a fresh test pass, use Supabase MCP `execute_sql`:

```sql
-- Replace <ATTENDEE_ID> with the uuid of the test attendee.
delete from public.question_progress where attendee_id = '<ATTENDEE_ID>';
delete from public.answer_attempts where attendee_id = '<ATTENDEE_ID>';
delete from public.challenge_attempts where attendee_id = '<ATTENDEE_ID>';
```

Run each check. Mark `[x]` only after observing the behavior directly.

**Begin flow**
- [ ] Registered user on `/challenge/1` sees `ChallengeIntro` with "Begin Workshop" button.
- [ ] Clicking Begin transitions to the question grid; countdown shows ~34:59 remaining and decrements every second.
- [ ] DB query: both `challenge_attempts` rows for this attendee have identical `started_at` timestamps. Use:
  ```sql
  select challenge_id, started_at from public.challenge_attempts
  where attendee_id = '<ATTENDEE_ID>' order by challenge_id;
  ```
- [ ] Calling `begin_workshop` a second time (e.g. by reopening the page) does NOT reset `started_at` — `coalesce` preserves the original.

**Routing**
- [ ] Before Begin: direct navigation to `/challenge/2` redirects to `/challenge/1` and replaces history (back button does NOT return to `/challenge/2`).
- [ ] After Begin: navigating to `/challenge/2` renders the question grid with no Begin gate.

**Countdown UI**
- [ ] Countdown matches between `/challenge/1` and `/challenge/2` within ~1 second.
- [ ] Force the under-5-min state: in Supabase, set `started_at = now() - interval '31 minutes'` for the test attendee on both challenges, then reload `/challenge/1`. Timer reads ~3:59 in amber.
- [ ] Force the under-1-min state: set `started_at = now() - interval '34 minutes 30 seconds'`. Timer reads ~0:29 in red.
- [ ] Force the complete state: solve all 5 of one challenge then all 5 of the other. After C2's last correct answer, countdown freezes and flips to purple.

**Server expiry lock**
- [ ] Set `started_at = now() - interval '36 minutes'` for the test attendee. Calling `submit_answer` returns `{ ok: false, error: 'time_expired' }`:
  ```sql
  -- Pick any unsolved question for the attendee's started challenge:
  select id from public.questions where challenge_id = 1 order by order_idx limit 1;
  -- Then in the SQL editor, run submit_answer (as the attendee's role) — or
  -- trigger via the browser UI by setting started_at -36min and clicking submit.
  ```
- [ ] No row written to `answer_attempts` for the late attempt.
- [ ] `wrong_count` does NOT increment.

**Client expiry flow**
- [ ] Reset and re-begin a fresh attempt. Set `started_at = now() - interval '34 minutes 58 seconds'` via SQL. Reload `/challenge/1`. Within ~2 seconds the timer hits 0:00.
- [ ] All question inputs disable; submit buttons hide/disable (look for the "LOCKED" pill on each card).
- [ ] "Time's Up" overlay fades in.
- [ ] Within ~2.5s the user is navigated to `/completed` and the URL replaces (back button does NOT return to the locked page).
- [ ] The auto-navigate fires exactly once — there is no flicker or double-navigate.

**Leaderboard ranking**

Create three test attendees with different end states:

- Attendee A: finishes both challenges in ~18 minutes with 2 wrong answers (natural finisher).
- Attendee B: solves 4/5 on C1 + 4/5 on C2 (8/10 total) by expiry. Force expiry via `started_at = now() - interval '36 minutes'`.
- Attendee C: solves 3/5 on C1 + 2/5 on C2 (5/10 total) by expiry, same forced-expiry trick.

- [ ] `select * from public.leaderboard order by questions_complete desc, total_ms asc nulls last, wrong_count asc;` shows A first, B second, C third.
- [ ] All three have non-null `total_ms`.

**Completed page tiers**

For each tier, create or pick an attendee whose leaderboard rank matches and open `/completed` while signed in as them.

- [ ] Rank 1 finisher → "Workshop Champion" headline in gold, 3-stat grid with gold accents.
- [ ] Rank 2 finisher → "Runner-up" headline in silver.
- [ ] Rank 3 finisher → "Third Place" headline in bronze.
- [ ] Rank 4+ finished naturally → "Round Complete" headline in muted purple, 3-stat grid with neutral accents.
- [ ] Rank 4+ timed out → "Time's Up" headline in red, "Did Not Finish" label, 2-stat layout (Solved N/10 + Final Score), footer line spells out the timer expired.
- [ ] Unregistered visitor (sign out / no attendee) → falls back to the existing scenario-recap layout with "Workshop Complete" headline.

**Final state**

- [ ] `pnpm check` is clean.
- [ ] `git status` shows no uncommitted changes (other than possibly the workspace file that was already untracked).
- [ ] `git log --oneline -10` shows the per-task commit chain.

Once every box is checked, the feature is shippable.

---

## Self-review checks (done)

- **Spec coverage:** All sections of the spec — DB changes, useWorkshop, ChallengePage rewires, QuestionCard locking, ChallengeHeader countdown, Completed tier matrix (including timed-out variant), Leaderboard copy refresh, manual verification checklist — have a corresponding task.
- **Placeholders:** None. Every code step shows the full code; every command step shows the exact command and expected output.
- **Type consistency:**
  - `useWorkshop` returns `WorkshopState` with `status`, `remainingMs`, `c1Completed`, `c2Completed`, `error`, `beginWorkshop()`, `refresh()`. Same shape used in Task 7's `ChallengePage` consumption.
  - `ChallengeHeader` props swap (`startedAt`/`completedAt` → `remainingMs`/`isComplete`/`isExpired`) is consistent across the component definition (Task 5) and the call site (Task 7).
  - `QuestionCard`'s `locked?: boolean` is added in Task 4 and threaded in Task 7 — type names match.
  - `tierFor(rank, finishedNaturally)` returns `FinishTier`, consumed by the `tier` variable in `Completed.tsx`. Same naming through both Task 8 steps.
