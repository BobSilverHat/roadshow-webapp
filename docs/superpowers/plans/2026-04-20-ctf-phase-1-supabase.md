# CTF Phase 1 — Supabase Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Supabase data model, RLS policies, RPCs, and seed data for the two-challenge CTF feature. Zero frontend code touched in this plan. After this plan, the data layer is fully testable via `mcp__supabase__execute_sql` and ready for UI integration in Phase 2.

**Architecture:** Eleven numbered SQL migration files committed under `supabase/migrations/`, each applied via `mcp__supabase__apply_migration` so Supabase's migration log and our git history stay in sync. Every migration ends with an `execute_sql` verification step that proves the expected shape before the task is committed. Four `SECURITY DEFINER` Postgres functions mediate all writes; direct client writes are blocked by RLS.

**Tech Stack:**
- **Supabase** project `cttpfrwphcqpjwmwothb` (clean slate, `public` schema empty).
- **PostgreSQL 15+** with `pgcrypto` extension for SHA-256 hashing in `submit_answer`.
- **Supabase MCP** tools: `apply_migration`, `execute_sql`, `list_tables`, `list_migrations`, `get_advisors`.
- No frontend code. No tests framework installed. Verification = SQL.

**Source of truth spec:** `docs/superpowers/specs/2026-04-20-ctf-challenges-design.md`

---

## File structure

```
supabase/
├── README.md                                         # How to rebuild the schema from scratch
└── migrations/
    ├── 001_enable_pgcrypto.sql                       # digest() for SHA-256
    ├── 002_create_core_tables.sql                    # attendees, challenges, questions
    ├── 003_create_tracking_tables.sql                # challenge_attempts, answer_attempts, question_progress
    ├── 004_create_views.sql                          # questions_public, leaderboard
    ├── 005_enable_rls.sql                            # RLS on all 6 tables + SELECT policies
    ├── 006_register_attendee_rpc.sql                 # RPC: register_attendee(name, email)
    ├── 007_begin_challenge_rpc.sql                   # RPC: begin_challenge(challenge_id)
    ├── 008_submit_answer_rpc.sql                     # RPC: submit_answer(question_id, submission)
    ├── 009_get_leaderboard_rpc.sql                   # RPC: get_leaderboard()
    ├── 010_seed_challenges.sql                       # 2 rows in challenges
    └── 011_seed_placeholder_questions.sql            # 10 placeholder rows in questions
```

Every file is idempotent (`create table if not exists`, `create or replace function`, `on conflict do nothing`) so re-running the whole stack against a fresh project reproduces the exact schema.

---

## Task 0: Scaffold `supabase/migrations/` + README

**Files:**
- Create: `supabase/README.md`
- Create: `supabase/migrations/` (empty dir, kept with `.gitkeep`)
- Create: `supabase/migrations/.gitkeep`

- [ ] **Step 1: Create the directory and placeholder**

```bash
mkdir -p /Users/brandons/Documents/roadshow-webapp/supabase/migrations
touch /Users/brandons/Documents/roadshow-webapp/supabase/migrations/.gitkeep
```

- [ ] **Step 2: Write the README**

Write `supabase/README.md` with this exact content:

```markdown
# Supabase backend — Salt workshop CTF

This directory is the paper-trail mirror of what's applied to Supabase project `cttpfrwphcqpjwmwothb` for the two-challenge CTF feature.

Every file under `migrations/` was applied via the Supabase MCP's `apply_migration` tool, using the filename (minus `.sql`) as the migration name. The authoritative history lives server-side — `mcp__supabase__list_migrations` returns it — but these files let a human reproduce the schema from scratch against a fresh project.

## Reproducing the schema

Against a fresh Supabase project:

1. Open the SQL editor.
2. Run each file under `migrations/` in numeric order (001 → 011).

Every migration is idempotent — re-running against an already-migrated project is safe.

## Conventions

- File name: `NNN_<snake_case_name>.sql` where NNN is the sequence number (001, 002, …).
- Every migration ends with a comment block describing what to verify, including the exact `execute_sql` commands used during development.
- Tables are created with `if not exists`. Functions use `create or replace`. Seeds use `on conflict … do nothing`.
- SECURITY DEFINER functions always set `search_path` to avoid hijacking.
- RLS is enabled on every table; no `USING (true)` policies on mutating ops.

## Design spec

See `docs/superpowers/specs/2026-04-20-ctf-challenges-design.md` for the full design rationale this backend implements.
```

- [ ] **Step 3: Verify the structure**

```bash
ls -la /Users/brandons/Documents/roadshow-webapp/supabase/
ls -la /Users/brandons/Documents/roadshow-webapp/supabase/migrations/
cat /Users/brandons/Documents/roadshow-webapp/supabase/README.md | head -20
```

Expected: `README.md` exists at the first path; `migrations/.gitkeep` exists at the second; the `cat` shows the heading "Supabase backend — Salt workshop CTF".

- [ ] **Step 4: Commit**

