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
