-- 025_real_challenge1_hints.sql
-- Replace the placeholder hint copy for Challenge 1 questions with the
-- workshop-ready text. Q5 keeps three sequential hints (general →
-- specific); Q1–Q4 each have a single hint. Challenge 2 still uses
-- placeholders from 024 — to be filled in a follow-up migration.

update public.questions
set hints = array[
  'Open the Salt Agentic Graph to see every MCP server detected within Sora Financial.'
]
where challenge_id = 1 and order_idx = 1;

update public.questions
set hints = array[
  'Open crm.sora-financial.com in the Agentic Inventory, MCP side drawer, or Agentic Graph and look for the "technology" icon.'
]
where challenge_id = 1 and order_idx = 2;

update public.questions
set hints = array[
  'Find plaid.identity.verify in the Agentic Inventory, Discovery Inventory, or Agentic Graph. Open its side drawer and navigate to the "Posture Gaps" tab.'
]
where challenge_id = 1 and order_idx = 3;

update public.questions
set hints = array[
  'Inside the Agentic Inventory, switch the view from "View by MCPs" to "Capabilities".'
]
where challenge_id = 1 and order_idx = 4;

update public.questions
set hints = array[
  'Open the Discovery Inventory, drill into the host ai.sora-financial.com, and count its distinct MCP methods.',
  'Look for the standard MCP request types used to enumerate capabilities, list features, and trigger actions; methods like tools/list, resources/list, and prompts/list. Count each distinct method only once.',
  'MCP methods also include calls such as tools/call and resources/read, your final total is under 10.'
]
where challenge_id = 1 and order_idx = 5;
