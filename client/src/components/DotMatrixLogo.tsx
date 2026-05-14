/**
 * DotMatrixLogo — animated 5×6 "S" rendered with circular dots that pulse
 * in a staggered wave (bottom-up). Each dot uses a Gaussian-blur glow
 * filter for soft luminance, and the wave cycle is 2400ms — matching the
 * cadence used by the workshop overlays (Waiting, Time's Up) so multiple
 * pulsing elements feel like one rhythm.
 *
 * Used in:
 *   - WaitingOverlay (admin gate)   — pale neon green
 *   - Time's Up overlay (expiry)    — workshop red
 */

// Active dot positions in the 5×6 matrix, laid out by row.col indices.
// "d##" class drives the staggered per-dot animation delay.
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

const buildCss = (color: string) => `
  .dml-l {
    fill: ${color};
    opacity: 0.08;
    filter: url(#dml-glow);
    animation: dml-logo-fill 2400ms cubic-bezier(0.65, 0, 0.35, 1) infinite both;
  }
  @keyframes dml-logo-fill {
    0%   { opacity: 0.08; }
    14%  { opacity: 1; }
    72%  { opacity: 0.92; }
    100% { opacity: 0.08; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dml-l { animation: none; opacity: 0.45; }
  }
  .dml-l.d00 { animation-delay:  960ms; } .dml-l.d01 { animation-delay: 1056ms; }
  .dml-l.d02 { animation-delay: 1152ms; } .dml-l.d03 { animation-delay: 1248ms; }
  .dml-l.d04 { animation-delay: 1344ms; }
  .dml-l.d10 { animation-delay:  720ms; } .dml-l.d11 { animation-delay:  816ms; }
  .dml-l.d12 { animation-delay:  912ms; } .dml-l.d13 { animation-delay: 1008ms; }
  .dml-l.d14 { animation-delay: 1104ms; }
  .dml-l.d20 { animation-delay:  480ms; } .dml-l.d21 { animation-delay:  576ms; }
  .dml-l.d22 { animation-delay:  672ms; } .dml-l.d23 { animation-delay:  768ms; }
  .dml-l.d24 { animation-delay:  864ms; }
  .dml-l.d30 { animation-delay:  240ms; } .dml-l.d31 { animation-delay:  336ms; }
  .dml-l.d32 { animation-delay:  432ms; } .dml-l.d33 { animation-delay:  528ms; }
  .dml-l.d34 { animation-delay:  624ms; }
  .dml-l.d40 { animation-delay:    0ms; } .dml-l.d41 { animation-delay:   96ms; }
  .dml-l.d42 { animation-delay:  192ms; } .dml-l.d43 { animation-delay:  288ms; }
  .dml-l.d44 { animation-delay:  384ms; }
  .dml-l.d50 { animation-delay: 1200ms; } .dml-l.d51 { animation-delay: 1296ms; }
  .dml-l.d52 { animation-delay: 1392ms; } .dml-l.d53 { animation-delay: 1488ms; }
  .dml-l.d54 { animation-delay: 1584ms; }
`;

interface Props {
  /** Fill color of each lit dot. Glow inherits via SVG filter. */
  color: string;
  /** Optional pixel width — height scales by viewBox aspect (56:67). */
  width?: number;
  /** Optional aria label. */
  label?: string;
  /** Optional outer style overrides (margin, etc.). */
  style?: React.CSSProperties;
}

export default function DotMatrixLogo({
  color,
  width = 84,
  label = "Workshop indicator",
  style,
}: Props) {
  const height = Math.round((width * 67) / 56);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 67"
      role="img"
      aria-label={label}
      width={width}
      height={height}
      style={{ display: "block", ...style }}
    >
      <defs>
        <circle id="dml-lit" r="3.1" />
        <filter id="dml-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>{buildCss(color)}</style>
      {ACTIVE_DOTS.map((d) => (
        <use
          key={`dml-${d.cls}`}
          className={`dml-l ${d.cls}`}
          href="#dml-lit"
          x={d.x}
          y={d.y}
        />
      ))}
    </svg>
  );
}
