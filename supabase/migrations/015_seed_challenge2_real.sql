-- Real Challenge 2 (Protect) questions.
-- Replaces the 5 placeholder rows in-place. Row IDs are preserved.
-- Q1, Q2, Q5 embed the target attacker hash directly in the prompt so
-- each question is self-contained.

update public.questions
set
  prompt = 'How many different MCP tools was attacker ''HASHED:b5054931dd19c11e05ca180bd8bc3981'' seen using?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('3'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 2 and order_idx = 1;

update public.questions
set
  prompt = 'Attacker ''HASHED:b5054931dd19c11e05ca180bd8bc3981'': what sub-risk type under the parent risk type "Large Language Model" was flagged?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('Prompt Injection'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 2 and order_idx = 2;

update public.questions
set
  prompt = 'What''s the IP of the Critical-severity attacker caught performing a vulnerability scan?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('45.154.98.19'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 2 and order_idx = 3;

update public.questions
set
  prompt = 'An attacker from Singapore was flagged for a double BOLA (IDOR). Which body parameter didn''t match the path parameter?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('id'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 2 and order_idx = 4;

update public.questions
set
  prompt = 'Attacker ''HASHED:b5054931dd19c11e05ca180bd8bc3981'': which request method and URL was caught returning excessive PII to them?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('POST /agent/chat'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 2 and order_idx = 5;
