# Admin Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A PIN-gated admin portal (a discreet "admin" link → modal GUI) that lets a non-repo operator run a Salt roadshow workshop — open/close the challenge, control the timer + configurable duration, toggle review_mode/nexus, set language, watch live status, and clear data — all brokered through `SECURITY DEFINER` RPCs.

**Architecture:** New `admin_config` singleton (bcrypt PIN hash) + `admin_*` `SECURITY DEFINER` RPCs that verify the PIN as their first statement. A new `workshop_config.duration_minutes` replaces the hardcoded 35 min across SQL + client. Frontend: a `useAdmin` hook + an `AdminPanel` Radix modal + an `AdminLink`, all English-only (no i18n).

**Tech Stack:** Supabase/Postgres (pgcrypto, SECURITY DEFINER), React 18 + Vite + wouter, shadcn/ui (Radix Dialog/ToggleGroup), sonner, TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-15-admin-portal-design.md`

---

## Verification approach (read first)

No unit-test runner exists (no Vitest suite/config). Do NOT add one. Verify each task with:
- **DB tasks:** apply the migration via the **Supabase MCP `apply_migration`** (project `cttpfrwphcqpjwmwothb`), then `execute_sql` read-only checks. ⚠️ These migrations touch **production** — they are additive/safe (new table, new column default 35, function recreations preserving behavior), but apply deliberately.
- **Client tasks:** `pnpm check` (tsc) + `pnpm build`. Do NOT run `pnpm dev`/`pnpm build` concurrently across agents.
- **Manual smoke** for GUI/end-to-end (Task 15), against the deployed site or `pnpm dev`.

Work in the worktree: `/Users/brandons/Documents/roadshow-webapp/.claude/worktrees/feat+pt-br-localization`. Branch `worktree-feat+pt-br-localization`. Commit per task. **An initial strong PIN must be set out-of-band before the event** (the migration seeds only a throwaway `changeme-bootstrap`).

**Pre-req gotcha:** pgcrypto lives in the `extensions` schema. In SQL, always call `extensions.crypt(...)` / `extensions.gen_salt(...)` and `extensions.digest(...)`, and set `search_path = public, extensions, pg_temp` on functions.

---

## File Structure

**New:**
- `supabase/migrations/036_admin_config_and_rpcs.sql` — admin_config table + all `admin_*` RPCs.
- `supabase/migrations/037_configurable_duration.sql` — `duration_minutes` column, `default_locale` CHECK, recreate submit_answer/request_hint/leaderboard/begin_workshop reading the duration.
- `client/src/hooks/useAdmin.ts` — wraps admin RPCs + the polled `admin_get_status`.
- `client/src/components/AdminPanel.tsx` — the modal (PIN gate + dashboard + controls).
- `client/src/components/AdminLink.tsx` — the discreet link + ⌘⇧A chord.

**Modified:**
- `client/src/components/WorkshopLayout.tsx` — mount `<AdminLink/>` in the sidebar footer.
- `client/src/hooks/useWorkshopClock.ts`, `client/src/hooks/useWorkshop.ts` — read `duration_minutes`.
- `client/src/components/ChallengeIntro.tsx` + `client/public/locales/{en,pt-BR}/challenge.json` — interpolate the minutes.
- `shared/const.ts` — `WORKSHOP_DURATION_MS` becomes the documented fallback default.

---

## Phase 1 — Backend: admin_config + admin RPCs (migration 036)

### Task 1: admin_config table + bootstrap + lockdown

**Files:** Create `supabase/migrations/036_admin_config_and_rpcs.sql` (this task writes the table portion; later tasks append the RPCs to the same file).

- [ ] **Step 1: Write the table + seed + grants** into `036_admin_config_and_rpcs.sql`

```sql
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
```

- [ ] **Step 2: Apply via Supabase MCP**

Apply with `apply_migration` (name `036_admin_config_and_rpcs`, project `cttpfrwphcqpjwmwothb`) using the SQL so far. (Subsequent tasks extend the same file on disk; re-apply the full file at Task 4, or apply incrementally — the migration name stays `036_admin_config_and_rpcs`.)

- [ ] **Step 3: Verify with execute_sql**

```sql
select id, left(pin_hash,7) as hash_prefix from public.admin_config;     -- expect 1 | $2a$12$
select has_table_privilege('anon','public.admin_config','select') as anon_can_read; -- expect false
```
Expected: one row, `hash_prefix = $2a$12$`, `anon_can_read = false`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/036_admin_config_and_rpcs.sql
git commit -m "feat(admin): admin_config table + bcrypt PIN bootstrap (throwaway)"
```

