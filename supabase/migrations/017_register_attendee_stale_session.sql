-- 017_register_attendee_stale_session.sql
-- Harden register_attendee against the post-wipe scenario:
--   The client may hold a JWT whose auth.uid() no longer exists in
--   auth.users (because a workshop reset wiped the auth tree). Inserting
--   into attendees then trips attendees_auth_uid_fkey, which surfaces as
--   a raw Postgres error.
--
-- Fix: catch foreign_key_violation and return {ok:false, error:'stale_session'}
-- so the client can sign out + re-sign-in anonymously + retry.

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
  exception
    when unique_violation then
      return json_build_object('ok', false, 'error', 'email_claimed');
    when foreign_key_violation then
      -- auth.uid() no longer exists in auth.users (e.g., workshop reset
      -- wiped the auth tree). Client should sign out, sign in anonymously
      -- with a fresh user, and retry.
      return json_build_object('ok', false, 'error', 'stale_session');
  end;

  return json_build_object('ok', true, 'attendee_id', v_attendee_id);
end;
$$;

grant execute on function public.register_attendee(text, text) to anon, authenticated;
