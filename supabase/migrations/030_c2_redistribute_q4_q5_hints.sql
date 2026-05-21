-- 030_c2_redistribute_q4_q5_hints.sql
-- After 029 swapped C2 Q4 and Q5 positions, the hint counts also
-- moved with the questions — leaving the centered Q5 slot with one
-- hint and the new Q4 slot with three. Restore the Challenge-1
-- shape (Q1–Q4 single hint, Q5 three hints) by redistributing.
-- Both arrays are still placeholders from 024, so this is a structural
-- swap only — no content lost.

update public.questions
set hints = array['Hint 01 — TBD']
where challenge_id = 2 and order_idx = 4;

update public.questions
set hints = array[
  'Hint 01 — TBD',
  'Hint 02 — TBD',
  'Hint 03 — TBD'
]
where challenge_id = 2 and order_idx = 5;
