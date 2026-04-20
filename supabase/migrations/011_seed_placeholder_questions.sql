-- Placeholder questions for UI development. Phase 7 will replace these with real
-- content and answers. Hashes below correspond to literal answers shown in
-- comments (useful during Phase 2/3/4 UI smoke tests).
-- Idempotent via (challenge_id, order_idx) unique constraint.

insert into public.questions (challenge_id, order_idx, prompt, answer_hash) values
  -- Challenge 1 placeholders (answers: placeholder-c1-q1 through placeholder-c1-q5)
  (1, 1, 'Placeholder C1 Q1 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c1-q1', 'sha256'), 'hex')),
  (1, 2, 'Placeholder C1 Q2 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c1-q2', 'sha256'), 'hex')),
  (1, 3, 'Placeholder C1 Q3 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c1-q3', 'sha256'), 'hex')),
  (1, 4, 'Placeholder C1 Q4 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c1-q4', 'sha256'), 'hex')),
  (1, 5, 'Placeholder C1 Q5 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c1-q5', 'sha256'), 'hex')),
  -- Challenge 2 placeholders (answers: placeholder-c2-q1 through placeholder-c2-q5)
  (2, 1, 'Placeholder C2 Q1 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c2-q1', 'sha256'), 'hex')),
  (2, 2, 'Placeholder C2 Q2 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c2-q2', 'sha256'), 'hex')),
  (2, 3, 'Placeholder C2 Q3 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c2-q3', 'sha256'), 'hex')),
  (2, 4, 'Placeholder C2 Q4 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c2-q4', 'sha256'), 'hex')),
  (2, 5, 'Placeholder C2 Q5 — real content in Phase 7.',
    encode(extensions.digest('placeholder-c2-q5', 'sha256'), 'hex'))
on conflict (challenge_id, order_idx) do nothing;
