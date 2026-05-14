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

// Active dot positions in the 5×6 matrix, laid out by row → column index.
// Each tuple is [colClass, x, y]. The "d##" class drives the staggered
// per-dot animation delay defined in the <style> block below.
const ACTIVE_DOTS: Array<{ cls: string; x: number; y: number }> = [
  // row 1 (top): . ● ● ● .
  { cls: "d01", x: 17, y: 6 },
  { cls: "d02", x: 28, y: 6 },
  { cls: "d03", x: 39, y: 6 },
  // row 2: ● ● ● ● ●
  { cls: "d10", x: 6, y: 17 },
  { cls: "d11", x: 17, y: 17 },
  { cls: "d12", x: 28, y: 17 },
  { cls: "d13", x: 39, y: 17 },
  { cls: "d14", x: 50, y: 17 },
  // row 3: ● ● . ● .
  { cls: "d20", x: 6, y: 28 },
  { cls: "d21", x: 17, y: 28 },
  { cls: "d23", x: 39, y: 28 },
  // row 4: . ● . ● ●
  { cls: "d31", x: 17, y: 39 },
  { cls: "d33", x: 39, y: 39 },
  { cls: "d34", x: 50, y: 39 },
  // row 5: ● ● ● ● ●
  { cls: "d40", x: 6, y: 50 },
  { cls: "d41", x: 17, y: 50 },
  { cls: "d42", x: 28, y: 50 },
  { cls: "d43", x: 39, y: 50 },
  { cls: "d44", x: 50, y: 50 },
  // row 6 (bottom): . ● ● ● .
  { cls: "d51", x: 17, y: 61 },
  { cls: "d52", x: 28, y: 61 },
  { cls: "d53", x: 39, y: 61 },
];

const DOT_MATRIX_CSS = `
  .wo-l {
    fill: oklch(0.88 0.2 145);
    opacity: 0.08;
    filter: url(#wo-glow);
    animation: wo-logo-fill 2400ms cubic-bezier(0.65, 0, 0.35, 1) infinite both;
  }
  @keyframes wo-logo-fill {
    0%   { opacity: 0.08; }
    14%  { opacity: 1; }
    72%  { opacity: 0.92; }
    100% { opacity: 0.08; }
  }
  @media (prefers-reduced-motion: reduce) {
    .wo-l { animation: none; opacity: 0.45; }
  }
  /* per-column / row delays — bottom-up wave through the matrix */
  .wo-l.d00 { animation-delay:  960ms; } .wo-l.d01 { animation-delay: 1056ms; }
  .wo-l.d02 { animation-delay: 1152ms; } .wo-l.d03 { animation-delay: 1248ms; }
  .wo-l.d04 { animation-delay: 1344ms; }
  .wo-l.d10 { animation-delay:  720ms; } .wo-l.d11 { animation-delay:  816ms; }
  .wo-l.d12 { animation-delay:  912ms; } .wo-l.d13 { animation-delay: 1008ms; }
  .wo-l.d14 { animation-delay: 1104ms; }
  .wo-l.d20 { animation-delay:  480ms; } .wo-l.d21 { animation-delay:  576ms; }
  .wo-l.d22 { animation-delay:  672ms; } .wo-l.d23 { animation-delay:  768ms; }
  .wo-l.d24 { animation-delay:  864ms; }
  .wo-l.d30 { animation-delay:  240ms; } .wo-l.d31 { animation-delay:  336ms; }
  .wo-l.d32 { animation-delay:  432ms; } .wo-l.d33 { animation-delay:  528ms; }
  .wo-l.d34 { animation-delay:  624ms; }
  .wo-l.d40 { animation-delay:    0ms; } .wo-l.d41 { animation-delay:   96ms; }
  .wo-l.d42 { animation-delay:  192ms; } .wo-l.d43 { animation-delay:  288ms; }
  .wo-l.d44 { animation-delay:  384ms; }
  .wo-l.d50 { animation-delay: 1200ms; } .wo-l.d51 { animation-delay: 1296ms; }
  .wo-l.d52 { animation-delay: 1392ms; } .wo-l.d53 { animation-delay: 1488ms; }
  .wo-l.d54 { animation-delay: 1584ms; }
`;

function DotMatrixLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 67"
      role="img"
      aria-label="Workshop standby indicator"
      width="84"
      height="100"
      style={{ display: "block", margin: "2.25rem auto 0" }}
    >
      <title>Standby pulse</title>
      <defs>
        <circle id="wo-lit" r="3.1" />
        <filter id="wo-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{DOT_MATRIX_CSS}</style>
      {ACTIVE_DOTS.map((d) => (
        <use
          key={`lit-${d.cls}`}
          className={`wo-l ${d.cls}`}
          href="#wo-lit"
          x={d.x}
          y={d.y}
        />
      ))}
    </svg>
  );
}

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
        <DotMatrixLogo />
      </div>
    </motion.div>
  );
}
