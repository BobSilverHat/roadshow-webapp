/**
 * Scenario 3 Page — Runtime Protection
 * Design: Cyber-Noir / Dark Ops Terminal
 * Route: /scenario/3
 *
 * Scaffolded with placeholder step content — fill in real copy and
 * screenshots per step when the Runtime Protection walkthrough is authored.
 */

import { motion } from "framer-motion";
import { useLocation } from "wouter";
import WorkshopLayout from "@/components/WorkshopLayout";
import MagicRingsButton from "@/components/MagicRingsButton";
import StepSection from "@/components/StepSection";
import EvervaultCard from "@/components/EvervaultCard";

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

const stepPlaceholderStyle = {
  width: "100%",
  aspectRatio: "16 / 10",
  borderRadius: "6px",
  border: "1px dashed rgba(255,255,255,0.15)",
  backgroundColor: "rgba(255,255,255,0.02)",
  marginTop: "0.5rem",
  marginBottom: "1.5rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.7rem",
  fontWeight: "600",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(200,200,220,0.4)",
} as const;

export default function Scenario3() {
  const [, navigate] = useLocation();

  return (
    <WorkshopLayout activeId="scenario-3">
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
            <span className="section-label">Scenario 3</span>
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
              Runtime{" "}
              <span
                style={{
                  color: "oklch(0.72 0.28 290)",
                  textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                }}
              >
                Protection
              </span>
            </h1>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            <p style={bodyParagraphStyle}>
              Agents move at machine speed. So does Salt. In this final scenario, you will simulate an active agentic
              attack — including prompt injection, tool abuse, credential theft, and data exfiltration — and observe
              how Salt Security's behavioral AI detects and blocks the attack in real time without requiring signatures
              or manual rule creation.
            </p>

            <p style={bodyParagraphStyle}>
              Salt monitors every action your agents take — every API call, every tool invocation, every MCP server
              interaction — and correlates behavior across the full graph to surface{" "}
              <a href="#" className="accent-link">
                attacker intent before data is exfiltrated
              </a>
              , including the internal east-west traffic your perimeter tools never see.
            </p>

            <p style={{ ...bodyParagraphStyle, marginBottom: "2rem" }}>
              You will see how Salt correlates low-and-slow reconnaissance patterns across{" "}
              <a href="#" className="accent-link">
                millions of agentic interactions to surface attacker intent
              </a>{" "}
              before sensitive data leaves your environment.
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
                  "Stream every agent action — tool call, MCP invocation, API request — as it happens",
                  "Correlate low-and-slow anomalies across millions of interactions into full attack timelines",
                  "Block compromised agents and quarantine MCPs automatically — including east-west traffic",
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
            STEPS — placeholder copy until the walkthrough is authored
            ==================================================== */}
        <StepSection stepNumber="01" title="The Runtime Feed" id="step-01">
          <p style={bodyParagraphStyle}>
            The Runtime tab streams every action your agents take in real time — API calls, tool invocations, MCP
            server interactions — across the full Agentic Security Graph. Filter by agent, destination, or risk level
            to zero in on what matters.
          </p>
          <div style={stepPlaceholderStyle}>Screenshot Pending</div>
        </StepSection>

        <StepSection stepNumber="02" title="Anomaly Detection" id="step-02">
          <p style={bodyParagraphStyle}>
            Salt builds a behavioral baseline for every agent — which tools it normally calls, what data it usually
            touches, how often it acts — and flags deviations the moment they occur. No signatures, no tuning, just
            behavior vs. baseline.
          </p>
          <div style={stepPlaceholderStyle}>Screenshot Pending</div>
        </StepSection>

        <StepSection stepNumber="03" title="Attack Correlation" id="step-03">
          <p style={bodyParagraphStyle}>
            Individual anomalies are noise; correlated anomalies are attacks. Salt stitches low-and-slow reconnaissance
            across millions of agentic interactions into a single attack timeline — so the moment a compromised agent
            starts reaching for credentials, you see it as an attack, not a metric spike.
          </p>
          <div style={stepPlaceholderStyle}>Screenshot Pending</div>
        </StepSection>

        <StepSection stepNumber="04" title="Internal Traffic Inspection" id="step-04">
          <p style={bodyParagraphStyle}>
            Most runtime tools watch the perimeter. Salt watches the east-west traffic between your agents, MCPs, and
            internal APIs — where the interesting attacks actually live. Every internal call is scored against the same
            behavioral model as external traffic.
          </p>
          <div style={stepPlaceholderStyle}>Screenshot Pending</div>
        </StepSection>

        <StepSection stepNumber="05" title="Automated Response" id="step-05">
          <p style={bodyParagraphStyle}>
            From any detected attack, Salt can block the offending agent, revoke credentials, or quarantine an MCP —
            automatically or via one-click approval. The response path is built into the graph, not bolted on to a
            separate SOAR tool.
          </p>
          <div style={stepPlaceholderStyle}>Screenshot Pending</div>
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
              Attacks, stopped at machine speed.
            </h2>
            <p style={bodyParagraphStyle}>
              You saw the full runtime loop: stream every agent action, baseline their behavior, correlate anomalies
              into real attack timelines, and respond automatically — across external and internal traffic. Discovery
              told you what exists; posture told you what's exposed; runtime tells you{" "}
              <a href="#" className="accent-link">who's actively moving against you</a>.
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
            <MagicRingsButton label="Finish" onClick={() => navigate("/completed")} />
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
