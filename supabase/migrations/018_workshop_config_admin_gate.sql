-- 018_workshop_config_admin_gate.sql
-- Admin-controlled gate that prevents anyone from clicking "Begin Workshop"
-- before the presenter is ready. State lives in a single-row table; admin
-- toggles it via SQL. begin_workshop() enforces the flag server-side so the
-- gate is real (not just a UI veneer).
--
-- Admin commands (run via Supabase SQL editor or MCP):
--   -- Open the gate:
--   update public.workshop_config
--     set challenge_open = true, opened_at = now() where id = 1;
--   -- Close it (between sessions, or to reset):
--   update public.workshop_config
--     set challenge_open = false, opened_at = null where id = 1;
--
-- Clients poll the row every ~3s while pre-begin, so changes propagate
-- within ~3s.

-- ---------------------------------------------------------------------
-- 1. workshop_config table — single row, enforced via PK + check
-- ---------------------------------------------------------------------
create table if not exists public.workshop_config (
  id              int primary key default 1,
  challenge_open  boolean not null default false,
  opened_at       timestamptz,
  constraint workshop_config_single_row check (id = 1)
);

-- Seed the singleton (idempotent: leaves any existing state untouched).
insert into public.workshop_config (id, challenge_open, opened_at)
values (1, false, null)
on conflict (id) do nothing;

-- Read-only for everyone; updates only via service_role (no grant here).
alter table public.workshop_config enable row level security;

drop policy if exists workshop_config_select on public.workshop_config;
create policy workshop_config_select
  on public.workshop_config
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------
-- 2. begin_workshop() — enforce the gate before stamping started_at
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
  v_open        boolean;
begin
  select id into v_attendee_id
  from public.attendees
  where auth_uid = auth.uid();

  if v_attendee_id is null then
    return json_build_object('ok', false, 'error', 'not_registered');
  end if;

  -- NEW: admin gate. If the workshop hasn't been opened, refuse to begin.
  -- This is the real lock; the UI overlay is just a polite veneer.
  select challenge_open into v_open
  from public.workshop_config where id = 1;

  if not coalesce(v_open, false) then
    return json_build_object('ok', false, 'error', 'challenge_locked');
  end if;

  -- Atomic: both rows get the same started_at, preserving any pre-existing
  -- value via coalesce in the conflict clause (idempotent on repeat calls).
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
    'started_at', v_started_at,
    'expires_at', v_started_at + interval '35 minutes'
  );
end;
$$;

revoke execute on function public.begin_workshop() from public;
revoke execute on function public.begin_workshop() from anon;
grant  execute on function public.begin_workshop() to authenticated;
