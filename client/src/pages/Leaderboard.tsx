/**
 * Leaderboard
 * Route: /leaderboard
 *
 * Phase 2 shell: placeholder. The live-updating scoreboard lands in Phase 6
 * (polling on get_leaderboard with a 500ms debounce per the spec).
 */

import { motion } from "framer-motion";
import WorkshopLayout from "@/components/WorkshopLayout";

export default function Leaderboard() {
  return (
    <WorkshopLayout activeId="leaderboard">
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 2rem 6rem" }}>
        <section style={{ paddingTop: "5rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
              Live
            </span>
            <h1
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "rgba(232,232,240,0.97)",
                margin: "0 0 1.5rem",
              }}
            >
              Leader{" "}
              <span
                style={{
                  color: "oklch(0.72 0.28 290)",
                  textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                }}
              >
                board
              </span>
            </h1>
            <p
              style={{
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: "0.875rem",
                fontWeight: 300,
                lineHeight: 1.65,
                color: "rgba(200,200,220,0.85)",
                marginBottom: "2rem",
              }}
            >
              Live ranking of attendees across Challenge 1 and Challenge 2. Sort order:
              questions completed (descending), total time (ascending), wrong answers
              (ascending).
            </p>

            <div
              style={{
                padding: "3rem 2rem",
                border: "1px dashed rgba(255,255,255,0.15)",
                borderRadius: "6px",
                textAlign: "center",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.75rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(200,200,220,0.45)",
              }}
            >
              Leaderboard renders in Phase 6
            </div>
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