```bash
git add supabase/README.md supabase/migrations/.gitkeep
git commit -m "Scaffold supabase/ directory with migrations README"
```

---

## Task 1: Migration 001 — Enable `pgcrypto`

**Purpose:** `submit_answer` hashes answers with SHA-256. `extensions.digest(text, 'sha256')` comes from `pgcrypto`.

**Files:**
- Create: `supabase/migrations/001_enable_pgcrypto.sql`

- [ ] **Step 1: Write the SQL file**

Contents of `supabase/migrations/001_enable_pgcrypto.sql`:

```sql
-- Enable pgcrypto for SHA-256 hashing in submit_answer RPC.
-- Supabase ships pgcrypto in the `extensions` schema.
create extension if not exists pgcrypto with schema extensions;

-- Verification:
-- select extensions.digest('test', 'sha256');  -- should return a bytea
```

- [ ] **Step 2: Apply the migration via MCP**

Call `mcp__supabase__apply_migration` with:
- `name`: `001_enable_pgcrypto`
- `query`: the contents of `supabase/migrations/001_enable_pgcrypto.sql` (the SQL, minus the shell comment header)

- [ ] **Step 3: Verify the extension is live**

Call `mcp__supabase__execute_sql` with:

```sql
select encode(extensions.digest('test', 'sha256'), 'hex') as hash;
```

