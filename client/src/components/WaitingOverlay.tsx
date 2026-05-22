/**
 * WaitingOverlay — admin-gated standby overlay.
 *
 * Two variants share the same scaffold (positioning, backdrop, pulse
 * animation, dot-matrix logo):
 *   - "workshop" (default): shown on /challenge/1 before the admin opens
 *     the challenge gate. Copy: "The Workshop Begins Soon."
 *   - "nexus": shown on /salt-nexus before the admin opens the post-
 *     challenge gate. Copy: "Salt Nexus Opens Soon" — users know it
 *     unlocks after the challenge phase wraps up.
 *
 * Positioning mirrors the Time's Up overlay (sidebar covered via left:0,
 * content centered to the main column via paddingLeft = --sidebar-width,
 * navbar stays visible above zIndex 45).
 */

import { motion } from "framer-motion";
import DotMatrixLogo from "@/components/DotMatrixLogo";

interface Props {
  variant?: "workshop" | "nexus";
}

interface VariantCopy {
  label: string;
  headlineLead: string;
  headlineAccent: string;
  body: string;
  dotMatrixLabel: string;
}

const COPY: Record<NonNullable<Props["variant"]>, VariantCopy> = {
  workshop: {
    label: "Standby",
    headlineLead: "The Workshop",
    headlineAccent: "Begins Soon",
    body:
      "Your admin will open the challenge shortly. Sit tight, keep this tab open. " +
      "When the gate lifts, you'll see the Begin button — and the 35-minute clock " +
      "starts the moment you click.",
    dotMatrixLabel: "Standby pulse",
  },
  nexus: {
    label: "Standby",
    headlineLead: "Salt",
    headlineAccent: "Nexus Opens Soon",
    body:
      "Nexus unlocks once the challenge phase wraps up. Your admin will release " +
      "it when the 35-minute timer ends, stay in this tab and we'll route you to " +
      "the live attack simulation the moment it opens.",
    dotMatrixLabel: "Nexus standby pulse",
  },
};

export default function WaitingOverlay({ variant = "workshop" }: Props) {
  const copy = COPY[variant];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed",
        top: "var(--navbar-height, 70px)",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: "var(--sidebar-width, 200px)",
        background: "oklch(from var(--background) l c h / 0.65)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div style={{ textAlign: "center", padding: "2rem", maxWidth: "640px" }}>
        <motion.span
          className="section-label"
          style={{
            display: "block",
            marginBottom: "1rem",
            color: "oklch(0.78 0.18 145)",
          }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {copy.label}
        </motion.span>
        <h2
          style={{
            fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
            fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--foreground)",
            margin: "0 0 0.75rem",
            lineHeight: 1.05,
          }}
        >
          {copy.headlineLead}{" "}
          <motion.span
            animate={{
              opacity: [0.72, 1, 0.72],
              textShadow: [
                "0 0 12px oklch(0.6 0.25 145 / 0.35)",
                "0 0 32px oklch(0.65 0.28 145 / 0.7)",
                "0 0 12px oklch(0.6 0.25 145 / 0.35)",
              ],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              display: "inline-block",
              color: "oklch(0.88 0.2 145)",
            }}
          >
            {copy.headlineAccent}
          </motion.span>
        </h2>
        <p
          style={{
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: "0.875rem",
            color: "var(--muted-foreground)",
            margin: "0 auto",
            maxWidth: "440px",
            lineHeight: 1.6,
          }}
        >
          {copy.body}
        </p>
        <DotMatrixLogo
          color="oklch(0.88 0.2 145)"
          label={copy.dotMatrixLabel}
          style={{ margin: "2.25rem auto 0" }}
        />
      </div>
    </motion.div>
  );
}
