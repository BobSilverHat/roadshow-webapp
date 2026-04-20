-- Harden begin_challenge: catch foreign_key_violation when the caller
-- passes a challenge_id that doesn't exist in public.challenges. Without
-- this, the INSERT bubbles up as a raw Postgres error to the client.
--
-- Function body is unchanged aside from the wrapping BEGIN/EXCEPTION.

create or replace function public.begin_challenge(p_challenge_id int)
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

  begin
    insert into public.challenge_attempts (attendee_id, challenge_id, started_at)
    values (v_attendee_id, p_challenge_id, now())
    on conflict (attendee_id, challenge_id) do update
      set started_at = coalesce(public.challenge_attempts.started_at, excluded.started_at)
    returning started_at into v_started_at;
  exception when foreign_key_violation then
    return json_build_object('ok', false, 'error', 'invalid_challenge');
  end;

  return json_build_object('ok', true, 'started_at', v_started_at);
end;
$$;

-- Grants unchanged but re-applied for idempotency.
revoke execute on function public.begin_challenge(int) from public;
grant execute on function public.begin_challenge(int) to authenticated;
