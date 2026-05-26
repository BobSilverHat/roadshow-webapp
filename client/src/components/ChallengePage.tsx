/**
 * Challenge page container. Wires the useChallenge hook to the header,
 * intro block, and grid of question cards. Handles the completion reveal
 * and post-challenge navigation.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import Challenge1HelpStepper from "@/components/Challenge1HelpStepper";
import ChallengeHeader from "@/components/ChallengeHeader";
import ChallengeIntro from "@/components/ChallengeIntro";
import DotMatrixLogo from "@/components/DotMatrixLogo";
import QuestionCard from "@/components/QuestionCard";
import MagicRingsButton from "@/components/MagicRingsButton";
import WaitingOverlay from "@/components/WaitingOverlay";
import { useChallenge } from "@/hooks/useChallenge";
import { useHints, type HintReveal } from "@/hooks/useHints";
import { useWorkshop } from "@/hooks/useWorkshop";
import { useWorkshopClock } from "@/hooks/useWorkshopClock";
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
const TIME_UP_AUTONAV_DELAY_MS = 5000;

// Staggered fade-up matching the scenario pages' entry animation, so the
// question cards don't pop in instantly.
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

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
  const workshop = useWorkshop({ attendeeId: attendee.id });
  // Per-clock expiry — independent of this user's completion state. Drives
  // the time-up overlay for EVERYONE when the global 35-min window closes,
  // including winners who already finished both challenges (whose
  // workshop.status would otherwise stay "complete").
  const workshopClock = useWorkshopClock();
  const {
    meta,
    questions,
    state,
    progress,
    solvedAnswers,
    status,
    error,
    solvedCount,
    totalQuestions,
    submit,
  } = useChallenge({ challengeId, attendeeId: attendee.id });
  const hints = useHints({ attendeeId: attendee.id });

  function buildRevealed(questionId: string): HintReveal[] {
    const state = hints.getState(questionId);
    return Array.from(state.revealed.entries())
      .map(([idx, text]) => ({ idx, text }))
      .sort((a, b) => a.idx - b.idx);
  }

  function makeOnRequestHint(questionId: string) {
    return (idx: number) => hints.requestHint(questionId, idx);
  }
  const [revealed, setRevealed] = useState(false);
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const timeUpHandledRef = useRef(false);
  // Challenge 1 help-stepper visibility. Toggled by the HELP button in
  // the ChallengeHeader; Complete on the stepper's final step also
  // flips this back to false via onClose.
  const [helpOpen, setHelpOpen] = useState(false);
  // True when the next/current open was triggered by a HELP button click
  // (so the stepper should scroll itself into view). False when opened
  // by the first-visit auto-open below (no scroll — let the user keep
  // the natural top-of-page view of the question grid).
  const [helpScrollOnOpen, setHelpScrollOnOpen] = useState(true);
  // One-shot ref so the first-visit auto-open below only fires once per
  // mount (independent of the localStorage gate).
  const helpAutoOpenedRef = useRef(false);
  // Smooth-scroll target for the celebration reveal card.
  const completeCardRef = useRef<HTMLDivElement | null>(null);

  // First-visit auto-open: when a user JUST clicked Begin on
  // /challenge/1 (workshop.startedAt within the last 5 seconds), pop
  // the help stepper open automatically. Using the timestamp on the
  // attendee's challenge_attempts row instead of localStorage means
  // (a) refreshing the page mid-challenge doesn't re-open it, and
  // (b) the gate resets naturally per attendee so DB resets / new
  // registrations get a fresh auto-open on their next Begin click.
  const workshopStartedAt = workshop.startedAt;
  useEffect(() => {
    if (challengeId !== 1) return;
    if (workshop.status !== "in_progress") return;
    if (!workshopStartedAt) return;
    if (helpAutoOpenedRef.current) return;
    const startedMs = new Date(workshopStartedAt).getTime();
    if (Date.now() - startedMs > 5000) return;
    helpAutoOpenedRef.current = true;
    setHelpScrollOnOpen(false);
    setHelpOpen(true);
  }, [challengeId, workshop.status, workshopStartedAt]);

  // Direct nav to /challenge/2 before the workshop is begun → bounce to C1.
  // Funnels both the locked (admin-gated) and ready states to the same
  // pre-begin page so the WaitingOverlay / Begin button only appears in
  // one place.
  useEffect(() => {
    if (challengeId !== 2) return;
    if (workshop.status !== "ready" && workshop.status !== "locked") return;
    navigate("/challenge/1", { replace: true });
  }, [challengeId, workshop.status, navigate]);

  // When THIS challenge transitions to completed_at, refresh workshop
  // so it sees the new completion flag. useWorkshop doesn't refetch
  // attempts on its own (only its 1s display ticker runs) — explicit
  // refresh here is the only signal that the completion flag changed.
  const completedAtSig = state?.completed_at ?? null;
  const workshopRefresh = workshop.refresh;
  useEffect(() => {
    if (!completedAtSig) return;
    workshopRefresh().catch((e) =>
      console.error("workshop refresh failed", e),
    );
  }, [completedAtSig, workshopRefresh]);

  // Time's-up handler: one-shot. Fades in the overlay, then auto-navs.
  // Triggered by the GLOBAL clock (useWorkshopClock), NOT per-user
  // workshop.status — winners who completed before the timer have
  // workshop.status === "complete", but the overlay + auto-nav still
  // need to run for them when the global window closes.
  // No cleanup-clear on the timer — once we've decided to nav, we MUST
  // nav. Any re-run of this effect (from dep identity changes, hint
  // state updates, etc.) used to call clearTimeout in cleanup, which
  // could wipe the pending nav and strand users on the expired page.
  // The handled-ref guards against scheduling more than one timer.
  useEffect(() => {
    if (workshopClock.reviewMode) return;
    if (workshopClock.status !== "expired") return;
    if (timeUpHandledRef.current) return;
    timeUpHandledRef.current = true;
    setShowTimeUp(true);
    window.setTimeout(() => {
      navigate("/completed", { replace: true });
    }, TIME_UP_AUTONAV_DELAY_MS);
  }, [workshopClock.status, workshopClock.reviewMode, navigate]);

  // When the hook transitions to "complete", raise the reveal overlay,
  // take a one-shot snapshot of the leaderboard for the top-3 peek, and
  // dismiss the help walkthrough + smooth-scroll the celebration card
  // into the center of the viewport. Help is irrelevant the moment the
  // challenge ends, so we close it (no-op if already closed) to give the
  // complete card a quiet stage to land in.
  useEffect(() => {
    if (status !== "complete") return;
    setRevealed(true);
    setHelpOpen(false);
    // Layout-settling budget: ~400ms for the help exit animation +
    // ~100ms for the complete card's mount animation to begin. Scrolling
    // at t=500ms hits a stable, final layout.
    const scrollTimer = window.setTimeout(() => {
      completeCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 500);
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
      window.clearTimeout(scrollTimer);
      mounted = false;
    };
  }, [status, attendee.id]);

  if (status === "loading" || workshop.status === "loading") {
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
          color: "var(--muted-foreground)",
        }}
      >
        Loading challenge…
      </div>
    );
  }

  if (status === "error" || workshop.error) {
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
          color: "var(--color-time-up)",
        }}
      >
        Couldn't load the challenge: {error ?? workshop.error}
      </div>
    );
  }

  const beganAt = state?.started_at ?? null;
  const completedAt = state?.completed_at ?? null;
  const wrongCount = state?.wrong_count ?? 0;
  const myHintCount = questions.reduce(
    (sum, q) => sum + hints.getState(q.id).paidIdxs.size,
    0,
  );
  const title = meta
    ? `Challenge ${challengeNumber} — ${titleWithoutPrefix(meta.title)}`
    : `Challenge ${challengeNumber}`;
  const isLocked = workshop.status === "expired";

  // Pre-Begin: only Challenge 1 shows the intro/Begin gate. /challenge/2
  // in the ready/locked state hits the redirect effect above and renders nothing.
  // When the admin gate is closed (status === "locked"), we render the intro
  // underneath the WaitingOverlay so users can read the workshop rules through
  // the blur while they wait.
  if (workshop.status === "ready" || workshop.status === "locked") {
    if (challengeId !== 1) return null; // redirecting
    return (
      <>
        <ChallengeIntro
          number={challengeNumber}
          title={titleWithoutPrefix(meta?.title ?? `Challenge ${challengeNumber}`)}
          subtitle={meta?.subtitle ?? null}
          onBegin={workshop.beginWorkshop}
        />
        <AnimatePresence>
          {workshop.status === "locked" && <WaitingOverlay />}
        </AnimatePresence>
      </>
    );
  }

  // In-progress or complete: header + cards grid (+ maybe reveal).
  const finalMs = beganAt && completedAt
    ? new Date(completedAt).getTime() -
      new Date(beganAt).getTime() +
      wrongCount * PENALTY_PER_WRONG_MS +
      myHintCount * 60_000
    : 0;

  return (
    <>
      <ChallengeHeader
        title={title}
        wrongCount={wrongCount}
        attendeeName={attendee.name}
        solvedCount={solvedCount}
        totalQuestions={totalQuestions}
        helpOpen={challengeId === 1 ? helpOpen : undefined}
        onToggleHelp={
          challengeId === 1
            ? () => {
                // Manual HELP click — always scroll the stepper into view.
                setHelpScrollOnOpen(true);
                setHelpOpen((o) => !o);
              }
            : undefined
        }
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
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={questions[i].id}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={i}
            >
              <QuestionCard
                orderIdx={questions[i].order_idx}
                questionId={questions[i].id}
                prompt={questions[i].prompt}
                isSolved={progress.has(questions[i].id)}
                solvedAnswer={solvedAnswers.get(questions[i].id)}
                locked={isLocked}
                hintCount={questions[i].hint_count}
                paidHintIdxs={hints.getState(questions[i].id).paidIdxs}
                revealedHints={buildRevealed(questions[i].id)}
                onRequestHint={makeOnRequestHint(questions[i].id)}
                onSubmit={submit}
              />
            </motion.div>
          ))}
          {/* Q5 — centered below the two pairs at single-column width */}
          <div
            style={{
              gridColumn: "span 2",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div style={{ width: "calc(50% - 0.625rem)" }}>
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={4}
              >
                <QuestionCard
                  key={questions[4].id}
                  orderIdx={questions[4].order_idx}
                  questionId={questions[4].id}
                  prompt={questions[4].prompt}
                  isSolved={progress.has(questions[4].id)}
                  solvedAnswer={solvedAnswers.get(questions[4].id)}
                  locked={isLocked}
                  hintCount={questions[4].hint_count}
                  paidHintIdxs={hints.getState(questions[4].id).paidIdxs}
                  revealedHints={buildRevealed(questions[4].id)}
                  onRequestHint={makeOnRequestHint(questions[4].id)}
                  onSubmit={submit}
                />
              </motion.div>
            </div>
          </div>
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
          {questions.map((q, i) => (
            <motion.div
              key={q.id}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={i}
            >
              <QuestionCard
                orderIdx={q.order_idx}
                questionId={q.id}
                prompt={q.prompt}
                isSolved={progress.has(q.id)}
                solvedAnswer={solvedAnswers.get(q.id)}
                locked={isLocked}
                hintCount={q.hint_count}
                paidHintIdxs={hints.getState(q.id).paidIdxs}
                revealedHints={buildRevealed(q.id)}
                onRequestHint={makeOnRequestHint(q.id)}
                onSubmit={submit}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Inline help stepper — Challenge 1 only. Visibility is controlled
          by the TIPS toggle in ChallengeHeader; Complete on the stepper's
          final step calls onClose, which flips tipsOpen back to false. */}
      {challengeId === 1 && (
        <Challenge1HelpStepper
          open={helpOpen}
          scrollOnOpen={helpScrollOnOpen}
          onClose={() => setHelpOpen(false)}
        />
      )}

      <AnimatePresence>
        {revealed && completedAt && (
          <motion.div
            ref={completeCardRef}
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
                color: "var(--foreground)",
                margin: "0 0 0.5rem",
              }}
            >
              Challenge {challengeNumber} -{" "}
              <span
                style={{
                  color: "var(--color-accent-text-bright)",
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
                color: "var(--muted-foreground)",
                margin: "0 0 1.5rem",
              }}
            >
              {wrongCount > 0
                ? `${wrongCount} wrong guess${wrongCount === 1 ? "" : "es"} (+${wrongCount * 15}s penalty baked in).`
                : "Clean run — no wrong guesses."}
              {myHintCount > 0 && (
                <>
                  {" "}· Used {myHintCount} hint{myHintCount === 1 ? "" : "s"} (+{myHintCount}m penalty baked in).
                </>
              )}
              {myRank !== null && <> · Current rank <strong style={{ color: "var(--color-accent-text-bright)" }}>#{myRank}</strong></>}
            </p>

            {snapshot && snapshot.length > 0 && (
              <div
                style={{
                  margin: "0 auto 1.75rem",
                  maxWidth: "420px",
                  padding: "0.9rem 1rem",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  background: "oklch(from var(--background) l c h / 0.45)",
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
                    color: "var(--muted-foreground)",
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
                        color: isMe ? "var(--foreground)" : "var(--muted-foreground)",
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
                              color: "var(--color-accent-text-bright)",
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

      <AnimatePresence>
        {showTimeUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{
              // Overlay covers everything below the navbar (including the
              // sidebar), but sits BELOW the sticky ChallengeHeader so the
              // countdown stays readable while the lock animates in.
              // Inner content is offset by --sidebar-width so the text
              // centers within the main-content column, not the viewport.
              position: "fixed",
              top: "var(--navbar-height, 70px)",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 45,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingLeft: "var(--sidebar-width, 200px)",
              background: "oklch(from var(--background) l c h / 0.65)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <span
                className="section-label"
                style={{ display: "block", marginBottom: "0.75rem" }}
              >
                Workshop Closed
              </span>
              <h2
                style={{
                  fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                  fontSize: "clamp(2.25rem, 5vw, 3.25rem)",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--foreground)",
                  margin: "0 0 0.5rem",
                }}
              >
                Time's{" "}
                <span
                  style={{
                    color: "var(--color-time-up)",
                    textShadow: "0 0 24px var(--color-time-up-glow)",
                  }}
                >
                  Up
                </span>
              </h2>
              <p
                style={{
                  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  fontSize: "0.875rem",
                  color: "var(--muted-foreground)",
                  margin: 0,
                }}
              >
                Locking submissions · routing to your results…
              </p>
              <DotMatrixLogo
                color="var(--color-time-up)"
                label="Time's up pulse"
                style={{ margin: "2.25rem auto 0" }}
              />
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