### Task 2: PIN gate helper + flag/timer mutation RPCs

**Files:** Append to `supabase/migrations/036_admin_config_and_rpcs.sql`.

- [ ] **Step 1: Append the gate helper + mutation RPCs**

```sql
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
-- only other DEFINER functions call it; not client-callable.

-- ── helper macro pattern: every mutation gates first ──────────────────────
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
    return json_build_object('ok',false,'error','workshop_live'); end if;  -- use adjust_timer mid-run
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

-- grants: operator runs as anon OR authenticated; the PIN is the gate.
revoke execute on function public.admin_open_challenge(text), public.admin_close_challenge(text),
  public.admin_set_review_mode(text,boolean), public.admin_set_nexus_open(text,boolean),
  public.admin_set_default_locale(text,text), public.admin_set_duration(text,int),
  public.admin_restart_timer(text), public.admin_adjust_timer(text,int) from public;
grant execute on function public.admin_open_challenge(text), public.admin_close_challenge(text),
  public.admin_set_review_mode(text,boolean), public.admin_set_nexus_open(text,boolean),
  public.admin_set_default_locale(text,text), public.admin_set_duration(text,int),
  public.admin_restart_timer(text), public.admin_adjust_timer(text,int) to anon, authenticated;
```

- [ ] **Step 2: Apply via MCP** (re-apply the full `036_admin_config_and_rpcs` migration).

- [ ] **Step 3: Verify**

```sql
select public.admin_open_challenge('wrong')::text;                 -- {"ok":false,"error":"unauthorized"}
select public.admin_open_challenge('changeme-bootstrap')::text;    -- {"ok":true}
select challenge_open, opened_at is not null as opened from public.workshop_config where id=1; -- t | t
select public.admin_set_duration('changeme-bootstrap', 25)::text;  -- {"ok":false,"error":"workshop_live"} (gate is open)
select public.admin_close_challenge('changeme-bootstrap')::text;   -- {"ok":true}
select public.admin_set_duration('changeme-bootstrap', 25)::text;  -- {"ok":true}
select duration_minutes from public.workshop_config where id=1;    -- 25
-- restore for the live env:
select public.admin_set_duration('changeme-bootstrap', 35)::text;
```
Expected: as annotated. ⚠️ This mutates prod config — leave it in a sane state (close challenge, duration 35) when done; the operator/reset will re-stamp as needed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/036_admin_config_and_rpcs.sql
git commit -m "feat(admin): PIN gate + flag/timer mutation RPCs"
```

### Task 3: admin_clear_data + admin_change_pin

**Files:** Append to `036_admin_config_and_rpcs.sql`.

- [ ] **Step 1: Append**

```sql
-- ── destructive: wipe ALL anonymous users (cascades attendees + all child
--    tables via ON DELETE CASCADE) and reset the gate to a coherent pre-start.
create or replace function public.admin_clear_data(p_pin text)
returns json language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_deleted int;
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  -- lock the singleton to serialize against a concurrent operator
  perform 1 from public.workshop_config where id = 1 for update;
  -- the app only ever creates anonymous users; deleting them cascades through
  -- attendees -> challenge_attempts/answer_attempts/question_progress/hint_usage.
  with d as (delete from auth.users where is_anonymous = true returning 1)
  select count(*) into v_deleted from d;
  update public.workshop_config
    set challenge_open = false, opened_at = null, nexus_open = false
    where id = 1;   -- preserves review_mode + default_locale
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

