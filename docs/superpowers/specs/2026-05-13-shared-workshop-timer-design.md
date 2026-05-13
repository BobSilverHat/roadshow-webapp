# Shared 35-Minute Workshop Timer — Design Spec

**Date:** 2026-05-13
**Status:** Approved for implementation planning
**Owner:** Brandon

## Summary

Replace the existing per-challenge timer model with a single shared 35-minute timer that spans both Challenge 1 and Challenge 2. The user clicks "Begin Workshop" once on Challenge 1; both attempts start simultaneously. When the timer hits zero, submissions are locked server-side and the user is auto-navigated to the Completed page. Final standings are settled deterministically: ranks 1/2/3 get podium screens (Champion / Runner-up / Third Place), ranks 4+ get a unified completion screen, and partial finishers see "Time's Up" framing distinguishing them from natural finishers.

## Goals

1. One shared 35-minute window covering both challenges, started by a single Begin click.
2. Direct navigation to `/challenge/2` before starting the workshop redirects to `/challenge/1`.
3. Server-side hard lock at expiry: submissions past the deadline are rejected.
4. Client-side soft lock at expiry: inputs disabled, brief "Time's Up" overlay, auto-navigate to `/completed`.
5. Leaderboard ranks every attendee (including partial finishers) deterministically once the timer expires.
6. Completed page differentiates the #1 finisher (Champion) from podium finishers (2nd/3rd) and from the long tail (4+), and distinguishes natural finishers from timed-out attendees.

## Non-Goals

- Persisting in-progress sessions across redeploys with mid-session migration safety. We will not deploy during an active workshop.
- Multi-tab synchronization. Server enforcement is the source of truth.
- Pause/resume semantics. The 35 minutes is wall-clock.
- Per-question time tracking. Only per-challenge completion timestamps are recorded.
- Monotonic clock protection against user-induced wall-clock changes. Server is authoritative; client display drift is acceptable.

## Architecture

### Data model

`challenge_attempts` keeps its existing schema: `(attendee_id, challenge_id, started_at, completed_at, wrong_count)` with a uniqueness constraint on `(attendee_id, challenge_id)`. The **semantic change** is that both rows for a given attendee will share the same `started_at` value, set atomically by the new `begin_workshop()` RPC. The 35-minute workshop window is computed as `started_at + interval '35 minutes'`.

No new tables. No column additions.

### Constants

The 35-minute duration is hardcoded in three places:

- `supabase/migrations/016_shared_workshop_timer.sql` — `interval '35 minutes'` in `begin_workshop`, `submit_answer`, and the `leaderboard` view (2,100,000 ms numeric form in the view for arithmetic).
- `shared/const.ts` — `WORKSHOP_DURATION_MS = 35 * 60 * 1000`, imported by client code.

A grep for `35 minutes` / `2100000` / `WORKSHOP_DURATION_MS` finds all sites. No DB config table.

## Database changes (single migration: `016_shared_workshop_timer.sql`)

### New RPC: `begin_workshop()`

```sql
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
  select id into v_attendee_id from public.attendees where auth_uid = auth.uid();
  if v_attendee_id is null then
    return json_build_object('ok', false, 'error', 'not_registered');
  end if;

  -- Atomic: both rows get the same started_at, preserving any pre-existing value.
  insert into public.challenge_attempts (attendee_id, challenge_id, started_at)
  values (v_attendee_id, 1, now()), (v_attendee_id, 2, now())
  on conflict (attendee_id, challenge_id) do update
    set started_at = coalesce(public.challenge_attempts.started_at, excluded.started_at);

  -- Read back the canonical started_at (challenge 1's, but both are equal post-upsert).
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

revoke execute on function public.begin_workshop() from public, anon;
grant  execute on function public.begin_workshop() to authenticated;
```

Idempotent: re-calling `begin_workshop()` preserves the original `started_at` because of the `coalesce` in the conflict clause.

### Update `submit_answer` — reject past expiry

Add this guard immediately after fetching `v_challenge_started` and before the normalize/hash block:

