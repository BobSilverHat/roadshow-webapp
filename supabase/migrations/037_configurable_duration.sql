-- 037_configurable_duration.sql
-- Make the workshop window length configurable. duration_minutes already added
-- in 036 (idempotent here). Recreate the live expiry-bearing functions to read it.
--
-- Behavior is preserved exactly: duration_minutes defaults to 35, so every
-- expiry expression below (duration * interval '1 minute', duration * 60000)
-- evaluates to today's hardcoded `interval '35 minutes'` / 2,100,000 ms cap
-- when the default is in effect. The ONLY change from the live definitions is
-- reading duration_minutes from workshop_config and deriving the window from it.

-- ---------------------------------------------------------------------
-- Task 5 — column + locale CHECK (both idempotent; live state already has
-- duration_minutes and default_locale from 036, but keep this re-runnable).
-- ---------------------------------------------------------------------
alter table public.workshop_config add column if not exists duration_minutes int not null default 35;
do $$ begin
  alter table public.workshop_config add constraint workshop_config_locale_chk check (default_locale in ('en','pt-BR'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Task 6 — submit_answer: read duration_minutes, gate expiry on it.
-- Preserves the review_mode bypass AND the alt_answer_hashes OR-check.
-- ---------------------------------------------------------------------
create or replace function public.submit_answer(p_question_id uuid, p_submission text)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_attendee_id uuid; v_challenge_id int; v_challenge_started timestamptz;
  v_opened_at timestamptz; v_review_mode boolean; v_duration int;
  v_expected_hash text; v_alt_hashes text[]; v_normalized text; v_submitted_hash text;
  v_correct boolean; v_wrong_count int; v_total_correct int; v_required_count int;
  v_challenge_complete boolean := false;
begin
  select id into v_attendee_id from public.attendees where auth_uid = auth.uid();
  if v_attendee_id is null then return json_build_object('ok',false,'error','not_registered'); end if;
  if exists (select 1 from public.question_progress where attendee_id=v_attendee_id and question_id=p_question_id) then
    return json_build_object('ok',false,'error','already_answered'); end if;
  select answer_hash, alt_answer_hashes, challenge_id into v_expected_hash, v_alt_hashes, v_challenge_id
    from public.questions where id=p_question_id;
  if v_expected_hash is null then return json_build_object('ok',false,'error','question_not_found'); end if;
  select started_at into v_challenge_started from public.challenge_attempts
    where attendee_id=v_attendee_id and challenge_id=v_challenge_id;
  if v_challenge_started is null then return json_build_object('ok',false,'error','challenge_not_begun'); end if;
  select opened_at, review_mode, duration_minutes into v_opened_at, v_review_mode, v_duration
    from public.workshop_config where id=1;
  if v_opened_at is null then return json_build_object('ok',false,'error','challenge_locked'); end if;
  if not coalesce(v_review_mode,false) and now() > v_opened_at + (v_duration * interval '1 minute') then
    return json_build_object('ok',false,'error','time_expired'); end if;
  v_normalized := public.normalize_answer(p_submission);
  v_submitted_hash := encode(extensions.digest(v_normalized,'sha256'),'hex');
  v_correct := v_submitted_hash = v_expected_hash or v_submitted_hash = any(coalesce(v_alt_hashes,'{}'::text[]));
  insert into public.answer_attempts (attendee_id, question_id, correct, submission_raw)
    values (v_attendee_id, p_question_id, v_correct, left(v_normalized,200));
  if v_correct then
    insert into public.question_progress (attendee_id, question_id) values (v_attendee_id, p_question_id)
      on conflict (attendee_id, question_id) do nothing;
  else
    update public.challenge_attempts set wrong_count=wrong_count+1
      where attendee_id=v_attendee_id and challenge_id=v_challenge_id;
  end if;
  select count(*) into v_total_correct from public.question_progress qp
    join public.questions q on q.id=qp.question_id
    where qp.attendee_id=v_attendee_id and q.challenge_id=v_challenge_id;
  select count(*) into v_required_count from public.questions where challenge_id=v_challenge_id;
  if v_required_count > 0 and v_total_correct >= v_required_count then
    update public.challenge_attempts set completed_at=coalesce(completed_at,now())
      where attendee_id=v_attendee_id and challenge_id=v_challenge_id;
    v_challenge_complete := true;
  end if;
  select wrong_count into v_wrong_count from public.challenge_attempts
    where attendee_id=v_attendee_id and challenge_id=v_challenge_id;
  return json_build_object('ok',true,'correct',v_correct,'wrong_count',coalesce(v_wrong_count,0),
    'total_correct',v_total_correct,'required_count',v_required_count,'challenge_complete',v_challenge_complete);
end; $$;
revoke execute on function public.submit_answer(uuid,text) from public, anon;
grant execute on function public.submit_answer(uuid,text) to authenticated;

-- ---------------------------------------------------------------------
-- Task 7 — request_hint (3-arg locale version from 033): read duration,
-- gate expiry on it. Preserves hints_pt / p_locale selection.
-- ---------------------------------------------------------------------
create or replace function public.request_hint(p_question_id uuid, p_hint_idx int, p_locale text default 'en')
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_attendee_id uuid; v_challenge_id int; v_hints text[]; v_hints_pt text[];
  v_started_at timestamptz; v_opened_at timestamptz; v_duration int;
  v_hint_text text; v_inserted int;
begin
  select id into v_attendee_id from public.attendees where auth_uid = auth.uid();
  if v_attendee_id is null then return json_build_object('ok',false,'error','not_registered'); end if;
  select hints, hints_pt, challenge_id into v_hints, v_hints_pt, v_challenge_id
    from public.questions where id = p_question_id;
  if v_hints is null then return json_build_object('ok',false,'error','question_not_found'); end if;
  if p_hint_idx < 0 or p_hint_idx >= cardinality(v_hints) then
    return json_build_object('ok',false,'error','hint_out_of_range'); end if;
  if exists (select 1 from public.question_progress where attendee_id=v_attendee_id and question_id=p_question_id) then
    return json_build_object('ok',false,'error','already_solved'); end if;
  select started_at into v_started_at from public.challenge_attempts
    where attendee_id=v_attendee_id and challenge_id=v_challenge_id;
  if v_started_at is null then return json_build_object('ok',false,'error','challenge_not_begun'); end if;
  select opened_at, duration_minutes into v_opened_at, v_duration from public.workshop_config where id=1;
  if v_opened_at is null then return json_build_object('ok',false,'error','challenge_locked'); end if;
  if now() > v_opened_at + (v_duration * interval '1 minute') then
    return json_build_object('ok',false,'error','time_expired'); end if;
  if p_locale = 'pt-BR' and v_hints_pt is not null and v_hints_pt[p_hint_idx + 1] is not null then
    v_hint_text := v_hints_pt[p_hint_idx + 1];
  else
    v_hint_text := v_hints[p_hint_idx + 1];
  end if;
  with ins as (
    insert into public.hint_usage (attendee_id, question_id, hint_idx)
    values (v_attendee_id, p_question_id, p_hint_idx)
    on conflict (attendee_id, question_id, hint_idx) do nothing returning 1)
  select count(*) into v_inserted from ins;
  return json_build_object('ok',true,'hint',v_hint_text,'hint_idx',p_hint_idx,
    'already_charged', v_inserted = 0, 'penalty_ms', 60000);
end; $$;
revoke execute on function public.request_hint(uuid,int,text) from public, anon;
grant execute on function public.request_hint(uuid,int,text) to authenticated;

-- ---------------------------------------------------------------------
-- Task 8 — leaderboard view: add duration_minutes to the gate CTE; derive
-- the expiry predicate and the 35-min cap from it. Recreated from the live
-- definition (== migration 032's view); ONLY the two duration edits differ.
-- create-or-replace keeps the column shape identical, so get_leaderboard()
-- stays valid and is intentionally NOT touched.
-- ---------------------------------------------------------------------
create or replace view public.leaderboard as
with q as (
  select attendee_id, count(*)::int as n
  from public.question_progress group by attendee_id
),
h as (
  select attendee_id, count(*)::int as n
  from public.hint_usage group by attendee_id
),
gate as (
  select opened_at, coalesce(review_mode, false) as review_mode, duration_minutes
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
    -- Expired without both completed → cap at the configured window. ONLY
    -- fires when review_mode is off, so demo runs don't collapse total_ms.
    when not (select review_mode from gate)
     and (select opened_at from gate) is not null
     and now() > (select opened_at from gate) + ((select duration_minutes from gate) * interval '1 minute')
    then ((select duration_minutes from gate) * 60000)::bigint
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

-- ---------------------------------------------------------------------
-- Task 9 — begin_workshop: recreated identically except the stale
-- 'expires_at' key is dropped from the returned object (client never uses
-- it, and it would otherwise hardcode the 35-min window).
-- ---------------------------------------------------------------------
create or replace function public.begin_workshop()
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_attendee_id uuid;
  v_started_at  timestamptz;
  v_open        boolean;
begin
  select id into v_attendee_id
  from public.attendees
  where auth_uid = auth.uid();

  if v_attendee_id is null then
    return json_build_object('ok', false, 'error', 'not_registered');
  end if;

  select challenge_open into v_open from public.workshop_config where id = 1;
  if not coalesce(v_open, false) then
    return json_build_object('ok', false, 'error', 'challenge_locked');
  end if;

  insert into public.challenge_attempts (attendee_id, challenge_id, started_at)
  values
    (v_attendee_id, 1, now()),
    (v_attendee_id, 2, now())
  on conflict (attendee_id, challenge_id) do update
    set started_at = coalesce(public.challenge_attempts.started_at, excluded.started_at);

  select started_at into v_started_at
  from public.challenge_attempts
  where attendee_id = v_attendee_id and challenge_id = 1;

  return json_build_object(
    'ok', true,
    'started_at', v_started_at
  );
end;
$$;

revoke execute on function public.begin_workshop() from public;
revoke execute on function public.begin_workshop() from anon;
grant  execute on function public.begin_workshop() to authenticated;
