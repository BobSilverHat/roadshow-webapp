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