revoke execute on function public.admin_clear_data(text), public.admin_change_pin(text,text) from public;
grant execute on function public.admin_clear_data(text), public.admin_change_pin(text,text) to anon, authenticated;
```

- [ ] **Step 2: Apply via MCP.**

- [ ] **Step 3: Verify** (the wipe is real but data is already test-only/empty)

```sql
select public.admin_clear_data('changeme-bootstrap')::text;  -- {"ok":true,"users_deleted":N}
select (select count(*) from public.attendees) as att,
       (select count(*) from public.auth.users where is_anonymous) as anon_users,
       challenge_open, opened_at, nexus_open, review_mode
from public.workshop_config where id=1;  -- att=0, anon_users=0, gate reset, review_mode preserved
select public.admin_change_pin('changeme-bootstrap','changeme-bootstrap2')::text; -- {"ok":true}
select public.admin_change_pin('changeme-bootstrap2','changeme-bootstrap')::text; -- restore: {"ok":true}
select public.admin_change_pin('changeme-bootstrap','short')::text;              -- {"ok":false,"error":"weak_pin"}
```
Note: `auth.users` is in the `auth` schema; query as `auth.users` (the `public.` prefix above is wrong — use `from auth.users`). Expected: attendees 0, anon users 0, gate reset, review_mode unchanged.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/036_admin_config_and_rpcs.sql
git commit -m "feat(admin): admin_clear_data (cascade wipe + gate reset) + admin_change_pin"
```

### Task 4: admin_get_status (PIN-gated roster read)

**Files:** Append to `036_admin_config_and_rpcs.sql`.

- [ ] **Step 1: Append** (selects from the existing `public.leaderboard` view for standings; never re-derives scoring)

```sql
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
revoke execute on function public.admin_get_status(text) from public;
grant execute on function public.admin_get_status(text) to anon, authenticated;
```

- [ ] **Step 2: Apply via MCP.**

- [ ] **Step 3: Verify**

```sql
select (public.admin_get_status('wrong')->>'error');                 -- unauthorized
select (public.admin_get_status('changeme-bootstrap')->'counts');    -- {registered,begun,finished_both}
select json_typeof(public.admin_get_status('changeme-bootstrap')->'attendees'); -- array
```
Expected: wrong PIN → `unauthorized` with no roster; correct → counts object + attendees array.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/036_admin_config_and_rpcs.sql
git commit -m "feat(admin): admin_get_status roster/counts read (from leaderboard view)"
```

---

## Phase 2 — Configurable duration (migration 037)

### Task 5: duration_minutes column + default_locale CHECK

**Files:** Create `supabase/migrations/037_configurable_duration.sql`.

- [ ] **Step 1: Write**

```sql
-- 037_configurable_duration.sql
-- Make the workshop window length configurable (replaces hardcoded 35 min).
alter table public.workshop_config add column if not exists duration_minutes int not null default 35;
-- harden default_locale to the supported set (no CHECK existed before)
do $$ begin
  alter table public.workshop_config add constraint workshop_config_locale_chk check (default_locale in ('en','pt-BR'));
