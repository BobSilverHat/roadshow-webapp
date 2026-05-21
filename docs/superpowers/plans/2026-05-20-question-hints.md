# Question Hints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in hint system to all 10 workshop questions (Q1–Q4 = 1 hint each, Q5 = 3 hints) on both challenges, with a +60 s/hint penalty rolled into the leaderboard's `total_ms`.

**Architecture:**

- DB: `hints text[]` on `public.questions`, new `public.hint_usage` ledger table, new `request_hint` RPC (security definer), rewritten `questions_public` + `leaderboard` views.
- Client: a `useHints` hook fetches the user's hint ledger; `HintBulbButton` lives top-right of every unsolved/unlocked `QuestionCard` and opens a `HintModal` with `BorderGlow`-yellow card + blurred backdrop. Modal has a confirm state (first hint) and a reveal state (all paid hints + optional "reveal next" for Q5).
- Scoring: leaderboard view adds `count(hint_usage) * 60_000` to `total_ms`; per-challenge completion card and `/completed` summary display hints used.

**Tech Stack:** TypeScript / React 18 / Vite / wouter / Supabase Postgres + RLS / Framer Motion. Inline SVG for the lightbulb icon (no new dep).

**Reference spec:** `docs/superpowers/specs/2026-05-20-question-hints-design.md` (commit `6c17803`).

---

## File Structure

**New files:**
- `supabase/migrations/023_question_hints.sql` — schema (column, table, RLS), `request_hint` RPC, view rewrites, `get_leaderboard` RPC rewrite.
- `supabase/migrations/024_seed_question_hints.sql` — placeholder hint copy (`Hint 0X — TBD`) for all 10 questions.
- `client/src/hooks/useHints.ts` — fetches and manages hint state per attendee.
- `client/src/components/HintBulbButton.tsx` — small inline-SVG lightbulb top-right of `QuestionCard`.
- `client/src/components/HintModal.tsx` — full-screen overlay with confirm + reveal states.

**Modified files:**
- `client/src/components/QuestionCard.tsx` — accept hint props, render `HintBulbButton`, manage `HintModal` open state.
- `client/src/components/ChallengePage.tsx` — wire `useHints`, pass to cards, append hint line to completion card.
- `client/src/hooks/useLeaderboard.ts` — add `hints_used` to `LeaderboardRow` type.
- `client/src/pages/Completed.tsx` — append hint line to performance card.

**Verification surface:** there is no test runner configured in the repo. Each task verifies via (a) Supabase MCP SQL probes for DB changes, (b) `pnpm check` for TS, (c) manual browser smoke at the end. No new test infra is introduced — keep YAGNI.

---

## Task 1: Migration 023 schema — column, ledger table, RLS policy

**Files:**
- Create: `supabase/migrations/023_question_hints.sql`

- [ ] **Step 1: Create the migration file with schema additions**

Write this to `supabase/migrations/023_question_hints.sql`:

```sql
-- 023_question_hints.sql
-- Adds the hint system:
--   1. questions.hints text[]    — ordered hint copy per question.
--   2. public.hint_usage         — per-attendee, per-hint reveal ledger.
--   3. request_hint() RPC        — single gated path to reveal hint text,
--                                  charges a +60s scoring penalty per row.
--   4. questions_public          — exposes hint_count (NOT text).
--   5. leaderboard view rewrite  — +60_000 ms * hints_used in total_ms,
--                                  plus a new hints_used column.
--   6. get_leaderboard() RPC     — re-declared to include hints_used.
--
-- Reset note: any workshop-reset operation that truncates
-- challenge_attempts / answer_attempts / question_progress MUST also
-- truncate hint_usage to keep state coherent across runs.

-- ---------------------------------------------------------------------
-- 1. questions.hints column
-- ---------------------------------------------------------------------
alter table public.questions
  add column if not exists hints text[] not null default '{}'::text[];

-- ---------------------------------------------------------------------
-- 2. hint_usage ledger
-- ---------------------------------------------------------------------
create table if not exists public.hint_usage (
  attendee_id uuid not null references public.attendees(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  hint_idx    int  not null check (hint_idx >= 0),
  used_at     timestamptz not null default now(),
  primary key (attendee_id, question_id, hint_idx)
);

create index if not exists hint_usage_attendee_idx
  on public.hint_usage(attendee_id);

alter table public.hint_usage enable row level security;

drop policy if exists "hint_usage select own" on public.hint_usage;
create policy "hint_usage select own"
  on public.hint_usage for select
  using (attendee_id in (
    select id from public.attendees where auth_uid = auth.uid()
  ));
-- No INSERT/UPDATE/DELETE policies — only request_hint() may write.
```

- [ ] **Step 2: Apply migration to Supabase**

Run via Supabase MCP:

```
mcp__supabase__apply_migration(
  project_id="cttpfrwphcqpjwmwothb",
  name="023_question_hints_schema",
  query="<contents of the file written above>"
)
```

Expected: success, no error.

- [ ] **Step 3: Verify schema landed**

Run via Supabase MCP `execute_sql`:

```sql
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='questions' and column_name='hints';

select column_name from information_schema.columns
where table_schema='public' and table_name='hint_usage'
order by ordinal_position;

select policyname from pg_policies
where schemaname='public' and tablename='hint_usage';
```

