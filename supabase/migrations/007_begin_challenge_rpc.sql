-- RPC: begin_challenge(challenge_id)
-- Stamps challenge_attempts.started_at = now() on first call.
-- On repeat calls, preserves the original started_at (idempotent).
-- Returns ok:true with started_at ISO string.
-- Returns ok:false with error:"not_registered" if caller has no attendees row.

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

  insert into public.challenge_attempts (attendee_id, challenge_id, started_at)
  values (v_attendee_id, p_challenge_id, now())
  on conflict (attendee_id, challenge_id) do update
    set started_at = coalesce(public.challenge_attempts.started_at, excluded.started_at)
  returning started_at into v_started_at;

  return json_build_object('ok', true, 'started_at', v_started_at);
end;
$$;

revoke execute on function public.begin_challenge(int) from public;
revoke execute on function public.begin_challenge(int) from anon;
grant execute on function public.begin_challenge(int) to authenticated;