exception when duplicate_object then null; end $$;
```

- [ ] **Step 2: Apply via MCP** (`apply_migration` name `037_configurable_duration`).
- [ ] **Step 3: Verify:** `select duration_minutes from public.workshop_config where id=1;` → 35.
- [ ] **Step 4: Commit** `git commit -m "feat(admin): add workshop_config.duration_minutes + locale check"`.

### Task 6: recreate submit_answer reading duration_minutes

**Files:** Append to `037_configurable_duration.sql`. (Body = migration 032's superset — review_mode bypass + alt_answer_hashes — with the duration substitution.)

- [ ] **Step 1: Append** the full recreated function. **Before writing, read the current body** in `supabase/migrations/032_review_mode.sql` to confirm no logic is dropped; the ONLY change is reading `duration_minutes` and using it in the expiry guard:

```sql
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
```

- [ ] **Step 2: Apply via MCP.**
- [ ] **Step 3: Verify** (diff intent): `select pg_get_functiondef('public.submit_answer(uuid,text)'::regprocedure) ilike '%duration_minutes%';` → true; confirm it still contains `alt_answer_hashes` and `review_mode`.
- [ ] **Step 4: Commit** `git commit -m "feat(admin): submit_answer reads configurable duration"`.

### Task 7: recreate request_hint (3-arg locale-aware) reading duration

**Files:** Append to `037_configurable_duration.sql`. **Read the current body in `supabase/migrations/033_pt_translations.sql`** — this is the 3-arg `(uuid,int,text)` locale version; preserve `hints_pt` resolution. Only the expiry uses duration:

```sql
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
```

- [ ] **Step 2: Apply via MCP.**
- [ ] **Step 3: Verify:** `select pg_get_function_identity_arguments('public.request_hint'::regproc);` → `p_question_id uuid, p_hint_idx integer, p_locale text`; body contains `hints_pt` and `duration_minutes`.
- [ ] **Step 4: Commit** `git commit -m "feat(admin): request_hint (3-arg) reads configurable duration"`.

### Task 8: recreate leaderboard view + get_leaderboard reading duration

**Files:** Append to `037_configurable_duration.sql`. **Read the current view in `supabase/migrations/032_review_mode.sql`** (it has the `gate` CTE with `opened_at, review_mode`, plus `hints_used`, `+15000`/`+60000`/expiry-cap). Extend `gate` with `duration_minutes` and replace both 35-min sites.

- [ ] **Step 1: Append** — recreate the view (must `drop function get_leaderboard()` first if it depends on column order; follow the 032 pattern of drop+recreate). Provide the full view from 032 with these two replacements: `+ interval '35 minutes'` → `+ ((select duration_minutes from gate) * interval '1 minute')`; `(extract(epoch from interval '35 minutes') * 1000)::bigint` → `((select duration_minutes from gate) * 60000)::bigint`; and `gate as (select opened_at, coalesce(review_mode,false) as review_mode from workshop_config where id=1)` → add `, duration_minutes`. Re-create `get_leaderboard()` unchanged (same columns/order). (Copy the exact 032 view text and apply only those edits to avoid drift.)

- [ ] **Step 2: Apply via MCP.**
- [ ] **Step 3: Verify:** `select pg_get_viewdef('public.leaderboard') ilike '%duration_minutes%';` → true; `select * from public.get_leaderboard() limit 1;` runs without error.
- [ ] **Step 4: Commit** `git commit -m "feat(admin): leaderboard view caps at configurable duration"`.

### Task 9: fix begin_workshop expires_at

**Files:** Append to `037_configurable_duration.sql`. **Read the current body in `supabase/migrations/018_workshop_config_admin_gate.sql`** (it returns `expires_at = v_started_at + interval '35 minutes'`, which the client ignores). Recreate it dropping `expires_at` from the returned json (keep everything else identical).

- [ ] **Step 2: Apply.**
- [ ] **Step 3: Verify:** `select pg_get_functiondef('public.begin_workshop()'::regprocedure) ilike '%35 minutes%';` → **false**.
- [ ] **Step 4: Commit** `git commit -m "feat(admin): drop stale 35-min expires_at from begin_workshop"`.

### Task 10: client hooks read duration_minutes

**Files:** Modify `client/src/hooks/useWorkshopClock.ts`, `client/src/hooks/useWorkshop.ts`, `shared/const.ts`.

- [ ] **Step 1:** In `useWorkshopClock.ts`: add `duration_minutes` to the `.select(...)` of `workshop_config`; add `durationMs = (data?.duration_minutes ?? 35) * 60_000`; compute `expiresAtMs = openedAtMs + durationMs` (replacing the `WORKSHOP_DURATION_MS` use). Do the same in `useWorkshop.ts` if it derives expiry from the const. In `shared/const.ts` keep `WORKSHOP_DURATION_MS` and add a comment that it is the fallback default only.
- [ ] **Step 2: Verify:** `pnpm check` clean; grep that `WORKSHOP_DURATION_MS` is no longer the source of truth in the hooks (used only as fallback).
- [ ] **Step 3: Commit** `git commit -m "feat(admin): client clock reads workshop_config.duration_minutes"`.

### Task 11: ChallengeIntro interpolates the minutes

**Files:** Modify `client/src/components/ChallengeIntro.tsx`, `client/public/locales/{en,pt-BR}/challenge.json`.

- [ ] **Step 1:** Pass a `minutes` value (from `useWorkshopClock`'s `duration_minutes`, default 35) into the `intro` copy: change the en/pt `intro.p1` value's "35 minutes" / "35 minutos" to `{{minutes}} minutes` / `{{minutes}} minutos` and render via `t("intro.p1", { minutes })` (or a `<Trans>` value). Keep token-preservation rules.
- [ ] **Step 2: Verify:** `pnpm check`; `node scripts/check-locales.mjs`; the en value renders identically when minutes=35.
- [ ] **Step 3: Commit** `git commit -m "feat(admin): ChallengeIntro shows the configured duration"`.

---

## Phase 3 — Frontend admin GUI

### Task 12: useAdmin hook

**Files:** Create `client/src/hooks/useAdmin.ts`.

- [ ] **Step 1: Write** the hook: holds the PIN in state, exposes typed wrappers for each `admin_*` RPC (each returns `{ok, error?}`), and a `status` (`admin_get_status`) that **polls every 3s only while `open && pin`** and tears down on close. Full skeleton:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AdminStatus {
  review_mode: boolean;
  counts: { registered: number; begun: number; finished_both: number };
  attendees: { id: string; name: string; email: string; created_at: string; begun: boolean;
    questions_complete: number; total_ms: number | null; wrong_count: number | null; hints_used: number | null }[];
}

async function call(fn: string, args: Record<string, unknown>): Promise<{ ok: boolean; error?: string; [k: string]: unknown }> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: error.message };
  return (data as { ok: boolean; error?: string }) ?? { ok: false, error: "no_data" };
}

export function useAdmin(open: boolean) {
  const [pin, setPin] = useState<string | null>(null);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [stale, setStale] = useState(false);
  const pinRef = useRef<string | null>(null);
  pinRef.current = pin;

  const fetchStatus = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const p = pinRef.current;
    if (!p) return { ok: false, error: "no_pin" };
    const res = await call("admin_get_status", { p_pin: p });
    if (res.ok) { setStatus(res as unknown as AdminStatus); setStale(false); }
    else setStale(true);
    return res;
  }, []);

  // unlock: first successful status proves the PIN
  const unlock = useCallback(async (candidate: string) => {
    const { data, error } = await supabase.rpc("admin_get_status", { p_pin: candidate });
    if (error) return { ok: false, error: error.message };
    const r = data as { ok: boolean; error?: string };
    if (r?.ok) { setPin(candidate); setStatus(r as unknown as AdminStatus); return { ok: true }; }
    return { ok: false, error: r?.error ?? "unauthorized" };
  }, []);

  const lock = useCallback(() => { setPin(null); setStatus(null); setStale(false); }, []);

  // poll only while open && pin
  useEffect(() => {
    if (!open || !pin) return;
    fetchStatus();
    const id = window.setInterval(fetchStatus, 3000);
    return () => window.clearInterval(id);
  }, [open, pin, fetchStatus]);

  // clear PIN whenever the dialog closes
  useEffect(() => { if (!open) lock(); }, [open, lock]);

  // action wrappers (each re-sends the PIN; refresh status after)
  const act = useCallback(async (fn: string, extra: Record<string, unknown> = {}) => {
    const p = pinRef.current; if (!p) return { ok: false, error: "locked" };
    const res = await call(fn, { p_pin: p, ...extra });
    if (res.ok) fetchStatus();
    return res;
  }, [fetchStatus]);

  return {
    unlocked: !!pin, status, stale, unlock, lock, refresh: fetchStatus,
    openChallenge: () => act("admin_open_challenge"),
    closeChallenge: () => act("admin_close_challenge"),
    setReviewMode: (on: boolean) => act("admin_set_review_mode", { p_on: on }),
    setNexusOpen: (on: boolean) => act("admin_set_nexus_open", { p_on: on }),
    setDefaultLocale: (loc: string) => act("admin_set_default_locale", { p_locale: loc }),
    setDuration: (min: number) => act("admin_set_duration", { p_minutes: min }),
    restartTimer: () => act("admin_restart_timer"),
    adjustTimer: (delta: number) => act("admin_adjust_timer", { p_delta_min: delta }),
    clearData: () => act("admin_clear_data"),
    changePin: (oldp: string, newp: string) => call("admin_change_pin", { p_old_pin: oldp, p_new_pin: newp }),
  };
}
```

