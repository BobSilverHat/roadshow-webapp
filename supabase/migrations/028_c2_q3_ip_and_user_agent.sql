-- 028_c2_q3_ip_and_user_agent.sql
-- Replace Challenge 2 Q3 with a new question that accepts the attacker's
-- IP combined with either of two distinct user-agents. Uses the multi-
-- answer mechanism added in migration 027:
--   primary answer_hash  = "10.0.1.197" + "Sora-BillingAgent/1.0 MCPClient"
--   alt_answer_hashes[0] = "10.0.1.197" + "python-httpx/0.28.1"
--
-- normalize_answer() lowercases + sorts comma-separated values, so any
-- input order or casing on the two tokens still hashes to one of the
-- two canonical forms.

update public.questions
set
  prompt =
    'What''s the IP of this attacker ''HASHED:b5054931dd19c11e05ca180bd8bc3981'', and what is one distinct user-agent they were seen using?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('10.0.1.197, Sora-BillingAgent/1.0 MCPClient'),
      'sha256'
    ),
    'hex'
  ),
  alt_answer_hashes = array[
    encode(
      extensions.digest(
        public.normalize_answer('10.0.1.197, python-httpx/0.28.1'),
        'sha256'
      ),
      'hex'
    )
  ],
  hints = array[
    'After opening the attacker profile, navigate to "Sources" — you''ll find every user-agent seen for this attacker listed there.'
  ]
where challenge_id = 2 and order_idx = 3;
