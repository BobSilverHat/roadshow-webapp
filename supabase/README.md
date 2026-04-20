# Supabase backend — Salt workshop CTF

This directory is the paper-trail mirror of what's applied to Supabase project `cttpfrwphcqpjwmwothb` for the two-challenge CTF feature.

Every file under `migrations/` was applied via the Supabase MCP's `apply_migration` tool, using the filename (minus `.sql`) as the migration name. The authoritative history lives server-side — `mcp__supabase__list_migrations` returns it — but these files let a human reproduce the schema from scratch against a fresh project.

## Reproducing the schema

Against a fresh Supabase project:

1. Open the SQL editor.
2. Run each file under `migrations/` in numeric order (001 → 011).

Every migration is idempotent — re-running against an already-migrated project is safe.

## Conventions

- File name: `NNN_<snake_case_name>.sql` where NNN is the sequence number (001, 002, …).
- Every migration ends with a comment block describing what to verify, including the exact `execute_sql` commands used during development.
- Tables are created with `if not exists`. Functions use `create or replace`. Seeds use `on conflict … do nothing`.
- SECURITY DEFINER functions always set `search_path` to avoid hijacking.
- RLS is enabled on every table; no `USING (true)` policies on mutating ops.

## Design spec

See `docs/superpowers/specs/2026-04-20-ctf-challenges-design.md` for the full design rationale this backend implements.
