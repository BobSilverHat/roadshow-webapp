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

  -- 7. Idempotent insert. v_inserted=1 on first write, 0 on conflict.
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
--    Existing view has a different column order, so we drop+recreate.
--    get_leaderboard() depends on it, so drop the function first.
-- ---------------------------------------------------------------------
drop function if exists public.get_leaderboard();
drop view if exists public.leaderboard;

create view public.leaderboard as
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
    when c1.completed_at is not null and c2.completed_at is not null
     and c1.started_at  is not null
    then (extract(epoch from (greatest(c1.completed_at, c2.completed_at) - c1.started_at)) * 1000)::bigint
         + (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0)) * 15000
         + coalesce(h.n, 0) * 60000
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
