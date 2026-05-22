/**
 * Salt Nexus — Live Attack Simulation
 * Route: /salt-nexus
 *
 * The post-challenge waypoint. Frames the McKinsey/Lilli breach as the
 * scenario behind the live attack we're about to launch, then drops the
 * attendee out to https://salt-nexus.com.
 *
 * Gated by workshop_config.nexus_open — admin flips that flag once the
 * 35-minute challenge phase wraps up. While locked, the WaitingOverlay
 * (nexus variant) covers the page with copy explaining users will get
 * access after the challenge phase completes.
 */

import { AnimatePresence, motion } from "framer-motion";
import WorkshopLayout from "@/components/WorkshopLayout";
import WaitingOverlay from "@/components/WaitingOverlay";
import { useWorkshopClock } from "@/hooks/useWorkshopClock";

const NEXUS_URL = "https://salt-nexus.com";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1 },
  }),
};

const bodyParagraph = {
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontSize: "0.9rem",
  fontWeight: 300,
  lineHeight: 1.7,
  color: "var(--muted-foreground)",
  margin: "0 0 1.25rem",
} as const;

const headingSerif = {
  fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
  fontWeight: 800,
  letterSpacing: "0.03em",
  textTransform: "uppercase" as const,
  color: "var(--foreground)",
};

const STATS = [
  { value: "3.6M", label: "Document chunks" },
  { value: "57K+", label: "User accounts" },
  { value: "46M+", label: "Chat messages" },
  { value: "22", label: "Unauthorized endpoints" },
];

export default function SaltNexus() {
  const clock = useWorkshopClock();
  const locked = !clock.nexusOpen;

  return (
    <WorkshopLayout activeId="salt-nexus">
      <div style={{ maxWidth: "740px", margin: "0 auto", padding: "0 2rem 6rem" }}>
        <section style={{ paddingTop: "4rem" }}>
          {/* Section label */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            style={{ marginBottom: "0.85rem" }}
          >
            <span className="section-label">Live Attack Simulation</span>
          </motion.div>

          {/* Hero headline: Salt [Nexus] */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            style={{
              ...headingSerif,
              fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
              lineHeight: 1.05,
              margin: "0 0 1.5rem",
            }}
          >
            Salt{" "}
            <motion.span
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
                display: "inline-block",
                color: "oklch(0.88 0.2 145)",
              }}
            >
              Nexus
            </motion.span>
          </motion.h1>

          {/* Lede */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            style={{ ...bodyParagraph, marginBottom: "2.5rem" }}
          >
            You've discovered the API surface. You've governed it. You've protected it.
            Now watch what happens when those defenses aren't in place, on a target that
            lives on the public web.
          </motion.p>

          <hr className="section-divider" style={{ marginBottom: "2.5rem" }} />

          {/* The Lilli Incident */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            style={{ marginBottom: "2.5rem" }}
          >
            <span
              className="section-label"
              style={{ display: "block", marginBottom: "0.85rem" }}
            >
              The Lilli Incident · March 2026
            </span>
            <h2
              style={{
                ...headingSerif,
                fontSize: "1.65rem",
                margin: "0 0 1rem",
              }}
            >
              McKinsey's AI Wasn't Hacked. Its APIs Were.
            </h2>
            <p style={bodyParagraph}>
              In March 2026, security researchers disclosed a significant breach of{" "}
              <span className="accent-link">Lilli</span>, McKinsey & Company's internal
              generative AI platform. An autonomous AI agent built by startup CodeWall
              compromised the system in roughly two hours.
            </p>
            <p style={bodyParagraph}>
              The attack didn't target the model. It targeted the API surface beneath
              it, inadequately secured endpoints and over-privileged access. The agent
              enumerated 22 unauthorized endpoints, leveraged a SQL injection to gain
              read/write on the production database, and walked away with the corpus
              the model was trained to query.
            </p>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0.75rem",
              marginBottom: "3rem",
            }}
          >
            {STATS.map((s) => (
              <div
                key={s.label}
                style={{
                  padding: "1.1rem 0.85rem",
                  border: "1px solid oklch(from var(--color-accent-text) l c h / 0.22)",
                  borderRadius: "4px",
                  background: "oklch(from var(--color-accent-text) l c h / 0.04)",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    color: "var(--color-accent-text-bright)",
                    textShadow: "0 0 18px oklch(0.5 0.28 290 / 0.4)",
                    lineHeight: 1,
                    marginBottom: "0.55rem",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--muted-foreground)",
                    lineHeight: 1.25,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>

          <hr className="section-divider" style={{ marginBottom: "2.5rem" }} />

          {/* Why this matters */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={5}
            style={{ marginBottom: "3rem" }}
          >
            <span
              className="section-label"
              style={{ display: "block", marginBottom: "0.85rem" }}
            >
              Why This Matters
            </span>
            <h2
              style={{
                ...headingSerif,
                fontSize: "1.65rem",
                margin: "0 0 1rem",
              }}
            >
              An API Incident Dressed as an AI Incident.
            </h2>
            <p style={bodyParagraph}>
              The model behaved exactly as designed. The walls behind it didn't. That's
              the gap Salt sits in, <span className="accent-link">discovery</span>,{" "}
              <span className="accent-link">posture</span>, and{" "}
              <span className="accent-link">runtime</span> for every interface an
              autonomous agent can reach, including the ones the platform team didn't
              know existed.
            </p>
            <p style={bodyParagraph}>
              In the next few minutes you'll see this play out live, against a sandboxed
              target. Watch the agent move, watch the endpoints light up, and watch
              what Salt catches.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={6}
            style={{ textAlign: "center", marginBottom: "1.25rem" }}
          >
            <a
              href={NEXUS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-salt-primary"
              style={{
                display: "inline-block",
                minWidth: "320px",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>
                Launch Salt Nexus →
              </span>
            </a>
          </motion.div>

          {/* Source link */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={7}
            style={{ textAlign: "center" }}
          >
            <a
              href="https://salt.security/blog/mckinsey-hack-exposed-apis"
              target="_blank"
              rel="noopener noreferrer"
              className="accent-link"
              style={{
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: "0.75rem",
              }}
            >
              Read the full breakdown · salt.security/blog/mckinsey-hack-exposed-apis →
            </a>
          </motion.div>
        </section>
      </div>

      {/* Admin gate — covers the page until nexus_open flips true. */}
      <AnimatePresence>
        {locked && <WaitingOverlay variant="nexus" />}
      </AnimatePresence>
    </WorkshopLayout>
  );
}
