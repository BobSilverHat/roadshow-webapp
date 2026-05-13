-- 016_shared_workshop_timer.sql
-- Adds shared 35-minute workshop timer model:
--   1. New RPC begin_workshop() — stamps both challenge_attempts rows
--      atomically with the same started_at. Idempotent.
--   2. Updates submit_answer() to reject submissions past
--      started_at + 35 minutes with error:'time_expired'.
--   3. Rewrites public.leaderboard view so total_ms settles when both
--      challenges are completed OR the workshop window has expired,
--      enabling deterministic ranking for partial finishers.
--
-- Semantic change vs. 004_create_views.sql: c1_elapsed_ms / c2_elapsed_ms
-- now hold raw wall-clock time (completed_at - c1.started_at), without
-- the per-challenge +15s penalty rollup. The penalty rolls into
-- total_ms only. UI relabels these columns to milestone semantics
-- ("Challenge 1 done at MM:SS").
--
-- Duration source-of-truth note: the 35-minute window is duplicated in
-- begin_workshop (expires_at calc), submit_answer (time_expired guard),
-- and this view (both total_ms branches). All three must change together
-- if the workshop length is ever tuned. Mirrored client-side by
-- WORKSHOP_DURATION_MS in shared/const.ts.

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
    then (extract(epoch from interval '35 minutes') * 1000)::bigint
         + (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0)) * 15000
    -- Still actively running
    else null
  end                                        as total_ms,
  (coalesce(c1.wrong_count, 0) + coalesce(c2.wrong_count, 0))::int as wrong_count
from public.attendees a
left join public.challenge_attempts c1 on c1.attendee_id = a.id and c1.challenge_id = 1
left join public.challenge_attempts c2 on c2.attendee_id = a.id and c2.challenge_id = 2
left join q on q.attendee_id = a.id;
