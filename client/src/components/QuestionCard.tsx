/**
 * A single CTF question card. Locked to green once correctly answered;
 * flashes red on a wrong attempt. Submit goes through the submit_answer
 * RPC via the onSubmit prop.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  orderIdx: number;
  questionId: string;
  prompt: string;
  isSolved: boolean;
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
  onSubmit,
}: Props) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<CardStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setErrorMsg(result.error ?? "submit_failed");
      return;
    }
    if (result.correct) {
      // Parent flips isSolved, which re-renders us in the solved-locked state.
      setStatus("idle");
      setValue("");
    } else {
      setStatus("wrong");
      setValue("");
    }
  }

  // Solved-locked view
  if (isSolved) {
    return (
      <motion.div
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.35 }}
        style={{
          position: "relative",
          padding: "1.25rem 1.35rem",
          border: "1px solid oklch(0.55 0.22 145 / 0.5)",
          borderRadius: "6px",
          background: "oklch(0.35 0.1 145 / 0.2)",
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
        <p style={{ ...promptStyle, opacity: 0.6, marginBottom: 0 }}>{prompt}</p>
      </motion.div>
    );
  }

  const flashWrong = status === "wrong";
  const borderColor = flashWrong
    ? "oklch(0.55 0.2 25)"
    : "rgba(255,255,255,0.12)";
  const bgColor = flashWrong
    ? "oklch(0.3 0.12 25 / 0.15)"
    : "rgba(255,255,255,0.02)";

  return (
    <motion.form
      onSubmit={handleSubmit}
      animate={flashWrong ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        padding: "1.25rem 1.35rem",
        border: `1px solid ${borderColor}`,
        borderRadius: "6px",
        background: bgColor,
        transition: "border-color 0.3s, background 0.3s",
      }}
    >
      <div style={cardHeaderStyle}>
        <span className="section-label">Question {pad(orderIdx)}</span>
      </div>
      <p style={promptStyle}>{prompt}</p>

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "stretch" }}>
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
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
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
