# i18n Glossary & Decisions

## Frozen terms — stay English in BOTH locales

These are Salt product names, UI labels, and technical identifiers that attendees must match against the **English** Salt platform and screenshots. They stay verbatim inside Portuguese sentences — never translate them.

**Product / brand:** Salt, Salt Security, Pepper AI, Salt Nexus, Sora Financial, GuidePoint.

**Platform UI labels (as they appear in the English product):** Agentic Inventory, Graph, Table, Insight Layers, Capabilities, Posture Gaps, Risk Score, Risk Factors, Risk Types, Data & Structure, Sensitive Data, Structure, Overview, Sources, Attackers, Details, Policy, API Found, Policy Conditions, Evidence, Matching Findings, Parameter Findings, Manage Policies, Generate Swagger, Take Action.

**Risk-type / finding names:** Large Language Model, Prompt Injection, Parameter Tampering, Broken User Authentication, Security Misconfiguration, Mass Assignment, Excessive Data Exposure, Injection, MCP, BOLA, IDOR, Unsecured JWT, Shadow API, Zombie API, Agentic AI, Data Security and Privacy, GDPR, Operational Security.

**Endpoints / methods / tools (verbatim):** `POST /agent/chat`, `/mcp/tools/list`, `/mcp/tools/call/...`, `POST /v1/refunds`, `GET /v1/orders/search`, `stripe.orders.get`, `stripe.orders.search`, `plaid.identity.verify`, `zendesk.tickets.get`, `sfdc.cases.create`, `snowflake.query.execute`, `dbt.model.run`, `github.pr.merge`, header names (`x-aidr-user-id`, `authorization`, `cf-connecting-ip`, …), CVE ids (`CVE-2015-9235`), attacker hashes, IPs, user-agents, cloud asset IDs.

**Units/tokens left as-is:** numbers, `MM:SS`, `+15s`, `+60s`, severity words shown in the UI (Critical/High/Medium/Low) — keep matching the platform.

> Rule of thumb: if an attendee will read it in the Salt platform or a screenshot to answer a question, it stays English.

## Font glyph decision (Task 0, 2026-06-01)

Checked each self-hosted face's cmap for pt-BR diacritics `ã â á à ç é ê í ó ô õ ú Ã Ç É` via fontTools:

- **Casta-Thin.otf** (navbar/sidebar) — ALL PRESENT
- **Casta-ThinSlanted.otf** (navbar/sidebar italic) — ALL PRESENT
- **NostalgicWhispers-Regular.ttf** (H1/H2 headlines) — ALL PRESENT

**Decision:** No font swap or `:lang(pt)` fallback required. All display faces render Portuguese accents natively. **Task 24 reduces to setting `<html lang>` from `i18n.language`** (for correct hyphenation/accessibility) — no CSS font-family overrides needed.
