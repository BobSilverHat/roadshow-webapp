-- 040_c1_q1_hint_table_tile.sql
-- Companion to 039 (Q1 answer 9 -> 10).
--
-- The Q1 hint pointed attendees at the Agentic Graph, whose "MCPs & Toolkit"
-- column renders 11 nodes: the 10 MCPs plus a non-MCP "Other / Toolkit"
-- aggregate fed by the sora-servicing-agent edge. A user who follows the hint
-- and counts nodes answers 11 and is graded wrong against the correct answer
-- of 10. normalize_answer does not map words to digits and no alternates are
-- registered, so there is no recovery from that miscount.
--
-- Re-points the hint at the Table view's "MCPs" stat tile, which reads 10
-- cleanly, and adds an explicit carve-out for anyone who still works from the
-- Graph. Updates BOTH hints (en, lineage 025) and hints_pt (pt-BR, lineage
-- 034); cardinality stays 1 in both languages, as request_hint() indexes them
-- positionally and hint_count derives from the English array.
--
-- Unchanged: answer_hash, alt_answer_hashes, prompt, prompt_pt, order_idx, id.

update public.questions
set hints = array[
      $b$In the Agentic Inventory, stay on the Table view and read the "MCPs" stat tile at the top of the page. In the Graph view the "Other / Toolkit" node is not an MCP, so don't count it.$b$
    ],
    hints_pt = array[
      $b$No Agentic Inventory, permaneça na Table view e leia o stat tile "MCPs" no topo da página. No Graph view, o nó "Other / Toolkit" não é um MCP, então não o conte.$b$
    ]
where challenge_id = 1 and order_idx = 1;

-- ---------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------
-- Expect one row, both cardinalities = 1, both hints referencing the Table
-- view stat tile:
--
--   select order_idx,
--          cardinality(hints)    as n_hints,
--          cardinality(hints_pt) as n_hints_pt,
--          hints[1]    as hint_en,
--          hints_pt[1] as hint_pt
--   from public.questions
--   where challenge_id = 1 and order_idx = 1;
--
-- hint_count exposed to clients must still be 1:
--   select hint_count from public.questions_public
--   where challenge_id = 1 and order_idx = 1;
