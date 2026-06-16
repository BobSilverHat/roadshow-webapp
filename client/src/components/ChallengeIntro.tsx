/**
 * Pre-Begin intro block for Challenge 1. Shows workshop metadata plus
 * the Begin Workshop button that starts the shared 35-minute timer
 * covering BOTH challenges. Only rendered on /challenge/1 when the
 * workshop hasn't begun; /challenge/2 in the same state redirects to
 * /challenge/1 (see ChallengePage).
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation, Trans } from "react-i18next";
import { useWorkshopClock } from "@/hooks/useWorkshopClock";

interface Props {
  number: string;
  title: string;
  subtitle: string | null;
  onBegin: () => Promise<boolean>;
}

const LAUNCH_URL = "https://salt-labs.secured-api.com";

export default function ChallengeIntro({ number, title, subtitle, onBegin }: Props) {
  const { t } = useTranslation("challenge");
  const { durationMinutes } = useWorkshopClock();
  const minutes = durationMinutes ?? 35;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBegin() {
    setError(null);
    setSubmitting(true);
    const ok = await onBegin();
    setSubmitting(false);
    if (!ok) setError(t("intro.errorStart"));
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ paddingTop: "3rem", maxWidth: "880px", margin: "0 auto" }}
    >
      <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
        {t("intro.sectionLabel", { number })}
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
          margin: "0 0 0.75rem",
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.95rem",
            fontWeight: 400,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted-foreground)",
            marginBottom: "2rem",
          }}
        >
          {subtitle}
        </p>
      )}

      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "1rem",
          fontWeight: 300,
          lineHeight: 1.65,
          color: "var(--muted-foreground)",
          marginBottom: "1rem",
        }}
      >
        <Trans i18nKey="intro.p1" t={t} components={{ l1: <span className="accent-link" /> }} values={{ minutes }}>
          You have <l1>{minutes} minutes</l1> total to complete both challenges. Starting
          Challenge 1 unlocks Challenge 2 — work them in any order, and switch between them
          at will. When the timer hits zero, submissions lock and you'll be taken to your
          results.
        </Trans>
      </p>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "1rem",
          fontWeight: 300,
          lineHeight: 1.65,
          color: "var(--muted-foreground)",
          marginBottom: "1rem",
        }}
      >
        <Trans i18nKey="intro.p2" t={t} components={{ l1: <span className="accent-link" /> }}>
          Every answer lives inside the Salt platform. Open it in another tab, hunt through
          the UI, submit each flag here. Wrong guesses add{" "}
          <l1>+15 seconds</l1> each, so take the time to get it right.
        </Trans>
      </p>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.9rem",
          fontWeight: 300,
          lineHeight: 1.6,
          color: "var(--muted-foreground)",
          marginBottom: "1.5rem",
        }}
      >
        <Trans i18nKey="intro.p3" t={t} components={{ l1: <span className="accent-link" /> }}>
          <l1>Answers with multiple values:</l1> separate each with a comma + space.
          Order doesn't matter — `A, B` and `B, A` both land. Answers are case-insensitive
          and whitespace-tolerant.
        </Trans>
      </p>

      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "1rem",
          fontWeight: 300,
          lineHeight: 1.65,
          color: "var(--muted-foreground)",
          marginBottom: "2.5rem",
        }}
      >
        <a
          href={LAUNCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="accent-link"
        >
          {t("intro.launchLink")}
        </a>
      </p>

      {error && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.7rem 0.9rem",
            border: "1px solid oklch(0.55 0.2 25 / 0.4)",
            borderRadius: "4px",
            background: "oklch(0.4 0.15 25 / 0.15)",
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: "0.78rem",
            color: "oklch(0.7 0.2 25)",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn-salt-primary"
        onClick={handleBegin}
        disabled={submitting}
        style={{
          cursor: submitting ? "wait" : "pointer",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        <span style={{ position: "relative", zIndex: 1 }}>
          {submitting ? t("intro.buttonStarting") : t("intro.buttonBegin")}
        </span>
      </button>
    </motion.section>
  );
}