```sql
if v_challenge_started is null then
  return json_build_object('ok', false, 'error', 'challenge_not_begun');
end if;

if now() > v_challenge_started + interval '35 minutes' then
  return json_build_object('ok', false, 'error', 'time_expired');
end if;
```

No writes occur when expired. The existing `answer_attempts` log row is not inserted (we do not want to credit late attempts).

`begin_challenge(int)` is left in place for backward compatibility but unused by the client.

### Rewrite `leaderboard` view

```sql
create or replace view public.leaderboard as
with q as (
  select attendee_id, count(*)::int as n
  from public.question_progress group by attendee_id
)
select
  a.id as attendee_id,
  a.name,
  coalesce(q.n, 0) as questions_complete,
  case
    when c1.completed_at is not null and c1.started_at is not null
    then (extract(epoch from (c1.completed_at - c1.started_at)) * 1000)::bigint
  end as c1_elapsed_ms,
  case
    when c2.completed_at is not null and c2.started_at is not null
    then (extract(epoch from (c2.completed_at - c2.started_at)) * 1000)::bigint
  end as c2_elapsed_ms,
  case
    -- Both completed: contiguous workshop window
    when c1.completed_at is not null and c2.completed_at is not null
     and c1.started_at is not null
    then (extract(epoch from (greatest(c1.completed_at, c2.completed_at) - c1.started_at)) * 1000)::bigint
         + (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0)) * 15000
    -- Expired without both completed: cap at workshop duration
    when c1.started_at is not null
     and now() > c1.started_at + interval '35 minutes'
    then 2100000::bigint
         + (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0)) * 15000
    -- Still in progress
    else null
  end as total_ms,
  (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0))::int as wrong_count
from public.attendees a
left join public.challenge_attempts c1 on c1.attendee_id = a.id and c1.challenge_id = 1
left join public.challenge_attempts c2 on c2.attendee_id = a.id and c2.challenge_id = 2
left join q on q.attendee_id = a.id;
```

- `c1_elapsed_ms` / `c2_elapsed_ms` are now **milestone offsets from workshop start** to each challenge's completion. Used by the Completed page for the per-challenge stat blocks.
- `total_ms` is settled when both challenges are completed OR when the workshop has expired. Null only while the workshop is genuinely still in progress.
- `get_leaderboard()` RPC is unaffected; it selects by column name and the column types are unchanged.

## Client architecture

### New: `useWorkshop` hook (`client/src/hooks/useWorkshop.ts`)

Single source of truth for shared workshop state. Returns:

```ts
interface WorkshopState {
  startedAt: string | null;
  expiresAt: string | null;
  status: "ready" | "in_progress" | "expired" | "complete";
  remainingMs: number;        // live-ticked; 0 when expired or not started
  c1Completed: boolean;
  c2Completed: boolean;
  beginWorkshop: () => Promise<boolean>;
  error: string | null;
}
```

Implementation notes:

- On mount with `attendeeId`, fetch both `challenge_attempts` rows in one query (`.in('challenge_id', [1, 2])`). Derive `startedAt` from challenge 1's row (or 2's — they're equal post-`begin_workshop`).
- Status derivation:
  - `startedAt == null` → `ready`
  - `c1Completed && c2Completed` → `complete`
  - `Date.now() > expiresAt` → `expired`
  - else → `in_progress`
- Live ticker: a `setInterval(1000)` updates `remainingMs` only while status is `in_progress`. Stops on `complete`/`expired`.
- `beginWorkshop()` calls the new RPC; on success, optimistically stamps `startedAt` and transitions status to `in_progress`. Idempotent at the RPC layer.

### `useChallenge` hook (modified)

- Keeps responsibility for per-challenge questions, progress, and the `submit` action.
- Removes its `begin` function (replaced by `useWorkshop.beginWorkshop`).
- Removes its status enum; it no longer drives gating decisions. Component-level status comes from `useWorkshop`.
- The `submit` callback handles the new `time_expired` error from the server by setting a card-level error message ("Time's up — answer not submitted"). No state mutation otherwise.
- Returns `state` (the per-challenge `challenge_attempts` row), `questions`, `progress`, `solvedCount`, `totalQuestions`, `submit`, `error`.

