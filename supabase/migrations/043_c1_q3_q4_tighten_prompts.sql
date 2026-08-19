-- 043_c1_q3_q4_tighten_prompts.sql
-- Trims Challenge 1 Q3 and Q4 down to the question itself.
--
-- Both prompts were narrating the click path ("switch the View by MCPs
-- dropdown to View by Capabilities and sort by Risk Score, highest first",
-- "click the row to open its side drawer, then open the Capabilities tab"),
-- which gave away for free what the paid hints already say. That removed the
-- searching, made the questions read as instructions rather than challenges,
-- and wasted the hint tier.
--
-- The navigation now lives only in hint 1 of each question, where it already
-- was. Q3 hint 2 is de-duplicated since the prompt still states the 8.0 fact.
--
-- ANSWERS AND HASHES ARE UNCHANGED (notifications.webhook /
-- snowflake.query.execute). Prompt text and one hint string only.

update public.questions set
  prompt    = $b$In the Agentic Inventory, exactly one capability has a Risk Score of 8.0. What is its name?$b$,
  prompt_pt = $b$No Agentic Inventory, exatamente uma capability tem Risk Score 8.0. Qual é o nome dela?$b$,
  hints = array[
    $b$In the Agentic Inventory, switch the view dropdown from "View by MCPs" to "View by Capabilities", then click the Risk Score column to sort highest first.$b$,
    $b$Everything above it scores 8.4 or 9.4 and everything below is 7.8. The name ends in .webhook. Type it exactly, dot included.$b$
  ],
  hints_pt = array[
    $b$No Agentic Inventory, mude o seletor de "View by MCPs" para "View by Capabilities" e clique na coluna Risk Score para ordenar do maior para o menor.$b$,
    $b$Tudo acima dela tem 8.4 ou 9.4 e tudo abaixo tem 7.8. O nome termina em .webhook. Digite exatamente, com o ponto.$b$
  ]
where challenge_id = 1 and order_idx = 3;

update public.questions set
  prompt    = $b$On the MCP dataops.sora-financial.com/mcp, which tool has the highest Risk Score?$b$,
  prompt_pt = $b$No MCP dataops.sora-financial.com/mcp, qual tool tem o maior Risk Score?$b$
where challenge_id = 1 and order_idx = 4;

-- ---------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------
--   select order_idx, prompt, length(prompt) as chars,
--          cardinality(hints) = cardinality(hints_pt) as hint_parity
--   from public.questions where challenge_id = 1 and order_idx in (3,4);
--   -- expect 91 and 81 chars, hint_parity true on both
