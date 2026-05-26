-- 032_review_mode.sql
-- Adds a review-mode flag for pre-workshop demos / handoffs / dry-runs.
-- When workshop_config.review_mode is true:
--   1. submit_answer skips the time_expired guard — submissions never
--      expire while the flag is on.
--   2. The leaderboard view skips the expiry-based total_ms fallback —
--      total_ms only settles on real completions, not on the 35-min clock.
--   3. Clients render "REVIEW MODE" in place of the countdown (frontend
--      change, not in this migration).
--
-- All admin via the single boolean column; default false so production
-- timing logic is unchanged unless explicitly opted in.

alter table public.workshop_config
  add column if not exists review_mode boolean not null default false;

-- ---------------------------------------------------------------------
-- submit_answer — skip time_expired when review_mode is on
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
  v_opened_at           timestamptz;
  v_review_mode         boolean;
  v_expected_hash       text;
  v_alt_hashes          text[];
  v_normalized          text;
  v_submitted_hash      text;
  v_correct             boolean;
  v_wrong_count         int;
  v_total_correct       int;
  v_required_count      int;
  v_challenge_complete  boolean := false;
begin
  select id into v_attendee_id from public.attendees where auth_uid = auth.uid();
  if v_attendee_id is null then
    return json_build_object('ok', false, 'error', 'not_registered');
  end if;

  if exists (
    select 1 from public.question_progress
    where attendee_id = v_attendee_id and question_id = p_question_id
  ) then
    return json_build_object('ok', false, 'error', 'already_answered');
  end if;

  select answer_hash, alt_answer_hashes, challenge_id
  into v_expected_hash, v_alt_hashes, v_challenge_id
  from public.questions where id = p_question_id;
  if v_expected_hash is null then
    return json_build_object('ok', false, 'error', 'question_not_found');
  end if;

  select started_at into v_challenge_started
  from public.challenge_attempts
  where attendee_id = v_attendee_id and challenge_id = v_challenge_id;
  if v_challenge_started is null then
    return json_build_object('ok', false, 'error', 'challenge_not_begun');
  end if;

  select opened_at, review_mode into v_opened_at, v_review_mode
  from public.workshop_config where id = 1;
  if v_opened_at is null then
    return json_build_object('ok', false, 'error', 'challenge_locked');
  end if;
  if not coalesce(v_review_mode, false)
     and now() > v_opened_at + interval '35 minutes' then
    return json_build_object('ok', false, 'error', 'time_expired');
  end if;

  v_normalized     := public.normalize_answer(p_submission);
  v_submitted_hash := encode(extensions.digest(v_normalized, 'sha256'), 'hex');
  v_correct        := v_submitted_hash = v_expected_hash
                      or v_submitted_hash = any(coalesce(v_alt_hashes, '{}'::text[]));

  insert into public.answer_attempts (attendee_id, question_id, correct, submission_raw)
  values (v_attendee_id, p_question_id, v_correct, left(v_normalized, 200));

  if v_correct then
    insert into public.question_progress (attendee_id, question_id)
    values (v_attendee_id, p_question_id)
    on conflict (attendee_id, question_id) do nothing;
  else
    update public.challenge_attempts set wrong_count = wrong_count + 1
    where attendee_id = v_attendee_id and challenge_id = v_challenge_id;
  end if;

  select count(*) into v_total_correct
  from public.question_progress qp
  join public.questions q on q.id = qp.question_id
  where qp.attendee_id = v_attendee_id and q.challenge_id = v_challenge_id;

  select count(*) into v_required_count
  from public.questions where challenge_id = v_challenge_id;

  if v_required_count > 0 and v_total_correct >= v_required_count then
    update public.challenge_attempts set completed_at = coalesce(completed_at, now())
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
-- leaderboard view — gate the expiry-fallback branch on !review_mode
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
  select opened_at, coalesce(review_mode, false) as review_mode
  from public.workshop_config where id = 1
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
    -- Both completed → personal wallclock + penalties.
    when c1.completed_at is not null and c2.completed_at is not null
     and c1.started_at  is not null
    then (extract(epoch from (greatest(c1.completed_at, c2.completed_at) - c1.started_at)) * 1000)::bigint
         + (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0)) * 15000
         + coalesce(h.n, 0) * 60000
    -- Expired without both completed → cap at 35min. ONLY fires when
    -- review_mode is off, so demo runs don't collapse total_ms.
    when not (select review_mode from gate)
     and (select opened_at from gate) is not null
     and now() > (select opened_at from gate) + interval '35 minutes'
    then (extract(epoch from interval '35 minutes') * 1000)::bigint
         + (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0)) * 15000
         + coalesce(h.n, 0) * 60000
    -- Still running.
    else null
  end                                         as total_ms,
  (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0))::int as wrong_count
from public.attendees a
left join public.challenge_attempts c1 on c1.attendee_id = a.id and c1.challenge_id = 1
left join public.challenge_attempts c2 on c2.attendee_id = a.id and c2.challenge_id = 2
left join q on q.attendee_id = a.id
left join h on h.attendee_id = a.id;

grant select on public.leaderboard to anon, authenticated;

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
