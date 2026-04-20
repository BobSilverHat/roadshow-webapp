/**
 * Sticky top strip for the challenge pages. Shows the challenge title,
 * the running wall-clock timer (`mm:ss`), the penalty tally (+15s × N),
 * and the attendee's name. Timer is purely derived from started_at +
 * wall clock — no server polling needed for display.
 */

import { useEffect, useState } from "react";

interface Props {
  title: string;
  startedAt: string | null;
  completedAt: string | null;
  wrongCount: number;
  attendeeName: string;
  solvedCount: number;
  totalQuestions: number;
}

const PENALTY_PER_WRONG_MS = 15_000;

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ChallengeHeader({
  title,
  startedAt,
  completedAt,
  wrongCount,
  attendeeName,
  solvedCount,
  totalQuestions,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || completedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, completedAt]);

  let elapsedLabel = "--:--";
  if (startedAt) {
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : now;
    elapsedLabel = formatMs(end - start + wrongCount * PENALTY_PER_WRONG_MS);
  }

  const penaltyLabel = wrongCount > 0
    ? `+15s × ${wrongCount} = +${wrongCount * 15}s`
    : null;

  return (
    <div
      style={{
        position: "sticky",
        top: "70px", // sits under the fixed navbar
        zIndex: 20,
        margin: "-2rem -2rem 2.5rem",
        padding: "0.9rem 2rem",
        background: "rgba(10,10,15,0.85)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
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
          color: "rgba(200,200,220,0.75)",
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
            color: completedAt
              ? "oklch(0.72 0.28 290)"
              : "rgba(232,232,240,0.97)",
            letterSpacing: "0.05em",
            textShadow: completedAt
              ? "0 0 16px oklch(0.52 0.28 290 / 0.5)"
              : "none",
          }}
        >
          {elapsedLabel}
        </span>
        {penaltyLabel && (
          <span
            style={{
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: "0.72rem",
              color: "oklch(0.7 0.2 25)",
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
            color: "rgba(200,200,220,0.55)",
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
          gap: "0.5rem",
          justifyContent: "flex-end",
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.8rem",
          color: "rgba(200,200,220,0.85)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <span style={{ color: "oklch(0.65 0.25 290)" }}>◆</span>
        <span>{attendeeName}</span>
      </div>
    </div>
  );
}