Expected output: a single row, column `hash`, value `9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08` (the well-known SHA-256 of the literal string `test`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_enable_pgcrypto.sql
git commit -m "Enable pgcrypto extension for SHA-256 hashing"
```

---

## Task 2: Migration 002 — Create core tables

**Purpose:** Create the three root tables — `attendees`, `challenges`, `questions` — that have no inbound FK dependencies from each other (except `questions → challenges`).

**Files:**
- Create: `supabase/migrations/002_create_core_tables.sql`

- [ ] **Step 1: Write the SQL file**

Contents of `supabase/migrations/002_create_core_tables.sql`:

```sql
-- Core reference tables for the CTF. See design spec §3.1.

create table if not exists public.attendees (
  id         uuid primary key default gen_random_uuid(),
  auth_uid   uuid not null unique references auth.users(id) on delete cascade,
  email      text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id         int primary key,
  slug       text not null unique,
  title      text not null,
  subtitle   text,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id           uuid primary key default gen_random_uuid(),
  challenge_id int  not null references public.challenges(id) on delete cascade,
  order_idx    int  not null,
  prompt       text not null,
  answer_hash  text not null,
  created_at   timestamptz not null default now(),
  unique (challenge_id, order_idx)
);
```

- [ ] **Step 2: Apply via MCP**

Call `mcp__supabase__apply_migration` with:
- `name`: `002_create_core_tables`
- `query`: the SQL above

- [ ] **Step 3: Verify table creation via list_tables**

Call `mcp__supabase__list_tables` with `schemas=["public"]`, `verbose=false`.

Expected: response includes `attendees`, `challenges`, `questions` (three tables).

- [ ] **Step 4: Verify column shapes via execute_sql**

Call `mcp__supabase__execute_sql` with:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('attendees', 'challenges', 'questions')
order by table_name, ordinal_position;
```

Expected: 16 rows (attendees has 5, challenges has 5, questions has 6 — but `created_at` counts once per table).

Concrete expected shape (order-insensitive):
- `attendees`: `id`, `auth_uid`, `email`, `name`, `created_at`
- `challenges`: `id`, `slug`, `title`, `subtitle`, `created_at`
- `questions`: `id`, `challenge_id`, `order_idx`, `prompt`, `answer_hash`, `created_at`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/002_create_core_tables.sql
git commit -m "Create core tables: attendees, challenges, questions"
```

---

## Task 3: Migration 003 — Create tracking tables

**Purpose:** Tables that record attendee activity — `challenge_attempts` (per-challenge clock), `answer_attempts` (every submission), `question_progress` (green-card flags).

**Files:**
- Create: `supabase/migrations/003_create_tracking_tables.sql`

- [ ] **Step 1: Write the SQL file**

Contents of `supabase/migrations/003_create_tracking_tables.sql`:

```sql
-- Per-attendee tracking tables. See design spec §3.1.

create table if not exists public.challenge_attempts (
  id           uuid primary key default gen_random_uuid(),
  attendee_id  uuid not null references public.attendees(id) on delete cascade,
  challenge_id int  not null references public.challenges(id) on delete cascade,
  started_at   timestamptz,
  completed_at timestamptz,
  wrong_count  int not null default 0,
  unique (attendee_id, challenge_id)
);

create table if not exists public.answer_attempts (
  id             uuid primary key default gen_random_uuid(),
  attendee_id    uuid not null references public.attendees(id) on delete cascade,
  question_id    uuid not null references public.questions(id) on delete cascade,
  submitted_at   timestamptz not null default now(),
  correct        boolean not null,
  submission_raw text
);

create index if not exists answer_attempts_attendee_question_idx
  on public.answer_attempts (attendee_id, question_id);

create table if not exists public.question_progress (
  attendee_id  uuid not null references public.attendees(id) on delete cascade,
  question_id  uuid not null references public.questions(id) on delete cascade,
  correct_at   timestamptz not null default now(),
  primary key (attendee_id, question_id)
);
```

- [ ] **Step 2: Apply via MCP**

Call `mcp__supabase__apply_migration`:
- `name`: `003_create_tracking_tables`
- `query`: the SQL above

- [ ] **Step 3: Verify via list_tables**

Call `mcp__supabase__list_tables` with `schemas=["public"]`, `verbose=false`.

Expected: response includes all 6 tables (`attendees`, `challenges`, `questions`, `challenge_attempts`, `answer_attempts`, `question_progress`).

- [ ] **Step 4: Verify FK constraints via execute_sql**

Call `mcp__supabase__execute_sql` with:

```sql
select
  conname        as constraint_name,
  conrelid::regclass::text as table_name,
  confrelid::regclass::text as references_table
from pg_constraint
where contype = 'f'
  and conrelid::regclass::text in (
    'public.challenge_attempts',
    'public.answer_attempts',
    'public.question_progress'
  )
order by table_name, constraint_name;
```

Expected: 6 rows (each table has 2 FKs — one to attendees, one to challenges or questions).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/003_create_tracking_tables.sql
git commit -m "Create tracking tables: challenge_attempts, answer_attempts, question_progress"
```

---

## Task 4: Migration 004 — Create views

**Purpose:** `questions_public` (client-readable projection of `questions`, no `answer_hash`) and `leaderboard` (computed view used by `get_leaderboard` RPC and direct reads).

**Files:**
- Create: `supabase/migrations/004_create_views.sql`

- [ ] **Step 1: Write the SQL file**

Contents of `supabase/migrations/004_create_views.sql`:

```sql
-- Client-facing projections. See design spec §3.2.

-- questions_public hides answer_hash from non-privileged callers.
create or replace view public.questions_public as
  select id, challenge_id, order_idx, prompt
  from public.questions;

-- leaderboard is the computed scoreboard joined across three tables.
-- Time formula per spec §3.2:
--   elapsed_ms = (completed_at - started_at) in ms + wrong_count * 15000
-- Nulls (challenge not completed) surface as null elapsed_ms.
create or replace view public.leaderboard as
select
  a.id  as attendee_id,
  a.name,
  coalesce(qp_count.n, 0)::int as questions_complete,
  case
    when c1.completed_at is not null and c1.started_at is not null
    then (extract(epoch from (c1.completed_at - c1.started_at)) * 1000)::bigint
         + c1.wrong_count * 15000
  end as c1_elapsed_ms,
  case
    when c2.completed_at is not null and c2.started_at is not null
    then (extract(epoch from (c2.completed_at - c2.started_at)) * 1000)::bigint
         + c2.wrong_count * 15000
  end as c2_elapsed_ms,
  case
    when c1.completed_at is not null and c1.started_at is not null
     and c2.completed_at is not null and c2.started_at is not null
    then ((extract(epoch from (c1.completed_at - c1.started_at)) * 1000)::bigint + c1.wrong_count * 15000)
       + ((extract(epoch from (c2.completed_at - c2.started_at)) * 1000)::bigint + c2.wrong_count * 15000)
  end as total_ms,
  (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0))::int as wrong_count
from public.attendees a
left join public.challenge_attempts c1 on c1.attendee_id = a.id and c1.challenge_id = 1
left join public.challenge_attempts c2 on c2.attendee_id = a.id and c2.challenge_id = 2
left join (
  select attendee_id, count(*)::int as n
  from public.question_progress
  group by attendee_id
) qp_count on qp_count.attendee_id = a.id;
```

- [ ] **Step 2: Apply via MCP**

Call `mcp__supabase__apply_migration`:
- `name`: `004_create_views`
- `query`: the SQL above

- [ ] **Step 3: Verify the views exist and return the right shape**

Call `mcp__supabase__execute_sql` with:

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('questions_public', 'leaderboard')
order by table_name, ordinal_position;
```

Expected: 4 rows for `questions_public` (`id`, `challenge_id`, `order_idx`, `prompt`), 7 rows for `leaderboard` (`attendee_id`, `name`, `questions_complete`, `c1_elapsed_ms`, `c2_elapsed_ms`, `total_ms`, `wrong_count`).

- [ ] **Step 4: Verify views query cleanly against empty tables**

Call `mcp__supabase__execute_sql` with:

```sql
select count(*) as qp_count from public.questions_public;
select count(*) as lb_count from public.leaderboard;
```

Expected: both return 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/004_create_views.sql
git commit -m "Create questions_public and leaderboard views"
```

---

## Task 5: Migration 005 — Enable RLS + policies

**Purpose:** Lock the mutation surface. RLS is ON for every table. `SELECT` policies scope attendees to their own rows; writes are available only via `SECURITY DEFINER` RPCs (no explicit `INSERT`/`UPDATE`/`DELETE` policies granted, so direct writes from `anon` or `authenticated` are denied). Views inherit from the caller's perspective via granted access.

**Files:**
- Create: `supabase/migrations/005_enable_rls.sql`

- [ ] **Step 1: Write the SQL file**

Contents of `supabase/migrations/005_enable_rls.sql`:

```sql
-- RLS posture per design spec §3.3.
-- All tables: RLS enabled, default-deny.
-- SELECT policies: own rows only (for attendee-scoped data) or world-readable (for reference).
-- No INSERT/UPDATE/DELETE policies — mutations must flow through SECURITY DEFINER RPCs.

-- ============ attendees ============
alter table public.attendees enable row level security;

drop policy if exists "attendees read own row" on public.attendees;
create policy "attendees read own row" on public.attendees
  for select
  using (auth_uid = auth.uid());

-- ============ challenges ============
alter table public.challenges enable row level security;

drop policy if exists "challenges readable by all" on public.challenges;
create policy "challenges readable by all" on public.challenges
  for select
  using (true);

-- ============ questions ============
-- Direct SELECT is denied so answer_hash never leaks.
-- Clients read from the questions_public view instead.
alter table public.questions enable row level security;

-- ============ challenge_attempts ============
alter table public.challenge_attempts enable row level security;

drop policy if exists "challenge_attempts read own" on public.challenge_attempts;
create policy "challenge_attempts read own" on public.challenge_attempts
  for select
  using (attendee_id in (
    select id from public.attendees where auth_uid = auth.uid()
  ));

-- ============ answer_attempts ============
alter table public.answer_attempts enable row level security;

drop policy if exists "answer_attempts read own" on public.answer_attempts;
create policy "answer_attempts read own" on public.answer_attempts
  for select
  using (attendee_id in (
    select id from public.attendees where auth_uid = auth.uid()
  ));

-- ============ question_progress ============
alter table public.question_progress enable row level security;

drop policy if exists "question_progress read own" on public.question_progress;
create policy "question_progress read own" on public.question_progress
  for select
  using (attendee_id in (
    select id from public.attendees where auth_uid = auth.uid()
  ));

-- ============ views ============
-- Views inherit RLS from base tables (security_invoker = off by default
-- for backward compat, but Postgres 15+ supports security_invoker = true).
-- We want:
--   questions_public: readable by anon — grant SELECT directly.
--   leaderboard: readable by anon (names + times only) — grant SELECT directly.
grant select on public.questions_public to anon, authenticated;
grant select on public.leaderboard to anon, authenticated;

-- Also grant SELECT on challenges to anon so the client can list titles.
grant select on public.challenges to anon, authenticated;
```

- [ ] **Step 2: Apply via MCP**

Call `mcp__supabase__apply_migration`:
- `name`: `005_enable_rls`
- `query`: the SQL above

- [ ] **Step 3: Verify RLS is enabled on every CTF table**

Call `mcp__supabase__execute_sql` with:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'attendees', 'challenges', 'questions',
    'challenge_attempts', 'answer_attempts', 'question_progress'
  )
