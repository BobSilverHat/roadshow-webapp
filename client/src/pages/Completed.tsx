/**
 * Completed — Workshop finale
 * Route: /completed
 *
 * Shows a personalized performance summary when the viewer is a registered
 * attendee who has completed both challenges. Keeps the scenario-recap
 * cards for unregistered visitors or anyone who routes here directly.
 */

import { motion } from "framer-motion";
import { useMemo } from "react";
import { useLocation } from "wouter";
import WorkshopLayout from "@/components/WorkshopLayout";
import { useAttendee } from "@/hooks/useAttendee";
import { useLeaderboard } from "@/hooks/useLeaderboard";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.12 },
  }),
};

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function rankAccent(rank: number): string {
  if (rank === 1) return "oklch(0.82 0.18 85)"; // gold
  if (rank === 2) return "oklch(0.78 0.04 260)"; // silver
  if (rank === 3) return "oklch(0.6 0.12 45)"; // bronze
  return "oklch(0.65 0.25 290)";
}

function rankLabel(rank: number): string {
  if (rank === 1) return "Champion";
  if (rank === 2) return "Runner-up";
  if (rank === 3) return "Third Place";
  const suffix = ["th", "st", "nd", "rd"][
    rank % 100 > 10 && rank % 100 < 14 ? 0 : Math.min(rank % 10, 3)
  ];
  return `${rank}${suffix} Place`;
}

export default function Completed() {
  const [, navigate] = useLocation();
  const { attendee } = useAttendee();
  const { rows } = useLeaderboard({ pollIntervalMs: 3000 });

  const myRow = useMemo(
    () => (attendee ? rows.find((r) => r.attendee_id === attendee.id) ?? null : null),
    [rows, attendee],
  );
  const myRank = useMemo(() => {
    if (!attendee) return null;
    const idx = rows.findIndex((r) => r.attendee_id === attendee.id);
    return idx >= 0 ? idx + 1 : null;
  }, [rows, attendee]);

  const finished = myRow !== null && myRow.total_ms !== null;

  return (
    <WorkshopLayout activeId="completed">
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "0 2rem 6rem",
          textAlign: "center",
        }}
      >
        <section style={{ paddingTop: "5rem" }}>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            style={{ marginBottom: "0.75rem" }}
          >
            <span className="section-label">Workshop Complete</span>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            style={{ marginBottom: "2rem" }}
          >
            <h1
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "rgba(232,232,240,0.97)",
                margin: 0,
              }}
            >
              {finished ? (
                <>
                  {rankLabel(myRank ?? 0).split(" ")[0]}{" "}
                  <span
                    style={{
                      color: rankAccent(myRank ?? 0),
                      textShadow: `0 0 30px ${rankAccent(myRank ?? 0)}`,
                    }}
                  >
                    {(rankLabel(myRank ?? 0).split(" ").slice(1).join(" ") || "Finisher")}
                  </span>
                </>
              ) : (
                <>
                  Workshop{" "}
                  <span
                    style={{
                      color: "oklch(0.72 0.28 290)",
                      textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                    }}
                  >
                    Complete
                  </span>
                </>
              )}
            </h1>
          </motion.div>

          {/* Performance card for finished attendees */}
          {finished && myRow && myRank !== null && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
            >
              <div
                style={{
                  padding: "2rem",
                  marginBottom: "2.5rem",
                  border: `1px solid ${rankAccent(myRank)}`,
                  borderRadius: "8px",
                  background: "rgba(10,10,15,0.55)",
                  boxShadow: `0 0 40px ${rankAccent(myRank)} 22`.replace(/ 22$/, "33"),
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: rankAccent(myRank),
                    }}
                  >
                    Your Result
                  </span>
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(200,200,220,0.6)",
                    }}
                  >
                    Rank {myRank.toString().padStart(2, "0")} of {rows.length}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "1rem",
                  }}
                >
                  <Stat label="Challenge 1" value={formatMs(myRow.c1_elapsed_ms)} />
                  <Stat label="Challenge 2" value={formatMs(myRow.c2_elapsed_ms)} />
                  <Stat
                    label="Total"
                    value={formatMs(myRow.total_ms)}
                    accent={rankAccent(myRank)}
                  />
                </div>
                <div
                  style={{
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                    fontSize: "0.8rem",
                    color: "rgba(200,200,220,0.7)",
                  }}
                >
                  {myRow.wrong_count > 0
                    ? `${myRow.wrong_count} wrong guess${myRow.wrong_count === 1 ? "" : "es"} · +${myRow.wrong_count * 15}s penalty baked into total`
                    : "Clean run — no wrong guesses."}
                </div>
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            {/* Scenario recap cards */}
            <p
              style={{
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: "0.875rem",
                fontWeight: 300,
                lineHeight: 1.65,
                color: "rgba(200,200,220,0.85)",
                marginBottom: "2rem",
                textAlign: "center",
              }}
            >
              You walked the full agentic security stack — discovery, posture, runtime —
              then hunted real flags inside the Salt platform.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
                marginBottom: "3rem",
                textAlign: "left",
              }}
            >
              {[
                {
                  number: "01",
                  title: "Agentic Discovery",
                  desc: "Full inventory of agents, MCP servers & APIs",
                },
                {
                  number: "02",
                  title: "Posture Management",
                  desc: "Risk-contextualized findings by blast radius",
                },
                {
                  number: "03",
                  title: "Runtime Protection",
                  desc: "Real-time behavioral detection & blocking",
                },
              ].map((card) => (
                <div
                  key={card.number}
                  style={{
                    border: "1px solid oklch(0.52 0.28 290 / 0.18)",
                    borderRadius: "4px",
                    padding: "1.25rem",
                    backgroundColor: "oklch(0.52 0.28 290 / 0.04)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: "oklch(0.65 0.25 290)",
                      lineHeight: 1,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {card.number}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "rgba(232,232,240,0.9)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    {card.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      fontSize: "0.8rem",
                      fontWeight: 300,
                      lineHeight: 1.5,
                      color: "rgba(160,160,180,0.75)",
                    }}
                  >
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn-salt-primary"
              style={{
                borderRadius: "2px",
                maxWidth: "400px",
                margin: "0 auto",
                display: "block",
              }}
              onClick={() => navigate("/leaderboard")}
            >
              <span style={{ position: "relative", zIndex: 1 }}>View Full Leaderboard</span>
            </button>

            <button
              onClick={() => navigate("/")}
              style={{
                background: "none",
                border: "none",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(150,130,200,0.55)",
                marginTop: "1.5rem",
                cursor: "pointer",
                transition: "color 0.2s",
                display: "block",
                margin: "1.5rem auto 0",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLButtonElement).style.color = "rgba(196,181,253,0.8)")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLButtonElement).style.color = "rgba(150,130,200,0.55)")
              }
            >
              ← Back to Introduction
            </button>
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "0.62rem",
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(200,200,220,0.55)",
          marginBottom: "0.35rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: accent ? "1.6rem" : "1.2rem",
          fontWeight: accent ? 600 : 500,
          color: accent ?? "rgba(232,232,240,0.97)",
          letterSpacing: "0.04em",
          textShadow: accent ? `0 0 18px ${accent}55` : "none",
        }}
      >
        {value}
      </div>
    </div>
  );
}
