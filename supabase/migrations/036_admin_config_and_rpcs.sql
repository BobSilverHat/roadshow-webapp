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