Expected:
- `hints` column exists, type `ARRAY`.
- Columns on `hint_usage`: `attendee_id, question_id, hint_idx, used_at`.
- One policy named `hint_usage select own`.

- [ ] **Step 4: Commit schema portion**

The full migration file will be added in one commit after Task 2 + 3 append to it. Skip commit here — continue to Task 2.

---

## Task 2: Migration 023 — `request_hint` RPC

**Files:**
- Modify: `supabase/migrations/023_question_hints.sql` (append)

- [ ] **Step 1: Append the RPC to the migration file**

Append this to `supabase/migrations/023_question_hints.sql`:

```sql
-- ---------------------------------------------------------------------
-- 3. request_hint(p_question_id, p_hint_idx) — single gated path to
--    reveal a hint. Idempotent on the PK. Records penalty by inserting
--    into hint_usage; leaderboard view multiplies the count by 60_000.
-- ---------------------------------------------------------------------
create or replace function public.request_hint(
  p_question_id uuid,
  p_hint_idx    int
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attendee_id    uuid;
  v_challenge_id   int;
  v_hints          text[];
  v_started_at     timestamptz;
  v_opened_at      timestamptz;
  v_hint_text      text;
  v_inserted       int;
begin
  -- 1. Attendee
  select id into v_attendee_id
  from public.attendees where auth_uid = auth.uid();
  if v_attendee_id is null then
    return json_build_object('ok', false, 'error', 'not_registered');
  end if;

  -- 2. Question + hints
  select hints, challenge_id into v_hints, v_challenge_id
  from public.questions where id = p_question_id;
  if v_hints is null then
    return json_build_object('ok', false, 'error', 'question_not_found');
  end if;

  -- 3. Hint index in range
  if p_hint_idx < 0 or p_hint_idx >= cardinality(v_hints) then
    return json_build_object('ok', false, 'error', 'hint_out_of_range');
  end if;

  -- 4. Already solved? No penalty for trolling solved questions.
  if exists (
    select 1 from public.question_progress
    where attendee_id = v_attendee_id and question_id = p_question_id
  ) then
    return json_build_object('ok', false, 'error', 'already_solved');
  end if;

  -- 5. Challenge begun?
  select started_at into v_started_at
  from public.challenge_attempts
  where attendee_id = v_attendee_id and challenge_id = v_challenge_id;
  if v_started_at is null then
    return json_build_object('ok', false, 'error', 'challenge_not_begun');
  end if;

  -- 6. Global gate state
  select opened_at into v_opened_at from public.workshop_config where id = 1;
  if v_opened_at is null then
    return json_build_object('ok', false, 'error', 'challenge_locked');
  end if;
  if now() > v_opened_at + interval '35 minutes' then
    return json_build_object('ok', false, 'error', 'time_expired');
  end if;

  -- Postgres arrays are 1-indexed; client passes 0-indexed.
  v_hint_text := v_hints[p_hint_idx + 1];

  -- 7. Idempotent insert. v_inserted=1 on first write, null on conflict.
  with ins as (
    insert into public.hint_usage (attendee_id, question_id, hint_idx)
    values (v_attendee_id, p_question_id, p_hint_idx)
    on conflict (attendee_id, question_id, hint_idx) do nothing
    returning 1
  )
  select count(*) into v_inserted from ins;

  return json_build_object(
    'ok', true,
    'hint', v_hint_text,
    'hint_idx', p_hint_idx,
    'already_charged', v_inserted = 0,
    'penalty_ms', 60000
  );
end;
$$;

revoke execute on function public.request_hint(uuid, int) from public;
revoke execute on function public.request_hint(uuid, int) from anon;
grant  execute on function public.request_hint(uuid, int) to authenticated;
```

- [ ] **Step 2: Apply the appended RPC**

Run `mcp__supabase__apply_migration` with `name="023_question_hints_rpc"` and the new RPC SQL only (not the whole file). Migrations are append-friendly per project pattern.

Expected: success.

- [ ] **Step 3: Verify the RPC compiles and grants are correct**

```sql
select proname, prosecdef
from pg_proc where proname = 'request_hint';

select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema='public' and routine_name='request_hint';
```

Expected:
- `request_hint` exists, `prosecdef = true`.
- Only `authenticated` has `EXECUTE`. `anon` and `public` should NOT appear.

---

## Task 3: Migration 023 — view rewrites + `get_leaderboard` RPC

**Files:**
- Modify: `supabase/migrations/023_question_hints.sql` (append)

- [ ] **Step 1: Append view + RPC rewrites**

Append to `supabase/migrations/023_question_hints.sql`:

