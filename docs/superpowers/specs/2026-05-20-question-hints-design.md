# Question Hints — Design Spec

**Status:** Approved (pending user review of this file)
**Date:** 2026-05-20
**Scope:** Workshop CTF challenges 1 & 2

## Problem

Both workshop challenges present five questions each on a single page. Some
attendees stall on a question and currently have no in-product nudge — they
either ask a presenter aloud or give up. We want a self-serve hint with a
real cost so the leaderboard still rewards users who solved unaided.

## Goals

- One hint available on Q1–Q4, three hints on Q5, on **both** challenges.
- Each hint reveal costs **+60 s** added to the user's `total_ms`.
- Hint usage is per-attendee, durable across refresh, idempotent across tabs.
- Hint text is server-gated — never shipped in the JS bundle.
- Per-challenge completion card and the final `/completed` page disclose how
  many hints the user spent.
- Workshop expiry hides hints alongside the rest of the submit affordance.

## Non-goals

- Configurable hint counts per question (hard-coded by seed-time array length).
- Leaderboard column for hints (kept off the podium to stay clean).
- Live hint counter in the challenge header.
- Revoking/refunding hints. Once revealed, the penalty stands.
- Admin tooling to add/edit hints at runtime — handled via migrations.

## Schema

New migration `023_question_hints.sql`:

```sql
-- 1. Hint copy lives next to the question.
alter table public.questions
  add column hints text[] not null default '{}'::text[];

-- 2. Per-attendee, per-hint ledger.
create table public.hint_usage (
  attendee_id uuid not null references public.attendees(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  hint_idx    int  not null check (hint_idx >= 0),
  used_at     timestamptz not null default now(),
  primary key (attendee_id, question_id, hint_idx)
);
create index hint_usage_attendee_idx on public.hint_usage(attendee_id);

alter table public.hint_usage enable row level security;

create policy "hint_usage select own"
  on public.hint_usage for select
  using (attendee_id in (
    select id from public.attendees where auth_uid = auth.uid()
  ));
-- No INSERT/UPDATE/DELETE policies — only request_hint() may write.

-- 3. Expose hint COUNT (not text) on the public view.
create or replace view public.questions_public as
  select id, challenge_id, order_idx, prompt,
         cardinality(hints) as hint_count
  from public.questions;
```

A separate seed migration (`024_seed_question_hints.sql`) populates each
question's `hints` array. Scaffold values for v1:

- Challenge 1 Q1–Q4: `hints = ARRAY['Hint 01 — TBD']`
- Challenge 1 Q5:    `hints = ARRAY['Hint 01 — TBD', 'Hint 02 — TBD', 'Hint 03 — TBD']`
- Challenge 2 Q1–Q4: `hints = ARRAY['Hint 01 — TBD']`
- Challenge 2 Q5:    `hints = ARRAY['Hint 01 — TBD', 'Hint 02 — TBD', 'Hint 03 — TBD']`

Real hint copy is filled in a follow-up migration before the workshop.

## RPC

```sql
create function public.request_hint(p_question_id uuid, p_hint_idx int)
  returns json
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$ ... $$;

revoke execute on function public.request_hint(uuid, int) from public, anon;
grant  execute on function public.request_hint(uuid, int) to authenticated;
```

Guard order (each returns `{ ok:false, error: <code> }` and writes nothing):

1. `not_registered` — `auth.uid()` does not resolve to an attendee.
2. `question_not_found` — bad UUID.
3. `hint_out_of_range` — `p_hint_idx < 0 OR p_hint_idx >= cardinality(hints)`.
4. `already_solved` — `question_progress` row exists for this user/question.
5. `challenge_not_begun` — no `challenge_attempts.started_at` for this user.
6. `challenge_locked` — `workshop_config.opened_at` is null.
7. `time_expired` — `now() > opened_at + interval '35 minutes'`.

On pass:

```sql
insert into public.hint_usage (attendee_id, question_id, hint_idx)
values (v_attendee_id, p_question_id, p_hint_idx)
on conflict (attendee_id, question_id, hint_idx) do nothing
returning 1 into v_inserted;
```

Return shape:

```json
{
  "ok": true,
  "hint": "<text>",
  "hint_idx": 0,
  "already_charged": false,   // true when ON CONFLICT path hit
  "penalty_ms": 60000
}
```

`already_charged: true` means the row pre-existed (multi-tab race, replay) —
the client must not display a "fresh +60s" affordance in that case.

## Scoring

The `leaderboard` view rewrite includes hint penalty:

```
hints_count := count(hint_usage) per attendee_id
total_ms (both complete) = (greatest(c1.completed_at, c2.completed_at)
                            - c1.started_at)*1000
                         + (c1.wrong_count + c2.wrong_count) * 15_000
                         + hints_count * 60_000
total_ms (expired)       = 35*60*1000
                         + (c1.wrong_count + c2.wrong_count) * 15_000
                         + hints_count * 60_000
total_ms (running)       = null
```

The view also exposes `hints_used int` as a column so clients can render the
count without a second query.

## Reset semantics

The existing workshop-reset SQL (admin op) must add `public.hint_usage` to
its truncation list:

```sql
truncate public.answer_attempts,
         public.question_progress,
         public.challenge_attempts,
         public.hint_usage;
update public.workshop_config
  set opened_at = now(), challenge_open = true
where id = 1;
```

A truncate of `attendees` is **not** added here — admins reset workshop
state, not the attendee roster.

