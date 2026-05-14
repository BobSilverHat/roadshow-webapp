/**
 * WaitingOverlay — pre-begin admin gate overlay.
 * Shown on the challenge pages when the workshop is registered + locked
 * (admin hasn't opened the gate yet). Pale neon-green pulsing headline
 * to build anticipation without feeling alarming.
 *
 * Positioning + backdrop mirror the Time's Up overlay (sidebar covered
 * via left:0, content centered to the main column via paddingLeft =
 * --sidebar-width, navbar stays visible above zIndex 45).
 */

import { motion } from "framer-motion";

export default function WaitingOverlay() {
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
        background: "rgba(10,10,15,0.65)",
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
          Standby
        </motion.span>
        <h2
          style={{
            fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
            fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "rgba(232,232,240,0.97)",
            margin: "0 0 0.75rem",
            lineHeight: 1.05,
          }}
        >
          The Workshop{" "}
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
            Begins Soon
          </motion.span>
        </h2>
        <p
          style={{
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: "0.875rem",
            color: "rgba(200,220,210,0.7)",
            margin: "0 auto",
            maxWidth: "440px",
            lineHeight: 1.6,
          }}
        >
          Your admin will open the challenge shortly. Sit tight, keep this tab
          open. When the gate lifts, you'll see the Begin button — and the
          35-minute clock starts the moment you click.
        </p>
      </div>
    </motion.div>
  );
}