```sql
-- ---------------------------------------------------------------------
-- 4. questions_public — expose hint_count (NOT the text).
-- ---------------------------------------------------------------------
create or replace view public.questions_public as
  select id, challenge_id, order_idx, prompt,
         cardinality(hints) as hint_count
  from public.questions;

grant select on public.questions_public to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. leaderboard view — add +60_000 ms * hints_used; expose hints_used.
-- ---------------------------------------------------------------------
create or replace view public.leaderboard as
with q as (
  select attendee_id, count(*)::int as n
  from public.question_progress group by attendee_id
),
h as (
  select attendee_id, count(*)::int as n
  from public.hint_usage group by attendee_id
),
gate as (
  select opened_at from public.workshop_config where id = 1
)
select
  a.id  as attendee_id,
  a.name,
  coalesce(q.n, 0)                            as questions_complete,
  coalesce(h.n, 0)                            as hints_used,
  case
    when c1.completed_at is not null and c1.started_at is not null
    then (extract(epoch from (c1.completed_at - c1.started_at)) * 1000)::bigint
  end                                         as c1_elapsed_ms,
  case
    when c2.completed_at is not null and c2.started_at is not null
    then (extract(epoch from (c2.completed_at - c2.started_at)) * 1000)::bigint
  end                                         as c2_elapsed_ms,
  case
    -- Both completed → personal wallclock + wrong + hint penalties.
    when c1.completed_at is not null and c2.completed_at is not null
     and c1.started_at  is not null
    then (extract(epoch from (greatest(c1.completed_at, c2.completed_at) - c1.started_at)) * 1000)::bigint
         + (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0)) * 15000
         + coalesce(h.n, 0) * 60000
    -- Expired (35-min global gate closed) without both completed → cap.
    when (select opened_at from gate) is not null
     and now() > (select opened_at from gate) + interval '35 minutes'
    then (extract(epoch from interval '35 minutes') * 1000)::bigint
         + (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0)) * 15000
         + coalesce(h.n, 0) * 60000
    else null
  end                                         as total_ms,
  (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0))::int as wrong_count
from public.attendees a
left join public.challenge_attempts c1 on c1.attendee_id = a.id and c1.challenge_id = 1
left join public.challenge_attempts c2 on c2.attendee_id = a.id and c2.challenge_id = 2
left join q on q.attendee_id = a.id
left join h on h.attendee_id = a.id;

grant select on public.leaderboard to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. get_leaderboard() RPC — re-declared to include hints_used column.
-- ---------------------------------------------------------------------
drop function if exists public.get_leaderboard();

create or replace function public.get_leaderboard()
returns table(
  attendee_id        uuid,
  name               text,
  questions_complete int,
  hints_used         int,
  c1_elapsed_ms      bigint,
  c2_elapsed_ms      bigint,
  total_ms           bigint,
  wrong_count        int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    attendee_id,
    name,
    questions_complete,
    hints_used,
    c1_elapsed_ms,
    c2_elapsed_ms,
    total_ms,
    wrong_count
  from public.leaderboard
  order by
    questions_complete desc,
    total_ms           asc nulls last,
    wrong_count        asc;
$$;

grant execute on function public.get_leaderboard() to anon, authenticated;
```

- [ ] **Step 2: Apply the view/RPC rewrites**

Run `mcp__supabase__apply_migration` with `name="023_question_hints_views"` and the new view + RPC SQL.

Expected: success. Note: `drop function get_leaderboard()` is required because the return-table signature is changing.

- [ ] **Step 3: Verify the leaderboard view exposes hints_used**

```sql
select hints_used from public.leaderboard limit 1;
-- Returns 0 for any pre-existing attendee row (no hint_usage yet).

select * from public.get_leaderboard() limit 1;
-- Returns a row with the new hints_used column.
```

Expected: queries succeed and `hints_used` is `0` (or null if no attendees yet).

- [ ] **Step 4: Verify questions_public hint_count**

```sql
select id, order_idx, hint_count
from public.questions_public order by challenge_id, order_idx;
```

