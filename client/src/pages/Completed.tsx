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
import { useTranslation } from "react-i18next";
import BorderGlow from "@/components/BorderGlow";
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
  if (rank === 1) return "oklch(0.88 0.2 145)"; // Salt Nexus green
  if (rank === 2) return "oklch(0.78 0.04 260)"; // silver
  if (rank === 3) return "oklch(0.6 0.12 45)"; // bronze
  return "oklch(0.65 0.25 290)";
}

// Maps tier/rank to the BorderGlow palette + glowColor for the
// results card. Hex palette feeds the mesh-gradient border; HSL string
// drives the box-shadow halo.
function resultsGlow(
  tier: FinishTier,
  rank: number,
): { colors: string[]; glowColor: string } {
  if (tier === "timed-out")
    return { colors: ["#fca5a5", "#ef4444", "#b91c1c"], glowColor: "25 75 60" };
  if (rank === 1)
    return { colors: ["#86efac", "#4ade80", "#22c55e"], glowColor: "145 75 70" };
  if (rank === 2)
    return { colors: ["#e5e7eb", "#cbd5e1", "#94a3b8"], glowColor: "230 8 75" };
  if (rank === 3)
    return { colors: ["#fde68a", "#fbbf24", "#d97706"], glowColor: "40 80 60" };
  return { colors: ["#c084fc", "#a855f7", "#7c3aed"], glowColor: "290 80 70" };
}

type FinishTier = "champion" | "runner-up" | "third" | "completed" | "timed-out";

function tierFor(rank: number, finishedNaturally: boolean): FinishTier {
  if (rank === 1) return "champion";
  if (rank === 2) return "runner-up";
  if (rank === 3) return "third";
  return finishedNaturally ? "completed" : "timed-out";
}