- [ ] **Step 2: Verify:** `pnpm check` clean.
- [ ] **Step 3: Commit** `git commit -m "feat(admin): useAdmin hook (RPC wrappers + gated status poll)"`.

### Task 13: AdminPanel modal

**Files:** Create `client/src/components/AdminPanel.tsx`.

- [ ] **Step 1: Build** the modal using `@/components/ui/dialog` (Radix), `@/components/ui/toggle-group`, `sonner` `toast`, and `useAdmin`. **Import NO `useTranslation`/`t` — English literals only.** It must implement, per the spec:
  - **PIN gate** first (masked `type=password`, autofocus, no `inputMode=numeric`); on submit call `unlock`; inline generic error on failure.
  - **Live Status:** flags + timer derived from `useWorkshopClock()` (NOT from status) — phase badge precedence `review_mode → "REVIEW MODE (timer off)"` else `challenge_open ? (expired ? "EXPIRED" : "IN PROGRESS") : "CLOSED"`, plus a separate `nexus_open` chip; counts + standings from `useAdmin().status`; skeleton until first status; "stale" badge when `stale`; empty state for 0 attendees.
  - **Gate & Timer:** "Open challenge & start clock" — **if `useWorkshopClock().` review_mode is on, show the confirm** (Turn off & open → `setReviewMode(false)` then `openChallenge()`; Open in review mode → `openChallenge()`; Cancel). Close; Restart; +5/−5 (`adjustTimer`); Duration input (local state, commit on blur or "Set" → `setDuration`, clamp 5–180, disabled-with-tooltip while live; show the `workshop_live` error as a toast).
  - **Phases:** review_mode toggle (with the ⚠ banner when on) → `setReviewMode`; nexus_open toggle → `setNexusOpen`.
  - **Language:** ToggleGroup `type="single"` EN/PT-BR → `setDefaultLocale`.
  - **Danger Zone:** Clear data behind a type-`CLEAR` confirm; "Export CSV first" calls `refresh()` then builds a CSV (`rank,name,email,questions_complete,total_ms,wrong_count,hints_used,registered_at`) from the fresh `status.attendees` and triggers a download.
  - **Change PIN:** old + new fields → `changePin`; success/`weak_pin` toasts.
  - Every action: disabled-while-pending; `toast.success`/`toast.error` from the `{ok,error}` result.