Expected: 10 rows, `hint_count = 0` for all (we haven't seeded yet).

- [ ] **Step 5: Commit migration 023**

```bash
git add supabase/migrations/023_question_hints.sql
git commit -m "Add question hints schema, RPC, and leaderboard scoring"
```

---

## Task 4: Migration 024 — seed placeholder hints

**Files:**
- Create: `supabase/migrations/024_seed_question_hints.sql`

- [ ] **Step 1: Write the seed migration**

Create `supabase/migrations/024_seed_question_hints.sql`:

```sql
-- 024_seed_question_hints.sql
-- Seed placeholder hint copy so the end-to-end flow works in dev.
-- Q1–Q4 of each challenge get one placeholder hint; Q5 gets three.
-- Real copy is written in a follow-up migration before the workshop.

update public.questions
set hints = ARRAY['Hint 01 — TBD']
where order_idx in (1, 2, 3, 4);

update public.questions
set hints = ARRAY[
  'Hint 01 — TBD',
  'Hint 02 — TBD',
  'Hint 03 — TBD'
]
where order_idx = 5;
```

- [ ] **Step 2: Apply via Supabase MCP**

```
mcp__supabase__apply_migration(
  project_id="cttpfrwphcqpjwmwothb",
  name="024_seed_question_hints",
  query="<contents of the file above>"
)
```

Expected: success.

- [ ] **Step 3: Verify hint_count distribution**

```sql
select order_idx, challenge_id, cardinality(hints) as hc
from public.questions
order by challenge_id, order_idx;
```

Expected:
- (C1, Q1) hc=1, (C1, Q2) hc=1, (C1, Q3) hc=1, (C1, Q4) hc=1, (C1, Q5) hc=3
- (C2, Q1) hc=1, (C2, Q2) hc=1, (C2, Q3) hc=1, (C2, Q4) hc=1, (C2, Q5) hc=3

- [ ] **Step 4: Commit migration 024**

```bash
git add supabase/migrations/024_seed_question_hints.sql
git commit -m "Seed placeholder hint copy for all 10 questions"
```

---

## Task 5: `useHints` hook

**Files:**
- Create: `client/src/hooks/useHints.ts`

- [ ] **Step 1: Write the hook**

Create `client/src/hooks/useHints.ts`:

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useHints.ts
git commit -m "Add useHints hook for question hint state"
```

---

## Task 6: `HintBulbButton` component

**Files:**
- Create: `client/src/components/HintBulbButton.tsx`

- [ ] **Step 1: Write the component**

Create `client/src/components/HintBulbButton.tsx`:

```tsx
/**
 * Small yellow lightbulb pinned to the top-right of an unsolved
 * QuestionCard. Inline SVG (no react-icons dep). Pulses softly while
 * hints remain. Hidden by the parent when isSolved || locked || allUsed.
 */

import { motion } from "framer-motion";

interface Props {
  onClick: () => void;
  /** True when the user has paid for at least one hint on this question
   *  but more remain. Subtly de-emphasizes the pulse. */
  partiallyUsed?: boolean;
}

export default function HintBulbButton({ onClick, partiallyUsed }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Reveal a hint"
      style={{
        position: "absolute",
        top: "0.85rem",
        right: "1rem",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        zIndex: 2,
        outline: "none",
      }}
    >
      <motion.svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill="oklch(0.82 0.18 85)"
        aria-hidden="true"
        animate={
          partiallyUsed
            ? { opacity: 0.7 }
            : {
                opacity: [0.65, 1, 0.65],
                filter: [
                  "drop-shadow(0 0 4px oklch(0.65 0.2 85 / 0.4))",
                  "drop-shadow(0 0 10px oklch(0.78 0.22 85 / 0.7))",
                  "drop-shadow(0 0 4px oklch(0.65 0.2 85 / 0.4))",
                ],
              }
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* FaLightbulb-style glyph (solid bulb with filament arc). */}
        <path d="M9 21v-1h6v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zm-2-7.5C5.5 12 5 10.5 5 9a7 7 0 0 1 14 0c0 1.5-.5 3-2 4.5-1 1-1.5 2-1.5 3.5v.5h-5V17c0-1.5-.5-2.5-1.5-3.5z" />
      </motion.svg>
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/HintBulbButton.tsx
git commit -m "Add HintBulbButton inline-SVG lightbulb"
```

---

## Task 7: `HintModal` component

**Files:**
- Create: `client/src/components/HintModal.tsx`

- [ ] **Step 1: Write the modal**

Create `client/src/components/HintModal.tsx`:

```tsx
/**
 * Full-screen overlay (blurred backdrop) that confirms a hint reveal
 * (+60s penalty) and then displays the hint text. Sized to sit under
 * the navbar and to the right of the sidebar — same scaffolding as
 * the Time's-Up overlay in ChallengePage.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BorderGlow from "@/components/BorderGlow";
import type { HintError, HintReveal } from "@/hooks/useHints";

interface Props {
  open: boolean;
  /** "01" / "02" / etc. for the badge. */
  questionLabel: string;
  /** Total hints available for this question. */
  hintCount: number;
  /** Hints the user has already paid for, with text loaded post-open. */
  revealed: HintReveal[];
  /** Fires the request_hint RPC for a given idx and resolves with the
   *  text. Caller updates revealed via the parent's useHints hook. */
  onRequestReveal: (idx: number) => Promise<{
    ok: boolean;
    hint?: string;
    error?: HintError;
  }>;
  onClose: () => void;
}

const YELLOW_PALETTE = ["#fde68a", "#facc15", "#f59e0b"];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function friendlyError(e: HintError | undefined): string {
  switch (e) {
    case "already_solved":
      return "You've already solved this question.";
    case "time_expired":
      return "Workshop window closed.";
    case "challenge_not_begun":
      return "Challenge hasn't started yet.";
    case "challenge_locked":
      return "The challenge is locked.";
    default:
      return "Couldn't reveal hint. Try again.";
  }
}

export default function HintModal({
  open,
  questionLabel,
  hintCount,
  revealed,
  onRequestReveal,
  onClose,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<HintError | null>(null);

  // Auto-replay reveals for hints the user already paid for — when the
  // modal opens with paidIdxs but empty revealed text. Each call returns
  // already_charged: true, so no new penalty is recorded.
  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const revealedCount = revealed.length;
  const showConfirm = revealedCount === 0;
  const showNextReveal = !showConfirm && revealedCount < hintCount;
  const nextIdx = revealedCount;

  async function handleReveal() {
    setError(null);
    setSubmitting(true);
    const result = await onRequestReveal(nextIdx);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "rpc_failed");
    }
  }

  const sortedRevealed = useMemo(
    () => [...revealed].sort((a, b) => a.idx - b.idx),
    [revealed],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="hint-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            top: "var(--navbar-height, 70px)",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: "var(--sidebar-width, 200px)",
            background: "rgba(10,10,15,0.65)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(520px, 90vw)" }}
          >
            <BorderGlow
              backgroundColor="#0e0e16"
              borderRadius={8}
              glowColor="50 90 70"
              glowRadius={36}
              glowIntensity={0.95}
              edgeSensitivity={20}
              coneSpread={28}
              colors={YELLOW_PALETTE}
              animated
            >
              <div
                style={{
                  padding: "1.75rem 1.85rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    className="section-label"
                    style={{ color: "oklch(0.82 0.18 85)" }}
                  >
                    Question {questionLabel}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "rgba(200,200,220,0.55)",
                    }}
                  >
                    Hint {revealedCount} / {hintCount}
                  </span>
                </div>

                {showConfirm ? (
                  <>
                    <h3
                      style={{
                        fontFamily:
                          "'Nostalgic Whispers', 'Barlow Condensed', serif",
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        color: "rgba(232,232,240,0.97)",
                        margin: 0,
                      }}
                    >
                      Reveal a{" "}
                      <span
                        style={{
                          color: "oklch(0.82 0.18 85)",
                          textShadow: "0 0 24px oklch(0.6 0.2 85 / 0.45)",
                        }}
                      >
                        Hint
                      </span>
                      ?
                    </h3>
                    <p
                      style={{
                        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                        fontSize: "0.875rem",
                        lineHeight: 1.6,
                        color: "rgba(210,210,225,0.85)",
                        margin: 0,
                      }}
                    >
                      +60 seconds will be added to your total time.
                    </p>
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                    }}
                  >
                    {sortedRevealed.map((r) => (
                      <div
                        key={r.idx}
                        style={{
                          padding: "0.85rem 1rem",
                          border: "1px solid oklch(0.55 0.18 85 / 0.35)",
                          borderRadius: "4px",
                          background: "oklch(0.18 0.06 85 / 0.18)",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            letterSpacing: "0.22em",
                            textTransform: "uppercase",
                            color: "oklch(0.82 0.18 85)",
                            marginBottom: "0.4rem",
                          }}
                        >
                          Hint {pad(r.idx + 1)}
                        </div>
                        <div
                          style={{
                            fontFamily:
                              "'IBM Plex Mono', ui-monospace, monospace",
                            fontSize: "0.875rem",
                            lineHeight: 1.6,
                            color: "rgba(232,232,240,0.92)",
                          }}
                        >
                          {r.text}
                        </div>
                      </div>
                    ))}
                    {revealedCount >= hintCount && (
                      <div
                        style={{
                          fontFamily:
                            "'IBM Plex Mono', ui-monospace, monospace",
                          fontSize: "0.78rem",
                          color: "rgba(200,200,220,0.55)",
                          textAlign: "center",
                          marginTop: "0.25rem",
                        }}
                      >
                        No more hints.
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      fontSize: "0.78rem",
                      color: "oklch(0.7 0.2 25)",
                    }}
                  >
                    {friendlyError(error)}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    justifyContent: "flex-end",
                    marginTop: "0.25rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={onClose}
                    style={cancelButtonStyle}
                  >
                    {showConfirm ? "Cancel" : "Close"}
                  </button>
                  {(showConfirm || showNextReveal) && (
                    <button
                      type="button"
                      onClick={handleReveal}
                      disabled={submitting}
                      style={{
                        ...revealButtonStyle,
                        opacity: submitting ? 0.6 : 1,
                        cursor: submitting ? "wait" : "pointer",
                      }}
                    >
                      {submitting
                        ? "…"
                        : showConfirm
                          ? "Reveal +60s"
                          : `Reveal Hint ${pad(nextIdx + 1)} +60s`}
                    </button>
                  )}
                </div>

                {!showConfirm && (
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      fontSize: "0.72rem",
                      color: "rgba(200,200,220,0.55)",
                      textAlign: "center",
                    }}
                  >
                    +60s per hint baked into your total time.
                  </div>
                )}
              </div>
            </BorderGlow>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const cancelButtonStyle: React.CSSProperties = {
  padding: "0.55rem 1rem",
  background: "transparent",
  color: "rgba(200,200,220,0.85)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "4px",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.78rem",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const revealButtonStyle: React.CSSProperties = {
  padding: "0.55rem 1.1rem",
  background:
    "linear-gradient(135deg, oklch(0.78 0.18 85) 0%, oklch(0.62 0.18 65) 100%)",
  color: "#1a140a",
  border: "none",
  borderRadius: "4px",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.8rem",
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/HintModal.tsx
git commit -m "Add HintModal overlay with confirm + reveal states"
```

---

## Task 8: Wire `QuestionCard` to the bulb + modal

**Files:**
- Modify: `client/src/components/QuestionCard.tsx`

- [ ] **Step 1: Add hint props and modal wiring**

Replace `QuestionCard.tsx` props interface and add hint state. The full new content of the file:

```tsx
/**
 * A single CTF question card. Locked to green once correctly answered;
 * flashes red on a wrong attempt. Submit goes through the submit_answer
 * RPC via the onSubmit prop. Renders a yellow lightbulb in the top-right
 * when hints are available and the question is unsolved + unlocked;
 * clicking it opens HintModal.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BorderGlow from "@/components/BorderGlow";
import HintBulbButton from "@/components/HintBulbButton";
import HintModal from "@/components/HintModal";
import type { HintError, HintReveal } from "@/hooks/useHints";

interface Props {
  orderIdx: number;
  questionId: string;
  prompt: string;
  isSolved: boolean;
  solvedAnswer?: string;
  locked?: boolean;
  /** Total hints configured for this question (0 disables the bulb). */
  hintCount?: number;
  /** Indices the user has already paid for. */
  paidHintIdxs?: Set<number>;
  /** Hints with text known to the client (after the modal opened). */
  revealedHints?: HintReveal[];
  /** Wraps useHints.requestHint, scoped to this question. */
  onRequestHint?: (idx: number) => Promise<{
    ok: boolean;
    hint?: string;
    error?: HintError;
  }>;
  onSubmit: (
    questionId: string,
    submission: string,
  ) => Promise<{ ok: boolean; correct?: boolean; error?: string }>;
}

type CardStatus = "idle" | "submitting" | "wrong" | "error";

const FLASH_DURATION_MS = 700;

export default function QuestionCard({
  orderIdx,
  questionId,
  prompt,
  isSolved,
  solvedAnswer,
  locked = false,
  hintCount = 0,
  paidHintIdxs,
  revealedHints,
  onRequestHint,
  onSubmit,
}: Props) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<CardStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [solvedValue, setSolvedValue] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    if (status !== "wrong") return;
    const id = window.setTimeout(() => setStatus("idle"), FLASH_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [status]);

  // When the modal opens with paid-but-unrevealed hints, replay
  // request_hint for each so the text loads into state. Each call returns
  // already_charged: true, so the penalty is NOT re-applied.
  useEffect(() => {
    if (!hintOpen || !onRequestHint) return;
    if (!paidHintIdxs || paidHintIdxs.size === 0) return;
    const haveTextFor = new Set((revealedHints ?? []).map((r) => r.idx));
    const missing = [...paidHintIdxs].filter((i) => !haveTextFor.has(i));
    missing.forEach((idx) => {
      onRequestHint(idx);
    });
  }, [hintOpen, paidHintIdxs, revealedHints, onRequestHint]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!value.trim() || status === "submitting") return;
    setErrorMsg(null);
    setStatus("submitting");
    const result = await onSubmit(questionId, value);
    if (!result.ok) {
      setStatus("error");
      setErrorMsg(friendlyError(result.error ?? "submit_failed"));
      return;
    }
    if (result.correct) {
      setSolvedValue(value);
      setStatus("idle");
      setValue("");
    } else {
      setStatus("wrong");
      setValue("");
    }
  }

  if (isSolved) {
    const answerToDisplay = solvedValue ?? solvedAnswer ?? "✓ Solved";
    return (
      <BorderGlow
        className="h-full"
        backgroundColor="#0e0e16"
        borderRadius={6}
        glowColor="145 75 70"
        glowRadius={28}
        glowIntensity={0.85}
        edgeSensitivity={28}
        coneSpread={22}
        colors={["#86efac", "#4ade80", "#22c55e"]}
      >
        <motion.div
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.35 }}
          style={{
            padding: "1.25rem 1.35rem",
            background: "transparent",
            height: "100%",
            display: "flex",
            flexDirection: "column",
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
                color: "oklch(0.78 0.25 145)",
              }}
            >
              COMPLETE
            </span>
          </div>
          <p style={promptStyle}>{prompt}</p>
          <motion.div
            aria-label="Your correct answer"
            animate={{
              opacity: [0.72, 1, 0.72],
              textShadow: [
                "0 0 12px oklch(0.6 0.25 145 / 0.35)",
                "0 0 32px oklch(0.65 0.28 145 / 0.7)",
                "0 0 12px oklch(0.6 0.25 145 / 0.35)",
              ],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              marginTop: "auto",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid oklch(0.55 0.22 145 / 0.5)",
              borderRadius: "4px",
              padding: "0.65rem 0.85rem",
              color: "oklch(0.88 0.2 145)",
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: "0.85rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              userSelect: "text",
            }}
          >
            {answerToDisplay}
          </motion.div>
        </motion.div>
      </BorderGlow>
    );
  }

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

  const flashWrong = status === "wrong";
  const flashBg = flashWrong ? "oklch(0.3 0.12 25 / 0.3)" : "transparent";
  const allUsed = hintCount > 0 && (paidHintIdxs?.size ?? 0) >= hintCount;
  const bulbVisible = hintCount > 0 && !allUsed && !!onRequestHint;
  const partiallyUsed = (paidHintIdxs?.size ?? 0) > 0;

  return (
    <BorderGlow
      className="h-full"
      backgroundColor="#0e0e16"
      borderRadius={6}
      glowColor="290 80 70"
      glowRadius={28}
      glowIntensity={0.85}
      edgeSensitivity={28}
      coneSpread={22}
      colors={["#c084fc", "#a855f7", "#7c3aed"]}
    >
      <motion.form
        onSubmit={handleSubmit}
        animate={flashWrong ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "relative",
          padding: "1.25rem 1.35rem",
          background: flashBg,
          transition: "background 0.3s",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {bulbVisible && (
          <HintBulbButton
            onClick={() => setHintOpen(true)}
            partiallyUsed={partiallyUsed}
          />
        )}
        <div style={cardHeaderStyle}>
          <span className="section-label">Question {pad(orderIdx)}</span>
        </div>
        <p style={promptStyle}>{prompt}</p>

        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            alignItems: "stretch",
            marginTop: "auto",
          }}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter flag (comma + space for multiple)"
            disabled={status === "submitting"}
            spellCheck={false}
            autoComplete="off"
            style={{
              flex: 1,
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "4px",
              padding: "0.65rem 0.85rem",
              color: "rgba(232,232,240,0.97)",
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={status === "submitting" || !value.trim()}
            style={{
              padding: "0.65rem 1.1rem",
              background:
                "linear-gradient(135deg, oklch(0.52 0.28 290) 0%, oklch(0.42 0.25 295) 100%)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: status === "submitting" ? "wait" : "pointer",
              opacity: status === "submitting" || !value.trim() ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {status === "submitting" ? "…" : "Submit"}
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              marginTop: "0.75rem",
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: "0.75rem",
              color: "oklch(0.7 0.2 25)",
            }}
          >
            {errorMsg}
          </div>
        )}
      </motion.form>

      {onRequestHint && (
        <HintModal
          open={hintOpen}
          questionLabel={pad(orderIdx)}
          hintCount={hintCount}
          revealed={revealedHints ?? []}
          onRequestReveal={onRequestHint}
          onClose={() => setHintOpen(false)}
        />
      )}
    </BorderGlow>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function friendlyError(code: string): string {
  switch (code) {
    case "time_expired":
      return "Time's up — answer not submitted.";
    case "challenge_not_begun":
      return "Couldn't submit. Refresh and try again.";
    case "already_answered":
      return "Already solved on another tab.";
    case "not_registered":
      return "Registration expired. Refresh to re-register.";
    default:
      return "Submission failed. Try again.";
  }
}

const cardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "0.6rem",
} as const;

const promptStyle = {
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontSize: "0.875rem",
  fontWeight: 300,
  lineHeight: 1.6,
  color: "rgba(232,232,240,0.92)",
  marginBottom: "1rem",
} as const;
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/QuestionCard.tsx
git commit -m "QuestionCard: hint bulb + modal wiring"
```

---

## Task 9: Wire `ChallengePage` to `useHints` + completion summary

**Files:**
- Modify: `client/src/components/ChallengePage.tsx`
- Modify: `client/src/hooks/useChallenge.ts` (extend `ChallengeQuestion` with `hint_count`)

- [ ] **Step 1: Extend `useChallenge` to surface `hint_count`**

In `client/src/hooks/useChallenge.ts`, change the `ChallengeQuestion` interface and `fetchQuestions` to include `hint_count`:

```ts
export interface ChallengeQuestion {
  id: string;
  order_idx: number;
  prompt: string;
  hint_count: number;
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
```

- [ ] **Step 2: Wire useHints in ChallengePage and pass to QuestionCards**

In `client/src/components/ChallengePage.tsx`:

1. Add the import near other hook imports:

```ts
import { useHints, type HintReveal } from "@/hooks/useHints";
```

2. Below the existing `useChallenge` destructure, add:

```ts
const hints = useHints({ attendeeId: attendee.id });
```

3. Add a small helper inside the component to build per-question reveal arrays:

```ts
function buildRevealed(questionId: string): HintReveal[] {
  const state = hints.getState(questionId);
  return [...state.revealed.entries()]
    .map(([idx, text]) => ({ idx, text }))
    .sort((a, b) => a.idx - b.idx);
}

function makeOnRequestHint(questionId: string) {
  return (idx: number) => hints.requestHint(questionId, idx);
}
```

4. Update every `<QuestionCard … />` instantiation to pass the new props. For convenience, use a `q` reference in each render (the [0..3] indexed cards reference `questions[i]`, the centered Q5 references `questions[4]`, the fallback maps `questions`):

```tsx
<QuestionCard
  orderIdx={q.order_idx}
  questionId={q.id}
  prompt={q.prompt}
  isSolved={progress.has(q.id)}
  solvedAnswer={solvedAnswers.get(q.id)}
  locked={isLocked}
  hintCount={q.hint_count}
  paidHintIdxs={hints.getState(q.id).paidIdxs}
  revealedHints={buildRevealed(q.id)}
  onRequestHint={makeOnRequestHint(q.id)}
  onSubmit={submit}
/>
```

Three render sites to update: (a) the `[0,1,2,3].map(i => …)` block (Q1–Q4 in the grid), (b) the centered Q5 block, (c) the fallback `questions.map((q, i) => …)` block. The two render sites in (a)+(b) reference `questions[i]`/`questions[4]` directly; pass those values where the snippet uses `q`.

5. Compute the per-challenge hint count near the top of the component body (alongside `wrongCount` and `beganAt`, before `finalMs`):

```ts
const myHintCount = questions.reduce(
  (sum, q) => sum + hints.getState(q.id).paidIdxs.size,
  0,
);
```

6. Update the existing `finalMs` calculation to include the hint penalty:

```ts
const finalMs =
  beganAt && completedAt
    ? new Date(completedAt).getTime() -
      new Date(beganAt).getTime() +
      wrongCount * PENALTY_PER_WRONG_MS +
      myHintCount * 60_000
    : 0;
```

7. Update the existing `<p>` inside the celebration reveal card (currently rendering wrong-guess summary + `myRank`) to include the hint line:

```tsx
<p
  style={{
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: "0.85rem",
    color: "rgba(200,200,220,0.8)",
    margin: "0 0 1.5rem",
  }}
>
  {wrongCount > 0
    ? `${wrongCount} wrong guess${wrongCount === 1 ? "" : "es"} (+${wrongCount * 15}s penalty baked in).`
    : "Clean run — no wrong guesses."}
  {myHintCount > 0 && (
    <>
      {" "}
      · Used {myHintCount} hint{myHintCount === 1 ? "" : "s"} (+{myHintCount}m penalty baked in).
    </>
  )}
  {myRank !== null && (
    <>
      {" "}· Current rank{" "}
      <strong style={{ color: "oklch(0.72 0.28 290)" }}>#{myRank}</strong>
    </>
  )}
</p>
```

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ChallengePage.tsx client/src/hooks/useChallenge.ts
git commit -m "ChallengePage: wire useHints + show hint penalty on completion card"
```

---

## Task 10: `useLeaderboard` adds `hints_used`

**Files:**
- Modify: `client/src/hooks/useLeaderboard.ts`

- [ ] **Step 1: Add the column to the row type**

In `client/src/hooks/useLeaderboard.ts`, update the interface:

```ts
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
```

(No other changes — `get_leaderboard` already returns the column; this lets TypeScript see it.)

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useLeaderboard.ts
git commit -m "useLeaderboard: expose hints_used column"
```

---

## Task 11: `Completed` page hint summary

**Files:**
- Modify: `client/src/pages/Completed.tsx`

- [ ] **Step 1: Append the hint line to the per-row breakdown text**

In `client/src/pages/Completed.tsx`, locate the existing `<div>` near line 306–321 that renders the wrong-count summary. Replace its body with the version that includes hint count:

```tsx
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
    ? `Workshop timer expired. ${myRow.questions_complete} of 10 questions solved${myRow.wrong_count > 0 ? ` · ${myRow.wrong_count} wrong (+${myRow.wrong_count * 15}s)` : ""}${myRow.hints_used > 0 ? ` · ${myRow.hints_used} hint${myRow.hints_used === 1 ? "" : "s"} (+${myRow.hints_used}m)` : ""}.`
    : (
      <>
        {myRow.wrong_count > 0
          ? `${myRow.wrong_count} wrong guess${myRow.wrong_count === 1 ? "" : "es"} · +${myRow.wrong_count * 15}s penalty baked into total`
          : "Clean run — no wrong guesses."}
        {myRow.hints_used > 0 && (
          <>
            {" "}· {myRow.hints_used} hint
            {myRow.hints_used === 1 ? "" : "s"} used (+{myRow.hints_used}m penalty baked in)
          </>
        )}
      </>
    )}
