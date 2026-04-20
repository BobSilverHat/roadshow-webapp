# CTF Challenges — Design Spec

**Date:** 2026-04-20
**Scope:** Add a two-challenge capture-the-flag section to the Salt × Guidepoint Agentic AI Security Workshop webapp. Attendees work through the existing three scenarios, then prove comprehension against a timed, scored competition with a live leaderboard.

---

## 1. Purpose

The three workshop scenarios are passive — attendees read and scroll. The CTF turns that passivity into engagement. Attendees register, get a timer, and must navigate Salt's live platform to find answers to story-tied questions. A live leaderboard shows who's ahead, creating social pressure and reinforcing what was taught.

Two challenges, gated sequentially:

- **Challenge 1** — questions covering the Agentic Discovery and Posture Management scenarios.
- **Challenge 2** — questions covering the Runtime Protection scenario.

Each completion routes forward. Finishing Challenge 2 unlocks the workshop-complete page.

---

## 2. Attendee flow + UX

### 2.1 Navigation

Challenges live at **top-level routes alongside scenarios**, not nested under Scenario 3:

```
/                    Home
/scenario/1          Agentic Discovery (existing)
/scenario/2          Posture Management (existing)
/scenario/3          Runtime Protection (existing)
/challenge/1         Challenge 1 (NEW)
/challenge/2         Challenge 2 (NEW)
/leaderboard         Live leaderboard (NEW)
/completed           Finale (existing)
```

Sidebar (`WorkshopLayout.tsx` `NAV_ITEMS`) gains a new top-level "Challenges" section below the three scenarios, containing Challenge 1, Challenge 2, and Leaderboard as sub-items.

### 2.2 Registration (first visit to any challenge)

When an attendee opens `/challenge/1` (or `/challenge/2`) without an existing session:

1. A centered `RegistrationCard` renders — name field, email field, "Enter" button.
2. Submit → `register_attendee(name, email)` RPC.
3. On success → anonymous Supabase session JWT persisted in `localStorage` (Supabase client handles this), name/email stored server-side.
4. On email conflict → `{ error: "email_claimed" }` displays "That email is already competing — use a different one."
5. Card unmounts; the challenge page renders.

No logout affordance. No ability to edit name/email after registration. This is by design (anti-cheat, lead-gen integrity). Clearing localStorage or using a new browser means registration is required again, but the email unique-constraint rejects re-registration of any already-claimed email.

### 2.3 Challenge page shape (same for Challenge 1 and Challenge 2)

**Header strip (sticky at top of content column):**
- Challenge title (e.g. "Challenge 1 — Discover & Govern")
- Running timer `mm:ss` (paused until Begin clicked)
- Penalty tally `+15s × n = +Xs` (shown only once > 0)
- Attendee name + avatar glyph

