-- 033_pt_translations.sql
-- pt-BR localization: translated columns for CTF content, a locale-aware
-- request_hint, and a per-event default_locale. All additive/nullable;
-- submit_answer / answer_hash / normalize_answer are UNTOUCHED (answers
-- stay English, matched against the English Salt platform).

alter table public.challenges
  add column if not exists title_pt    text,
  add column if not exists subtitle_pt text;

alter table public.questions
  add column if not exists prompt_pt text,
  add column if not exists hints_pt  text[];

alter table public.workshop_config
  add column if not exists default_locale text not null default 'en';

-- questions_public: expose pt fields. NOTE: create-or-replace view cannot
-- reorder/rename existing columns — new columns MUST be appended at the end,
-- preserving the original (id, challenge_id, order_idx, prompt, hint_count)
-- prefix. Client selects by name, so trailing order is irrelevant.
create or replace view public.questions_public as
  select id, challenge_id, order_idx,
         prompt,
         cardinality(hints) as hint_count,
         prompt_pt,
         hints_pt
  from public.questions;
grant select on public.questions_public to anon, authenticated;

-- request_hint: locale-aware (drop 2-arg, recreate 3-arg with default).
-- Body identical to migration 023 except hint text resolves per locale.
drop function if exists public.request_hint(uuid, int);
create function public.request_hint(
  p_question_id uuid, p_hint_idx int, p_locale text default 'en'
) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_attendee_id uuid; v_challenge_id int;
  v_hints text[]; v_hints_pt text[];
  v_started_at timestamptz; v_opened_at timestamptz;
  v_hint_text text; v_inserted int;
begin
  select id into v_attendee_id from public.attendees where auth_uid = auth.uid();
  if v_attendee_id is null then return json_build_object('ok', false, 'error', 'not_registered'); end if;

  select hints, hints_pt, challenge_id into v_hints, v_hints_pt, v_challenge_id
  from public.questions where id = p_question_id;
  if v_hints is null then return json_build_object('ok', false, 'error', 'question_not_found'); end if;

  if p_hint_idx < 0 or p_hint_idx >= cardinality(v_hints) then
    return json_build_object('ok', false, 'error', 'hint_out_of_range'); end if;

  if exists (select 1 from public.question_progress
             where attendee_id = v_attendee_id and question_id = p_question_id) then
    return json_build_object('ok', false, 'error', 'already_solved'); end if;

  select started_at into v_started_at from public.challenge_attempts
  where attendee_id = v_attendee_id and challenge_id = v_challenge_id;
  if v_started_at is null then return json_build_object('ok', false, 'error', 'challenge_not_begun'); end if;

  select opened_at into v_opened_at from public.workshop_config where id = 1;
  if v_opened_at is null then return json_build_object('ok', false, 'error', 'challenge_locked'); end if;
  if now() > v_opened_at + interval '35 minutes' then
    return json_build_object('ok', false, 'error', 'time_expired'); end if;

  if p_locale = 'pt-BR' and v_hints_pt is not null and v_hints_pt[p_hint_idx + 1] is not null then
    v_hint_text := v_hints_pt[p_hint_idx + 1];
  else
    v_hint_text := v_hints[p_hint_idx + 1];
  end if;

  with ins as (
    insert into public.hint_usage (attendee_id, question_id, hint_idx)
    values (v_attendee_id, p_question_id, p_hint_idx)
    on conflict (attendee_id, question_id, hint_idx) do nothing
    returning 1)
  select count(*) into v_inserted from ins;

  return json_build_object('ok', true, 'hint', v_hint_text, 'hint_idx', p_hint_idx,
                           'already_charged', v_inserted = 0, 'penalty_ms', 60000);
end; $$;
revoke execute on function public.request_hint(uuid, int, text) from public;
revoke execute on function public.request_hint(uuid, int, text) from anon;
grant  execute on function public.request_hint(uuid, int, text) to authenticated;
