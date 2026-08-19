-- 042_c2_q1_host_question.sql
-- Replaces Challenge 2 Q1, the last toggle-dependent counting question.
--
-- The old Q1 asked for the number of distinct risk type detections (answer 9),
-- but the attacker profile shows only 8 risk types with "Display Suspicious
-- Attempts" turned OFF, which is the default. Attendees who never touched the
-- toggle counted 8, were marked wrong, and had no way to know why. Scenario 3
-- also teaches the 8-type view, so the walkthrough actively disagreed with the
-- grader.
--
-- Replaced with a confidence-builder that reads one plain-text field off the
-- attacker header: the targeted host. Durable (baked into the demo data, not a
-- live count), one click deep, and toggle-independent.
--
-- Answer: billing.sora-financial.com
-- Unchanged: row id, order_idx, every other question.

update public.questions set
  prompt = $b$Open Protect and find the Critical attacker 'llm-mass-refund@sora-financial.com'. Which host was this attacker targeting?$b$,
  prompt_pt = $b$Abra o Protect e encontre o atacante Critical 'llm-mass-refund@sora-financial.com'. Qual host esse atacante estava atacando?$b$,
  answer_hash = encode(extensions.digest(public.normalize_answer($b$billing.sora-financial.com$b$), 'sha256'), 'hex'),
  alt_answer_hashes = array[
    encode(extensions.digest(public.normalize_answer($b$billing.sora-financial.com/mcp$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$https://billing.sora-financial.com$b$), 'sha256'), 'hex'),
    encode(extensions.digest(public.normalize_answer($b$billing.sora-financial$b$), 'sha256'), 'hex')
  ],
  hints = array[
    $b$In Protect, the Detected Attackers list is long. If you have re-sorted it, sort by Severity so the Critical attackers come first, then look for llm-mass-refund@sora-financial.com.$b$,
    $b$Open the attacker. The Host is in the Attacker Details header row, alongside Severity, Confidence and Attempts.$b$
  ],
  hints_pt = array[
    $b$Em Protect, a lista de Detected Attackers é longa. Se você reordenou, ordene por Severity para os Critical aparecerem primeiro e procure llm-mass-refund@sora-financial.com.$b$,
    $b$Abra o atacante. O Host aparece na linha de Attacker Details, ao lado de Severity, Confidence e Attempts.$b$
  ]
where challenge_id = 2 and order_idx = 1;

-- ---------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------
--   select order_idx, prompt,
--          answer_hash = encode(extensions.digest(
--            public.normalize_answer('billing.sora-financial.com'),'sha256'),'hex') as answer_ok,
--          cardinality(hints) = cardinality(hints_pt) as hint_parity
--   from public.questions where challenge_id = 2 and order_idx = 1;
