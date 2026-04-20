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
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontSize: "0.875rem",
  fontWeight: "300",
  lineHeight: "1.65",
  color: "rgba(200,200,220,0.85)",
  marginBottom: "1.5rem",
} as const;

const stepImageStyle = {
  width: "100%",
  height: "auto",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.08)",
  marginTop: "0.5rem",
  marginBottom: "1.5rem",
  display: "block",
} as const;

export default function Scenario1() {
  const [, navigate] = useLocation();

  return (
    <WorkshopLayout activeId="scenario-1">
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "0 2rem 6rem",
        }}
      >
        {/* ====================================================
            OVERVIEW
            ==================================================== */}
        <section id="overview" data-step-id="overview" style={{ paddingTop: "5rem", scrollMarginTop: "90px" }}>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} style={{ marginBottom: "0.75rem" }}>
            <span className="section-label">Scenario 1</span>
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
                color: "rgba(232,232,240,0.97)",
                margin: 0,
              }}
            >
              Agentic{" "}
              <span
                style={{
                  color: "oklch(0.72 0.28 290)",
                  textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                }}
              >
                Discovery
              </span>
            </h1>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            <p style={bodyParagraphStyle}>
              You can't secure what you can't see. This scenario is a top-down investigation, start at the Agentic
              Security Graph, then drill into the MCP servers, tools, and APIs beneath it; ending with full visibility
              into your agentic attack surface. Eight years of API security research, now applied to every agent,
              through understanding the tools and apis they can access, from deploy to runtime.
            </p>

            <p style={bodyParagraphStyle}>
              Salt automatically maps the full{" "}
              <a href="#" className="accent-link">
                Agentic Security Graph
              </a>
              , showing every agent, the tools they call, the APIs they reach, and the data they touch. This gives you
              a complete picture of your agentic attack surface before attackers find the gaps.
            </p>

            <p style={{ ...bodyParagraphStyle, marginBottom: "2rem" }}>
              You can identify{" "}
              <a href="#" className="accent-link">
                shadow APIs, zombie endpoints, unauthenticated MCP servers, and sensitive data exposure
              </a>{" "}
              across your entire agentic landscape, building the foundation for a complete security posture.
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
                  color: "oklch(0.65 0.25 290)",
                  marginBottom: "1rem",
                }}
              >
                Key Objectives
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "Map every agent, MCP server, tool, and API across your entire Agentic Security Graph",
                  "Surface shadow MCPs, MCP server tools, and unauthenticated APIs silently exposing sensitive data",
                  "Drill any tool to reveal its risk factors, posture gaps, and real-world attackers",
                ].map((obj, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginBottom: "0.6rem",
                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      fontSize: "0.9rem",
                      fontWeight: "300",
                      lineHeight: "1.6",
                      color: "rgba(200,200,220,0.8)",
                    }}
                  >
                    <span style={{ color: "oklch(0.65 0.25 290)", flexShrink: 0, marginTop: "2px" }}>◆</span>
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
        <StepSection stepNumber="01" title="The Agentic Inventory" id="step-01">
          <p style={bodyParagraphStyle}>
            Start with the high-level view. The Inventory dashboard surfaces how many{" "}
            <a href="#" className="accent-link">MCPs, capabilities, and connected APIs</a>{" "}
            exist in your environment, plus live request volume. You'll immediately see posture gaps detected across
            capabilities and capabilities touching sensitive data — PII, emails, addresses — without opening a single
            API spec.
          </p>
          <ZoomableImage src="/steps/scenario1/step01-inventory.png" alt="Agentic Inventory dashboard" style={stepImageStyle} />
        </StepSection>

        {/* ====================================================
            STEP 02 — Agentic Security Graph
            ==================================================== */}
        <StepSection stepNumber="02" title="The Agentic Security Graph" id="step-02">
          <p style={bodyParagraphStyle}>
            Switch to the Graph view to see relationships. Every MCP node connects to the agents that call it; every
            agent connects to the APIs downstream. Turn on{" "}
            <a href="#" className="accent-link">Insight Layers</a>{" "}
            to overlay risk score, posture gaps, or sensitive data as color-coded halos — making the highest-value
            targets visible at a glance.
          </p>
          <ZoomableImage src="/steps/scenario1/step02-graph.png" alt="The Agentic Security Graph view" style={stepImageStyle} />
        </StepSection>

        {/* ====================================================
            STEP 03 — MCP Side Drawer
            ==================================================== */}
        <StepSection stepNumber="03" title="The MCP Side Drawer" id="step-03">
          <p style={bodyParagraphStyle}>
            Click any MCP node to open its side drawer. The <a href="#" className="accent-link">Overview</a> tab
            explains what the MCP does, who hosts it, and which technologies it runs on — plus a local graph of every
            tool it exposes.
          </p>
          <ZoomableImage
            src="/steps/scenario1/step03-mcp-drawer.png"
            alt="MCP side drawer — Overview tab"
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            The <a href="#" className="accent-link">Capabilities</a> tab lists every tool the MCP exposes —
            stripe.orders.cancel, plaid.identity.verify, zendesk.tickets.get — with their own per-tool risk scores so
            you can pinpoint which capability introduces the most exposure.
          </p>
          <ZoomableImage
            src="/steps/scenario1/step03-mcp-capabilities.png"
            alt="MCP side drawer — Capabilities tab"
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 04 — Tool Capabilities
            ==================================================== */}
        <StepSection stepNumber="04" title="Tool Capabilities" id="step-04">
          <p style={bodyParagraphStyle}>
            Drill into any tool to see why Salt scored it. The{" "}
            <a href="#" className="accent-link">Risk Factors</a> radar plots five axes — Posture, Sensitive Data,
            Exposure, Authenticated, Protocol — giving a visual read on where the exposure lives.
          </p>
          <ZoomableImage
            src="/steps/scenario1/step04-tool-risk.png"
            alt="Tool drawer — Risk Factors radar chart"
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <a href="#" className="accent-link">Posture Gaps</a> lists the specific policy violations — MCP exposed
            externally, PII without auth, strict-transport headers missing — with severity and status so you can
            prioritize remediation directly.
          </p>
          <ZoomableImage
            src="/steps/scenario1/step04-posture-gaps.png"
            alt="Tool drawer — Posture Gaps tab"
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <a href="#" className="accent-link">Attackers</a> surfaces adversary correlations — which threat actors
            have touched this exact tool in the wild — turning generic risk scoring into a real-world threat read.
          </p>
          <ZoomableImage
            src="/steps/scenario1/step04-attackers.png"
            alt="Tool drawer — Attackers tab"
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 05 — Capabilities Page
            ==================================================== */}
        <StepSection stepNumber="05" title="The Capabilities Page" id="step-05">
          <p style={bodyParagraphStyle}>
            Flatten the graph into a single capabilities table. Every tool across every MCP in one view, sortable by{" "}
            <a href="#" className="accent-link">risk score</a>. This is where you triage — sort highest-risk to top,
            filter by source type, and stack-rank remediation work. It's how posture management turns into an
            actionable backlog.
          </p>
          <ZoomableImage
            src="/steps/scenario1/step05-capabilities.png"
            alt="Capabilities page — aggregate tool view"
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            SUMMARY
            ==================================================== */}
        <section id="summary" data-step-id="summary" style={{ paddingTop: "3rem", scrollMarginTop: "90px" }}>
          <hr className="section-divider" />
          <div style={{ marginTop: "2rem", marginBottom: "3rem" }}>
            <span
              style={{
                display: "block",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.72rem",
                fontWeight: "700",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(200,200,220,0.78)",
                marginBottom: "1.25rem",
              }}
            >
              Summary
            </span>
            <h2
              style={{
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: "1.35rem",
                fontWeight: "500",
                lineHeight: "1.3",
                color: "rgba(232,232,240,0.97)",
                margin: "0 0 1.5rem",
                letterSpacing: "-0.01em",
              }}
            >
              End-to-end visibility, established.
            </h2>
            <p style={bodyParagraphStyle}>
              You walked the discovery progression: inventory count, graph view, MCP drilldown, per-tool risk surface,
              and a flat capabilities backlog. You now have end-to-end visibility into every agent, MCP, and API in
              your environment — the foundation{" "}
              <a href="#" className="accent-link">posture management</a> will build on in the next scenario.
            </p>
          </div>
        </section>

        <hr className="section-divider" />

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
            <MagicRingsButton label="Next" onClick={() => navigate("/scenario/2")} />
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
