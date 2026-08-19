-- 039_c1_q1_mcp_count_10.sql
-- Environment refresh (Aug 2026): the Agentic Inventory now surfaces 10 MCPs,
-- up from 9. The addition is finops.sora-financial.com/mcp, discovered through
-- the Azure Foundry Gateway connector.
--
-- Challenge 1 Q1 ("How many MCPs does Salt currently surface in the Agentic
-- Inventory?") was seeded in 022 with the answer '9'. Against the refreshed
-- tenant that grades every CORRECT attendee answer as wrong, so the hash is
-- re-computed here for '10' using the exact recipe submit_answer() uses:
-- public.normalize_answer() then sha256, hex-encoded.
--
-- Unchanged: the row id (client state keyed on question_id keeps working),
-- prompt, prompt_pt, order_idx, hints, hints_pt, alt_answer_hashes.
--
-- NOTE (not fixed here, needs a copy decision): the Q1 hint points users at
-- the Agentic Graph, whose "MCPs & Toolkit" column now renders 11 nodes
-- (10 MCPs + the "Other / Toolkit" node). A user who counts graph nodes will
-- answer 11 and be marked wrong. The Table view's MCPs stat tile reads 10
-- cleanly. Re-pointing the hint requires updating BOTH hints (en, seeded in
-- 025) and hints_pt (seeded in 034).

update public.questions
set answer_hash = encode(
      extensions.digest(public.normalize_answer('10'), 'sha256'),
      'hex'
    )
where challenge_id = 1 and order_idx = 1;

-- ---------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------
-- Expect one row, matches_10 = true, matches_old_9 = false:
--
--   select order_idx,
--          prompt,
--          answer_hash = encode(extensions.digest(public.normalize_answer('10'), 'sha256'), 'hex') as matches_10,
--          answer_hash = encode(extensions.digest(public.normalize_answer('9'),  'sha256'), 'hex') as matches_old_9
--   from public.questions
--   where challenge_id = 1 and order_idx = 1;
--
-- Round-trip through the grading path (as a registered, begun test attendee):
--   select public.submit_answer(
--     (select id from public.questions where challenge_id = 1 and order_idx = 1),
--     '10'
--   );
--   -- expect {"ok": true, "correct": true, ...}