export default function Completed() {
  const [, navigate] = useLocation();
  const { t } = useTranslation("completed");
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

  // A row is "settled" once total_ms is non-null (both done, or expired).
  // "Finished naturally" = both challenges have a completed_at milestone.
  const finished = myRow !== null && myRow.total_ms !== null;
  const finishedNaturally =
    myRow !== null && myRow.c1_elapsed_ms !== null && myRow.c2_elapsed_ms !== null;
  const tier: FinishTier | null =
    finished && myRank !== null ? tierFor(myRank, finishedNaturally) : null;

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
            <span className="section-label">{t("sectionLabel")}</span>
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
                color: "var(--foreground)",
                margin: 0,
              }}
            >
              {tier === "champion" && (
                <>
                  {t("tier.champion.word1")}{" "}
                  <span
                    style={{
                      color: rankAccent(1),
                      textShadow: `0 0 36px ${rankAccent(1)}`,
                    }}
                  >
                    {t("tier.champion.word2")}
                  </span>
                </>
              )}
              {tier === "runner-up" && (
                <>
                  {t("tier.runnerUp.word1")}
                  <span
                    style={{
                      color: rankAccent(2),
                      textShadow: `0 0 30px ${rankAccent(2)}`,
                    }}
                  >
                    {t("tier.runnerUp.word2")}
                  </span>
                </>
              )}
              {tier === "third" && (
                <>
                  <span
                    style={{
                      color: rankAccent(3),
                      textShadow: `0 0 30px ${rankAccent(3)}`,
                    }}
                  >
                    {t("tier.third.word1")}
                  </span>{" "}
                  {t("tier.third.word2")}
                </>
              )}
              {tier === "completed" && (
                <>
                  {t("tier.completed.word1")}{" "}
                  <span
                    style={{
                      color: "var(--color-accent-text-bright)",
                      textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                    }}
                  >
                    {t("tier.completed.word2")}
                  </span>
                </>
              )}
              {tier === "timed-out" && (
                <>
                  {t("tier.timedOut.word1")}{" "}
                  <span
                    style={{
                      color: "oklch(0.7 0.2 25)",
                      textShadow: "0 0 30px oklch(0.5 0.2 25 / 0.4)",
                    }}
                  >
                    {t("tier.timedOut.word2")}
                  </span>
                </>
              )}
              {tier === null && (
                <>
                  {t("tier.fallback.word1")}{" "}
                  <span
                    style={{
                      color: "var(--color-accent-text-bright)",
                      textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                    }}
                  >
                    {t("tier.fallback.word2")}
                  </span>
                </>
              )}
            </h1>
          </motion.div>

          {/* Performance card for settled attendees */}
          {tier && myRow && myRank !== null && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
            >
              <div style={{ marginBottom: "2.5rem", textAlign: "left" }}>
              <BorderGlow
                loop
                fillOpacity={0}
                outerGlowOnly
                backgroundColor="var(--card)"
                borderRadius={8}
                glowRadius={40}
                glowIntensity={0.9}
                edgeSensitivity={22}
                coneSpread={26}
                colors={resultsGlow(tier, myRank).colors}
                glowColor={resultsGlow(tier, myRank).glowColor}
              >
              <div
                style={{
                  padding: "2rem",
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
                      color:
                        tier === "timed-out"
                          ? "oklch(0.7 0.2 25)"
                          : rankAccent(myRank),
                    }}
                  >
                    {tier === "timed-out" ? t("card.didNotFinish") : t("card.yourResult")}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {t("card.rankOf", { rank: myRank.toString().padStart(2, "0"), total: rows.length })}
                  </span>
                </div>

                {tier === "timed-out" ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: "1rem",
                      alignItems: "end",
                    }}
                  >
                    <Stat
                      label={t("stat.solved")}
                      value={`${myRow.questions_complete} / 10`}
                      accent="oklch(0.7 0.2 25)"
                    />
                    <Stat
                      label={t("stat.finalScore")}
                      value={formatMs(myRow.total_ms)}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1rem",
                    }}
                  >
                    <Stat
                      label={t("stat.challenge1")}
                      value={formatMs(myRow.c1_elapsed_ms)}
                    />
                    <Stat
                      label={t("stat.challenge2")}
                      value={formatMs(myRow.c2_elapsed_ms)}
                    />
                    <Stat
                      label={t("stat.total")}
                      value={formatMs(myRow.total_ms)}
                      accent={rankAccent(myRank)}
                    />
                  </div>
                )}

                <div
                  style={{
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--border)",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.9rem",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {tier === "timed-out"
                    ? (
                      <>
                        {t("footer.timedOut", { solved: myRow.questions_complete })}
                        {myRow.wrong_count > 0 && t("footer.timedOutWrong", { count: myRow.wrong_count, penalty: myRow.wrong_count * 15 })}
                        {myRow.hints_used > 0 && t("footer.timedOutHints", { count: myRow.hints_used, penalty: myRow.hints_used })}
                        {"."}
                      </>
                    )
                    : (
                      <>
                        {myRow.wrong_count > 0
                          ? t("footer.wrongGuesses", { count: myRow.wrong_count, penalty: myRow.wrong_count * 15 })
                          : t("footer.cleanRun")}
                        {myRow.hints_used > 0 && t("footer.hints", { count: myRow.hints_used, penalty: myRow.hints_used })}
                      </>
                    )}
                </div>
              </div>
              </BorderGlow>
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            {/* Scenario recap cards */}
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1rem",
                fontWeight: 300,
                lineHeight: 1.65,
                color: "var(--muted-foreground)",
                marginBottom: "2rem",
                textAlign: "center",
              }}
            >
              {t("recapParagraph")}
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
              {(t("scenarioCards", { returnObjects: true }) as { number: string; title: string; desc: string }[]).map((card) => (
                <div
                  key={card.number}
                  style={{
                    border: "1px solid oklch(from var(--color-accent-text) l c h / 0.18)",
                    borderRadius: "4px",
                    padding: "1.25rem",
                    backgroundColor: "oklch(from var(--color-accent-text) l c h / 0.04)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: "var(--color-accent-text)",
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
                      color: "var(--foreground)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    {card.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.875rem",
                      fontWeight: 300,
                      lineHeight: 1.5,
                      color: "var(--muted-foreground)",
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
              <span style={{ position: "relative", zIndex: 1 }}>{t("viewLeaderboard")}</span>
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
              {t("backToIntro")}
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
          color: "var(--muted-foreground)",
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
          color: accent ?? "var(--foreground)",
          letterSpacing: "0.04em",
          textShadow: accent ? `0 0 18px ${accent}55` : "none",
        }}
      >
        {value}
      </div>
    </div>
  );
}
