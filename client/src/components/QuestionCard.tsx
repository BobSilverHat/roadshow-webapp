/**
 * A single CTF question card. Locked to green once correctly answered;
 * flashes red on a wrong attempt. Submit goes through the submit_answer
 * RPC via the onSubmit prop.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BorderGlow from "@/components/BorderGlow";

interface Props {
  orderIdx: number;
  questionId: string;
  prompt: string;
  isSolved: boolean;
  /** Normalized correct submission for this question, fetched once at
   *  mount via useChallenge — used to populate the solved-locked card
   *  on page reload when the in-session `solvedValue` is empty. */
  solvedAnswer?: string;
  locked?: boolean;
  onSubmit: (
    questionId: string,
    submission: string,
  ) => Promise<{ ok: boolean; correct?: boolean; error?: string }>;
}

type CardStatus = "idle" | "submitting" | "wrong" | "error";

const FLASH_DURATION_MS = 700;

export default function QuestionCard({
  orderIdx,
  questionId,
  prompt,
  isSolved,
  solvedAnswer,
  locked = false,
  onSubmit,
}: Props) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<CardStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Captures the user's submission at the moment of a correct answer, so
  // the just-solved card can display exactly what they typed (instead of
  // the alphabetized canonical form returned by the DB on reload).
  const [solvedValue, setSolvedValue] = useState<string | null>(null);

  // Clear flash after a beat
  useEffect(() => {
    if (status !== "wrong") return;
    const id = window.setTimeout(() => setStatus("idle"), FLASH_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [status]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!value.trim() || status === "submitting") return;
    setErrorMsg(null);
    setStatus("submitting");
    const result = await onSubmit(questionId, value);
    if (!result.ok) {
      setStatus("error");
      setErrorMsg(friendlyError(result.error ?? "submit_failed"));
      return;
    }
    if (result.correct) {
      // Parent flips isSolved, which re-renders us in the solved-locked state.
      setSolvedValue(value);
      setStatus("idle");
      setValue("");
    } else {
      setStatus("wrong");
      setValue("");
    }
  }

  // Solved-locked view — same shape as the active form (chrome + input)
  // but in green: BorderGlow with green palette, no submit button, and the
  // user's answer is shown inside a non-editable input-styled element with
  // the pulsing green glow that matches the WaitingOverlay headlines.
  if (isSolved) {
    const answerToDisplay = solvedValue ?? solvedAnswer ?? "✓ Solved";
    return (
      <BorderGlow
        className="h-full"
        backgroundColor="#0e0e16"
        borderRadius={6}
        glowColor="145 75 70"
        glowRadius={28}
        glowIntensity={0.85}
        edgeSensitivity={28}
        coneSpread={22}
        colors={["#86efac", "#4ade80", "#22c55e"]}
      >
        <motion.div
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.35 }}
          style={{
            padding: "1.25rem 1.35rem",
            background: "transparent",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={cardHeaderStyle}>
            <span className="section-label">Question {pad(orderIdx)}</span>
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.25em",
                color: "oklch(0.78 0.25 145)",
              }}
            >
              COMPLETE
            </span>
          </div>
          <p style={promptStyle}>{prompt}</p>

          {/* Answer display — styled like the active input box but
              non-interactive, with the green pulse animation. */}
          <motion.div
            aria-label="Your correct answer"
            animate={{
              opacity: [0.72, 1, 0.72],
              textShadow: [
                "0 0 12px oklch(0.6 0.25 145 / 0.35)",
                "0 0 32px oklch(0.65 0.28 145 / 0.7)",
                "0 0 12px oklch(0.6 0.25 145 / 0.35)",
              ],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              marginTop: "auto",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid oklch(0.55 0.22 145 / 0.5)",
              borderRadius: "4px",
              padding: "0.65rem 0.85rem",
              color: "oklch(0.88 0.2 145)",
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: "0.85rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              userSelect: "text",
            }}
          >
            {answerToDisplay}
          </motion.div>
        </motion.div>
      </BorderGlow>
    );
  }

  // Solved takes precedence (above). Otherwise, time-up locks the card.
  if (locked) {
    return (
      <div
        style={{
          position: "relative",
          padding: "1.25rem 1.35rem",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "6px",
          background: "rgba(255,255,255,0.015)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          opacity: 0.55,
        }}
      >
        <div style={cardHeaderStyle}>
          <span className="section-label">Question {pad(orderIdx)}</span>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.25em",
              color: "rgba(200,200,220,0.5)",
            }}
          >
            LOCKED
          </span>
        </div>
        <p style={{ ...promptStyle, opacity: 0.7, marginBottom: 0 }}>{prompt}</p>
      </div>
    );
  }

  const flashWrong = status === "wrong";
  // Card chrome (border, base bg, glow) comes from BorderGlow. The wrong-
  // flash overlay still paints red over the BorderGlow's bg for the brief
  // moment after a wrong answer, then fades back to transparent so the
  // mesh-gradient edge glow shows through normally.
  const flashBg = flashWrong ? "oklch(0.3 0.12 25 / 0.3)" : "transparent";

  return (
    <BorderGlow
      className="h-full"
      backgroundColor="#0e0e16"
      borderRadius={6}
      glowColor="290 80 70"
      glowRadius={28}
      glowIntensity={0.85}
      edgeSensitivity={28}
      coneSpread={22}
      colors={["#c084fc", "#a855f7", "#7c3aed"]}
    >
    <motion.form
      onSubmit={handleSubmit}
      animate={flashWrong ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        padding: "1.25rem 1.35rem",
        background: flashBg,
        transition: "background 0.3s",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={cardHeaderStyle}>
        <span className="section-label">Question {pad(orderIdx)}</span>
      </div>
      <p style={promptStyle}>{prompt}</p>

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "stretch", marginTop: "auto" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter flag (comma + space for multiple)"
          disabled={status === "submitting"}
          spellCheck={false}
          autoComplete="off"
          style={{
            flex: 1,
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "4px",
            padding: "0.65rem 0.85rem",
            color: "rgba(232,232,240,0.97)",
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: "0.85rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={status === "submitting" || !value.trim()}
          style={{
            padding: "0.65rem 1.1rem",
            background:
              "linear-gradient(135deg, oklch(0.52 0.28 290) 0%, oklch(0.42 0.25 295) 100%)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.85rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: status === "submitting" ? "wait" : "pointer",
            opacity: status === "submitting" || !value.trim() ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {status === "submitting" ? "…" : "Submit"}
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            marginTop: "0.75rem",
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: "0.75rem",
            color: "oklch(0.7 0.2 25)",
          }}
        >
          {errorMsg}
        </div>
      )}
    </motion.form>
    </BorderGlow>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function friendlyError(code: string): string {
  switch (code) {
    case "time_expired":
      return "Time's up — answer not submitted.";
    case "challenge_not_begun":
      return "Couldn't submit. Refresh and try again.";
    case "already_answered":
      return "Already solved on another tab.";
    case "not_registered":
      return "Registration expired. Refresh to re-register.";
    default:
      return "Submission failed. Try again.";
  }
}

const cardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "0.6rem",
} as const;

const promptStyle = {
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontSize: "0.875rem",
  fontWeight: 300,
  lineHeight: 1.6,
  color: "rgba(232,232,240,0.92)",
  marginBottom: "1rem",
} as const;