order by relname;
```

Expected: 6 rows, every `relrowsecurity` value = `t` (true).

- [ ] **Step 4: Verify SELECT policies exist**

Call `mcp__supabase__execute_sql` with:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Expected rows:
- `attendees | attendees read own row | SELECT`
- `challenges | challenges readable by all | SELECT`
- `challenge_attempts | challenge_attempts read own | SELECT`
- `answer_attempts | answer_attempts read own | SELECT`
- `question_progress | question_progress read own | SELECT`

(Note: `questions` has RLS enabled but no policies — intentional, so direct reads are denied.)

- [ ] **Step 5: Run Supabase advisor for any security regressions**

Call `mcp__supabase__get_advisors` with `type="security"`.

Expected: no ERROR-level findings related to missing RLS. WARN-level findings about `security_invoker` on views are acceptable (we intentionally bypass view RLS so anon can read the leaderboard).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/005_enable_rls.sql
git commit -m "Enable RLS on all CTF tables with SELECT-own-row policies"
```

---

## Task 6: Migration 006 — `register_attendee` RPC

**Purpose:** Accept name + email, insert a new `attendees` row linked to the caller's `auth.uid()`. Reject on email collision. Idempotent if the same auth user calls it twice (returns the existing attendee_id). Called by the client after `supabase.auth.signInAnonymously()`.

**Files:**
- Create: `supabase/migrations/006_register_attendee_rpc.sql`

- [ ] **Step 1: Write the SQL file**

Contents of `supabase/migrations/006_register_attendee_rpc.sql`:

