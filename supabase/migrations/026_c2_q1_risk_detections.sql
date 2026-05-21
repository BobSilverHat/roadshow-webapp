-- 026_c2_q1_risk_detections.sql
-- Replace Challenge 2 Q1 with a "count distinct risk type detections"
-- question on the same attacker hash. New answer = 9. Sets the hint
-- alongside (Q1 was using a placeholder from migration 024).
--
-- Row ID is preserved (UPDATE, not INSERT) so any client-side state
-- keyed on question_id keeps working. Answer hash uses normalize_answer()
-- so casing / whitespace variations on "9" still match.

update public.questions
set
  prompt =
    'Including suspicious attempts, how many distinct risk type detections were triggered for attacker ''HASHED:b5054931dd19c11e05ca180bd8bc3981''?',
  answer_hash = encode(
    extensions.digest(public.normalize_answer('9'), 'sha256'),
    'hex'
  ),
  hints = array[
    'On the Protect side of the platform, open the attacker and toggle on "Display Suspicious Attempts".'
  ]
where challenge_id = 2 and order_idx = 1;
