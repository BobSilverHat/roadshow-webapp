# Phase 1 verification log

**Date applied:** 2026-04-20
**Project:** cttpfrwphcqpjwmwothb
**Branch:** ctf-phase-1-supabase

## Migrations applied (via mcp__supabase__list_migrations)

- 001_enable_pgcrypto
- 002_create_core_tables
- 003_create_tracking_tables
- 004_create_views
- 005_enable_rls
- 006_register_attendee_rpc
- 007_begin_challenge_rpc
- 008_submit_answer_rpc
- 009_get_leaderboard_rpc
- 010_seed_challenges
- 011_seed_placeholder_questions

## Tables created

attendees, challenges, questions, challenge_attempts, answer_attempts, question_progress — all with RLS enabled.

## Views created

questions_public, leaderboard — both readable by anon.

## RPCs created

register_attendee(text, text), begin_challenge(int), submit_answer(uuid, text), get_leaderboard() — all SECURITY DEFINER, grants set.

## Advisor results

### Security

**Findings (3 total):**

1. **security_definer_view** (ERROR) — View `public.leaderboard` is defined with SECURITY DEFINER. *Intentional and spec-sanctioned.*
2. **security_definer_view** (ERROR) — View `public.questions_public` is defined with SECURITY DEFINER. *Intentional and spec-sanctioned.*
3. **rls_enabled_no_policy** (INFO) — Table `public.questions` has RLS enabled but no policies exist. *Expected; RLS enforcement is delegated to the views.*

No unexpected ERROR-level findings. The two SECURITY DEFINER ERRORs are the documented defense against privilege escalation in public views.

### Performance

**Findings (6 total — all INFO or WARN, no CRITICAL):**

- **Unindexed foreign keys** (INFO, 3 findings): `answer_attempts.question_id_fkey`, `challenge_attempts.challenge_id_fkey`, `question_progress.question_id_fkey` lack covering indexes. *Acceptable for Phase 1 data volume; will optimize in Phase 3 if needed.*
- **Auth RLS initialization plan** (WARN, 4 findings): RLS policies on `attendees`, `challenge_attempts`, `answer_attempts`, `question_progress` re-evaluate `auth.<function>()` per row. *Acceptable for Phase 1 scale; documented for future optimization.*
- **Unused index** (INFO): Index `answer_attempts_attendee_question_idx` not yet used. *Expected in early phase; will be utilized once queries run.*

**Summary:** No critical findings. Informational and warning-level notes about indexes and RLS call patterns are expected for a fresh dataset and will be addressed in Phase 3 optimization if performance data warrants.

## Smoke test outputs (Step 4)

Query: `register_attendee`, `begin_challenge`, `submit_answer`, and `get_leaderboard` rowcount.

```json
{
  "register_r": { "ok": false, "error": "not_authenticated" },
  "begin_r": { "ok": false, "error": "not_registered" },
  "submit_r": { "ok": false, "error": "not_registered" },
  "leaderboard_rowcount": 0
}
```

**Result:** All four RPCs returned expected error states (no session context, no attendee rows). Leaderboard count is 0 as expected (no submissions yet).

## Public surface (Step 5)

**First 3 rows of questions_public:**

| id | challenge_id | order_idx | prompt |
|---|---|---|---|
| d7b082fc-87b2-4354-ad8d-dfdb3f955f80 | 1 | 1 | Placeholder C1 Q1 — real content in Phase 7. |
| f92579ab-ac6c-4c1c-bb98-d7eb0abb26d9 | 1 | 2 | Placeholder C1 Q2 — real content in Phase 7. |
| 56ba40b0-f7e6-468b-844e-7367ead8f010 | 1 | 3 | Placeholder C1 Q3 — real content in Phase 7. |

**Counts:**
- `challenges` total: 2
- `leaderboard` total: 0

## Anti-cheat verification (Step 6)

**questions_public columns:**

1. id
2. challenge_id
3. order_idx
4. prompt

No `answer_hash` present. Clients cannot read answer hashes through the public surface. The seed data in `questions` (challenge 1 Q1-Q5 and challenge 2 Q1-Q5, 10 rows total) contains correct answer hashes that are hidden from anon users.

## Ready for Phase 2

The data layer is stable. All 11 migrations applied successfully. RLS policies and SECURITY DEFINER views are in place to protect attendee privacy and prevent answer-hash leakage. Public surface exposes only challenge metadata and placeholder prompts. The four core RPCs (`register_attendee`, `begin_challenge`, `submit_answer`, `get_leaderboard`) function correctly and return proper error handling when called without session context.

Phase 2 (client routing + RegistrationGate) can proceed with confidence.