```sql
-- RPC: register_attendee(name, email)
-- Called by the client immediately after supabase.auth.signInAnonymously().
-- Links the newly-minted auth.users row to an attendees row.
-- Returns ok:true with attendee_id on success.
-- Returns ok:false with error:"email_claimed" if another attendee owns the email.
-- Returns ok:false with error:"not_authenticated" if no session.
-- Idempotent: repeated calls for the same auth.uid() return the existing attendee.

create or replace function public.register_attendee(
  p_name  text,
  p_email text
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_uid      uuid := auth.uid();
  v_attendee_id   uuid;
  v_normalized_em text := lower(trim(p_email));
  v_trimmed_name  text := trim(p_name);
begin
  if v_auth_uid is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_normalized_em = '' or v_trimmed_name = '' then
    return json_build_object('ok', false, 'error', 'missing_fields');
  end if;

  -- Idempotent: already registered by this auth user?
  select id into v_attendee_id
  from public.attendees
  where auth_uid = v_auth_uid;

  if v_attendee_id is not null then
    return json_build_object('ok', true, 'attendee_id', v_attendee_id, 'already_registered', true);
  end if;

  -- Fresh registration.
  begin
    insert into public.attendees (auth_uid, email, name)
    values (v_auth_uid, v_normalized_em, v_trimmed_name)
    returning id into v_attendee_id;
  exception when unique_violation then
    return json_build_object('ok', false, 'error', 'email_claimed');
  end;

  return json_build_object('ok', true, 'attendee_id', v_attendee_id);
end;
$$;

grant execute on function public.register_attendee(text, text) to anon, authenticated;
```

- [ ] **Step 2: Apply via MCP**

Call `mcp__supabase__apply_migration`:
- `name`: `006_register_attendee_rpc`
- `query`: the SQL above

- [ ] **Step 3: Verify the function exists and is callable**

Call `mcp__supabase__execute_sql` with:

```sql
select proname, pg_get_function_identity_arguments(oid) as args, prosecdef as security_definer
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'register_attendee';
```

Expected: one row. `args` = `p_name text, p_email text`. `security_definer` = `t`.

- [ ] **Step 4: Verify the not_authenticated branch**

Call `mcp__supabase__execute_sql` with:

```sql
-- MCP runs as service_role → auth.uid() is null → function returns not_authenticated
select public.register_attendee('Test User', 'test@example.com') as result;
```

Expected: single JSON result of the shape `{"ok": false, "error": "not_authenticated"}`.

