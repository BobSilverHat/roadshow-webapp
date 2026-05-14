-- 021_workshop_config_nexus_gate.sql
-- Adds a second admin-controlled gate for the post-challenge "Salt Nexus"
-- page (live attack simulation linking out to salt-nexus.com). Independent
-- of challenge_open so the admin can stage the workshop flow:
--   1. Open challenge_open  → users compete
--   2. Timer expires        → users land on /completed
--   3. Open nexus_open      → users access /salt-nexus + launch button
--
-- Admin commands:
--   -- Open Salt Nexus phase:
--   update public.workshop_config
--     set nexus_open = true where id = 1;
--   -- Close (between sessions, or to reset):
--   update public.workshop_config
--     set nexus_open = false where id = 1;
--
-- Defaults to false. The existing select policy on workshop_config
-- already covers this column (anon + authenticated read).

alter table public.workshop_config
  add column if not exists nexus_open boolean not null default false;
