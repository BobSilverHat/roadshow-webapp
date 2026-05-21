-- 022_seed_challenge1_v2.sql
-- Re-seed Challenge 1 with revised questions that map 1-to-1 to the
-- Scenario 1 walkthrough. Dry run showed the prior set was too hard —
-- they tested platform fluency on fields the scenarios never highlighted.
--
-- New shape: each question targets one of the five Scenario 1 steps so
-- attentive users can answer by going to the same screen the scenario
-- already walked them through.
--
-- Row IDs are preserved (UPDATE, not INSERT) so any client-side state
-- keyed on question_id continues to work. Answer hashes use
-- normalize_answer() so case + ordering variations match.

update public.questions
set
  prompt = 'How many MCPs does Salt currently surface in the Agentic Inventory?',
  answer_hash = encode(
    extensions.digest(public.normalize_answer('9'), 'sha256'),
    'hex'
  )
where challenge_id = 1 and order_idx = 1;

update public.questions
set
  prompt = 'What technology powers crm.sora-financial.com?',
  answer_hash = encode(
    extensions.digest(public.normalize_answer('cloudflare'), 'sha256'),
    'hex'
  )
where challenge_id = 1 and order_idx = 2;

update public.questions
set
  prompt = 'On tool plaid.identity.verify, which posture gap related to GDPR has the highest severity?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('Prohibition of social security numbers in api responses'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 1 and order_idx = 3;

update public.questions
set
  prompt = 'Sort the Capabilities table by risk score. What''s the top tool''s name and technology?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('stripe.orders.search, kong'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 1 and order_idx = 4;

update public.questions
set
  prompt = 'How many distinct MCP methods does ai.sora-financial.com call?',
  answer_hash = encode(
    extensions.digest(public.normalize_answer('6'), 'sha256'),
    'hex'
  )
where challenge_id = 1 and order_idx = 5;
