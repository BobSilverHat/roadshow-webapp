-- Real Challenge 1 (Discover & Govern) questions.
-- Replaces the 5 placeholder rows in-place. Row IDs are preserved so any
-- client-side state keyed on question_id continues to work.
--
-- Answer hashes use normalize_answer() so order/spacing variations match.

update public.questions
set
  prompt = 'Which MCP servers have exposed hardcoded secrets?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('support-copilot-mcp, platform-tools-mcp'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 1 and order_idx = 1;

update public.questions
set
  prompt = 'Which MCP server exposes tools that individually return the most sensitive data, and what technology does it use?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('crm.sora-financial.com, cloudflare'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 1 and order_idx = 2;

update public.questions
set
  prompt = 'I handle transaction details, and return money upon request. Credit details leak, and I can make a mess. I hang in AWS, time for the test — what''s my cloud asset ID?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('vjkdap70uc'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 1 and order_idx = 3;

update public.questions
set
  prompt = 'Which MCP server tool retrieves financial profile information, has a risk score of 7 or higher, and is connected to service:billing-agent?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('plaid.identity.verify'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 1 and order_idx = 4;

update public.questions
set
  prompt = 'How many distinct MCP methods does ai.sora-financial.com call?',
  answer_hash = encode(
    extensions.digest(
      public.normalize_answer('6'),
      'sha256'
    ),
    'hex'
  )
where challenge_id = 1 and order_idx = 5;