</div>
```

- [ ] **Step 2: Type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Completed.tsx
git commit -m "Completed: show hint count + penalty in performance card"
```

---

## Task 12: End-to-end manual verification

**Files:** none (manual)

- [ ] **Step 1: Reset workshop state via Supabase MCP**

```sql
truncate public.answer_attempts,
         public.question_progress,
         public.challenge_attempts,
         public.hint_usage;
update public.workshop_config
  set opened_at = now(), challenge_open = true
where id = 1;
```

- [ ] **Step 2: Start the dev server**

```bash
pnpm dev > /tmp/dev.log 2>&1 &
```

Wait until log shows `Local: http://localhost:3000/`.

- [ ] **Step 3: Walk the happy path**

Open `http://localhost:3000/` in a browser. Register an attendee, click Begin, navigate into Challenge 1.

Confirm visually:
1. Each unsolved question card shows a yellow lightbulb in the top-right corner.
2. Click the bulb on Q1. Modal opens with confirm state: "Reveal a Hint? +60 seconds will be added to your total time." with Cancel / Reveal +60s buttons. The page is blurred behind the modal.
3. Click Cancel. Modal closes cleanly, blur fades out.
4. Click the bulb again. Click Reveal +60s. Modal transitions to reveal state showing "Hint 01 — TBD" in a yellow-bordered card. "+60s per hint baked into your total time." footer is present.
5. Close the modal, open it again. Hint text loads back in without a new charge (DB only has one `hint_usage` row for that question/idx — confirm via SQL `select * from hint_usage;`).
6. Click the bulb on Q5. Repeat the confirm flow. After revealing hint 1, a "Reveal Hint 02 +60s" button is visible. Reveal it. Then reveal hint 03. After hint 03 revealed, button is replaced with "No more hints." Close.
7. The bulb on Q5 is now gone (allUsed).
8. Solve Q1 with the correct answer. Card flips to green-solved state, no bulb.
9. Force time-up: in Supabase, `update workshop_config set opened_at = now() - interval '36 minutes' where id = 1;`. After the next workshop-clock tick, unsolved cards enter the locked state — bulb is hidden.

