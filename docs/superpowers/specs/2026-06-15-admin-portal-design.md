# Admin Portal — Design Spec

**Date:** 2026-06-15
**Status:** Approved for implementation planning (revised after adversarial spec review)
**Owner:** Brandon

## Summary

A PIN-gated **admin portal** that lets a non-developer operator run a Salt roadshow workshop entirely from the website — with no access to the repo, AWS, or Supabase. A discreet **"admin"** text link (sidebar footer, plus a ⌘/Ctrl+Shift+A chord) opens a modal: enter the operator PIN, then drive the workshop from a live dashboard with grouped controls. Every privileged action is brokered through a new **`SECURITY DEFINER` RPC** that verifies the PIN server-side; the browser never holds the service-role key. Single global event (one `workshop_config` row, as today). The 35-minute window becomes a configurable `duration_minutes`.

## Goals

1. An operator can run the full lifecycle from the GUI: set default language + duration → optional review-mode dry run → **open the challenge (starts the shared clock)** → watch live status/standings → toggle Salt Nexus → clear data between sessions.
2. **Every privileged action is enforced server-side** (PIN-gated RPC). The GUI is treated as fully untrusted code.
3. No service-role key in the browser; no repo/Supabase access needed to operate.
4. Workshop **duration is configurable** (no longer hardcoded at 35 minutes).

## Non-Goals (v1, explicitly deferred)

Audit log; soft-delete / undo for clear-data; single-attendee removal; multi-event / multi-room isolation; pause/resume submissions; **Supabase Edge Function with per-IP rate-limiting** (noted as the future hardening for the un-throttleable public RPC). A minimal `admin_change_pin` IS in v1 so the PIN isn't frozen.

## Decisions (locked)

- **In-DB `SECURITY DEFINER` RPCs**, not an Edge Function (matches existing backend patterns; ships as migrations).
- **Shared operator PIN**, bcrypt-hashed server-side (cost 12), **verified on every action**. **No account lockout** (see Security) — the defense is PIN entropy, not a lock that an anon could weaponize against the operator.
- **Single global event** — one `workshop_config` row drives one workshop at a time.
- **Configurable duration** via `workshop_config.duration_minutes`.

## Architecture

```
 [ "admin" link / ⌘⇧A ]  →  AdminPanel (Radix Dialog)
                                  │ PIN in component memory, re-sent each call
                                  ▼
                  supabase.rpc('admin_*', { p_pin, ... })
                                  │  ← the operator usually has NO session; calls run as the
                                  │     `anon` role (or `authenticated` if they ever registered).
                                  ▼  auth.uid() is irrelevant — the PIN is the only gate.
        ┌─────────────────────────────────────────────────────────┐
        │ Postgres admin_* SECURITY DEFINER RPCs (owned by postgres)│
        │ FIRST statement of every body: verify PIN, else return    │
        │   {ok:false,error:'unauthorized'} before ANY other query  │
        └─────────────────────────────────────────────────────────┘
  Dashboard reads:
    • flags + timer  → reuse useWorkshopClock (already polls workshop_config every 3s) — ONE clock source
    • roster/PII     → admin_get_status(p_pin) (emails, counts, standings) — the only PIN-gated read
```

**Operator identity:** the app only ever calls `signInAnonymously()` inside attendee registration; an operator who just opens the panel typically has **no session at all** (`anon` role) — or an anonymous `authenticated` JWT if they previously registered. RPCs are therefore granted to **both** `anon` and `authenticated`, and **no admin logic may rely on `auth.uid()`**. The PIN check is the sole boundary.

## Data model (migration `036_admin_config_and_rpcs.sql`)

**`admin_config`** — singleton, server-only:
```
id              int primary key default 1, check (id = 1)
pin_hash        text not null    -- extensions.crypt(pin, extensions.gen_salt('bf', 12))
```
- `alter table public.admin_config enable row level security;` with **NO policies**, AND **`revoke all on public.admin_config from anon, authenticated, public;`** (belt-and-suspenders: `workshop_config` proves table-level grants can leak even with RLS, so we revoke explicitly). Only the `SECURITY DEFINER` RPCs (owner `postgres`, `rolbypassrls`) read/write it.
- **No `failed_attempts`/`locked_until` columns** — the lockout was removed (see Security).
- **Bootstrap (idempotent):**
  ```sql
  insert into public.admin_config (id, pin_hash)
  values (1, extensions.crypt('changeme-bootstrap', extensions.gen_salt('bf', 12)))
  on conflict (id) do nothing;
  ```
  The committed PIN is a **throwaway** (`changeme-bootstrap`) — explicitly non-secret, documented in the migration as MUST-rotate. Brandon (or any operator via `admin_change_pin`) sets the real strong PIN before the first event. The real operator PIN is **never** committed as a literal.

