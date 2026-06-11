/**
 * Challenge 1 help stepper — five-step walkthrough that lives below the
 * question grid on /challenge/1. Frames the same "find it inside the
 * Salt platform" muscle memory that Scenario 1 builds, so users can
 * orient themselves while the timer is running.
 *
 * Steps:
 *   1. Launch Salt — link out to the Salt platform login.
 *   2. How to find answers — narrative pointer to the platform.
 *   3. Agentic UI — what the surface is called.
 *   4. Agentic UI graph — visual reference.
 *   5. Discovery inventory — visual reference.
 *
 * Step 4 + 5 images live under /challenge-help/ in the public dir;
 * see HANDOFF.md for the expected filenames.
 */

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trans, useTranslation } from "react-i18next";
import Stepper, { Step } from "@/components/Stepper";

const LAUNCH_URL = "https://salt-labs.secured-api.com/login";

const headingStyle = {
  fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
  fontSize: "1.4rem",
  fontWeight: 800,
  letterSpacing: "0.03em",
  textTransform: "uppercase" as const,
  color: "var(--foreground)",
  margin: "0 0 0.85rem",
  lineHeight: 1.15,
};

const bodyStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "0.95rem",
  fontWeight: 300,
  lineHeight: 1.65,
  color: "var(--muted-foreground)",
  margin: "0 0 0.85rem",
} as const;

const labelStyle = {
  display: "inline-block",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.65rem",
  fontWeight: 700,
  letterSpacing: "0.22em",
  textTransform: "uppercase" as const,
  color: "oklch(0.78 0.18 145)",
  marginBottom: "0.5rem",
};

interface Challenge1HelpStepperProps {
  /** Whether the stepper is visible. Controlled by the TIPS toggle in
   *  the ChallengeHeader. */
  open: boolean;
  /** When false, the stepper renders without scrolling the page to
   *  center it. Used by ChallengePage for the first-visit auto-open
   *  so the user keeps the natural top-of-page view (question grid
   *  stays fully visible). Defaults to true for manual HELP clicks. */
  scrollOnOpen?: boolean;
  /** Fired when the user clicks Complete on the last step. */
  onClose: () => void;
}

export default function Challenge1HelpStepper({
  open,
  scrollOnOpen = true,
  onClose,
}: Challenge1HelpStepperProps) {
  const { t } = useTranslation("challenge");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Capture scrollOnOpen at the moment of an open transition. Using a
  // ref instead of a dep avoids re-firing the scroll if the parent
  // flips the prop while open is still true.
  const scrollOnOpenRef = useRef(scrollOnOpen);
  scrollOnOpenRef.current = scrollOnOpen;

  // When the stepper opens, smooth-scroll it into view, sitting
  // slightly above the vertical center of the viewport. Computed
  // manually instead of scrollIntoView({block:"center"}) so we can
  // bias it upward by SCROLL_BIAS_PX. Delay matches the motion.div
  // entrance + Stepper mount so the final layout is settled first.
  useEffect(() => {
    if (!open) return;
    if (!scrollOnOpenRef.current) return;
    const SCROLL_BIAS_PX = 120;
    const t = window.setTimeout(() => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const elementTopInDoc = rect.top + window.scrollY;
      const targetY =
        elementTopInDoc - window.innerHeight / 2 + rect.height / 2 + SCROLL_BIAS_PX;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    }, 250);
    return () => window.clearTimeout(t);
  }, [open]);

  // Entry animation. On the first-visit auto-open (scrollOnOpen=false
  // from parent), match the question-card fadeUp pattern exactly
  // (opacity + y:24, duration 0.5s) and add a 0.5s delay so the
  // stepper cascades in AFTER the 5 question cards finish their
  // staggered entrance (each card delays by i * 0.08s, last ends
  // at ~0.82s). For manual HELP toggles, use the snappier easing
  // with no delay so it pops immediately.
  const entryTransition = scrollOnOpen
    ? { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }
    : { duration: 0.5, delay: 0.5 };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="challenge1-help-stepper"
          ref={wrapperRef}
          // Enter: fade + slide up, matches question-card fadeUp.hidden.
          // Mounts at full natural height so the inner Stepper can
          // measure its content on first paint — no racing height
          // animations.
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          // Exit: collapse height so content below reflows cleanly.
          // Override the entry transition with the snappy curve so
          // closing always feels brisk regardless of which path opened it.
          exit={{
            opacity: 0,
            y: 24,
            height: 0,
            marginTop: 0,
            marginBottom: 0,
            transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
          }}
          transition={entryTransition}
          style={{ overflow: "hidden" }}
        >
    <Stepper
      initialStep={1}
      backButtonText={t("helpStepper.back")}
      nextButtonText={t("helpStepper.next")}
      onFinalStepCompleted={onClose}
      style={{ marginTop: "0.5rem", marginBottom: "3rem" }}
    >
      {/* ── Step 1 — Launch Salt ────────────────────────────────────── */}
      <Step>
        <span style={labelStyle}>{t("helpStepper.step1.label")}</span>
        <h3 style={headingStyle}>{t("helpStepper.step1.heading")}</h3>
        <p style={bodyStyle}>
          <Trans
            i18nKey="helpStepper.step1.body"
            ns="challenge"
            components={{
              l1: (
                <a
                  href={LAUNCH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="accent-link"
                />
              ),
            }}
          />
        </p>
      </Step>

      {/* ── Step 2 — Methods ────────────────────────────────────────── */}
      <Step>
        <span style={labelStyle}>{t("helpStepper.step2.label")}</span>
        <h3 style={headingStyle}>{t("helpStepper.step2.heading")}</h3>
        <p style={bodyStyle}>{t("helpStepper.step2.body")}</p>
      </Step>

      {/* ── Step 3 — Agentic UI ─────────────────────────────────────── */}
      <Step>
        <span style={labelStyle}>{t("helpStepper.step3.label")}</span>
        <h3 style={headingStyle}>{t("helpStepper.step3.heading")}</h3>
        <p style={bodyStyle}>{t("helpStepper.step3.body")}</p>
      </Step>

      {/* ── Step 4 — Agentic UI Graph ───────────────────────────────── */}
      <Step>
        <span style={labelStyle}>{t("helpStepper.step4.label")}</span>
        <h3 style={headingStyle}>{t("helpStepper.step4.heading")}</h3>
        <p style={bodyStyle}>{t("helpStepper.step4.body")}</p>
      </Step>

      {/* ── Step 5 — Discovery Inventory ────────────────────────────── */}
      <Step>
        <span style={labelStyle}>{t("helpStepper.step5.label")}</span>
        <h3 style={headingStyle}>{t("helpStepper.step5.heading")}</h3>
        <p style={bodyStyle}>{t("helpStepper.step5.body")}</p>
      </Step>
    </Stepper>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
