-- 029_c2_swap_q4_q5.sql
-- Swap the order_idx of Challenge 2's Q4 and Q5 so the question that
-- was at position 4 now renders as Q5 and vice versa. Question rows
-- (prompt / answer_hash / alt_answer_hashes / hints / wrong_count
-- linkage) stay intact — only the display position moves, which means
-- attribute "what was Q4's answer" naturally lands at position 5.
--
-- The (challenge_id, order_idx) UNIQUE constraint is not deferrable
-- and Postgres validates it row-by-row mid-UPDATE, so the single-
-- statement CASE swap collides. Three-step swap via order_idx = -1
-- (no CHECK on the column, so a temporarily negative value is fine).

update public.questions set order_idx = -1
  where challenge_id = 2 and order_idx = 4;

update public.questions set order_idx = 4
  where challenge_id = 2 and order_idx = 5;

update public.questions set order_idx = 5
  where challenge_id = 2 and order_idx = -1;
