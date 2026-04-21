# CTF question drafts — for your review

Candidates for the 10 real CTF flags (5 per challenge). Designed around what's visible in the Salt platform at `salt-labs.secured-api.com` and reinforced by the Scenario 2 + 3 screenshots already in the workshop webapp.

**Ground rules I applied:**
- Every answer is a short, unambiguous string (a number, a header name, a risk type name, a dollar amount).
- Every answer is findable **inside the Salt UI** by navigating one or two clicks — no inference, no synthesis.
- Answers will be lowercased + trimmed server-side before hashing, so attendees can type "Prompt Injection" or "prompt injection" — both work.

**Caveat:** I derived specific values (61 attackers, $2,499.50, etc.) from the screenshots authored into Scenarios 2 and 3. If the live demo tenant has drifted — different row counts, different names — the answers below need refreshing. Please spot-check each against the live `salt-labs.secured-api.com` before we lock them in.

---

## Challenge 1 — Discover & Govern (Scenarios 1 + 2)

### Q1 · Agentic Graph size
**Prompt:** In the Agentic Inventory, how many MCP servers are in your environment?
**Answer:** *(pull from live tenant — Scenario 1 screenshots show the MCP capabilities panel but not a hard count I can verify)*
**Source:** Agentic → Inventory → filter `Technology IS MCP`.

### Q2 · Pepper AI ranking
**Prompt:** Ask Pepper AI "what APIs have the highest risk score?". What's the top API it returns?
**Answer candidate:** `POST /v1/refunds`
**Source:** Posture → Pepper AI chat. Confirm against live Pepper output.

### Q3 · Filtered gap count
**Prompt:** On the Posture Gaps dashboard, filter to `MCP servers exposed externally returning sensitive data` + `Hardcoded secrets exposed`. How many findings remain?
**Answer candidate:** `28`
**Source:** Scenario 2 step02 caption says "collapsing the list to 28 items". Verify live count.

### Q4 · API risk radar
**Prompt:** Open the API drawer for the Stripe orders endpoint. What's its composite risk score?
**Answer candidate:** `8.4`
**Source:** Scenario 2 step04 caption explicitly cites "composite score of 8.4 (HIGH)".

### Q5 · Policy conditions
**Prompt:** In the posture gap drawer's Policy Conditions, Salt matches three conditions joined by AND. The second one is `Internal/External IS External`. What's the first one?
**Answer candidate:** `Technology IS MCP`
**Source:** Scenario 2 step03 caption quotes the rule verbatim.

---

## Challenge 2 — Protect (Scenario 3)

### Q6 · Attackers dashboard count
**Prompt:** Open the Protect → Attackers tab. How many active attackers does the dashboard show right now?
**Answer candidate:** `61`
**Source:** Scenario 3 step01 — the donut center reads "61".

### Q7 · Missing header
**Prompt:** When the attacker pivoted from the LLM to the MCP server, one header was flagged missing by *both* the Parameter Tampering and MCP risk types. Which header?
**Answer candidate:** `x-aidr-user-id`
**Source:** Scenario 3 step03 caption — the whole narrative hinges on this header.

### Q8 · Forged JWT scope
**Prompt:** The attacker forged a JWT with `alg: none`. What scope did they claim?
**Answer candidate:** `billing:admin billing:refund:unlimited`
**Source:** Scenario 3 step04 JWT screenshots — the scope is in the `authorization.scope` field.

*(Alternative if the full string is too long to type: change the question to "What's the first scope they forged?" → answer `billing:admin`.)*

### Q9 · Tool-abuse XSS target
**Prompt:** During direct MCP tool abuse, the attacker injected a stored XSS payload into a tool argument. Which MCP tool did they target?
**Answer candidate:** `zendesk.tickets.get`
**Source:** Scenario 3 step05 — `POST /mcp/tools/call/zendesk.tickets.get`.

### Q10 · Cash-out amount
**Prompt:** How much money did the attacker steal during the cash-out?
**Answer candidate:** `$2,499.50`
**Source:** Scenario 3 step05 caption.

*(Format variants to consider: `2499.50`, `2,499.50`, `$2499.50`. We'll normalize via lower+trim but currency symbol and comma are tricky. My recommendation: accept the answer as `2499.50` — pure number, no symbol — and phrase the question as "Enter the amount stolen, with cents, no currency symbol.")*

---

## What I need from you

For each question above, either:

1. **Accept the answer candidate as-is.**
2. **Replace it with the correct value from the live tenant.**
3. **Reword the prompt** if it's too leading, too hard, or doesn't map to the current UI.
4. **Swap the question** entirely for a better one you have in mind.

Once you sign off (even partially), I'll:
- SHA-256-hash each answer (lowercase + trimmed) using the same recipe the RPC uses.
- Ship `supabase/migrations/013_real_questions.sql` that UPDATEs the 10 question rows with your final prompts + hashes.
- Run a smoke verification that the hashes round-trip correctly.

No code changes needed anywhere else — the client already reads prompts from `questions_public` and the grading pipeline is unchanged.
