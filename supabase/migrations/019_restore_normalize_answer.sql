-- 019_restore_normalize_answer.sql
-- REGRESSION FIX: migration 016 (the shared-workshop-timer migration)
-- rewrote submit_answer and inadvertently dropped the
-- public.normalize_answer() call, falling back to plain lower(trim(...)).
-- Stored hashes were computed with normalize_answer, which sorts
-- comma-separated values alphabetically — so submissions whose values
-- happened to be in non-alphabetical order failed to match.
--
-- Affected questions: any with multi-value (comma-separated) answers.
-- In the current seed: Challenge 1 Q1 and Q2. All others are single-value.
--
-- This migration restores normalize_answer in submit_answer while
-- preserving the time_expired guard added in 016. No data changes.

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

  -- Workshop hard lock past the 35-minute window. No writes.
  if now() > v_challenge_started + interval '35 minutes' then
    return json_build_object('ok', false, 'error', 'time_expired');
  end if;

  -- Canonicalize: lowercase, trim, split on commas, sort alphabetically,
  -- rejoin. Order-tolerant for multi-value answers.
  v_normalized     := public.normalize_answer(p_submission);
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
