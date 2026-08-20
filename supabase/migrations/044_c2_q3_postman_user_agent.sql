-- 044_c2_q3_postman_user_agent.sql
-- The demo tenant's second user-agent for llm-mass-refund@sora-financial.com
-- changed from python-httpx/0.28.1 to PostmanRuntime/7.50.0. Re-hash C2 Q3.
--
-- Alternates cover the realistic ways an attendee types it: bare product name,
-- version dropped, slash replaced with a space.
--
-- NOTE: Scenario 3 step 02 taught the old user-agent in its copy, so an
-- attendee following the walkthrough would have answered python-httpx and been
-- graded wrong. That copy is corrected in the same change set (en, pt-BR, and
-- the Trans fallback in Scenario3.tsx), and the per-agent call counts (60/11)
-- were dropped from the copy since they drift with the tenant. The Sources
-- screenshot (step02-attacker-profile-c.png) still shows the old value and
-- needs a re-capture from the live tenant.
--
-- Prompt, hints and hint cardinality are unchanged: the prompt never named the
-- user-agent, and the hint only points at the Sources tab.

update public.questions set
  answer_hash = encode(extensions.digest(public.normalize_answer($b$PostmanRuntime/7.50.0$b$), 'sha256'), 'hex'),
  alt_answer_hashes = array[
    encode(extensions.digest(public.normalize_answer($b$PostmanRuntime$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$PostmanRuntime 7.50.0$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$PostmanRuntime/7.50$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$Postman$b$), 'sha256'), 'hex')
  ]
where challenge_id = 2 and order_idx = 3;

-- ---------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------
--   select answer_hash = encode(extensions.digest(
--            public.normalize_answer('PostmanRuntime/7.50.0'),'sha256'),'hex') as ok,
--          cardinality(alt_answer_hashes) as alts
--   from public.questions where challenge_id = 2 and order_idx = 3;
--   -- expect ok = true, alts = 4
