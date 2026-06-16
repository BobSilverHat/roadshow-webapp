-- 036_admin_config_and_rpcs.sql
-- PIN-gated admin layer for the operator portal. Every admin_* RPC verifies the
-- PIN (bcrypt, cost 12) as its FIRST statement before any read/write. No lockout
-- (a global lock on a public RPC would let any anon lock out the operator) — the
-- defense is PIN entropy + cost-12 bcrypt. pgcrypto lives in `extensions`.

create table if not exists public.admin_config (
  id       int primary key default 1,
  pin_hash text not null,
  constraint admin_config_single_row check (id = 1)
);

alter table public.admin_config enable row level security;
-- Intentionally NO policies + explicit revoke: clients (anon/authenticated) get
-- ZERO access; only the SECURITY DEFINER RPCs (owner postgres) read/write it.
revoke all on public.admin_config from anon, authenticated, public;

-- Bootstrap with a THROWAWAY, non-secret PIN. MUST be rotated before any event
-- via admin_change_pin or an out-of-band UPDATE. Never commit a real PIN.
insert into public.admin_config (id, pin_hash)
values (1, extensions.crypt('changeme-bootstrap', extensions.gen_salt('bf', 12)))
on conflict (id) do nothing;

-- duration_minutes is needed by admin_set_duration below (added here so the
-- admin layer is self-contained; migration 037 re-adds it idempotently).
alter table public.workshop_config add column if not exists duration_minutes int not null default 35;

-- ── PIN gate: stateless verify, no counters/lock ──────────────────────────
create or replace function public.admin_check_pin(p_pin text)
returns boolean language sql security definer set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from public.admin_config
    where id = 1 and pin_hash is not null and pin_hash = extensions.crypt(p_pin, pin_hash)
  );
$$;
revoke execute on function public.admin_check_pin(text) from public, anon, authenticated;

create or replace function public.admin_open_challenge(p_pin text)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  update public.workshop_config set challenge_open = true, opened_at = now() where id = 1;
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_close_challenge(p_pin text)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  update public.workshop_config set challenge_open = false, opened_at = null where id = 1;
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_set_review_mode(p_pin text, p_on boolean)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  update public.workshop_config set review_mode = coalesce(p_on,false) where id = 1;
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_set_nexus_open(p_pin text, p_on boolean)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  update public.workshop_config set nexus_open = coalesce(p_on,false) where id = 1;
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_set_default_locale(p_pin text, p_locale text)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  if p_locale not in ('en','pt-BR') then return json_build_object('ok',false,'error','bad_locale'); end if;
  update public.workshop_config set default_locale = p_locale where id = 1;
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_set_duration(p_pin text, p_minutes int)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_open boolean; v_opened timestamptz;
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 180 then
    return json_build_object('ok',false,'error','bad_duration'); end if;
  select challenge_open, opened_at into v_open, v_opened from public.workshop_config where id = 1;
  if coalesce(v_open,false) and v_opened is not null then
    return json_build_object('ok',false,'error','workshop_live'); end if;
  update public.workshop_config set duration_minutes = p_minutes where id = 1;
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_restart_timer(p_pin text)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  update public.workshop_config set opened_at = now() where id = 1;
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_adjust_timer(p_pin text, p_delta_min int)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  update public.workshop_config
    set opened_at = opened_at + (coalesce(p_delta_min,0) * interval '1 minute')
    where id = 1 and opened_at is not null;
  return json_build_object('ok', true);
end; $$;

revoke execute on function public.admin_open_challenge(text), public.admin_close_challenge(text),
  public.admin_set_review_mode(text,boolean), public.admin_set_nexus_open(text,boolean),
  public.admin_set_default_locale(text,text), public.admin_set_duration(text,int),
  public.admin_restart_timer(text), public.admin_adjust_timer(text,int) from public;
grant execute on function public.admin_open_challenge(text), public.admin_close_challenge(text),
  public.admin_set_review_mode(text,boolean), public.admin_set_nexus_open(text,boolean),
  public.admin_set_default_locale(text,text), public.admin_set_duration(text,int),
  public.admin_restart_timer(text), public.admin_adjust_timer(text,int) to anon, authenticated;

-- ── destructive: wipe ALL anonymous users (cascades attendees + child tables)
--    and reset the gate to a coherent pre-start (preserves review_mode/default_locale).
create or replace function public.admin_clear_data(p_pin text)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_deleted int;
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  perform 1 from public.workshop_config where id = 1 for update;
  with d as (delete from auth.users where is_anonymous = true returning 1)
  select count(*) into v_deleted from d;
  update public.workshop_config
    set challenge_open = false, opened_at = null, nexus_open = false
    where id = 1;
  return json_build_object('ok', true, 'users_deleted', v_deleted);
end; $$;

create or replace function public.admin_change_pin(p_old_pin text, p_new_pin text)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not public.admin_check_pin(p_old_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  if p_new_pin is null or length(p_new_pin) < 10 then return json_build_object('ok',false,'error','weak_pin'); end if;
  update public.admin_config set pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf', 12)) where id = 1;
  return json_build_object('ok', true);
end; $$;

create or replace function public.admin_get_status(p_pin text)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_review boolean; v_counts json; v_attendees json;
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  select review_mode into v_review from public.workshop_config where id = 1;
  select json_build_object(
    'registered', (select count(*) from public.attendees),
    'begun', (select count(distinct attendee_id) from public.challenge_attempts where started_at is not null),
    'finished_both', (
      select count(*) from public.attendees a
      where exists (select 1 from public.challenge_attempts c1 where c1.attendee_id=a.id and c1.challenge_id=1 and c1.completed_at is not null)
        and exists (select 1 from public.challenge_attempts c2 where c2.attendee_id=a.id and c2.challenge_id=2 and c2.completed_at is not null))
  ) into v_counts;
  select coalesce(json_agg(row_to_json(t) order by t.questions_complete desc, t.total_ms asc nulls last, t.wrong_count asc), '[]'::json)
    into v_attendees
  from (
    select a.id, a.name, a.email, a.created_at,
           exists (select 1 from public.challenge_attempts c where c.attendee_id=a.id and c.started_at is not null) as begun,
           coalesce(lb.questions_complete,0) as questions_complete,
           lb.total_ms, lb.wrong_count, lb.hints_used
    from public.attendees a
    left join public.leaderboard lb on lb.attendee_id = a.id
  ) t;
  return json_build_object('ok', true, 'review_mode', coalesce(v_review,false),
    'counts', v_counts, 'attendees', v_attendees);
end; $$;

revoke execute on function public.admin_clear_data(text), public.admin_change_pin(text,text),
  public.admin_get_status(text) from public;
grant execute on function public.admin_clear_data(text), public.admin_change_pin(text,text),
  public.admin_get_status(text) to anon, authenticated;
