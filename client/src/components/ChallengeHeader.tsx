/**
 * Sticky top strip for the challenge pages. Shows the challenge title,
 * the global 35-minute countdown, the solved-count progress, the penalty
 * tally (+15s × N), and the attendee's name.
 *
 * Countdown is sourced from useWorkshopClock (same shared global clock
 * that drives the sidebar pill). Coexisting with the sidebar timer is
 * intentional — the header gives the in-context, larger-typography
 * version while the sidebar stays persistent across pages.
 */

import { motion } from "framer-motion";
import { useWorkshopClock } from "@/hooks/useWorkshopClock";

interface Props {
  title: string;
  wrongCount: number;
  attendeeName: string;
  solvedCount: number;
  totalQuestions: number;
  /** When provided, renders a HELP toggle in the right cluster. The
   *  parent owns the open/closed state. Omit for challenges that don't
   *  have a help stepper (Challenge 2). */
  helpOpen?: boolean;
  onToggleHelp?: () => void;
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ChallengeHeader({
  title,
  wrongCount,
  attendeeName,
  solvedCount,
  totalQuestions,
  helpOpen,
  onToggleHelp,
}: Props) {
  const clock = useWorkshopClock();
  // During the initial fetch (openedAt unknown), useWorkshopClock returns
  // remainingMs = 0. Without this guard the < 60_000 branch fires and the
  // timer flashes red on first paint. Render a neutral placeholder until
  // the clock has loaded.
  const clockLoaded = clock.openedAt !== null;
  const reviewMode = clock.reviewMode;
  const remainingLabel = !clockLoaded
    ? "--:--"
    : reviewMode
      ? "REVIEW MODE"
      : formatMs(clock.remainingMs);
  const isExpired = clock.status === "expired";

  // Color tier — red under 1 min OR expired, amber under 5 min, white otherwise.
  let timerColor = "var(--foreground)";
  let timerShadow = "none";
  if (!clockLoaded) {
    // Neutral while loading — no color tier yet.
    timerColor = "var(--muted-foreground)";
  } else if (reviewMode) {
    // Demo mode — accent-purple, no urgency.
    timerColor = "var(--color-accent-text)";
    timerShadow = "none";
  } else if (isExpired || clock.remainingMs < 60_000) {
    timerColor = "var(--color-time-up)";
    timerShadow = "0 0 16px var(--color-time-up-glow)";
  } else if (clock.remainingMs < 5 * 60_000) {
    timerColor = "oklch(0.78 0.18 75)";
    timerShadow = "0 0 12px oklch(0.55 0.18 75 / 0.35)";
  }

  const penaltyLabel =
    wrongCount > 0 ? `+15s × ${wrongCount} = +${wrongCount * 15}s` : null;

  return (
    <div
      style={{
        position: "sticky",
        top: "70px", // sits under the fixed navbar
        zIndex: 20, // below the WaitingOverlay / Time's Up overlays
        margin: "-2rem -2rem 2.5rem",
        padding: "0.9rem 2rem",
        background: "oklch(from var(--background) l c h / 0.85)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: "1.5rem",
      }}
    >
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--muted-foreground)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.9rem",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: "1.3rem",
            fontWeight: 500,
            color: timerColor,
            letterSpacing: "0.05em",
            textShadow: timerShadow,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {remainingLabel}
        </span>
        {penaltyLabel && (
          <span
            style={{
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: "0.72rem",
              color: "var(--color-time-up)",
              whiteSpace: "nowrap",
            }}
          >
            {penaltyLabel}
          </span>
        )}
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--muted-foreground)",
            whiteSpace: "nowrap",
          }}
        >
          {solvedCount} / {totalQuestions} solved
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.9rem",
          justifyContent: "flex-end",
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.8rem",
          color: "var(--muted-foreground)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {onToggleHelp && (
          <button
            type="button"
            onClick={onToggleHelp}
            aria-pressed={helpOpen}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              lineHeight: 1,
              outline: "none",
            }}
          >
            {helpOpen ? (
              // Open state — static low-opacity white, indicates "click
              // to close." No animation so the eye isn't pulled back to
              // it while the user reads the open stepper below.
              <span style={{ color: "var(--muted-foreground)" }}>Help</span>
            ) : (
              // Closed state — pulsing pale neon green, same cadence
              // as the WaitingOverlay headlines + sidebar pill, drawing
              // attention to the affordance.
              <motion.span
                animate={{
                  opacity: [0.72, 1, 0.72],
                  textShadow: [
                    "0 0 8px oklch(0.6 0.25 145 / 0.35)",
                    "0 0 18px oklch(0.65 0.28 145 / 0.7)",
                    "0 0 8px oklch(0.6 0.25 145 / 0.35)",
                  ],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  display: "inline-block",
                  color: "oklch(0.88 0.2 145)",
                }}
              >
                Help
              </motion.span>
            )}
          </button>
        )}
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "var(--color-accent-text)" }}>◆</span>
          <span>{attendeeName}</span>
        </span>

      </div>
    </div>
  );
}