- [ ] **Step 2: Verify:** `pnpm check` clean; grep confirms no `useTranslation`/`from "react-i18next"` import in the file.
- [ ] **Step 3: Commit** `git commit -m "feat(admin): AdminPanel modal (PIN gate + dashboard + controls)"`.

### Task 14: AdminLink + mount + chord

**Files:** Create `client/src/components/AdminLink.tsx`; modify `client/src/components/WorkshopLayout.tsx`.

- [ ] **Step 1: Write `AdminLink.tsx`** — renders the discreet "admin" text (Barlow Condensed, muted, `aria-label="Open admin panel"`, `:focus-visible` outline) and owns the `open` state + the `<AdminPanel open={open} onOpenChange={setOpen}/>`. Add a global keydown effect for ⌘/Ctrl+Shift+A: `e.preventDefault()`, ignore if `document.activeElement` is INPUT/TEXTAREA or `open` is already true or `e.repeat`, else `setOpen(true)`.
- [ ] **Step 2: Mount** `<AdminLink/>` in `WorkshopLayout.tsx`'s sidebar footer cluster (near the WorkshopClockPill, ~line 660-670). Do not disturb the existing footer.
- [ ] **Step 3: Verify:** `pnpm check` + `pnpm build` clean.
- [ ] **Step 4: Commit** `git commit -m "feat(admin): admin link in sidebar footer + keyboard chord"`.