### `ChallengePage` (modified)

- Reads workshop state from `useWorkshop`, per-challenge from `useChallenge`.
- Branching on `useWorkshop.status`:
  - **`ready` on `/challenge/1`:** render `ChallengeIntro` with "Begin Workshop" button (renamed from "Begin Challenge"). Intro copy updated to mention the 35-minute shared timer across both challenges.
  - **`ready` on `/challenge/2`:** redirect to `/challenge/1` via `useLocation` (`navigate('/challenge/1', { replace: true })`) in a `useEffect`.
  - **`in_progress`:** existing question grid + `ChallengeHeader` with countdown.
  - **`expired`:** lock all `QuestionCard`s, show a 2.5s "Time's Up" fade overlay, then `navigate('/completed', { replace: true })`. Use a `useRef<boolean>` one-shot to prevent re-entry on status churn.
  - **`complete`:** existing per-challenge "Complete" reveal renders when the current challenge's `completed_at` is set. C1's reveal links to `/challenge/2` ("To Challenge 2"); C2's reveal links to `/completed` ("Finish"). The "Finish" button works the same way it does today.
- The expiry overlay is a `motion.div` with `position: fixed`, blurred backdrop, centered "Time's Up" headline + 1-line subtitle. Mirrors the existing reveal styling for visual consistency.

### `ChallengeHeader` (modified)

- Timer becomes a countdown derived from `useWorkshop.remainingMs`, not `now − startedAt`.
- Display: `MM:SS` remaining.
- Color states (background + text):
  - Default (≥5min remaining): current white-on-dark.
  - Under 5min: amber (oklch warm accent).
  - Under 1min: red (oklch warning accent).
  - `complete`: purple (current celebration color).
- Penalty pill (`+15s × N`) display unchanged.
- "X / Y solved" pill display unchanged.

### `QuestionCard` (modified)

- New optional prop: `locked?: boolean`.
- When `locked`: input is disabled, submit button hidden or visibly disabled, card opacity reduced (~0.6), a "Locked" label appears where the submit button was. Wrong-guess error display is suppressed.
- `ChallengePage` passes `locked={workshopStatus === 'expired'}` (true for all cards once expired). Already-solved cards remain visually "solved" and take precedence over locked styling.

### `ChallengeIntro` (light edit)

- "Begin Challenge" button → "Begin Workshop".
- Copy explicitly states: "You have 35 minutes total to complete both challenges. Starting Challenge 1 unlocks Challenge 2 — work them in any order. Submissions lock when the timer hits zero."
- `onBegin` prop now calls `beginWorkshop` from `useWorkshop` (no signature change for the component; the parent rewires the callback).

### `Completed` page (modified)

The existing rank-tier helpers (`rankAccent`, `rankLabel`) get promoted from cosmetic to structural. New helper:

```ts
function tierFor(rank: number, finishedNaturally: boolean): Tier { ... }
type Tier = "champion" | "runner-up" | "third" | "completed" | "timed-out" | "visitor";
```

Tier matrix:

| Condition | Tier | Headline | Accent |
|---|---|---|---|
| No attendee or no workshop started | `visitor` | "Workshop **Complete**" | purple (current) |
| Rank 1 | `champion` | "Workshop **Champion**" | gold, heavy glow |
| Rank 2 | `runner-up` | "Runner-**up**" | silver |
| Rank 3 | `third` | "**Third** Place" | bronze |
| Rank 4+, `finishedNaturally` | `completed` | "Round **Complete**" | muted purple |
| Rank 4+, `!finishedNaturally` | `timed-out` | "**Time's** Up" | dim red/purple |

`finishedNaturally = c1Completed && c2Completed` (read from `useWorkshop` or computed from `myRow.c1_elapsed_ms != null && myRow.c2_elapsed_ms != null`).

Result-card content per tier:

