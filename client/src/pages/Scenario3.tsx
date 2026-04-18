/**
 * Scenario 3 Page — Runtime Protection
 * Design: Cyber-Noir / Dark Ops Terminal
 * Route: /scenario/3
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
        <section style={{ paddingTop: "5rem" }}>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} style={{ marginBottom: "0.75rem" }}>
            <span className="section-label">Scenario 3</span>
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
              Agents move at machine speed. So does Salt. In this final scenario, you will simulate an active agentic
              attack — including prompt injection, tool abuse, credential theft, and data exfiltration — and observe
              how Salt Security's behavioral AI detects and blocks the attack in real time without requiring signatures
              or manual rule creation.
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
              Salt monitors every action your agents take — every API call, every tool invocation, every MCP server
              interaction — and correlates behavior across the full graph to surface{" "}
              <a href="#" className="accent-link">
                attacker intent before data is exfiltrated
              </a>
              , including the internal east-west traffic your perimeter tools never see.
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
              You will see how Salt correlates low-and-slow reconnaissance patterns across{" "}
              <a href="#" className="accent-link">
                millions of agentic interactions to surface attacker intent
              </a>{" "}
              before sensitive data leaves your environment.
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
                  "Detect prompt injection attempts in real time",
                  "Block unauthorized tool calls and API access by compromised agents",
                  "Identify anomalous agent behavior using behavioral baseline AI",
                  "Prevent sensitive data from reaching unauthorized destinations",
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
            <MagicRingsButton label="Next" onClick={() => navigate("/completed")} />
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
