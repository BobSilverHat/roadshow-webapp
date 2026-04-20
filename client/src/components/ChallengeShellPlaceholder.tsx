/**
 * Temporary shell shown on /challenge/1 and /challenge/2 after registration
 * succeeds. Phase 3 replaces this with the full challenge layout (timer,
 * Begin button, question card grid).
 */

import { motion } from "framer-motion";

interface Props {
  challengeNumber: string;
  title: string;
  attendeeName: string;
}

export default function ChallengeShellPlaceholder({
  challengeNumber,
  title,
  attendeeName,
}: Props) {
  return (
    <section style={{ paddingTop: "5rem" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
          Challenge {challengeNumber}
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
          {title}
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
          Welcome, <span style={{ color: "oklch(0.65 0.25 290)", fontWeight: 600 }}>{attendeeName}</span>.
          Your session is locked — you can't re-register or swap identities mid-challenge.
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
          Timer + question cards render in Phase 3
        </div>
      </motion.div>
    </section>
  );
}
