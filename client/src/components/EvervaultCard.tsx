/**
 * EvervaultCard — hover-reveal card effect.
 *
 * Replica of the Aceternity UI "Evervault Card" component, themed for the
 * Cyber-Noir / Dark Ops palette (purple reveal + hex/binary glyphs instead of
 * the default green-to-blue + printable ASCII).
 *
 * Visual behavior:
 *   - Idle: looks like the existing bordered card with a subtle purple tint
 *   - On hover: a radial-gradient spotlight follows the cursor, revealing a
 *     layer of randomly-generated hex glyphs and a purple gradient underneath
 *   - Inner card content always sits on top at z-index: 10
 *
 * No new dependencies — uses `framer-motion` (already installed) for the
 * motion value + `useMotionTemplate` hook that drives the cursor mask.
 */
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

interface EvervaultCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const HEX_GLYPHS = "0123456789abcdef/_-<>{}[]=+*";

function generateRandomString(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += HEX_GLYPHS[Math.floor(Math.random() * HEX_GLYPHS.length)];
  }
  return out;
}

export default function EvervaultCard({ children, className, style }: EvervaultCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [randomString, setRandomString] = useState("");
  const [hovered, setHovered] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Generous default length so tall cards still get glyph coverage all the
    // way to the bottom — the alternative (short string) leaves a solid
    // empty zone at the bottom that makes the reveal look asymmetric.
    setRandomString(generateRandomString(3500));
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Shared coord-setter — used on mouseenter so the mask is positioned at the
  // actual entry point from the first frame of the reveal, not stuck at (0,0)
  // until a mousemove fires (which is what made the effect look dead in the
  // corner you hovered into without moving).
  const setCoordsFromEvent = (event: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - left);
    mouseY.set(event.clientY - top);
  };

  const onMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
    setCoordsFromEvent(event);
    setHovered(true);
  };

  const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    setCoordsFromEvent(event);
    // Regenerate glyphs ~15% of frames so the text shimmers under the cursor
    // without a re-render per pointer event.
    if (frameRef.current === null && Math.random() < 0.15) {
      frameRef.current = requestAnimationFrame(() => {
        setRandomString(generateRandomString(3500));
        frameRef.current = null;
      });
    }
  };

  const maskImage = useMotionTemplate`radial-gradient(260px circle at ${mouseX}px ${mouseY}px, white, transparent 70%)`;
  const maskStyle = { maskImage, WebkitMaskImage: maskImage } as const;

  return (
    <div
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => setHovered(false)}
      className={className}
      style={{
        position: "relative",
        // Top + bottom hairline rails only, matching the reference: the rails
        // terminate visually at the corner brackets below; left and right
        // sides stay open so the card reads as a schematic frame rather than
        // a closed box.
        borderTop: "1px solid oklch(0.52 0.28 290 / 0.22)",
        borderBottom: "1px solid oklch(0.52 0.28 290 / 0.22)",
        backgroundColor: "oklch(0.52 0.28 290 / 0.04)",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Purple gradient tint — revealed only inside the cursor's radial mask.
          Alphas intentionally low so the reveal is a whisper behind the text,
          not a blown-out spotlight. */}
      <motion.div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, oklch(0.52 0.28 290 / 0.5), oklch(0.65 0.25 290 / 0.3))",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: "none",
          ...maskStyle,
        }}
      />

      {/* Random hex/binary glyphs — same cursor mask, overlay-blended on top.
          Capped at 60% opacity so they read as ambient shimmer, not noise.
          No padding: glyphs fill edge-to-edge and clip at the card's rounded
          border via the parent's `overflow: hidden`, which keeps the bottom
          reveal symmetric with the top instead of having an empty padding
          strip on any side. */}
      <motion.div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.65rem",
          lineHeight: 1.1,
          fontWeight: 400,
          color: "rgba(255, 255, 255, 0.9)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          mixBlendMode: "overlay",
          opacity: hovered ? 0.6 : 0,
          transition: "opacity 0.3s",
          pointerEvents: "none",
          userSelect: "none",
          overflow: "hidden",
          ...maskStyle,
        }}
      >
        {randomString}
      </motion.div>

      {/* Card content — always on top, unaffected by the mask. On hover a
          brightness/saturation filter lifts all descendant text, and a dark
          text-shadow halo keeps it punching through the purple reveal
          regardless of where the cursor lands. */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          filter: hovered ? "brightness(1.25) saturate(1.1)" : "none",
          textShadow: hovered
            ? "0 0 14px rgba(10,10,15,0.9), 0 1px 3px rgba(10,10,15,0.75)"
            : "none",
          transition: "filter 0.3s ease, text-shadow 0.3s ease",
        }}
      >
        {children}
      </div>

      {/* CAD-style corner brackets — L-marks flush at the four corners of
          the top/bottom rails. Each bracket's outer vertex coincides with a
          corner of the card so the brackets appear to "cap" the rails the
          way they do in the reference drawing. Brighten slightly on hover
          to stay in sync with the reveal. */}
      {(() => {
        const color = hovered
          ? "rgba(230, 230, 245, 0.6)"
          : "rgba(220, 220, 235, 0.38)";
        const line = `1px solid ${color}`;
        // Flush against the corners. `top: 0 / left: 0` aligns the bracket's
        // outer vertex with the padding-box corner — right where the top/bottom
        // rails meet the open side of the frame. Using 0 rather than a negative
        // offset because the parent's `overflow: hidden` clips anything in the
        // border area, and we want the brackets reliably visible.
        const corners: Array<{
          position: React.CSSProperties;
          borders: React.CSSProperties;
        }> = [
          { position: { top: 0, left: 0 }, borders: { borderTop: line, borderLeft: line } },
          { position: { top: 0, right: 0 }, borders: { borderTop: line, borderRight: line } },
          { position: { bottom: 0, left: 0 }, borders: { borderBottom: line, borderLeft: line } },
          { position: { bottom: 0, right: 0 }, borders: { borderBottom: line, borderRight: line } },
        ];
        return corners.map((c, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: "absolute",
              width: "12px",
              height: "12px",
              pointerEvents: "none",
              transition: "border-color 0.3s ease",
              zIndex: 20,
              ...c.position,
              ...c.borders,
            }}
          />
        ));
      })()}
    </div>
  );
}