**`workshop_config`** — add `duration_minutes int not null default 35`, plus tighten an existing gap: `alter table public.workshop_config add constraint workshop_config_locale_chk check (default_locale in ('en','pt-BR'));`

## Admin RPC layer (migration `036`)

All functions: `language plpgsql security definer set search_path = public, extensions, pg_temp`; `revoke execute ... from public`; `grant execute ... to anon, authenticated`. Every body's **first statement** is the PIN check; on mismatch it returns `{ok:false,error:'unauthorized'}` **before any other read or write** (so a wrong PIN never leaks attendee/email data). Generic error only — no distinct "locked" oracle.

**Gate helper — `admin_check_pin(p_pin text) returns boolean`** (or inlined): `select exists(select 1 from admin_config where id=1 and pin_hash is not null and pin_hash = extensions.crypt(p_pin, pin_hash))`. A null/absent `pin_hash` is a hard failure (the function returns false; never silently passes). **No counters, no lock** — stateless verify.

**Mutations:**
- `admin_open_challenge(p_pin)` → `challenge_open=true, opened_at=now()`. **Leaves `review_mode` untouched** — opening *while* review_mode is on is a valid timer-off practice run (exactly the state prod is in now), so the RPC must not silently mutate it. The "left it in review mode → scored run has no timer" foot-gun is handled in the **GUI** with a warning at click time (see Frontend → Gate & Timer), not by a forced server-side change.
- `admin_close_challenge(p_pin)` → `challenge_open=false, opened_at=null`.
- `admin_set_review_mode(p_pin, p_on bool)` · `admin_set_nexus_open(p_pin, p_on bool)`.
- `admin_set_default_locale(p_pin, p_locale text)` → validate `in ('en','pt-BR')`.
- `admin_set_duration(p_pin, p_minutes int)` → validate `between 5 and 180`; **rejects with `{ok:false,error:'workshop_live'}` when `challenge_open and opened_at is not null`** (changing duration mid-run would silently move everyone's deadline — operators adjust a running clock with `admin_adjust_timer` instead). Takes effect at the next `admin_open_challenge`/`admin_restart_timer`.
- `admin_restart_timer(p_pin)` → `opened_at=now()` (gate stays open; resets the global clock).
- `admin_adjust_timer(p_pin, p_delta_min int)` → `opened_at = opened_at + (p_delta_min * interval '1 minute')`. Because `expires_at = opened_at + duration`, **+N adds N minutes of remaining time** (and −N removes). No-op if `opened_at is null`. (Earlier "negative-shift" framing removed — it was contradictory.)
- `admin_clear_data(p_pin)` → **one transaction**: `delete from auth.users where is_anonymous = true;` — the app only ever creates anonymous users, and `attendees.auth_uid → auth.users` plus all four public child tables are `ON DELETE CASCADE`, so this single statement clears attendees + challenge_attempts + answer_attempts + question_progress + hint_usage in one shot (confirmed: postgres can delete `auth.users`). It then resets the gate to a coherent pre-start: `update workshop_config set challenge_open=false, opened_at=null, nexus_open=false where id=1` (preserves `review_mode` and `default_locale` — operator preferences). This avoids the "gate open, zero users, clock expired" incoherent state. Wrap in `begin/commit`; optional `select ... for update` on `workshop_config` to serialize against a concurrent operator.
- `admin_change_pin(p_old_pin, p_new_pin)` → verify old PIN; validate **`length(p_new_pin) >= 10`** (entropy floor, see Security); set `pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf', 12))`.

**Read — `admin_get_status(p_pin) returns json`** (PIN-checked first): the only read needing the PIN, because it exposes RLS-hidden columns (emails, cross-attendee aggregates). It does **not** re-implement scoring — it **selects from the existing `public.leaderboard` view** (single source of truth for `total_ms`/penalties/`hints_used`) and joins `attendees.email/created_at` on top, computing `rank` via `row_number() over (order by questions_complete desc, total_ms asc nulls last, wrong_count asc)` to match `get_leaderboard()` exactly. Returns:
```
{ ok, review_mode,                         -- so the UI can grey out the timer when true
  counts: { registered, begun, finished_both },
  attendees: [ { id, name, email, created_at, begun, questions_complete } ] }
```
- `registered = count(*) from attendees`; `begun = count(distinct attendee_id) from challenge_attempts where started_at is not null`; `finished_both = count of attendees with both challenge_attempts.completed_at set`.
- Flags/timer for the dashboard come from `useWorkshopClock` (not duplicated here) — `admin_get_status` is purely the roster/PII payload, refreshed on its own ~3s poll while the panel is open.

## Configurable duration — ALL touch points

`duration_minutes` (default 35) replaces every hardcoded `35 minutes` / `2100000`:
1. **`submit_answer`** — recreate from the **migration 032** body (the superset: it already merges `review_mode` bypass + `alt_answer_hashes` OR-check from 027). Add `select duration_minutes into v_duration from workshop_config where id=1`; change the guard to `not v_review_mode and now() > v_opened_at + (v_duration * interval '1 minute')`.
2. **`request_hint`** — recreate from the **migration 033** body (the live **3-arg locale-aware** version using `hints_pt`; NOT the 2-arg 023 version). Same duration substitution; preserve locale resolution, `already_solved` guard, idempotent `hint_usage` insert, `penalty_ms=60000`.
3. **`leaderboard` view** — extend the `gate` CTE to `select opened_at, coalesce(review_mode,false) review_mode, duration_minutes from workshop_config where id=1`; replace the `+ interval '35 minutes'` predicate with `+ ((select duration_minutes from gate) * interval '1 minute')` and the `extract(epoch from interval '35 minutes')*1000` cap with `(select duration_minutes from gate) * 60000`.
4. **Client hooks** — `useWorkshopClock` / `useWorkshop` already fetch `workshop_config`; add `duration_minutes` to the select and compute the window as `opened_at + duration_minutes*60_000`, falling back to `WORKSHOP_DURATION_MS` (now the documented default constant) if null.
5. **`begin_workshop` (018)** — its returned `expires_at` is computed from the per-attendee `started_at + 35min` and is **unused by the client** (which derives expiry from `opened_at + duration`). Drop `expires_at` from its return (or recompute from `opened_at + duration`) so it can't report a stale 35-min window. (Documented as a deliberate change, not "four sites.")
6. **`ChallengeIntro.tsx` copy** — the en/pt-BR `intro` strings say "35 minutes". Make the minutes an interpolation value fed from `useWorkshopClock`'s `duration_minutes` (e.g. `t("intro.p1", { minutes })`) so the copy can't contradict a changed duration. Update both locale files.

**Migrations:** `036_admin_config_and_rpcs.sql` (admin layer) and `037_configurable_duration.sql` (column + recreate submit_answer/request_hint/leaderboard/begin_workshop reading `duration_minutes`). 036/037 are the next free numbers (latest on disk is 035); renumber if anything lands first.

## Frontend

- **`AdminLink`** — small low-contrast "admin" text in `WorkshopLayout`'s sidebar-footer cluster (`aria-label="Open admin panel"`, visible `:focus-visible` outline; low contrast is intentional, the chord is the real entry). Plus a global ⌘/Ctrl+Shift+A handler: `e.preventDefault()`, ignore when `document.activeElement` is an input/textarea or the dialog is already open, and guard auto-repeat.
- **`AdminPanel`** — shadcn/ui (Radix) `Dialog`, ~400px, max-height 85vh, scrollable, focus-trapped. **First state:** masked PIN (`type=password`, **no `inputMode=numeric`** — don't nudge toward a 6-digit code). On submit, call `admin_get_status(pin)`; success → keep PIN in component memory + render dashboard; failure → inline generic error.
- **`AdminPanel`/`AdminLink` import ZERO `useTranslation`/`t`** — all labels/toasts are plain English literals. Because `i18n.changeLanguage` is process-global (WorkshopLayout auto-applies `default_locale`), any `t()` in the admin tree would flip to pt-BR; the rule is enforced by using no i18n at all. Verified by: flip language to PT-BR in the panel, confirm every admin label stays English.
- **Dashboard sections:**
  - **Live Status** (flags + timer from `useWorkshopClock`; roster from `admin_get_status` polled ~3s): a **phase badge with explicit precedence** — `review_mode → "REVIEW MODE (timer off)"`, else `challenge_open ? (expired ? "EXPIRED" : "IN PROGRESS") : "CLOSED"`; **`nexus_open` shown as a separate always-visible chip** (it's independent). Countdown is greyed/overridden when `review_mode`.
  - **Gate & Timer:** primary "Open challenge & start clock" — **if `review_mode` is on when clicked, raise a confirm** ("⚠ Review mode is ON — the timer won't run. [Turn off review mode & open] / [Open in review mode] / Cancel") so a scored run is never silently timer-less while an intentional review-mode practice run stays possible. Close; Restart; +5/−5 min; **Duration** as commit-on-blur or explicit "Set" button (never per-keystroke), client-clamped 5–180, disabled-with-tooltip while a workshop is live.
  - **Phases:** `review_mode` toggle with a persistent "⚠ timer OFF — submissions never expire" banner when on; `nexus_open` toggle.
  - **Language:** EN / PT-BR via `ToggleGroup type="single"` (a value always selected).
  - **Danger Zone** (red, separated): **Clear all data** behind **type-to-confirm** (`CLEAR`); **"Export CSV first"** triggers a **fresh `admin_get_status` fetch** (not the poll snapshot) and downloads columns `rank,name,email,questions_complete,total_ms,wrong_count,hints_used,registered_at`.
  - **Change PIN.**
- **State/behavior:** the `admin_get_status` poll runs **only while `open && pin`** (effect deps `[open, pin]`, cleanup clears the interval); Escape/close sets `pin=null`, which both stops the poll and drops it from memory (verify no `admin_get_status` calls fire after close). Per-control loading → `sonner` success toast; inline+toast error; disabled-while-pending (double-fire guard). Dashboard read states: skeleton until first status resolves; on a failed poll keep last-known data + a subtle "stale" badge (don't blank); explicit empty state for 0 attendees (reuse `LeaderboardTable`'s treatment).

## Security posture

- The bundle is public — anon key + every RPC name/signature are discoverable. Security rests **entirely** on the server-side PIN check inside each RPC.
- **No lockout.** A global lockout on a singleton row, reachable by any anon, would let anyone lock out the real operator mid-event while giving a true attacker nothing. Instead the defense is **PIN entropy**: require a **strong PIN ≥10 chars / mixed (≥~40 bits)**; at any realistic network request rate a 40-bit space is centuries to exhaust online, and bcrypt **cost 12** makes an offline crack expensive if the hash ever leaks. Supabase/PostgREST's own request limits are the only network throttle (accepted for a low-stakes, time-boxed event); the documented hardening is the deferred Edge-Function-with-per-IP-rate-limit.
- PIN-gate is the **literal first statement** of every RPC (no pre-gate SELECTs). bcrypt compare via pgcrypto `crypt()` is standard and not a useful timing oracle.
- `admin_config` is RLS-no-policy **and** has all client grants revoked; service-role key never reaches the browser.
- `admin_clear_data` is irreversible — server PIN gate **and** client type-to-confirm, with export-before-wipe.
- **Lost-PIN recovery:** `admin_change_pin` can't self-rescue; recovery is an out-of-band `UPDATE` by Brandon (documented).

## Concurrency / single-row notes

One global `workshop_config` row = one event; two operators sharing the PIN can both have the panel open. Last-write-wins is accepted for the idempotent flag toggles. `admin_clear_data` is the only serialization-sensitive op (optional `for update` row-lock). Operator guidance: coordinate out-of-band; one operator drives.

## Verification checklist (manual; no test runner)

- **PIN gate:** as **anon in a fresh incognito window that never registered**, a wrong PIN to `admin_get_status` returns only `{ok:false,error:'unauthorized'}` with **no attendee/email data**; a correct strong PIN works; `admin_change_pin` rotates it (old PIN required; new PIN <10 rejected). Stored hash starts with `$2a$12$`.
- **Each mutation** sets the intended field; the live site reflects it within ~3s. Clicking Open while `review_mode` is on raises the warning and does **not** silently change `review_mode`; "Turn off & open" clears it, "Open in review mode" leaves it on.
- **Configurable duration:** set 25 (while not live) → on next open, `submit_answer`/`request_hint` reject at 25:01, leaderboard caps at 25, client countdown + ChallengeIntro copy say 25. `admin_set_duration` is rejected while live.
- **Timer extend while expired:** with the clock expired, `+5 min` → both the sidebar pill and an attendee's challenge page un-expire within ~3s and submissions are accepted again.
- **Clear data:** wipes all five tables + all anonymous `auth.users` (cascade) and resets the gate to pre-start (challenge_open=false, opened_at=null, nexus_open=false); review_mode + default_locale preserved.
- **GUI:** type-to-confirm blocks accidental clear; CSV exports a fresh snapshot with the named columns; Escape clears the in-memory PIN and stops the poll (no calls after close); english-only holds after flipping language to PT-BR; phase badge + nexus chip correct in each state; duration input only commits on blur/Set.
- `pnpm check` + `pnpm build` clean.

## File-level change summary

**New:** `supabase/migrations/036_admin_config_and_rpcs.sql`; `supabase/migrations/037_configurable_duration.sql`; `client/src/components/AdminPanel.tsx`; `client/src/components/AdminLink.tsx`; `client/src/hooks/useAdmin.ts`.
**Modified:** `client/src/components/WorkshopLayout.tsx` (mount AdminLink + chord); `client/src/hooks/useWorkshopClock.ts`, `useWorkshop.ts` (read `duration_minutes`); `client/src/components/ChallengeIntro.tsx` + `client/public/locales/{en,pt-BR}/challenge.json` (interpolate minutes); `shared/const.ts` (`WORKSHOP_DURATION_MS` is the fallback default).
**Recreated SQL (037):** `submit_answer` (from 032 body), `request_hint` (from 033 3-arg body), `leaderboard` view, `begin_workshop` (drop/fix `expires_at`).
**Unchanged (confirm):** `normalize_answer`/answer hashing; RLS on data tables; attendee-facing flows.