- `champion` / `runner-up` / `third`: keep the existing 3-stat grid (C1 milestone, C2 milestone, Total) with rank-accent styling. Relabel "Challenge 1" → "Challenge 1 done", "Challenge 2" → "Challenge 2 done" to reflect milestone semantics.
- `completed` (rank 4+, natural): same 3-stat grid, neutral purple accent, no podium framing.
- `timed-out` (rank 4+, timed out): replace the 3-stat grid with a single prominent "N / 10 solved" stat plus a smaller "Final score: MM:SS (+penalty)" line. Different visual treatment so the user understands they didn't finish.
- `visitor`: keep current scenario-recap fallback as-is.

The "View Full Leaderboard" CTA + scenario-recap cards + "Back to Introduction" footer remain on all tiers below the personalized card.

### `WorkshopLayout` (no change)

The sidebar, navbar, and shader background are untouched.

## Flow summaries

### Happy path — natural finish

1. User registers, navigates to `/challenge/1`.
2. Status is `ready`. Sees `ChallengeIntro`, clicks **Begin Workshop**.
3. `useWorkshop.beginWorkshop()` calls RPC → both `challenge_attempts` rows stamped with the same `started_at`. Status flips to `in_progress`. Countdown starts.
4. User solves 5 questions on C1 → C1's `completed_at` set. Per-challenge "Complete" reveal renders. User clicks **To Challenge 2**.
5. Navigates to `/challenge/2`. Status still `in_progress`, countdown unchanged. Question grid renders immediately (no Begin gate).
6. User solves 5 questions on C2 → C2's `completed_at` set. `useWorkshop.status` flips to `complete`. Countdown freezes.
7. C2's "Complete" reveal renders with **Finish** button → `/completed`.
8. `/completed` reads leaderboard, finds user's rank, renders the appropriate tier.

### Timeout path

1. User clicks Begin, works for 35 minutes without solving all 10.
2. At expiry, `useWorkshop.status` flips to `expired` client-side.
3. `ChallengePage` effect (one-shot via `useRef`) sets a `timeUp` state, fades in a "Time's Up" overlay.
4. 2.5s later, `navigate('/completed', { replace: true })`.
5. Any in-flight submissions hitting the server during this window are rejected with `error: 'time_expired'`. Client surfaces a brief inline "Time's up" on the card; the navigate supersedes within ~2.5s.
6. `/completed` renders the appropriate tier — `timed-out` for rank 4+, podium for rank 1–3.

### Direct nav to `/challenge/2` before starting

1. User goes directly to `/challenge/2` (browser history, bookmark, etc.).
2. `useWorkshop.status === 'ready'`.
3. `ChallengePage` effect issues `navigate('/challenge/1', { replace: true })`.
4. User lands on `/challenge/1`, sees `ChallengeIntro`.

## Error handling

| Server error | Client behavior |
|---|---|
| `not_registered` | Already handled by `RegistrationGate`; should not reach a challenge page. |
| `challenge_not_begun` (legacy) | Should not occur with the new flow. If observed, log + show a generic "Couldn't submit; refresh and try again." |
| `time_expired` (new) | Card shows "Time's up — answer not submitted." Auto-navigate already in flight will supersede shortly. |
| `already_answered` | Existing behavior; card was solved on another tab/window. |
| RPC network error | Existing inline error display on the card. |

Client cannot bypass the server lock: server uses `now()` from the DB session, not anything supplied by the client.

## Migration considerations

