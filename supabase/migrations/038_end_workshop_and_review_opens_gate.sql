-- 038_end_workshop_and_review_opens_gate.sql
--
-- Two operator-control fixes surfaced during admin-panel smoke testing:
--
--   1. "End workshop now" — a NEW action that forces the global window into
--      the already-expired state so every challenge page shows the Time's Up
--      lockout (for begun and not-yet-begun attendees alike). The old
--      "Close gate" only resets to the pre-start "Begins Soon" overlay and is
--      ignored entirely by anyone already mid-challenge, so it could never
--      end a running workshop.
--
--   2. "Review mode" entering the gate — turning review mode ON now also
--      opens the challenge so attendees land directly in the untimed review
--      view. Previously the flag had no visible effect while the gate was
--      closed, because review mode only changes the timer behaviour of an
--      *open* challenge.
--
-- Both are additive / config-setter changes. They do not touch the live
-- scoring functions (submit_answer, leaderboard view, begin_workshop).

-- ---------------------------------------------------------------------------
-- 1. admin_end_workshop — force the Time's Up / expired state for everyone.
--
-- The expired state is computed purely from the clock: both useWorkshopClock
-- and useWorkshop derive "expired" when now() > opened_at + duration (with
-- review_mode off and the gate open). Back-dating opened_at past the full
-- duration guarantees that condition for every attendee immediately.
-- Reversible via admin_restart_timer / admin_open_challenge (both re-stamp
-- opened_at = now()).
-- ---------------------------------------------------------------------------
create or replace function public.admin_end_workshop(p_pin text)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  update public.workshop_config
     set challenge_open = true,
         review_mode    = false,
         opened_at      = now()
                          - (coalesce(duration_minutes, 35) * interval '1 minute')
                          - interval '1 second'
   where id = 1;
  return json_build_object('ok', true);
end; $function$;

grant execute on function public.admin_end_workshop(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. admin_set_review_mode — entering review mode also opens the challenge.
--
-- p_on = true  : review_mode on + gate open. Preserve an existing opened_at
--                (a live run already counting); only stamp now() if the gate
--                had never been opened, so the challenge is reachable in the
--                untimed review view.
-- p_on = false : clear the flag only; leave the gate exactly as it is (the
--                operator then uses Open / Restart for a fresh timed run).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_review_mode(p_pin text, p_on boolean)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
begin
  if not public.admin_check_pin(p_pin) then return json_build_object('ok',false,'error','unauthorized'); end if;
  if coalesce(p_on, false) then
    update public.workshop_config
       set review_mode    = true,
           challenge_open = true,
           opened_at      = coalesce(opened_at, now())
     where id = 1;
  else
    update public.workshop_config set review_mode = false where id = 1;
  end if;
  return json_build_object('ok', true);
end; $function$;

grant execute on function public.admin_set_review_mode(text, boolean) to anon, authenticated;
