/**
 * Full-screen overlay (blurred backdrop) that confirms a hint reveal
 * (+60s penalty) and then displays the hint text. Sized to sit under
 * the navbar and to the right of the sidebar — same scaffolding as
 * the Time's-Up overlay in ChallengePage.
 */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import BorderGlow from "@/components/BorderGlow";
import type { HintError, HintReveal } from "@/hooks/useHints";

interface Props {
  open: boolean;
  /** "01" / "02" / etc. for the badge. */
  questionLabel: string;
  /** Total hints available for this question. */
  hintCount: number;
  /** Hints the user has already paid for, with text loaded post-open. */
  revealed: HintReveal[];
  /** Fires the request_hint RPC for a given idx and resolves with the
   *  text. Caller updates revealed via the parent's useHints hook. */
  onRequestReveal: (idx: number) => Promise<{
    ok: boolean;
    hint?: string;
    error?: HintError;
  }>;
  onClose: () => void;
}

const YELLOW_PALETTE = ["#fde68a", "#facc15", "#f59e0b"];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function friendlyError(e: HintError | undefined): string {
  switch (e) {
    case "already_solved":
      return "You've already solved this question.";
    case "time_expired":
      return "Workshop window closed.";
    case "challenge_not_begun":
      return "Challenge hasn't started yet.";
    case "challenge_locked":
      return "The challenge is locked.";
    default:
      return "Couldn't reveal hint. Try again.";
  }
}

export default function HintModal({
  open,
  questionLabel,
  hintCount,
  revealed,
  onRequestReveal,
  onClose,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<HintError | null>(null);

  // Auto-replay reveals for hints the user already paid for — when the
  // modal opens with paidIdxs but empty revealed text. Each call returns
  // already_charged: true, so no new penalty is recorded.
  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const revealedCount = revealed.length;
  const showConfirm = revealedCount === 0;
  const showNextReveal = !showConfirm && revealedCount < hintCount;
  const nextIdx = revealedCount;

  async function handleReveal() {
    setError(null);
    setSubmitting(true);
    const result = await onRequestReveal(nextIdx);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "rpc_failed");
    }
  }

  const sortedRevealed = useMemo(
    () => [...revealed].sort((a, b) => a.idx - b.idx),
    [revealed],
  );

  // Portal to document.body so the fixed-position overlay escapes any
  // transformed ancestor (BorderGlow's translate3d creates a containing
  // block that breaks `position: fixed` for descendants). The portal
  // wraps AnimatePresence — not the other way around — so AnimatePresence
  // can see motion.div as its direct child and track mount/unmount.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="hint-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            top: "var(--navbar-height, 70px)",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: "var(--sidebar-width, 200px)",
            background: "rgba(10,10,15,0.65)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(520px, 90vw)" }}
          >
            <BorderGlow
              backgroundColor="#0e0e16"
              borderRadius={8}
              glowColor="50 90 70"
              glowRadius={36}
              glowIntensity={0.95}
              edgeSensitivity={20}
              coneSpread={28}
              colors={YELLOW_PALETTE}
              animated
            >
              <div
                style={{
                  padding: "1.75rem 1.85rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    className="section-label"
                    style={{ color: "oklch(0.82 0.18 85)" }}
                  >
                    Question {questionLabel}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "rgba(200,200,220,0.55)",
                    }}
                  >
                    Hint {revealedCount} / {hintCount}
                  </span>
                </div>

                {showConfirm ? (
                  <>
                    <h3
                      style={{
                        fontFamily:
                          "'Nostalgic Whispers', 'Barlow Condensed', serif",
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        color: "rgba(232,232,240,0.97)",
                        margin: 0,
                      }}
                    >
                      Reveal a{" "}
                      <span
                        style={{
                          color: "oklch(0.82 0.18 85)",
                          textShadow: "0 0 24px oklch(0.6 0.2 85 / 0.45)",
                        }}
                      >
                        Hint
                      </span>
                      ?
                    </h3>
                    <p
                      style={{
                        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                        fontSize: "0.875rem",
                        lineHeight: 1.6,
                        color: "rgba(210,210,225,0.85)",
                        margin: 0,
                      }}
                    >
                      +60 seconds will be added to your total time.
                    </p>
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                    }}
                  >
                    {sortedRevealed.map((r) => (
                      <div
                        key={r.idx}
                        style={{
                          padding: "0.85rem 1rem",
                          border: "1px solid oklch(0.55 0.18 85 / 0.35)",
                          borderRadius: "4px",
                          background: "oklch(0.18 0.06 85 / 0.18)",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            letterSpacing: "0.22em",
                            textTransform: "uppercase",
                            color: "oklch(0.82 0.18 85)",
                            marginBottom: "0.4rem",
                          }}
                        >
                          Hint {pad(r.idx + 1)}
                        </div>
                        <div
                          style={{
                            fontFamily:
                              "'IBM Plex Mono', ui-monospace, monospace",
                            fontSize: "0.875rem",
                            lineHeight: 1.6,
                            color: "rgba(232,232,240,0.92)",
                          }}
                        >
                          {r.text}
                        </div>
                      </div>
                    ))}
                    {revealedCount >= hintCount && (
                      <div
                        role="alert"
                        style={{
                          padding: "0.7rem 0.9rem",
                          border: "1px solid oklch(0.55 0.22 25 / 0.55)",
                          borderRadius: "4px",
                          background: "oklch(0.22 0.09 25 / 0.25)",
                          fontFamily:
                            "'IBM Plex Mono', ui-monospace, monospace",
                          fontSize: "0.78rem",
                          lineHeight: 1.55,
                          color: "oklch(0.78 0.18 25)",
                          textAlign: "center",
                          marginTop: "0.25rem",
                        }}
                      >
                        ⚠ Last hint — once you close, the hint won't be visible again.
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      fontSize: "0.78rem",
                      color: "oklch(0.7 0.2 25)",
                    }}
                  >
                    {friendlyError(error)}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    justifyContent: "flex-end",
                    marginTop: "0.25rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={onClose}
                    style={cancelButtonStyle}
                  >
                    {showConfirm ? "Cancel" : "Close"}
                  </button>
                  {(showConfirm || showNextReveal) && (
                    <button
                      type="button"
                      onClick={handleReveal}
                      disabled={submitting}
                      style={{
                        ...revealButtonStyle,
                        opacity: submitting ? 0.6 : 1,
                        cursor: submitting ? "wait" : "pointer",
                      }}
                    >
                      {submitting
                        ? "…"
                        : showConfirm
                          ? "Reveal +60s"
                          : `Reveal Hint ${pad(nextIdx + 1)} +60s`}
                    </button>
                  )}
                </div>

                {!showConfirm && (
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      fontSize: "0.72rem",
                      color: "rgba(200,200,220,0.55)",
                      textAlign: "center",
                    }}
                  >
                    +60s per hint baked into your total time.
                  </div>
                )}
              </div>
            </BorderGlow>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const cancelButtonStyle: React.CSSProperties = {
  padding: "0.55rem 1rem",
  background: "transparent",
  color: "rgba(200,200,220,0.85)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "4px",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.78rem",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const revealButtonStyle: React.CSSProperties = {
  padding: "0.55rem 1.1rem",
  background:
    "linear-gradient(135deg, oklch(0.78 0.18 85) 0%, oklch(0.62 0.18 65) 100%)",
  color: "#1a140a",
  border: "none",
  borderRadius: "4px",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.8rem",
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};
