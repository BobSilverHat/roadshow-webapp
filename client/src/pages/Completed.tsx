/**
 * Completed Page — Workshop Complete
 * Design: Cyber-Noir / Dark Ops Terminal
 * Route: /completed
 */

import { motion } from "framer-motion";
import { useLocation } from "wouter";
import WorkshopLayout from "@/components/WorkshopLayout";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.12 },
  }),
};

export default function Completed() {
  const [, navigate] = useLocation();

  return (
    <WorkshopLayout activeId="completed">
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "0 2rem 6rem",
          textAlign: "center",
        }}
      >
        <section style={{ paddingTop: "5rem" }}>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} style={{ marginBottom: "0.75rem" }}>
            <span className="section-label">Completed!</span>
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
              Workshop{" "}
              <span
                style={{
                  color: "oklch(0.72 0.28 290)",
                  textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                }}
              >
                Complete
              </span>
            </h1>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            {/* Completion badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: "1.5px solid oklch(0.65 0.25 290 / 0.5)",
                backgroundColor: "oklch(0.52 0.28 290 / 0.08)",
                marginBottom: "2rem",
                boxShadow: "0 0 32px oklch(0.52 0.28 290 / 0.2)",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="oklch(0.72 0.28 290)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

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
              Congratulations — you have completed the Salt Security Agentic AI Security Workshop. You now have
              hands-on experience discovering your agentic attack surface, managing posture at scale, and detecting
              real-time attacks using behavioral AI.
            </p>

            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.975rem",
                fontWeight: "300",
                lineHeight: "1.75",
                color: "rgba(200,200,220,0.85)",
                marginBottom: "2.5rem",
              }}
            >
              You've seen how Salt secures the full agentic stack — from{" "}
              <a href="#" className="accent-link">
                discovery through posture management to runtime protection
              </a>{" "}
              — giving your organization complete visibility and control over every agent, MCP server, and API in
              your environment.
            </p>

            {/* Summary cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
                marginBottom: "3rem",
                textAlign: "left",
              }}
            >
              {[
                { number: "01", title: "Agentic Discovery", desc: "Full inventory of agents, MCP servers & APIs" },
                { number: "02", title: "Posture Management", desc: "Risk-contextualized findings by blast radius" },
                { number: "03", title: "Runtime Protection", desc: "Real-time behavioral detection & blocking" },
              ].map((card) => (
                <div
                  key={card.number}
                  style={{
                    border: "1px solid oklch(0.52 0.28 290 / 0.18)",
                    borderRadius: "4px",
                    padding: "1.25rem",
                    backgroundColor: "oklch(0.52 0.28 290 / 0.04)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "1.5rem",
                      fontWeight: "800",
                      color: "oklch(0.65 0.25 290)",
                      lineHeight: "1",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {card.number}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "rgba(232,232,240,0.9)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    {card.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.8rem",
                      fontWeight: "300",
                      lineHeight: "1.5",
                      color: "rgba(160,160,180,0.75)",
                    }}
                  >
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Download certificate button */}
            <button
              className="btn-salt-primary"
              style={{ borderRadius: "2px", maxWidth: "400px", margin: "0 auto", display: "block" }}
              onClick={() => alert("Certificate download coming soon")}
            >
              <span style={{ position: "relative", zIndex: 1 }}>Download Certificate</span>
            </button>

            {/* Restart workshop */}
            <button
              onClick={() => navigate("/")}
              style={{
                background: "none",
                border: "none",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.75rem",
                fontWeight: "600",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(150,130,200,0.55)",
                marginTop: "1.5rem",
                cursor: "pointer",
                transition: "color 0.2s",
                display: "block",
                margin: "1.5rem auto 0",
              }}
              onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.color = "rgba(196,181,253,0.8)")}
              onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.color = "rgba(150,130,200,0.55)")}
            >
              ← Restart Workshop
            </button>
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
