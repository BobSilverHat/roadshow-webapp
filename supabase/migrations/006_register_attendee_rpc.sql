-- RPC: register_attendee(name, email)
-- Called by the client immediately after supabase.auth.signInAnonymously().
-- Links the newly-minted auth.users row to an attendees row.
-- Returns ok:true with attendee_id on success.
-- Returns ok:false with error:"email_claimed" if another attendee owns the email.
-- Returns ok:false with error:"not_authenticated" if no session.
-- Idempotent: repeated calls for the same auth.uid() return the existing attendee.

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
  exception when unique_violation then
    return json_build_object('ok', false, 'error', 'email_claimed');
  end;

  return json_build_object('ok', true, 'attendee_id', v_attendee_id);
end;
$$;

grant execute on function public.register_attendee(text, text) to anon, authenticated;
