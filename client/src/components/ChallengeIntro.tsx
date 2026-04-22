/**
 * Pre-Begin intro block for a challenge page. Shows challenge metadata
 * plus the Begin Challenge button that starts the wall-clock timer.
 */

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  number: string;
  title: string;
  subtitle: string | null;
  onBegin: () => Promise<boolean>;
}

const LAUNCH_URL = "https://salt-labs.secured-api.com";

export default function ChallengeIntro({ number, title, subtitle, onBegin }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBegin() {
    setError(null);
    setSubmitting(true);
    const ok = await onBegin();
    setSubmitting(false);
    if (!ok) setError("Couldn't start the timer. Refresh and try again.");
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ paddingTop: "3rem", maxWidth: "700px", margin: "0 auto" }}
    >
      <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
        Challenge {number}
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
          margin: "0 0 0.75rem",
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.95rem",
            fontWeight: 400,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(200,200,220,0.65)",
            marginBottom: "2rem",
          }}
        >
          {subtitle}
        </p>
      )}

      <p
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.875rem",
          fontWeight: 300,
          lineHeight: 1.65,
          color: "rgba(200,200,220,0.85)",
          marginBottom: "1rem",
        }}
      >
        Every answer lives inside the Salt platform. Open it in another tab, hunt through
        the UI, submit each flag here. Your timer starts the moment you click Begin —
        wrong guesses add <span className="accent-link">+15 seconds</span> each, so take
        the time to get it right.
      </p>
      <p
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.8rem",
          fontWeight: 300,
          lineHeight: 1.6,
          color: "rgba(200,200,220,0.6)",
          marginBottom: "1.5rem",
        }}
      >
        <span className="accent-link">Answers with multiple values:</span> separate each
        with a comma + space. Order doesn't matter — `A, B` and `B, A` both land.
        Answers are case-insensitive and whitespace-tolerant.
      </p>

      <p
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.875rem",
          fontWeight: 300,
          lineHeight: 1.65,
          color: "rgba(200,200,220,0.85)",
          marginBottom: "2.5rem",
        }}
      >
        <a
          href={LAUNCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="accent-link"
        >
          Launch the Salt Platform →
        </a>
      </p>

      {error && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.7rem 0.9rem",
            border: "1px solid oklch(0.55 0.2 25 / 0.4)",
            borderRadius: "4px",
            background: "oklch(0.4 0.15 25 / 0.15)",
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: "0.78rem",
            color: "oklch(0.7 0.2 25)",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn-salt-primary"
        onClick={handleBegin}
        disabled={submitting}
        style={{
          cursor: submitting ? "wait" : "pointer",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        <span style={{ position: "relative", zIndex: 1 }}>
          {submitting ? "Starting…" : "Begin Challenge"}
        </span>
      </button>
    </motion.section>
  );
}
