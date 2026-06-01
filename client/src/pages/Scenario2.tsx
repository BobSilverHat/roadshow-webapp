/**
 * Scenario 2 Page — Posture Management
 * Design: Cyber-Noir / Dark Ops Terminal
 * Route: /scenario/2
 *
 * Walkthrough: Posture Gaps dashboard → filter to criticals → drill the gap
 * drawer → investigate the offending API → correlate to active attackers and
 * transition into the Protect workflow. Screenshots live under
 * client/public/steps/scenario2/.
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

export default function Scenario2() {
  const [, navigate] = useLocation();
  const { t } = useTranslation("scenario2");

  return (
    <WorkshopLayout activeId="scenario-2">
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
                Not every agent carries the same blast radius. Salt's posture engine scores each finding by what the compromised tool can actually reach, which MCPs, which downstream APIs, which data categories, so your team spends its time on the <l1>handful of agents and tools that can cause real damage</l1>, not the entire backlog.
              </Trans>
            </p>

            <p style={{ ...bodyParagraphStyle, marginBottom: "2rem" }}>
              <Trans i18nKey="overview.p3" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
                Posture runs continuously, not at scan time. Salt tracks <l1>compliance drift, unauthenticated MCPs, hardcoded credentials in tool configs, and sensitive data exposed by the capabilities behind every agent, </l1> as your graph evolves, so does the finding list. You see new risk the moment it appears, not at the next quarterly audit.
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
            STEP 01 — Posture Gaps Overview
            ==================================================== */}
        <StepSection stepNumber="01" title={t("step01.title")} id="step-01">
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step01.body1" t={t} components={{ l1: <a href="#" className="accent-link" /> }} values={{ gaps: 909 }}>
              Open the Posture Gaps dashboard to see every policy violation across your entire Agentic Security Graph, ranked by severity. <l1>909 gaps</l1> detected here: shadow APIs, PII without authentication, strict-transport headers missing, MCPs exposed externally. The donut on the right breaks severity; the table below is the full, sortable worklist.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario2/step01-posture-gaps.png"
            alt={t("step01.image1Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step01.body2" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              Not sure where to start? Ask Pepper AI, <l1>"What APIs have the highest risk score?"</l1>, and Pepper surfaces a ranked list of the APIs contributing the most exposure, pulled live from the same graph data. Natural language in, prioritized triage out.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario2/step01-pepper-ai.png"
            alt={t("step01.image2Alt")}
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 02 — Filter to What Matters
            ==================================================== */}
        <StepSection stepNumber="02" title={t("step02.title")} id="step-02">
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step02.body"
              t={t}
              components={{ l1: <a href="#" className="accent-link" />, l2: <a href="#" className="accent-link" /> }}
              values={{ total: 909, filtered: 42 }}
            >
              909 findings can be a lot to digest. Filter it. Here we narrow to <l1>MCP servers exposed externally returning sensitive data</l1> and <l2>exposed hardcoded secrets</l2>, two critical-only policies, collapsing the list to 42 items you can actually take action on this week. Every filter condition is a Salt policy primitive, so the filtered worklist is also a saved query you can re-run any time.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario2/step02-filter.png"
            alt={t("step02.imageAlt")}
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 03 — The Posture Gap Drawer
            ==================================================== */}
        <StepSection stepNumber="03" title={t("step03.title")} id="step-03">
          <p style={bodyParagraphStyle}>
            <Trans
              i18nKey="step03.body1"
              t={t}
              components={{ l1: <a href="#" className="accent-link" />, l2: <a href="#" className="accent-link" /> }}
            >
              Click any posture gap to open its side-drawer. The <l1>API Found</l1> tab pins the exact endpoint that triggered the finding, POST /mcp/tools/call/sfdc.cases.create on crm.sora-financial.com, alongside <l2>Evidence</l2> and parameter findings: the live response samples proving the violation, here an Account number and Email exposed in the response content.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario2/step03-drawer-full.png"
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
                l4: <a href="#" className="accent-link" />,
              }}
            >
              Switch to the <l1>Policy</l1> tab to see why it fired. The <l2>Description</l2> explains the risk in plain language; <l3>General Remediation</l3> is a concrete action list, disable external access, apply authentication, sanitize responses. <l4>Policy Conditions</l4> shows the exact rule Salt matched: Technologies IS MCP AND Exposure IS External AND Response Content WITH Sensitive Parameter IS True.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario2/step03-conditions-evidence.png"
            alt={t("step03.image2Alt")}
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 04 — Investigate the API
            ==================================================== */}
        <StepSection stepNumber="04" title={t("step04.title")} id="step-04">
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step04.body1" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              Click the API link on any gap row to pivot from the posture finding into the full <l1>API investigation</l1>,  where Salt keeps everything it knows about that specific endpoint.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario2/step04-investigate-link.png"
            alt={t("step04.image1Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step04.body2" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              The API Overview opens on a radar plotting all five risk dimensions with a single <l1>composite score of 7.8 (HIGH)</l1>. Pepper AI auto-summarizes what the endpoint actually does: creates Salesforce support cases via an MCP tool, Bearer-authenticated, returning account numbers and emails. No spec hunting.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario2/step04-api-overview.png"
            alt={t("step04.image2Alt")}
            style={stepImageStyle}
          />
          <ZoomableImage
            src="/steps/scenario2/step04-pepper-summary.png"
            alt={t("step04.image3Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step04.body3" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              <l1>Data &amp; Structure → Sensitive Data</l1> lists every parameter carrying sensitive content, access tokens in request headers, account numbers and emails across request and response content, IP addresses forwarded, a phone number in the response headers, with data-type tags so you can see exactly what's leaking and where.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario2/step04-sensitive-data.png"
            alt={t("step04.image4Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step04.body4" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              The <l1>Details</l1> tab carries the full metadata: source, labels, auth type, content type, MCP technology tags, activity timeline, and extended metadata, all the context an investigator needs without leaving the view.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario2/step04-api-details.png"
            alt={t("step04.image5Alt")}
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 05 — Attacker Correlation
            ==================================================== */}
        <StepSection stepNumber="05" title={t("step05.title")} id="step-05">
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step05.body1" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              Posture tells you what's exposed. <l1>Attackers</l1> tells you who's already probing it. The Attackers tab on the API drawer correlates every adversary that has touched this exact endpoint, with severity, risk type (Broken User Auth, Parameter Tampering, Security Misconfig, Injection), status, and detection time.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario2/step05-attackers.png"
            alt={t("step05.image1Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step05.body2" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              Click through to Protect for the full attacker profile: categorized <l1>risk types</l1>, most-attacked APIs, server-response distribution, and a timeline of every attempt. This is where posture management hands off to runtime protection, the subject of the next scenario.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario2/step05-protect.png"
            alt={t("step05.image2Alt")}
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
              {t("summary.heading", { gaps: 909 })}
            </h2>
            <p style={bodyParagraphStyle}>
              <Trans i18nKey="summary.body" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
                You walked the triage path: overview the full gap list, filter to criticals, open a gap drawer for its conditions and evidence, pivot into the offending API to see its risk radar and sensitive-data exposure, and correlate it to active attackers. Posture stopped being a static scan, it became a <l1>live bridge into runtime protection</l1>, which is Scenario 3.
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
            <MagicRingsButton label={t("nextButton")} onClick={() => navigate("/scenario/3")} />
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
