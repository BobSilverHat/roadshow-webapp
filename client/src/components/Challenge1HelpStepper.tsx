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
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontSize: "0.85rem",
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
  /** Fired when the user clicks Complete on the last step. */
  onClose: () => void;
}

export default function Challenge1HelpStepper({
  open,
  onClose,
}: Challenge1HelpStepperProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // When the stepper opens, smooth-scroll it into view, sitting
  // slightly above the vertical center of the viewport. Computed
  // manually instead of scrollIntoView({block:"center"}) so we can
  // bias it upward by SCROLL_BIAS_PX. Delay matches the motion.div
  // entrance + Stepper mount so the final layout is settled first.
  useEffect(() => {
    if (!open) return;
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

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="challenge1-help-stepper"
          ref={wrapperRef}
          // Enter: just fade + slide. Card mounts at full natural height
          // so the inner Stepper can measure its content correctly on
          // first paint — no racing height animations.
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          // Exit: collapse height so content below reflows cleanly.
          exit={{ opacity: 0, y: 24, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: "hidden" }}
        >
    <Stepper
      initialStep={1}
      backButtonText="Back"
      nextButtonText="Next"
      onFinalStepCompleted={onClose}
      style={{ marginTop: "0.5rem", marginBottom: "3rem" }}
    >
      {/* ── Step 1 — Launch Salt ────────────────────────────────────── */}
      <Step>
        <span style={labelStyle}>Step 01</span>
        <h3 style={headingStyle}>Launch the Salt Platform</h3>
        <p style={bodyStyle}>
          Open the Salt platform in a new tab, submit each flag here as
          you find it.{" "}
          <a
            href={LAUNCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="accent-link"
          >
            Launch Salt Platform →
          </a>
        </p>
      </Step>

      {/* ── Step 2 — Methods ────────────────────────────────────────── */}
      <Step>
        <span style={labelStyle}>Step 02</span>
        <h3 style={headingStyle}>How to find the answers</h3>
        <p style={bodyStyle}>
          Every question above maps to a screen Scenario 1 walked you
          through, the inventory dashboard, the agentic graph, the MCP
          and tool side-drawers, and the sortable capabilities table.
        </p>
      </Step>

      {/* ── Step 3 — Agentic UI ─────────────────────────────────────── */}
      <Step>
        <span style={labelStyle}>Step 03</span>
        <h3 style={headingStyle}>The Agentic UI</h3>
        <p style={bodyStyle}>
          Salt surfaces every MCP server an agent touches, in a
          single agentic security view. Within this page, you can find the MCP servers SALT identified within your environment, relevant details for each,
          and filter for the specific capabilities of each tool connected.
        </p>
      </Step>

      {/* ── Step 4 — Agentic UI Graph ───────────────────────────────── */}
      <Step>
        <span style={labelStyle}>Step 04</span>
        <h3 style={headingStyle}>The Agentic Security Graph</h3>
        <p style={bodyStyle}>
          The Graph view gives you a comprehensive view of each MCP server, and there respective tools/capabilities, along with the technologies and applications involved for each. 
          You'll also find an insight layer to overlay the risk, posture gaps, and sensitive data exposure.
        </p>
      </Step>

      {/* ── Step 5 — Discovery Inventory ────────────────────────────── */}
      <Step>
        <span style={labelStyle}>Step 05</span>
        <h3 style={headingStyle}>The Discovery Inventory</h3>
        <p style={bodyStyle}>
          The inventory dashboard is the high-level count of everything
          Salt finds across your API landscape. This includes each specific host, there respective api's, and any MCP related findings. Use the resources we just went over to answer the questions above. Happy hunting!

        </p>
      </Step>
    </Stepper>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