(The happy path and email_claimed path require an authenticated client session and will be exercised in Phase 2 integration testing, not here.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/006_register_attendee_rpc.sql
git commit -m "Add register_attendee RPC"
```

---

## Task 7: Migration 007 — `begin_challenge` RPC

**Purpose:** Start the wall-clock for a challenge. Idempotent — if the attendee has already begun, returns the existing `started_at`. Denies unregistered callers.

**Files:**
- Create: `supabase/migrations/007_begin_challenge_rpc.sql`

- [ ] **Step 1: Write the SQL file**

Contents of `supabase/migrations/007_begin_challenge_rpc.sql`:

```sql
-- RPC: begin_challenge(challenge_id)
-- Stamps challenge_attempts.started_at = now() on first call.
-- On repeat calls, preserves the original started_at (idempotent).
-- Returns ok:true with started_at ISO string.
-- Returns ok:false with error:"not_registered" if caller has no attendees row.

create or replace function public.begin_challenge(p_challenge_id int)
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

  insert into public.challenge_attempts (attendee_id, challenge_id, started_at)
  values (v_attendee_id, p_challenge_id, now())
  on conflict (attendee_id, challenge_id) do update
    set started_at = coalesce(public.challenge_attempts.started_at, excluded.started_at)
  returning started_at into v_started_at;

  return json_build_object('ok', true, 'started_at', v_started_at);
end;
$$;

grant execute on function public.begin_challenge(int) to authenticated;
```

- [ ] **Step 2: Apply via MCP**

Call `mcp__supabase__apply_migration`:
- `name`: `007_begin_challenge_rpc`
- `query`: the SQL above

- [ ] **Step 3: Verify the function exists**

Call `mcp__supabase__execute_sql` with:

```sql
select proname, pg_get_function_identity_arguments(oid) as args
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'begin_challenge';
```

Expected: one row. `args` = `p_challenge_id integer`.

- [ ] **Step 4: Verify the not_registered branch**

Call `mcp__supabase__execute_sql` with:

```sql
select public.begin_challenge(1) as result;
```

Expected: `{"ok": false, "error": "not_registered"}` (MCP session has no auth.uid(), so no attendee row linked).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/007_begin_challenge_rpc.sql
git commit -m "Add begin_challenge RPC"
```

---

## Task 8: Migration 008 — `submit_answer` RPC

**Purpose:** The core grader. Hashes the submission, compares to stored hash, logs the attempt, updates `question_progress` on correct or `challenge_attempts.wrong_count` on wrong, marks challenge complete if this was the 5th correct answer.

**Files:**
- Create: `supabase/migrations/008_submit_answer_rpc.sql`

- [ ] **Step 1: Write the SQL file**

Contents of `supabase/migrations/008_submit_answer_rpc.sql`:

```sql
-- RPC: submit_answer(question_id, submission)
-- Full grading pipeline per design spec §3.4.
-- Behaviors:
--   1. Rejects if caller is not registered.
--   2. Rejects if the matching challenge has not been begun (started_at null).
--   3. If question already in question_progress → returns error:"already_answered", no writes.
--   4. Normalizes submission (lower + trim), SHA-256-hashes it, compares to answer_hash.
--   5. Logs every submission to answer_attempts with correct flag + raw submission (200 chars).
--   6. On correct: inserts question_progress.
--   7. On wrong: increments challenge_attempts.wrong_count.
--   8. If all questions in the challenge are correct, sets challenge_attempts.completed_at.
--      (Required count is derived from the questions table — robust to changing question counts.)

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
  -- Identify the caller
  select id into v_attendee_id
  from public.attendees
  where auth_uid = auth.uid();

  if v_attendee_id is null then
    return json_build_object('ok', false, 'error', 'not_registered');
  end if;

  -- Already answered? Lock the card.
  if exists (
    select 1 from public.question_progress
    where attendee_id = v_attendee_id and question_id = p_question_id
  ) then
    return json_build_object('ok', false, 'error', 'already_answered');
  end if;

  -- Look up the question
  select answer_hash, challenge_id
  into v_expected_hash, v_challenge_id
  from public.questions
  where id = p_question_id;

  if v_expected_hash is null then
    return json_build_object('ok', false, 'error', 'question_not_found');
  end if;

  -- Require that begin_challenge has been called for this challenge.
  -- This keeps the elapsed_time math honest (no null started_at rows).
  select started_at into v_challenge_started
  from public.challenge_attempts
  where attendee_id = v_attendee_id and challenge_id = v_challenge_id;

  if v_challenge_started is null then
    return json_build_object('ok', false, 'error', 'challenge_not_begun');
  end if;

  -- Normalize + hash the submission
  v_normalized := lower(trim(coalesce(p_submission, '')));
  v_submitted_hash := encode(extensions.digest(v_normalized, 'sha256'), 'hex');
  v_correct := v_submitted_hash = v_expected_hash;

  -- Log the attempt
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

  -- Tally current correct count for this challenge
  select count(*) into v_total_correct
  from public.question_progress qp
  join public.questions q on q.id = qp.question_id
  where qp.attendee_id = v_attendee_id and q.challenge_id = v_challenge_id;

  -- Derive required count from the questions table so this RPC is robust
  -- to future additions/removals of questions per challenge.
  select count(*) into v_required_count
  from public.questions
  where challenge_id = v_challenge_id;

  -- If all required questions are correct, set completed_at (idempotent)
  if v_required_count > 0 and v_total_correct >= v_required_count then
    update public.challenge_attempts
      set completed_at = coalesce(completed_at, now())
    where attendee_id = v_attendee_id and challenge_id = v_challenge_id;
    v_challenge_complete := true;
  end if;

  -- Read back current wrong_count for the return payload
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
grant execute on function public.submit_answer(uuid, text) to authenticated;
```

- [ ] **Step 2: Apply via MCP**

Call `mcp__supabase__apply_migration`:
- `name`: `008_submit_answer_rpc`
- `query`: the SQL above

- [ ] **Step 3: Verify the function exists**

Call `mcp__supabase__execute_sql` with:

```sql
select proname, pg_get_function_identity_arguments(oid) as args, prosecdef as security_definer
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'submit_answer';
```

Expected: one row. `args` = `p_question_id uuid, p_submission text`. `security_definer` = `t`.

- [ ] **Step 4: Verify the not_registered branch**

Call `mcp__supabase__execute_sql` with:

```sql
select public.submit_answer('00000000-0000-0000-0000-000000000000'::uuid, 'whatever') as result;
```

Expected: `{"ok": false, "error": "not_registered"}` (MCP has no auth.uid()).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/008_submit_answer_rpc.sql
git commit -m "Add submit_answer RPC with full grading pipeline"
```

---

## Task 9: Migration 009 — `get_leaderboard` RPC

**Purpose:** Thin wrapper over the `leaderboard` view with a stable sort order. Anon-readable (names only, no emails).

**Files:**
- Create: `supabase/migrations/009_get_leaderboard_rpc.sql`

- [ ] **Step 1: Write the SQL file**

Contents of `supabase/migrations/009_get_leaderboard_rpc.sql`:

```sql
-- RPC: get_leaderboard()
-- Returns the leaderboard view ordered by the canonical sort:
--   questions_complete DESC, total_ms ASC NULLS LAST, wrong_count ASC.
-- Anon-callable — no emails exposed.

create or replace function public.get_leaderboard()
returns table(
  attendee_id        uuid,
  name               text,
  questions_complete int,
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

- [ ] **Step 2: Apply via MCP**

Call `mcp__supabase__apply_migration`:
- `name`: `009_get_leaderboard_rpc`
- `query`: the SQL above

- [ ] **Step 3: Verify the function returns the expected shape on empty data**

Call `mcp__supabase__execute_sql` with:

```sql
select * from public.get_leaderboard();
```

Expected: zero rows (no attendees yet), but the column headers come back — `attendee_id`, `name`, `questions_complete`, `c1_elapsed_ms`, `c2_elapsed_ms`, `total_ms`, `wrong_count`.

- [ ] **Step 4: Verify function signature**

Call `mcp__supabase__execute_sql` with:

```sql
select proname, pg_get_function_arguments(oid) as args,
       pg_get_function_result(oid) as returns,
       prosecdef as security_definer
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'get_leaderboard';
```

Expected: one row. `args` = (empty). `returns` starts with `TABLE(attendee_id uuid, name text, …)`. `security_definer` = `t`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/009_get_leaderboard_rpc.sql
git commit -m "Add get_leaderboard RPC"
```

---

## Task 10: Migration 010 — Seed challenges

**Purpose:** Insert the two challenge rows. Idempotent via `on conflict do nothing`.

**Files:**
- Create: `supabase/migrations/010_seed_challenges.sql`

- [ ] **Step 1: Write the SQL file**

Contents of `supabase/migrations/010_seed_challenges.sql`:

```sql
-- Seed the two challenges. Idempotent.
-- Titles and slugs are final; subtitles may be tweaked during Phase 7 content authoring.

insert into public.challenges (id, slug, title, subtitle) values
  (1, 'discover-govern', 'Challenge 1 — Discover & Govern', 'Agentic Discovery and Posture Management'),
  (2, 'protect',         'Challenge 2 — Protect',           'Runtime Protection in action')
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply via MCP**

Call `mcp__supabase__apply_migration`:
- `name`: `010_seed_challenges`
- `query`: the SQL above

- [ ] **Step 3: Verify the two rows exist**

Call `mcp__supabase__execute_sql` with:

```sql
select id, slug, title, subtitle from public.challenges order by id;
```

Expected: exactly 2 rows with `id` = 1 and 2, slugs `discover-govern` and `protect`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/010_seed_challenges.sql
git commit -m "Seed the two challenge rows"
```

---

## Task 11: Migration 011 — Seed placeholder questions

**Purpose:** Insert 10 placeholder rows in `questions` (5 per challenge). Real content lands in Phase 7 — this just lets UI development target real row IDs.

**Files:**
- Create: `supabase/migrations/011_seed_placeholder_questions.sql`

- [ ] **Step 1: Write the SQL file**

Contents of `supabase/migrations/011_seed_placeholder_questions.sql`:

```sql
-- Placeholder questions for UI development. Phase 7 will replace these with real
-- content and answers. Hashes below correspond to literal answers shown in
-- comments (useful during Phase 2/3/4 UI smoke tests).
-- Idempotent via (challenge_id, order_idx) unique constraint.

insert into public.questions (challenge_id, order_idx, prompt, answer_hash) values
  -- Challenge 1 placeholders (answers: placeholder-c1-q1 through placeholder-c1-q5)
  (1, 1, 'Placeholder C1 Q1 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c1-q1', 'sha256'), 'hex')),
  (1, 2, 'Placeholder C1 Q2 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c1-q2', 'sha256'), 'hex')),
  (1, 3, 'Placeholder C1 Q3 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c1-q3', 'sha256'), 'hex')),
  (1, 4, 'Placeholder C1 Q4 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c1-q4', 'sha256'), 'hex')),
  (1, 5, 'Placeholder C1 Q5 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c1-q5', 'sha256'), 'hex')),
  -- Challenge 2 placeholders (answers: placeholder-c2-q1 through placeholder-c2-q5)
  (2, 1, 'Placeholder C2 Q1 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c2-q1', 'sha256'), 'hex')),
  (2, 2, 'Placeholder C2 Q2 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c2-q2', 'sha256'), 'hex')),
  (2, 3, 'Placeholder C2 Q3 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c2-q3', 'sha256'), 'hex')),
  (2, 4, 'Placeholder C2 Q4 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c2-q4', 'sha256'), 'hex')),
  (2, 5, 'Placeholder C2 Q5 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c2-q5', 'sha256'), 'hex'))
