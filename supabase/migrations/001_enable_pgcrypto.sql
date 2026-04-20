-- Enable pgcrypto for SHA-256 hashing in submit_answer RPC.
-- Supabase ships pgcrypto in the `extensions` schema.
create extension if not exists pgcrypto with schema extensions;

-- Verification:
-- select extensions.digest('test', 'sha256');  -- should return a bytea
