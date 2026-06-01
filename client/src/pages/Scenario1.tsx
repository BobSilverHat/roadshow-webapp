/**
 * Scenario 1 Page — Agentic Discovery
 * Design: Cyber-Noir / Dark Ops Terminal
 * Route: /scenario/1
 *
 * Structure: Overview → Step 01 – 05 → Summary → Next button.
 * Each section carries `id` + `data-step-id` so the WorkshopLayout sidebar
 * can scroll-spy the active sub-section.
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

export default function Scenario1() {
  const [, navigate] = useLocation();
  const { t } = useTranslation("scenario1");

  return (
    <WorkshopLayout activeId="scenario-1">
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
                Salt automatically maps the full <l1>Agentic Security Graph</l1>, showing every agent, the tools they call, the APIs they reach, and the data they touch. This gives you a complete picture of your agentic attack surface before attackers find the gaps.
              </Trans>
            </p>

            <p style={{ ...bodyParagraphStyle, marginBottom: "2rem" }}>
              <Trans i18nKey="overview.p3" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
                You can identify <l1>shadow APIs, zombie endpoints, unauthenticated MCP servers, and sensitive data exposure</l1> across your entire agentic landscape, building the foundation for a complete security posture.
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
            STEP 01 — Agentic Inventory
            ==================================================== */}
        <StepSection stepNumber="01" title={t("step01.title")} id="step-01">
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step01.body" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              Start with the high-level view. The Inventory dashboard surfaces how many <l1>MCPs, capabilities, and connected APIs</l1> exist in your environment, plus live request volume. You'll immediately see posture gaps detected across capabilities and capabilities touching sensitive data like PII, emails, addresses, without opening a single API spec.
            </Trans>
          </p>
          <ZoomableImage src="/steps/scenario1/step01-inventory.png" alt={t("step01.imageAlt")} style={stepImageStyle} />
        </StepSection>

        {/* ====================================================
            STEP 02 — Agentic Security Graph
            ==================================================== */}
        <StepSection stepNumber="02" title={t("step02.title")} id="step-02">
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step02.body" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              Switch to the Graph view to see how everything connects. The graph reads left to right across four linked columns: your MCPs, the Technologies they run on, the third-party Applications they reach, and the Capabilities each one exposes. Hover any node to highlight its connections and preview its risk score, top posture gap, and sensitive data; click to open its full side drawer. Turn on <l1>Insight Layers</l1> to recolor the whole graph by risk score, posture gaps, or sensitive data, so the highest-value targets stand out at a glance. Filters and layer toggles trim the view to what matters, and they persist across both Table and Graph.
            </Trans>
          </p>
          <ZoomableImage src="/steps/scenario1/step02-graph.png" alt={t("step02.imageAlt")} style={stepImageStyle} />
        </StepSection>

        {/* ====================================================
            STEP 03 — MCP Side Drawer
            ==================================================== */}
        <StepSection stepNumber="03" title={t("step03.title")} id="step-03">
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step03.body1" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              Click any MCP node to open its side drawer. The <l1>Overview</l1> tab explains what the MCP does, who hosts it, and which technologies it runs on, plus a local graph of every tool it exposes.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario1/step03-mcp-drawer.png"
            alt={t("step03.image1Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step03.body2" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              The <l1>Capabilities</l1> tab lists every tool the MCP exposes, snowflake.query.execute, dbt.model.run, github.pr.merge, with their own per-tool risk scores so you can pinpoint which capability introduces the most exposure.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario1/step03-mcp-capabilities.png"
            alt={t("step03.image2Alt")}
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 04 — Capabilities Page
            ==================================================== */}
        <StepSection stepNumber="04" title={t("step04.title")} id="step-04">
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step04.body" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              Flatten the graph into a single capabilities table. Every tool across every MCP in one view, sortable by <l1>risk score</l1>. This is where you triage, sort highest-risk to top, filter by source type, and stack-rank remediation work. It's how posture management turns into an actionable backlog.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario1/step05-capabilities.png"
            alt={t("step04.imageAlt")}
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 05 — Tool Capabilities
            ==================================================== */}
        <StepSection stepNumber="05" title={t("step05.title")} id="step-05">
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step05.body1" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              Drill into any tool to see why Salt scored it. The <l1>Risk Factors</l1> radar plots five axes, Posture, Sensitive Data, Exposure, Authenticated, Protocol, giving a visual read on where the exposure lives.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario1/step04-tool-risk.png"
            alt={t("step05.image1Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step05.body2" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              <l1>Posture Gaps</l1> lists the specific policy violations, MCP exposed externally, PII without auth, strict-transport headers missing, with severity and status so you can prioritize remediation directly.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario1/step04-posture-gaps.png"
            alt={t("step05.image2Alt")}
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <Trans i18nKey="step05.body3" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
              <l1>Attackers</l1> surfaces adversary correlations, which threat actors have touched this exact tool in the wild, turning generic risk scoring into a real-world threat read.
            </Trans>
          </p>
          <ZoomableImage
            src="/steps/scenario1/step04-attackers.png"
            alt={t("step05.image3Alt")}
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
                You walked the discovery progression: inventory count, graph view, MCP drilldown, a flat capabilities backlog, and the per-tool risk surface. You now have end-to-end visibility into every agent, MCP, and API in your environment — the foundation <l1>posture management</l1> will build on in the next scenario.
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
            <MagicRingsButton label={t("nextButton")} onClick={() => navigate("/scenario/2")} />
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