on conflict (challenge_id, order_idx) do nothing;
```

- [ ] **Step 2: Apply via MCP**

Call `mcp__supabase__apply_migration`:
- `name`: `011_seed_placeholder_questions`
- `query`: the SQL above

- [ ] **Step 3: Verify the 10 rows exist**

Call `mcp__supabase__execute_sql` with:

```sql
select challenge_id, order_idx, prompt
from public.questions
order by challenge_id, order_idx;
```

Expected: exactly 10 rows — challenge_id 1 with order_idx 1..5, challenge_id 2 with order_idx 1..5.

- [ ] **Step 4: Verify the hash is computable and matches**

Call `mcp__supabase__execute_sql` with:

```sql
select
  challenge_id,
  order_idx,
  encode(extensions.digest('placeholder-c1-q1', 'sha256'), 'hex') = answer_hash
    as c1q1_match
from public.questions
where challenge_id = 1 and order_idx = 1;
```

Expected: one row with `c1q1_match` = `t`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/011_seed_placeholder_questions.sql
git commit -m "Seed 10 placeholder questions (5 per challenge)"
```

---

## Task 12: End-to-end verification + migration log snapshot

**Purpose:** Confirm the full stack is live, migrations are all recorded server-side, and advisors are clean.

**Files:**
- No new files.