- [ ] **Step 4: Verify scoring**

Solve enough questions on both challenges to complete. Inspect the completion card on Challenge 1 — it should show `· Used N hints (+Nm penalty baked in).` and the displayed time should include +60s per hint.

Navigate to `/completed`. The performance card should append `· N hints used (+Nm penalty baked in)` to the wrong-guess line.

Hit Supabase:

```sql
select hints_used, total_ms, wrong_count from public.leaderboard;
```

Expected: `hints_used` matches what was used, and `total_ms = wallclock + wrong*15000 + hints_used*60000`.

- [ ] **Step 5: Multi-tab concurrency smoke**

Open the challenge page in two tabs. In tab 1, click bulb on Q1 → Reveal +60s. In tab 2, click bulb on Q1 → Reveal +60s. Confirm via SQL that only ONE `hint_usage` row exists for `(attendee, Q1, idx=0)`.

```sql
select count(*) from public.hint_usage
where question_id = (
  select id from public.questions where challenge_id=1 and order_idx=1
);
```

Expected: `1`.

- [ ] **Step 6: Stop the dev server**

```bash
kill <pid-from-step-2>
```

- [ ] **Step 7: Final commit (none expected)**

No additional commits — verification only. If issues are found, capture them in TaskCreate and address before considering the feature complete.
