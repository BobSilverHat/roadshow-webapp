/**
 * Scenario 2 Page — Posture Management
 * Design: Cyber-Noir / Dark Ops Terminal
 * Route: /scenario/2
 */

import { motion } from "framer-motion";
import { useLocation } from "wouter";
import WorkshopLayout from "@/components/WorkshopLayout";
import MagicRingsButton from "@/components/MagicRingsButton";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.12 },
  }),
};

export default function Scenario2() {
  const [, navigate] = useLocation();

  return (
    <WorkshopLayout activeId="scenario-2">
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "0 2rem 6rem",
        }}
      >
        <section style={{ paddingTop: "5rem" }}>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} style={{ marginBottom: "0.75rem" }}>
            <span className="section-label">Scenario 2</span>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} style={{ marginBottom: "2rem" }}>
            <h1
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: "800",
                lineHeight: "1.05",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "rgba(232,232,240,0.97)",
                margin: 0,
              }}
            >
              Posture{" "}
              <span
                style={{
                  color: "oklch(0.72 0.28 290)",
                  textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                }}
              >
                Management
              </span>
            </h1>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.975rem",
                fontWeight: "300",
                lineHeight: "1.75",
                color: "rgba(200,200,220,0.85)",
                marginBottom: "1.5rem",
              }}
            >
              Knowing what exists is only the first step. With your Agentic Security Graph established, this scenario
              walks you through analyzing every component for risk — misconfigurations, excessive permissions, exposed
              credentials, and policy violations — before an attacker finds them.
            </p>

            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.975rem",
                fontWeight: "300",
                lineHeight: "1.75",
                color: "rgba(200,200,220,0.85)",
                marginBottom: "1.5rem",
              }}
            >
              Not every agent carries the same risk. Salt's posture engine contextualizes each finding against the
              actual blast radius — separating{" "}
              <a href="#" className="accent-link">
                agents that can cause real damage from those that cannot
              </a>
              , so your team focuses on what matters.
            </p>

            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.975rem",
                fontWeight: "300",
                lineHeight: "1.75",
                color: "rgba(200,200,220,0.85)",
                marginBottom: "2rem",
              }}
            >
              Salt's posture management capabilities allow you to track{" "}
              <a href="#" className="accent-link">
                compliance drift, unauthenticated endpoints, and excessive data exposure
              </a>{" "}
              across every agent and API in your catalog — continuously, not just at scan time.
            </p>

            {/* Key objectives */}
            <div
              style={{
                border: "1px solid oklch(0.52 0.28 290 / 0.2)",
                borderRadius: "4px",
                padding: "1.5rem",
                backgroundColor: "oklch(0.52 0.28 290 / 0.04)",
                marginBottom: "2rem",
              }}
            >
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
                  "Identify misconfigured agents and over-permissioned service accounts",
                  "Detect exposed credentials and secrets in agent configurations",
                  "Enforce attribute-based access controls across the agentic graph",
                  "Prioritize findings by blast radius and actual exploitability",
                ].map((obj, i) => (
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
                      color: "rgba(200,200,220,0.8)",
                    }}
                  >
                    <span style={{ color: "oklch(0.65 0.25 290)", flexShrink: 0, marginTop: "2px" }}>◆</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
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
            <MagicRingsButton label="Next" onClick={() => navigate("/scenario/3")} />
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