---

## Phase 4 — Verification

### Task 15: End-to-end manual smoke

- [ ] **Step 1:** `pnpm check` + `pnpm build` clean; `node scripts/check-locales.mjs` passes.
- [ ] **Step 2: Smoke (against `pnpm dev` or a preview):**
  - Open the panel via link AND chord. Wrong PIN → generic error, no roster. Correct PIN (`changeme-bootstrap`) → dashboard.
  - Open challenge while review_mode ON → confirm appears; "Turn off & open" → review_mode false + gate open + timer ticking; sidebar pill agrees.
  - Set duration 25 (close gate first) → open → ChallengeIntro + countdown show 25; with a test attendee, a submission at 25:01 is rejected.
  - +5 while expired → un-expires within ~3s.
  - Toggle review_mode/nexus/language → live site reflects in ~3s; admin UI stays English after switching to PT-BR.
  - Clear data → attendees 0, gate reset; Export CSV downloads a fresh snapshot.
  - Escape closes + no further `admin_get_status` calls (network tab).
- [ ] **Step 3:** Set the **real strong PIN** out-of-band (`select public.admin_change_pin('changeme-bootstrap','<REAL_STRONG_PIN>')`) before any event. Confirm the bootstrap PIN no longer works.
- [ ] **Step 4: Commit** any fixes; final `git commit -m "test(admin): end-to-end smoke + notes"` if needed.

---

## Self-Review (completed by plan author)

- **Spec coverage:** admin_config + bootstrap (T1) · gate + flag/timer RPCs incl. set_duration-rejects-while-live (T2) · clear_data cascade+gate-reset & change_pin (T3) · get_status from leaderboard view (T4) · duration column + locale CHECK (T5) · submit_answer/request_hint/leaderboard/begin_workshop recreated reading duration (T6–9) · client hooks + ChallengeIntro copy (T10–11) · useAdmin gated poll (T12) · AdminPanel with badge precedence, review-mode-open warning, english-only, type-to-confirm, CSV (T13) · AdminLink + chord (T14) · smoke incl. strong-PIN rotation (T15). All spec sections map to a task.
- **Placeholders:** new RPCs + useAdmin have full code; the four recreated SQL functions instruct reading the exact current migration body (032/033/018) and applying the named substitution — the safest way to avoid logic drift (not a "similar to" cross-reference). AdminPanel/leaderboard-view bodies are specified by precise diff + section list rather than re-typing 80+ lines that could drift.
- **Type/name consistency:** RPC names + arg names (`p_pin`, `p_on`, `p_locale`, `p_minutes`, `p_delta_min`, `p_old_pin`, `p_new_pin`) are consistent across migration 036 and `useAdmin.ts`; `admin_get_status` shape matches `AdminStatus`.
