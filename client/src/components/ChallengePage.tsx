/**
 * Challenge page container. Wires the useChallenge hook to the header,
 * intro block, and grid of question cards. Handles the completion reveal
 * and post-challenge navigation.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import ChallengeHeader from "@/components/ChallengeHeader";
import ChallengeIntro from "@/components/ChallengeIntro";
import QuestionCard from "@/components/QuestionCard";
import MagicRingsButton from "@/components/MagicRingsButton";
import { useChallenge } from "@/hooks/useChallenge";
import { supabase } from "@/lib/supabase";

interface LeaderboardSnapshot {
  attendee_id: string;
  name: string;
  questions_complete: number;
  total_ms: number | null;
  wrong_count: number;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
}

interface Props {
  challengeId: number;
  challengeNumber: string; // "01" or "02"
  attendee: Attendee;
  nextPath: string; // "/challenge/2" or "/completed"
  nextLabel: string;
}

const PENALTY_PER_WRONG_MS = 15_000;

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ChallengePage({
  challengeId,
  challengeNumber,
  attendee,
  nextPath,
  nextLabel,
}: Props) {
  const [, navigate] = useLocation();
  const {
    meta,
    questions,
    state,
    progress,
    status,
    error,
    solvedCount,
    totalQuestions,
    begin,
    submit,
  } = useChallenge({ challengeId, attendeeId: attendee.id });
  const [revealed, setRevealed] = useState(false);
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  // When the hook transitions to "complete", raise the reveal overlay
  // and take a one-shot snapshot of the leaderboard for the top-3 peek.
  useEffect(() => {
    if (status !== "complete") return;
    setRevealed(true);
    let mounted = true;
    (async () => {
      const { data } = await supabase.rpc("get_leaderboard");
      if (!mounted || !data) return;
      const rows = data as LeaderboardSnapshot[];
      setSnapshot(rows.slice(0, 3));
      const idx = rows.findIndex((r) => r.attendee_id === attendee.id);
      setMyRank(idx >= 0 ? idx + 1 : null);
    })();
    return () => {
      mounted = false;
    };
  }, [status, attendee.id]);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "0.8rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(200,200,220,0.45)",
        }}
      >
        Loading challenge…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        style={{
          marginTop: "4rem",
          padding: "1.5rem",
          border: "1px solid oklch(0.55 0.2 25 / 0.4)",
          borderRadius: "6px",
          background: "oklch(0.35 0.15 25 / 0.15)",
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.85rem",
          color: "oklch(0.7 0.2 25)",
        }}
      >
        Couldn't load the challenge: {error}
      </div>
    );
  }

  const beganAt = state?.started_at ?? null;
  const completedAt = state?.completed_at ?? null;
  const wrongCount = state?.wrong_count ?? 0;
  const title = meta
    ? `Challenge ${challengeNumber} — ${titleWithoutPrefix(meta.title)}`
    : `Challenge ${challengeNumber}`;

  // Pre-Begin: just the intro block.
  if (status === "ready") {
    return (
      <ChallengeIntro
        number={challengeNumber}
        title={titleWithoutPrefix(meta?.title ?? `Challenge ${challengeNumber}`)}
        subtitle={meta?.subtitle ?? null}
        onBegin={begin}
      />
    );
  }

  // In-progress or complete: header + cards grid (+ maybe reveal).
  const finalMs = beganAt && completedAt
    ? new Date(completedAt).getTime() -
      new Date(beganAt).getTime() +
      wrongCount * PENALTY_PER_WRONG_MS
    : 0;

  return (
    <>
      <ChallengeHeader
        title={title}
        startedAt={beganAt}
        completedAt={completedAt}
        wrongCount={wrongCount}
        attendeeName={attendee.name}
        solvedCount={solvedCount}
        totalQuestions={totalQuestions}
      />

      {questions.length === 5 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.25rem",
            marginBottom: "3rem",
          }}
        >
          {/* Row 1 — Q1, Q2 */}
          <QuestionCard
            key={questions[0].id}
            orderIdx={questions[0].order_idx}
            questionId={questions[0].id}
            prompt={questions[0].prompt}
            isSolved={progress.has(questions[0].id)}
            onSubmit={submit}
          />
          <QuestionCard
            key={questions[1].id}
            orderIdx={questions[1].order_idx}
            questionId={questions[1].id}
            prompt={questions[1].prompt}
            isSolved={progress.has(questions[1].id)}
            onSubmit={submit}
          />
          {/* Q5 — centered between the two rows, half-width */}
          <div
            style={{
              gridColumn: "span 2",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div style={{ width: "calc(50% - 0.625rem)" }}>
              <QuestionCard
                key={questions[4].id}
                orderIdx={questions[4].order_idx}
                questionId={questions[4].id}
                prompt={questions[4].prompt}
                isSolved={progress.has(questions[4].id)}
                onSubmit={submit}
              />
            </div>
          </div>
          {/* Row 2 — Q3, Q4 */}
          <QuestionCard
            key={questions[2].id}
            orderIdx={questions[2].order_idx}
            questionId={questions[2].id}
            prompt={questions[2].prompt}
            isSolved={progress.has(questions[2].id)}
            onSubmit={submit}
          />
          <QuestionCard
            key={questions[3].id}
            orderIdx={questions[3].order_idx}
            questionId={questions[3].id}
            prompt={questions[3].prompt}
            isSolved={progress.has(questions[3].id)}
            onSubmit={submit}
          />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "1.25rem",
            marginBottom: "3rem",
          }}
        >
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              orderIdx={q.order_idx}
              questionId={q.id}
              prompt={q.prompt}
              isSolved={progress.has(q.id)}
              onSubmit={submit}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {revealed && completedAt && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.5 }}
            style={{
              marginTop: "2rem",
              padding: "2.25rem 2rem",
              border: "1px solid oklch(0.55 0.22 145 / 0.4)",
              borderRadius: "8px",
              background:
                "linear-gradient(135deg, oklch(0.3 0.12 145 / 0.35), oklch(0.25 0.15 290 / 0.25))",
              textAlign: "center",
            }}
          >
            <div
              className="section-label"
              style={{ display: "block", marginBottom: "0.75rem" }}
            >
              Complete
            </div>
            <h2
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "2rem",
                fontWeight: 800,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "rgba(232,232,240,0.97)",
                margin: "0 0 0.5rem",
              }}
            >
              Challenge {challengeNumber} —{" "}
              <span
                style={{
                  color: "oklch(0.72 0.28 290)",
                  textShadow: "0 0 24px oklch(0.52 0.28 290 / 0.5)",
                }}
              >
                {formatMs(finalMs)}
              </span>
            </h2>
            <p
              style={{
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: "0.85rem",
                color: "rgba(200,200,220,0.8)",
                margin: "0 0 1.5rem",
              }}
            >
              {wrongCount > 0
                ? `${wrongCount} wrong guess${wrongCount === 1 ? "" : "es"} (+${wrongCount * 15}s penalty baked in).`
                : "Clean run — no wrong guesses."}
              {myRank !== null && <> · Current rank <strong style={{ color: "oklch(0.72 0.28 290)" }}>#{myRank}</strong></>}
            </p>

            {snapshot && snapshot.length > 0 && (
              <div
                style={{
                  margin: "0 auto 1.75rem",
                  maxWidth: "420px",
                  padding: "0.9rem 1rem",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "6px",
                  background: "rgba(10,10,15,0.45)",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(200,200,220,0.55)",
                    marginBottom: "0.6rem",
                  }}
                >
                  Podium right now
                </div>
                {snapshot.map((row, i) => {
                  const isMe = row.attendee_id === attendee.id;
                  const rank = i + 1;
                  const rankColor =
                    rank === 1
                      ? "oklch(0.82 0.18 85)"
                      : rank === 2
                        ? "oklch(0.78 0.04 260)"
                        : "oklch(0.6 0.12 45)";
                  return (
                    <div
                      key={row.attendee_id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "28px 1fr auto",
                        alignItems: "baseline",
                        gap: "0.6rem",
                        padding: "0.3rem 0",
                        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                        fontSize: "0.82rem",
                        color: isMe ? "rgba(232,232,240,0.97)" : "rgba(200,200,220,0.8)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700,
                          letterSpacing: "0.18em",
                          color: rankColor,
                        }}
                      >
                        {rank.toString().padStart(2, "0")}
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
                              fontSize: "0.6rem",
                              letterSpacing: "0.2em",
                              color: "oklch(0.72 0.28 290)",
                            }}
                          >
                            YOU
                          </span>
                        )}
                      </span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.questions_complete}/10
                        {row.total_ms !== null && ` · ${formatMs(row.total_ms)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center" }}>
              <MagicRingsButton label={nextLabel} onClick={() => navigate(nextPath)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function titleWithoutPrefix(full: string): string {
  // Stored as "Challenge 1 — Discover & Govern" in challenges.title;
  // components receive challengeNumber separately so we trim the prefix.
  const m = full.match(/^Challenge\s+\d+\s*[—–-]\s*(.+)$/);
  return m ? m[1] : full;
}
