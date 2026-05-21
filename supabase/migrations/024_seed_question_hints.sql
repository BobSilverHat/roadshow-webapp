-- 024_seed_question_hints.sql
-- Seed placeholder hint copy so the end-to-end flow works in dev.
-- Q1–Q4 of each challenge get one placeholder hint; Q5 gets three.
-- Real copy is written in a follow-up migration before the workshop.

update public.questions
set hints = ARRAY['Hint 01 — TBD']
where order_idx in (1, 2, 3, 4);

update public.questions
set hints = ARRAY[
  'Hint 01 — TBD',
  'Hint 02 — TBD',
  'Hint 03 — TBD'
]
where order_idx = 5;
