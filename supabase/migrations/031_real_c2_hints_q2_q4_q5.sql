-- 031_real_c2_hints_q2_q4_q5.sql
-- Replace the "Hint 0X — TBD" placeholders on Challenge 2 Q2, Q4, and
-- the three hints on Q5 with the workshop-ready copy. Q1 and Q3 already
-- have their real hints from migrations 026 and 028.

update public.questions
set hints = array[
  'Open the attacker profile and locate the "Large Language Model" risk type — opening it reveals the sub-risk type.'
]
where challenge_id = 2 and order_idx = 2;

update public.questions
set hints = array[
  'Open the attacker profile, find the "Excessive Data Exposure" risk type, expand it, and click into the sub-risk type to surface the request method and API URL that triggered the detection.'
]
where challenge_id = 2 and order_idx = 4;

update public.questions
set hints = array[
  'On the Protect side of the platform, filter attackers by severity and locate the one associated with IP 150.222.78.110 — that''s the attacker this question is about.',
  'Once you''ve opened that attacker, head to the Summary tab. Find the "Broken Object Level Authorization" risk type and open one of its sub-risk types for details.',
  'Under "Broken Object Level Authorization", click the API listed inside one of its two sub-risk types — the API details panel on the right exposes the body parameter you need.'
]
where challenge_id = 2 and order_idx = 5;