- [ ] **Step 1: List applied migrations**

Call `mcp__supabase__list_migrations` with no arguments.

Expected: at minimum these 11 migrations listed, in order:
```
001_enable_pgcrypto
002_create_core_tables
003_create_tracking_tables
004_create_views
005_enable_rls
006_register_attendee_rpc
007_begin_challenge_rpc
008_submit_answer_rpc
009_get_leaderboard_rpc
010_seed_challenges
011_seed_placeholder_questions
```

- [ ] **Step 2: Run security advisors**

Call `mcp__supabase__get_advisors` with `type="security"`.

Expected: no ERROR-level findings. Acceptable: WARN-level findings about `security_invoker` on views (documented decision — leaderboard intentionally bypasses base-table RLS).

- [ ] **Step 3: Run performance advisors**

Call `mcp__supabase__get_advisors` with `type="performance"`.

Expected: no critical findings. Informational notes about missing indexes on small tables (6 rows) can be ignored.

- [ ] **Step 4: Smoke-test the four RPCs return their expected error shapes**

Call `mcp__supabase__execute_sql` with:

```sql
select
  public.register_attendee('X', 'x@x.com')                                as register_r,
  public.begin_challenge(1)                                               as begin_r,
  public.submit_answer('00000000-0000-0000-0000-000000000000'::uuid, 'x') as submit_r;
```

Expected: three JSON columns returning the "not authenticated" / "not registered" shapes:
- `register_r` → `{"ok": false, "error": "not_authenticated"}`
- `begin_r` → `{"ok": false, "error": "not_registered"}`
- `submit_r` → `{"ok": false, "error": "not_registered"}`

- [ ] **Step 5: Verify the public surface**

Call `mcp__supabase__execute_sql` with:

```sql
-- This is exactly what the client will run via the anon key.
-- Must succeed without referencing answer_hash.
select id, challenge_id, order_idx, prompt
from public.questions_public
order by challenge_id, order_idx
limit 3;

select count(*) as total from public.challenges;
select count(*) as total from public.leaderboard;
```

Expected:
- First query: 3 rows of placeholder prompts.
- `challenges` count: 2.
- `leaderboard` count: 0 (no attendees yet).

- [ ] **Step 6: Verify questions.answer_hash is NOT readable through the public projection**

Call `mcp__supabase__execute_sql` with:

```sql
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'questions_public';
```

Expected: exactly 4 rows — `id`, `challenge_id`, `order_idx`, `prompt`. No `answer_hash`.

- [ ] **Step 7: Write a verification log**

Create `supabase/VERIFICATION-PHASE-1.md` with this content, filling in actual results from the steps above:

```markdown
# Phase 1 verification log

**Date applied:** 2026-04-20
**Project:** cttpfrwphcqpjwmwothb

## Migrations applied (per list_migrations)

1. 001_enable_pgcrypto
2. 002_create_core_tables
3. 003_create_tracking_tables
4. 004_create_views
5. 005_enable_rls
6. 006_register_attendee_rpc
7. 007_begin_challenge_rpc
8. 008_submit_answer_rpc
9. 009_get_leaderboard_rpc
10. 010_seed_challenges
11. 011_seed_placeholder_questions

## Tables created

attendees, challenges, questions, challenge_attempts, answer_attempts, question_progress — all with RLS enabled.

## Views created

questions_public, leaderboard — both readable by anon.

## RPCs created

register_attendee(text, text), begin_challenge(int), submit_answer(uuid, text), get_leaderboard() — all SECURITY DEFINER, grants set.

## Advisor results

Security: <paste get_advisors(security) summary here>
Performance: <paste get_advisors(performance) summary here>

## Smoke test outputs

RPC not-authenticated error shapes confirmed (see Task 12 Step 4 output).

Public surface shows questions_public has 4 columns (no answer_hash leak), challenges count = 2, leaderboard count = 0.
```

- [ ] **Step 8: Commit**

```bash
git add supabase/VERIFICATION-PHASE-1.md
git commit -m "Log Phase 1 verification results"
```

---

## Completion criteria

Phase 1 is done when:

- All 11 migration files exist under `supabase/migrations/` and are committed to git.
- `mcp__supabase__list_migrations` returns all 11 as applied.
- All 6 tables have `relrowsecurity = t` (RLS enabled).
- All 4 RPCs exist with `prosecdef = t` (SECURITY DEFINER) and are callable.
- `questions_public` view projects 4 columns (no `answer_hash`).
- `leaderboard` view exists and returns 0 rows against empty data.
- The 2 challenge rows and 10 placeholder question rows are present.
- `get_advisors(security)` has no ERROR-level findings.
- `supabase/VERIFICATION-PHASE-1.md` committed with results.

After this plan, Phase 2 (client routing + `RegistrationGate`) can proceed against a stable, testable data layer.