- **Existing in-flight `challenge_attempts` rows:** the new view and `submit_answer` handle pre-existing rows whose two challenge attempts have different `started_at` timestamps gracefully (each is judged on its own row's `started_at + 35min`). The leaderboard view's `total_ms = max(completed_at) − c1.started_at` will produce slightly distorted totals for such legacy rows, but we will not deploy mid-workshop, so this is academic.
- **Backfill:** none required. New workshops naturally use `begin_workshop`.
- **Rollback:** drop migration 016, restore the previous view + `submit_answer`. `begin_workshop` becomes orphaned but harmless.
- **Deployment window:** outside any active workshop session.

## Verification checklist (manual)

Manual test plan; there is no automated test suite in the repo.

**Begin flow**
- [ ] Registered user on `/challenge/1` sees `ChallengeIntro` with "Begin Workshop" button.
- [ ] Clicking Begin transitions to question grid; countdown shows ~34:59 remaining and decrements every second.
- [ ] DB inspection: both `challenge_attempts` rows for this attendee have `started_at` set to identical timestamps.
- [ ] Clicking Begin a second time (e.g. on a second tab) preserves the original `started_at`.

**Routing**
- [ ] Direct navigation to `/challenge/2` before clicking Begin redirects to `/challenge/1` and replaces history (back button does not return to `/challenge/2`).
- [ ] After clicking Begin on C1, navigating to `/challenge/2` shows the question grid with no intro gate.

**Countdown UI**
- [ ] Countdown text matches between `/challenge/1` and `/challenge/2` within ~1 second.
- [ ] Under 5 minutes remaining: amber color.
- [ ] Under 1 minute remaining: red color.
- [ ] After both challenges complete naturally: countdown freezes, color flips to purple.

**Server expiry lock**
- [ ] Set a test attendee's `started_at` to `now() - interval '36 minutes'`. Calling `submit_answer` returns `{ ok: false, error: 'time_expired' }`. No row written to `answer_attempts`. No `wrong_count` increment.
- [ ] Submitting a correct answer at minute 34:59 succeeds. Submitting one at 35:01 returns `time_expired`.

**Client expiry flow**
- [ ] On expiry, all question inputs disable; submit buttons hide or disable.
- [ ] "Time's Up" overlay fades in for ~2.5 seconds.
- [ ] User is navigated to `/completed` with history replaced (back button does not return to the locked challenge page).
- [ ] The auto-navigate fires exactly once even if `status` briefly churns.

**Leaderboard ranking**
- [ ] Attendee A finishes both challenges in 18 minutes with 2 wrong: ranked above attendee B who solved 8/10 by expiry.
- [ ] Attendee B (8/10, timed out) is ranked above attendee C (5/10, timed out): primary sort is `questions_complete`.
- [ ] All three appear on the leaderboard with non-null `total_ms`.

**Completed page tiers**
- [ ] Rank 1 finisher sees Champion screen with gold accents.
- [ ] Rank 2 sees Runner-up (silver).
- [ ] Rank 3 sees Third Place (bronze).
- [ ] Rank 4+ finished naturally sees "Round Complete" (muted purple, 3-stat grid).
- [ ] Rank 4+ timed out sees "Time's Up" with `N / 10 solved` headline stat.
- [ ] Unregistered/visitor sees existing scenario-recap fallback.

## File-level change summary

**New:**
- `supabase/migrations/016_shared_workshop_timer.sql`
- `client/src/hooks/useWorkshop.ts`

**Modified:**
- `shared/const.ts` — add `WORKSHOP_DURATION_MS`.
- `client/src/components/ChallengePage.tsx` — workshop status branching, expiry overlay, auto-navigate.
- `client/src/components/ChallengeIntro.tsx` — copy + button label.
- `client/src/components/ChallengeHeader.tsx` — countdown display + color tiers.
- `client/src/components/QuestionCard.tsx` — `locked` prop.
- `client/src/hooks/useChallenge.ts` — drop `begin`, drop status enum, handle `time_expired` error.
- `client/src/pages/Completed.tsx` — rank-tier render with `timed-out` variant.

**Unchanged but worth confirming:**
- `WorkshopLayout`, `LeaderboardTable`, `RegistrationGate`, `useLeaderboard`, `useAttendee`.

**Small copy update:**
- `client/src/pages/Leaderboard.tsx` — the footer caption "Total time only populates once both challenges are complete" becomes stale after this change (total time also populates on expiry). Update to: "Total time populates once both challenges are complete, or once the 35-minute timer expires."

## Open questions for implementation phase

- Exact gold pulse animation for Champion screen (subtle CSS keyframe vs. framer-motion).
- Final copy for the `timed-out` Completed variant.
- Whether to show a "you have N minutes" callout *before* clicking Begin in the intro (probably yes — already in the copy plan above).
