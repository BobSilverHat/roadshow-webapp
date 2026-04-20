/**
 * Introduction Page — Salt Security Agentic Workshop
 * Design: Cyber-Noir / Dark Ops Terminal
 * Route: /
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
    transition: { duration: 0.55, delay: i * 0.1 },
  }),
};

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <WorkshopLayout activeId="introduction">
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "0 2rem 6rem",
        }}
      >
        {/* ====================================================
            HERO SECTION
            ==================================================== */}
        <section style={{ paddingTop: "5rem", textAlign: "center" }}>
          {/* WELCOME label */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            style={{ marginBottom: "1.5rem" }}
          >
            <span className="section-label">Welcome</span>
          </motion.div>

          {/* Hero headline */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            style={{ marginBottom: "2.5rem" }}
          >
            <h1
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                fontWeight: "800",
                lineHeight: "1.05",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: "rgba(232,232,240,0.97)",
                margin: 0,
              }}
            >
              Agentic AI Security Where it Matters
            </h1>
            <h1
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                fontWeight: "800",
                fontStyle: "italic",
                lineHeight: "1.05",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: "oklch(0.72 0.28 290)",
                margin: 0,
                textShadow: "0 0 40px oklch(0.52 0.28 290 / 0.5)",
              }}
            >
              In the Action.
            </h1>
          </motion.div>

          {/* OVERVIEW label */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            style={{ marginBottom: "1.75rem" }}
          >
            <span className="section-label">Overview</span>
          </motion.div>

          {/* Body paragraphs */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
          >
            <p
              style={{
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: "0.875rem",
                fontWeight: "300",
                lineHeight: "1.65",
                color: "rgba(200,200,220,0.85)",
                textAlign: "center",
                marginBottom: "1.75rem",
              }}
            >
              Your agents are performing actions with APIs and MCP servers you don't know exist. Salt secures all of it, from code to runtime. An AI Agent is like a digital employee. And like any employee, what matters isn't what they think.{" "}
              <a href="#" className="accent-link">
                It's what they do.
              </a>
            </p>

            <p
              style={{
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: "0.875rem",
                fontWeight: "300",
                lineHeight: "1.65",
                color: "rgba(200,200,220,0.85)",
                textAlign: "center",
                marginBottom: "1.75rem",
              }}
            >
              Visibility isn't enough, you need context. While most AI security stops at the model, attackers don't. Not every agent carries the same risk. Salt's Agentic Security platform contextualizes risk across your entire environment,{" "}
              <a href="#" className="accent-link">
                separating the agents that can cause real damage from those that cannot.
              </a>
            </p>

            <p
              style={{
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: "0.875rem",
                fontWeight: "300",
                lineHeight: "1.65",
                color: "rgba(200,200,220,0.85)",
                textAlign: "center",
                marginBottom: "2rem",
              }}
            >
              In this hands-on workshop, you will walk through three scenarios following a simple progression:{" "}
              <a href="#" className="accent-link">
                Agentic Discovery → Posture Management → Runtime Protection
              </a>
              .
            </p>

            {/* Bullet list */}
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 2rem",
                textAlign: "left",
              }}
            >
              {[
                {
                  label: "Agentic Discovery",
                  body: "You can't secure what you can't see. Salt automatically discovers every agent, MCP server and API across your environment, including the shadow and zombie APIs nobody knows are there.",
                },
                {
                  label: "Posture Management",
                  body: "Knowing what exists is only the first step. Salt analyzes every component in your Agentic Security Graph for misconfigurations, excessive permissions, and exposed credentials, before an attacker finds them.",
                },
                {
                  label: "Runtime Protection",
                  body: "Agents move at machine speed. So does Salt. Real-time detection of abuse, anomalous behavior, and active attacks across the full graph, including the internal traffic your perimeter tools never see.",
                },
              ].map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                    fontSize: "0.95rem",
                    fontWeight: "300",
                    lineHeight: "1.65",
                    color: "rgba(200,200,220,0.85)",
                  }}
                >
                  <span style={{ color: "oklch(0.65 0.25 290)", marginTop: "2px", flexShrink: 0 }}>•</span>
                  <span>
                    <a href="#" className="accent-link">
                      {item.label}
                    </a>{" "}
                    {item.body}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </section>

        <hr className="section-divider" />

        {/* ====================================================
            SALT ACCESS CTA
            ==================================================== */}
        <section style={{ paddingTop: "1rem", textAlign: "center" }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: "800",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                margin: "0 0 2rem",
              }}
            >
              <span style={{ color: "rgba(232,232,240,0.97)" }}>Salt </span>
              <span
                style={{
                  color: "oklch(0.72 0.28 290)",
                  textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.5)",
                }}
              >
                Access
              </span>
            </h2>

            <button
              className="btn-salt-primary"
              style={{ borderRadius: "2px" }}
              onClick={() =>
                window.open("https://salt-labs.secured-api.com", "_blank", "noopener,noreferrer")
              }
            >
              <span style={{ position: "relative", zIndex: 1 }}>Launch Salt Platform</span>
            </button>
          </motion.div>
        </section>

        <hr className="section-divider" />

        {/* ====================================================
            NAVIGATION BUTTON — Begin
            ==================================================== */}
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
            <MagicRingsButton label="Begin" onClick={() => navigate("/scenario/1")} />
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
