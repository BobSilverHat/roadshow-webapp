/**
 * EvervaultCard — hover-reveal card effect.
 *
 * Visual behavior:
 *   - Chrome: BorderGlow (same as challenge QuestionCards) — full mesh-
 *     gradient border + outer glow that tracks the cursor's angle near
 *     edges. Replaces the previous top/bottom rails + CAD corner brackets
 *     so Key Objectives cards visually match the question containers.
 *   - On hover (inner): a radial-gradient spotlight follows the cursor,
 *     revealing a purple gradient + a layer of randomly-generated hex
 *     glyphs underneath.
 *   - Inner card content always sits on top at z-index: 10.
 *
 * Uses framer-motion's useMotionValue + useMotionTemplate for the cursor
 * mask, no new dependencies.
 */
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useTheme } from "next-themes";
import BorderGlow from "@/components/BorderGlow";

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
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  // Hex-glyph reveal: light mode uses a low-opacity purple tint with
  // normal blend so it sits as a whisper inside the purple-gradient
  // reveal; dark mode keeps the original near-white overlay-blend
  // shimmer that reads against the dark card.
  const glyphColor = isLight
    ? "oklch(from var(--color-accent-text) l c h / 0.55)"
    : "oklch(from var(--foreground) l c h / 0.9)";
  const glyphBlend = isLight ? ("normal" as const) : ("overlay" as const);
  const glyphMaxOpacity = isLight ? 0.25 : 0.6;

  useEffect(() => {
    setRandomString(generateRandomString(3500));
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Compute the radial mask origin from the event relative to the inner
  // tracker (which fills the BorderGlow content area). currentTarget is
  // the tracker div, so getBoundingClientRect gives us card-local coords.
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
    if (frameRef.current === null && Math.random() < 0.15) {
      frameRef.current = requestAnimationFrame(() => {
        setRandomString(generateRandomString(3500));
        frameRef.current = null;
      });
    }
  };

  const maskImage = useMotionTemplate`radial-gradient(260px circle at ${mouseX}px ${mouseY}px, white, transparent 70%)`;
  const maskStyle = { maskImage, WebkitMaskImage: maskImage } as const;

  // Split incoming style: margin-related goes to the outer wrapper (so it
  // positions the whole card on the page), everything else (padding, etc.)
  // goes to the inner tracker. Without this split, marginBottom on the
  // tracker would leave a dead strip inside the BorderGlow where the
  // cursor-mask reveal doesn't reach — looks like the reveal is clipped.
  const {
    margin,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    marginInline,
    marginInlineStart,
    marginInlineEnd,
    marginBlock,
    marginBlockStart,
    marginBlockEnd,
    ...innerStyle
  } = style ?? {};
  const outerStyle: React.CSSProperties = {
    margin,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    marginInline,
    marginInlineStart,
    marginInlineEnd,
    marginBlock,
    marginBlockStart,
    marginBlockEnd,
  };

  return (
    <div className={className} style={outerStyle}>
    <BorderGlow
      backgroundColor="var(--card)"
      borderRadius={6}
      glowColor="290 80 70"
      glowRadius={28}
      glowIntensity={0.85}
      edgeSensitivity={28}
      coneSpread={22}
      colors={["#c084fc", "#a855f7", "#7c3aed"]}
    >
      <div
        onMouseMove={onMouseMove}
        onMouseEnter={onMouseEnter}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          // Match the BorderGlow's borderRadius so the cursor-mask reveal
          // (purple gradient + hex glyphs at inset:0) clips to the rounded
          // card shape instead of bleeding into the corner cutouts.
          borderRadius: 6,
          overflow: "hidden",
          // Fill the BorderGlow's content area so the inset:0 reveal
          // layers cover the visible card edge-to-edge, not just the
          // content-sized tracker bounds.
          flex: 1,
          width: "100%",
          // Subtle purple base tint behind the reveal — matches the prior
          // EvervaultCard idle look so the card doesn't read as flat dark.
          backgroundColor: "oklch(0.52 0.28 290 / 0.04)",
          ...innerStyle,
        }}
      >
        {/* Hover-reveal layers (purple gradient + hex glyphs). DARK MODE
            ONLY — these effects were authored against the obsidian card
            and read as subtle atmospheric noise on dark. On a white card
            they sit loud (no dark luminance to absorb them) so we skip
            them entirely in light mode and rely on the BorderGlow ring
            + content brightening to signal hover. */}
        {!isLight && (
          <>
            {/* Purple gradient tint — revealed only inside the cursor's
                radial mask. Alphas intentionally low so the reveal is a
                whisper behind the text, not a blown-out spotlight. */}
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

            {/* Random hex/binary glyphs — same cursor mask, overlay-blended
                on top. Capped at 60% opacity so they read as ambient
                shimmer. */}
            <motion.div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: "0.65rem",
                lineHeight: 1.1,
                fontWeight: 400,
                color: glyphColor,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                mixBlendMode: glyphBlend,
                opacity: hovered ? glyphMaxOpacity : 0,
                transition: "opacity 0.3s",
                pointerEvents: "none",
                userSelect: "none",
                overflow: "hidden",
                ...maskStyle,
              }}
            >
              {randomString}
            </motion.div>
          </>
        )}

        {/* Card content — always on top, unaffected by the mask. On hover a
            brightness/saturation filter lifts all descendant text, and a
            dark text-shadow halo keeps it punching through the purple
            reveal regardless of where the cursor lands. */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            filter: hovered ? "brightness(1.25) saturate(1.1)" : "none",
            textShadow: hovered
              ? "0 0 14px oklch(from var(--background) l c h / 0.9), 0 1px 3px oklch(from var(--background) l c h / 0.75)"
              : "none",
            transition: "filter 0.3s ease, text-shadow 0.3s ease",
          }}
        >
          {children}
        </div>
      </div>
    </BorderGlow>
    </div>
  );
}
