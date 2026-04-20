/**
 * Live leaderboard table. Rows animate their vertical positions when rank
 * shuffles, via framer-motion's `layout` prop on the row wrapper.
 */

import { AnimatePresence, motion } from "framer-motion";
import type { LeaderboardRow } from "@/hooks/useLeaderboard";

interface Props {
  rows: LeaderboardRow[];
  currentAttendeeId: string | null;
}

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function rankGlyph(rank: number): string {
  if (rank === 1) return "01";
  if (rank === 2) return "02";
  if (rank === 3) return "03";
  return rank.toString().padStart(2, "0");
}

const rankAccent = (rank: number): string => {
  if (rank === 1) return "oklch(0.82 0.18 85)"; // gold
  if (rank === 2) return "oklch(0.78 0.04 260)"; // silver
  if (rank === 3) return "oklch(0.6 0.12 45)"; // bronze
  return "rgba(200,200,220,0.55)";
};

export default function LeaderboardTable({ rows, currentAttendeeId }: Props) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "3rem 2rem",
          border: "1px dashed rgba(255,255,255,0.15)",
          borderRadius: "6px",
          textAlign: "center",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "0.75rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(200,200,220,0.45)",
        }}
      >
        No competitors yet — be the first
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "6px",
        overflow: "hidden",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: headerTemplate,
          padding: "0.9rem 1rem",
          background: "rgba(255,255,255,0.03)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(200,200,220,0.65)",
        }}
      >
        <span>Rank</span>
        <span>Name</span>
        <span style={numColStyle}>C1</span>
        <span style={numColStyle}>C2</span>
        <span style={numColStyle}>Total</span>
        <span style={numColStyle}>Wrong</span>
        <span style={numColStyle}>Solved</span>
      </div>

      {/* Rows */}
      <AnimatePresence initial={false}>
        {rows.map((row, i) => {
          const rank = i + 1;
          const isMe = currentAttendeeId !== null && row.attendee_id === currentAttendeeId;
          return (
            <motion.div
              key={row.attendee_id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              style={{
                display: "grid",
                gridTemplateColumns: headerTemplate,
                padding: "0.85rem 1rem",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: "0.85rem",
                background: isMe ? "oklch(0.35 0.15 290 / 0.2)" : "transparent",
                color: "rgba(232,232,240,0.92)",
              }}
            >
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: rankAccent(rank),
                }}
              >
                {rankGlyph(rank)}
              </span>
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.name}
                {isMe && (
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.65rem",
                      letterSpacing: "0.2em",
                      color: "oklch(0.72 0.28 290)",
                    }}
                  >
                    YOU
                  </span>
                )}
              </span>
              <span style={numCellStyle}>{formatMs(row.c1_elapsed_ms)}</span>
              <span style={numCellStyle}>{formatMs(row.c2_elapsed_ms)}</span>
              <span
                style={{
                  ...numCellStyle,
                  color: row.total_ms !== null ? "rgba(232,232,240,0.97)" : "rgba(200,200,220,0.45)",
                  fontWeight: row.total_ms !== null ? 500 : 300,
                }}
              >
                {formatMs(row.total_ms)}
              </span>
              <span
                style={{
                  ...numCellStyle,
                  color: row.wrong_count > 0 ? "oklch(0.7 0.2 25)" : "rgba(200,200,220,0.55)",
                }}
              >
                {row.wrong_count}
              </span>
              <span style={numCellStyle}>{row.questions_complete}/10</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

const headerTemplate = "56px 1fr 70px 70px 80px 56px 72px";

const numColStyle = {
  textAlign: "right" as const,
};

const numCellStyle = {
  textAlign: "right" as const,
  color: "rgba(200,200,220,0.85)",
};
