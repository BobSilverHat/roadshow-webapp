/**
 * Leaderboard
 * Route: /leaderboard
 *
 * Live-polling view over get_leaderboard(). Also highlights the viewer's
 * own row if they've registered.
 */

import { motion } from "framer-motion";
import WorkshopLayout from "@/components/WorkshopLayout";
import LeaderboardTable from "@/components/LeaderboardTable";
import { useAttendee } from "@/hooks/useAttendee";
import { useLeaderboard } from "@/hooks/useLeaderboard";

function formatClock(ts: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Leaderboard() {
  const { attendee } = useAttendee();
  const { rows, status, lastUpdated } = useLeaderboard();

  return (
    <WorkshopLayout activeId="leaderboard">
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "0 2rem 6rem" }}>
        <section style={{ paddingTop: "5rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="section-label"
              style={{ display: "block", marginBottom: "0.75rem" }}
            >
              Live
            </span>
            <h1
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "var(--foreground)",
                margin: "0 0 1rem",
              }}
            >
              Leader
              <span
                style={{
                  color: "var(--color-accent-text-bright)",
                  textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                }}
              >
                board
              </span>
            </h1>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "2rem",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background:
                    status === "live"
                      ? "oklch(0.75 0.22 145)"
                      : status === "error"
                        ? "oklch(0.6 0.2 25)"
                        : "oklch(0.6 0.1 260)",
                  boxShadow:
                    status === "live" ? "0 0 8px oklch(0.65 0.22 145)" : "none",
                }}
              />
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                }}
              >
                {status === "live"
                  ? `Live — last updated ${formatClock(lastUpdated)}`
                  : status === "error"
                    ? "Connection error — retrying"
                    : "Connecting…"}
              </span>
            </div>

            <LeaderboardTable
              rows={rows}
              currentAttendeeId={attendee?.id ?? null}
            />

            <p
              style={{
                marginTop: "1.5rem",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.875rem",
                fontWeight: 300,
                lineHeight: 1.6,
                color: "var(--muted-foreground)",
              }}
            >
              Sort order: questions solved (desc), total time (asc), wrong guesses
              (asc). Wrong answers add 15 seconds to your total. Total time
              populates once both challenges are complete, or once the 35-minute
              workshop timer expires.
            </p>
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
