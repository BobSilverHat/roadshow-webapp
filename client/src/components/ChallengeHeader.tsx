/**
 * Sticky top strip for the challenge pages. Shows the challenge title,
 * solved-count progress, the penalty tally (+15s × N), and the attendee's
 * name. The countdown timer itself now lives in the global navbar
 * (WorkshopClockPill), so this strip is purely about per-page context.
 */

interface Props {
  title: string;
  wrongCount: number;
  attendeeName: string;
  solvedCount: number;
  totalQuestions: number;
}

export default function ChallengeHeader({
  title,
  wrongCount,
  attendeeName,
  solvedCount,
  totalQuestions,
}: Props) {
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