## Client

### `useHints({ attendeeId })` hook

State: `Map<questionId, { revealed: Map<idx, text> }>`.

API:

```ts
function getHintState(questionId): {
  hintCount: number;            // from questions_public.hint_count
  revealedCount: number;
  allUsed: boolean;
  revealed: { idx: number; text: string }[];   // ordered by idx asc
};

function requestHint(questionId, idx): Promise<{
  ok: boolean;
  hint?: string;
  alreadyCharged?: boolean;
  error?: HintError;
}>;
```

The hook fetches `hint_usage` rows for the current attendee once on mount,
joins against the local `questionsById` map for hint text (which is empty
until the user reveals — we never store the full text client-side; revealed
text comes back from the RPC), and rehydrates the `revealed` map.

Important: on initial mount the `revealed` map starts empty even for hints
the user has already paid for. That's an acceptable trade — when they open
the modal on a question with prior usage, we fire a `request_hint` for each
already-paid `hint_idx`. Each call returns `already_charged: true` and the
text, with no new penalty. `useHints` populates `revealed` from the
responses. (Alternative: a new view `hint_usage_with_text` that joins through
RLS — rejected to keep the surface area small and the text path single-sourced
through `request_hint`.)

### `HintBulbButton`

- 18 px `FaLightbulb` from `react-icons/fa`.
- Absolute-positioned top-right inside the `QuestionCard` chrome.
- Color `oklch(0.82 0.18 85)` (matches the podium #1 yellow we already use).
- Visible **only** when: `!isSolved && !locked && !allUsed`.
- Subtle 2.4 s opacity pulse while hints remain.
- Click → opens `HintModal` for that question.

### `HintModal`

Identical scaffolding to the existing time-up overlay (full-screen `fixed`,
top offset = `--navbar-height`, left padding = `--sidebar-width`, blurred
backdrop). Centered card uses `BorderGlow` with the yellow palette
`["#fde68a", "#facc15", "#f59e0b"]` and `glowColor="40 90 75"`.

States:

1. **Confirm** — only for questions with **zero** revealed hints.
   - Heading: "Reveal a hint?"
   - Body: "+60 seconds will be added to your total time."
   - Buttons: `[CANCEL]` `[REVEAL +60s]`
   - Cancel → backdrop fades, modal closes.
   - Reveal → fires `requestHint(questionId, 0)`, transitions to Reveal state.

2. **Reveal** — at least one hint revealed.
   - Heading: question number badge ("QUESTION 05") + section label.
   - Stacked cards, one per revealed hint, in order: small "Hint 0X" label
     + the text. All revealed hints are visible (free re-read).
   - If `revealedCount < hintCount` (Q5 with hints left): a `[REVEAL NEXT HINT +60s]` button at the bottom; clicking fires `requestHint(questionId, revealedCount)` and appends the new hint card in place.
   - If `revealedCount === hintCount`: a muted footer line "No more hints."
   - Footer: "+60s per hint baked into your total time."
   - `[CLOSE]` button.

When `requestHint` returns `already_charged: true`, the UI shows the text
silently — no "+60s" toast, since no new penalty was applied.

### `ChallengePage` integration

- Pass `useHints` state into each `QuestionCard`.
- Completion card line, after the existing wrong-guess sentence:
  - 0 hints: no extra line.
  - ≥1 hint: `· Used N hint${N === 1 ? '' : 's'} (+${N}m penalty baked in)`
    where the minute count = `N` since `N × 60 s = N min`.

### `/completed` page

Adds a hint line to the final breakdown using the leaderboard view's
`hints_used` column:

> Hints used: **N** across both challenges (+N × 60 s penalty)

Position: below the existing wrong-guess line, same typography.

## Concurrency & failure modes

| Scenario | Behavior |
|---|---|
| User opens modal in two tabs, both click Reveal +60s for the same `hint_idx` | First insert wins, second receives `already_charged: true` and the same hint text. Single charge. |
| User refreshes mid-modal | Modal state lost, hint_usage rows durable. Re-opening the modal pulls them via the rehydrate path described above. |
| User solves the question via another tab before clicking Reveal | RPC returns `already_solved`. Modal shows inline error, no penalty. |
| 35-min window expires between bulb-click and Reveal confirm | RPC returns `time_expired`. Modal shows inline error, no penalty. Card transitions to locked state on next workshop tick. |
| User clicks Reveal repeatedly (double-click) | Second click hits the same `(attendee_id, question_id, hint_idx)` PK → `already_charged: true`. Single charge. |
| Admin resets the workshop while users are mid-challenge | `hint_usage` is truncated alongside other state. Users' local `revealed` maps go stale but `useHints` rehydrates on next page nav; the RPC is the source of truth. |

## Security

- Hint text never appears in any anon/authenticated SELECT path. The only
  way to read it is via `request_hint`, which records a ledger row.
- The view `questions_public` exposes `hint_count` only; users can see
  *how many* hints exist but not their content.
- `request_hint` is `security definer` with `search_path = public, pg_temp`
  and explicit `revoke execute … from public, anon`.
- RLS on `hint_usage` blocks cross-user reads.

## Open items (not blocking)

- Real hint copy for all 10 questions — written by Brandon in a follow-up
  migration before the workshop runs.
- Should the bulb glow brighter once the user has fallen behind some
  threshold (e.g. ≥1 wrong)? Deferred — no signal it helps engagement, and
  adds another state to the icon.
