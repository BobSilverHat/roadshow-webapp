-- 027_alt_answer_hashes.sql
-- Adds support for multi-answer questions: a question may now accept a
-- primary `answer_hash` OR any of N alternates listed in
-- `alt_answer_hashes`. Useful for questions where two distinct correct
-- payloads exist (e.g. "the IP + ONE of these two user-agents").
--
-- Existing single-answer questions are unaffected — the new column
-- defaults to '{}' (empty array) and the OR-check below short-circuits
-- on the primary hash exactly as before.
--
-- Two changes:
--   1. ALTER public.questions ADD COLUMN alt_answer_hashes text[].
--   2. CREATE OR REPLACE submit_answer() — same body as 020 with the
--      correctness check broadened to `primary OR any(alts)`.

-- ---------------------------------------------------------------------
-- 1. schema
-- ---------------------------------------------------------------------
alter table public.questions
  add column if not exists alt_answer_hashes text[] not null default '{}'::text[];

-- ---------------------------------------------------------------------
-- 2. submit_answer — broaden the correctness check
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

  -- GLOBAL expiry: same clock for everyone, anchored on workshop_config.opened_at.
  select opened_at into v_opened_at from public.workshop_config where id = 1;
  if v_opened_at is null then
    return json_build_object('ok', false, 'error', 'challenge_locked');
  end if;
  if now() > v_opened_at + interval '35 minutes' then
    return json_build_object('ok', false, 'error', 'time_expired');
  end if;

  -- Canonicalize (order-tolerant for multi-value answers).
  v_normalized     := public.normalize_answer(p_submission);
  v_submitted_hash := encode(extensions.digest(v_normalized, 'sha256'), 'hex');
  -- Accept the primary hash OR any alternate (multi-answer questions).
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
    'ok', true,
    'correct', v_correct,
    'wrong_count', coalesce(v_wrong_count, 0),
    'total_correct', v_total_correct,
    'required_count', v_required_count,
    'challenge_complete', v_challenge_complete
  );
end;
$$;

revoke execute on function public.submit_answer(uuid, text) from public;
revoke execute on function public.submit_answer(uuid, text) from anon;
grant  execute on function public.submit_answer(uuid, text) to authenticated;