**Intro block (before Begin):**
- One-paragraph orientation (what's being tested, e.g. "Everything you need is inside the Salt platform. Open it in another tab and hunt.")
- "Launch Salt Platform" link (existing convention from Home page)
- **Begin Challenge** button — prominent, centered. Clicking calls `begin_challenge(challenge_id)` RPC.

**After Begin:**
- All 5 question cards render in a grid.
- Each card: question text, single input, submit button.
- Tackled in any order. Timer runs wall-clock.
- Submit → `submit_answer(question_id, submission)` RPC →
  - Correct: card flashes green, locks, stamps "COMPLETE", question is immutable thereafter.
  - Wrong: card flashes red, input clears, stays open, `+15s` applied to attendee's score.
- When the fifth card flips green, a completion reveal overlays the page: "Challenge 1 Complete — 4:32 (incl. +30s penalties)".
- Auto-navigate to `/challenge/2` after 3 seconds (or click-through).

### 2.4 Challenge 1 → Challenge 2 handoff

Between challenges, a brief interstitial shows the live leaderboard for ~5 seconds so the attendee sees where they stand, then routes to `/challenge/2`. If they prefer, they can click through to the leaderboard or straight to Challenge 2 immediately.

### 2.5 Final completion → Finale

When Challenge 2's last card goes green, a completion reveal shows total time across both challenges, then routes to `/completed`. The existing finale page will be extended to show per-attendee summary (rank, total time, questions completed).

### 2.6 Refresh / abandon behavior

**Wall-clock time runs whether the tab is open or not.** If an attendee closes the tab mid-challenge and returns 3 minutes later, they're 3 minutes deeper. This is the simplest honest rule, matches real CTF convention, and removes edge cases around pause/resume gaming.

**Progress persists.** Already-correct questions stay green. The attendee resumes exactly where they left off — just with more elapsed time.

### 2.7 Leaderboard

Dedicated route at `/leaderboard`. Columns:

| Rank | Name | C1 time | C2 time | Total | Wrong | Done |
|------|------|---------|---------|-------|-------|------|

Sort order: `questions_complete DESC, total_ms ASC, wrong_count ASC`. Time columns include `wrong_count × 15,000 ms` penalty baked in.

Live-updated via Supabase Realtime subscription on `challenge_attempts` and `question_progress`. Client debounces re-fetch at 500 ms.

No emails displayed — names only.

---

## 3. Data model

All tables live in Supabase `public` schema. All writes are brokered through `SECURITY DEFINER` RPCs; direct client writes are denied by RLS.

### 3.1 Tables

**`attendees`** — registered players.
```
id          uuid PK default uuid_generate_v4()
email       text unique not null
name        text not null
auth_uid    uuid references auth.users(id)
created_at  timestamptz default now()
```

**`challenges`** — static reference data, two rows.
```
id          int PK   (1 or 2)
slug        text unique
title       text
subtitle    text
created_at  timestamptz default now()
```

**`questions`** — 5 per challenge.
```
id            uuid PK default uuid_generate_v4()
challenge_id  int references challenges(id) not null
order_idx     int not null
prompt        text not null
answer_hash   text not null   -- sha256(lower(trim(answer)))
created_at    timestamptz default now()
unique(challenge_id, order_idx)
```

**`challenge_attempts`** — per-attendee × per-challenge clock + score.
```
id            uuid PK default uuid_generate_v4()
attendee_id   uuid references attendees(id) not null
challenge_id  int references challenges(id) not null
started_at    timestamptz
completed_at  timestamptz
wrong_count   int default 0
unique(attendee_id, challenge_id)
```

**`answer_attempts`** — every submission, for telemetry.
```
id             uuid PK default uuid_generate_v4()
attendee_id    uuid references attendees(id) not null
question_id    uuid references questions(id) not null
submitted_at   timestamptz default now()
correct        boolean not null
submission_raw text   -- lowercased, trimmed, truncated 200 chars
index on (attendee_id, question_id)
```

**`question_progress`** — marks a question green for an attendee.
```
attendee_id  uuid not null
question_id  uuid not null
correct_at   timestamptz default now()
primary key (attendee_id, question_id)
```

### 3.2 Views

**`questions_public`** — projects only public columns, used by client.
```sql
create view questions_public as
  select id, challenge_id, order_idx, prompt from questions;
```

**`leaderboard`** — materialized view or plain view, computed fields:
```
attendee_id, name,
c1_elapsed_ms   = (c1.completed_at - c1.started_at) + c1.wrong_count * 15000
c2_elapsed_ms   = (c2.completed_at - c2.started_at) + c2.wrong_count * 15000
total_ms        = c1_elapsed_ms + c2_elapsed_ms   (nulls treated as max)
wrong_count     = c1.wrong_count + c2.wrong_count
questions_complete = count(question_progress rows for this attendee)
```

### 3.3 Row-Level Security

| Table | Anon SELECT | Anon INSERT/UPDATE/DELETE |
|---|---|---|
| `attendees` | own row only (`auth.uid() = attendee_id`) | denied (RPC only) |
| `challenges` | all | denied |
| `questions` | **denied** — use `questions_public` view | denied |
| `questions_public` | all | denied |
| `challenge_attempts` | own rows only | denied (RPC only) |
| `answer_attempts` | own rows only | denied (RPC only) |
| `question_progress` | own rows only | denied (RPC only) |
| `leaderboard` view | all (names + times, no emails) | denied |

### 3.4 RPC functions (all `SECURITY DEFINER`)

**`register_attendee(p_name text, p_email text) → json`**
- Creates anon auth user (via `auth.sign_in_anonymously` or equivalent).
- Inserts `attendees(email, name, auth_uid)`.
- On unique-constraint conflict → returns `{ ok: false, error: "email_claimed" }`.
- On success → returns `{ ok: true, attendee_id, session: { access_token, refresh_token } }`.

**`begin_challenge(p_challenge_id int) → json`**
- Upserts `challenge_attempts(attendee_id = auth.uid_as_attendee(), challenge_id, started_at = now())`.
- If `started_at` already set, returns the existing value (idempotent).
- Returns `{ started_at }`.

**`submit_answer(p_question_id uuid, p_submission text) → json`**
1. If a row exists in `question_progress` for this `(attendee_id, question_id)`, return `{ error: "already_answered" }` — no-op, no telemetry write. Card is locked.
2. Normalize: `lower(trim(p_submission))`.
3. Hash: `encode(digest(normalized, 'sha256'), 'hex')`.
4. Compare to `questions.answer_hash`.
5. Insert `answer_attempts` with `correct` = result of comparison and `submission_raw` = normalized input truncated to 200 chars.
6. If correct: `INSERT ... ON CONFLICT DO NOTHING` into `question_progress`.
7. If wrong: `UPDATE challenge_attempts SET wrong_count = wrong_count + 1` for this attendee/challenge.
8. Count correct answers in this challenge. If = 5, `UPDATE challenge_attempts SET completed_at = now()` (only if still null; idempotent).
9. Return `{ correct, wrong_count, total_correct_in_challenge, challenge_complete }`.

**`get_leaderboard() → setof leaderboard` (or plain `select *` from the view)**
- Just returns the view contents. Kept as an RPC for consistency if we want to filter/paginate later.

---

## 4. Client architecture

### 4.1 New files

```
client/src/
├── lib/supabase.ts                    Supabase client singleton, env-driven config
├── hooks/useAttendee.ts               Reads Supabase session, exposes attendee record
├── hooks/useChallenge.ts              Wraps begin/submit/progress RPCs for a challenge
├── hooks/useLeaderboard.ts            Subscribes + exposes leaderboard rows
├── components/
│   ├── RegistrationGate.tsx           Wrap challenge pages; shows form or children
│   ├── ChallengeHeader.tsx            Sticky timer/penalty/name strip
│   ├── QuestionCard.tsx               One card with flash + submit
│   ├── ChallengeCompleteReveal.tsx    Overlay on all-correct
│   └── LeaderboardTable.tsx           Table with row animations
└── pages/
    ├── Challenge1.tsx
    ├── Challenge2.tsx
    └── Leaderboard.tsx
```

### 4.2 Environment variables

```
VITE_SUPABASE_URL=https://cttpfrwphcqpjwmwothb.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable anon key, safe in client>
```

Stored in `.env.local` (already gitignored).

### 4.3 Dependencies

- `@supabase/supabase-js` — core client.
- React Bits components for timer count-up animation, card flip, leaderboard row ticker (final choices made in implementation phase).

---

## 5. Defaults locked in

| Decision | Value | Rationale |
|---|---|---|
| Question count per challenge | 5 (10 total) | Fewer = coin-flippy leaderboard; more = attention drain |
| Wrong-answer penalty | +15 seconds | Nudges without locking; honest mistakes not punished too hard |
| Answer normalization | lowercase + trim | Prevents typo/capitalization frustration on flag entry |
| Question order within challenge | fixed ascending `order_idx` | Simpler state, predictable for debugging |
| Visibility | all cards visible from Begin | Pick order freely; feels open, not linear |
| Refresh behavior | wall-clock, no pause | Simple, matches CTF convention |
| Identity lock | email unique constraint + anon session | In-person social pressure is the real enforcer |
| Hint system | none (v1) | Keep it lean; add later only if attendees get stuck |
| Tiebreaker | `questions_complete DESC, total_ms ASC, wrong_count ASC` | Rewards completion first, then speed, then cleanness |
| Email visibility | stored server-side only, never shown in leaderboard | Privacy + honesty |
| Finale routing | auto after 3s reveal; manual override via click | Smooth but not trapping |

---

## 6. Out of scope (v1)

- Admin dashboard (view completions, disqualify cheaters, etc.) — post-event via raw SQL or Supabase Studio.
- Prize automation — winners chosen manually from the leaderboard.
- Internationalization — English only.
- Accessibility audit — base keyboard + screen-reader support; no formal WCAG pass in v1.
- CSV export of results — trivial via Supabase Studio if needed.
- Hints, skips, undo — explicitly excluded.

---

## 7. Anti-cheat posture

**What we prevent:**
- Reading answers from the client (answers live only as hashes server-side).
- Forging a correct answer (all writes go through RPCs that do the hash comparison).
- Mutating the timer (`started_at` / `completed_at` / `wrong_count` only set by RPCs).
- Claiming someone else's registered email (unique constraint).
- Reading other attendees' `answer_attempts` or raw submissions (RLS scopes to own rows).

**What we tolerate:**
- Attendees registering burner emails (roomful-of-peers social pressure handles this).
- Attendees helping each other verbally in the room (it's a workshop, not a competition; leaderboard is flavor).
- Attendees opening DevTools to see the `prompt` text (intended — prompts are public).
- An attendee pausing by closing the tab (wall-clock keeps running; no gaming advantage).

---

## 8. Phased build plan

| Phase | Scope | Deliverable |
|---|---|---|
| 0 | Spec committed | This doc, in git |
| 1 | Supabase schema + RPCs + seed data | Migration files + `execute_sql` verification; 6 tables live, 4 RPCs callable, 2 challenges + 10 placeholder questions seeded |
| 2 | Routes + sidebar + RegistrationGate | `/challenge/*` routes exist; sidebar expands with "Challenges" section; name/email form blocks access until session exists |
| 3 | Challenge page shell | Header strip, intro block, Begin button, grid of locked cards. No question logic yet. |
| 4 | Question cards + submit flow | Green/red flash, RPC submit wiring, all-correct completion reveal |
| 5 | Challenge 1 → 2 → Finale navigation | Handoff interstitial, auto-nav, finale routing |
| 6 | Leaderboard | Dedicated page + Realtime subscription + row-ticker motion |
| 7 | Real question content | Replace placeholders with hand-crafted questions + answer hashes |
| 8 | Polish | Cyber-noir match, React Bits motion, loading states, error states |

Phase 1 is entirely backend; phases 2–6 are frontend; phase 7 is content authoring; phase 8 is craft. Each phase should ship independently verifiable (`pnpm check` passes, manual smoke test on the challenge page).

---

## 9. Open items for content authoring (Phase 7)

The spec defines the machine; the content is yours to author. During Phase 7 we'll need:

- **Challenge 1 (Discovery + Posture) — 5 questions + 1 answer each.** Each question should be findable by navigating the Salt platform at `https://salt-labs.secured-api.com`. Example shape: _"In the Posture Gaps dashboard, filter by Severity = Critical. How many findings remain?"_ — Answer: `28`.
- **Challenge 2 (Runtime Protection) — 5 questions + 1 answer each.** Same shape. Example: _"When the attacker pivoted from the LLM to the MCP, which header was flagged as missing by both the Parameter Tampering and MCP risk types?"_ — Answer: `x-aidr-user-id`.

Answers must be:
- Single unambiguous strings.
- Short enough to type without typos (1–3 words, or a single number/identifier).
- Findable inside the Salt UI without inference.

---

## 10. Success criteria

A v1 ship means:
- An attendee can register at `/challenge/1`, complete 5 questions, route to `/challenge/2`, complete 5 more, see their total time on `/completed`.
- The leaderboard updates live as other attendees in the room progress.
- No way to forge a correct answer from the browser.
- No way to register the same email twice.
- `pnpm check` passes.
- Cyber-noir design language preserved (same type, colors, motion language as existing scenario pages).
