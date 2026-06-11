/**
 * Introduction Page — Salt Security Agentic Workshop
 * Design: Cyber-Noir / Dark Ops Terminal
 * Route: /
 */

import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation, Trans } from "react-i18next";
import WorkshopLayout from "@/components/WorkshopLayout";
import MagicRingsButton from "@/components/MagicRingsButton";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1 },
  }),
};

export default function Home() {
  const [, navigate] = useLocation();
  const { t } = useTranslation("home");

  return (
    <WorkshopLayout activeId="introduction">
      <div
        style={{
          maxWidth: "880px",
          margin: "0 auto",
          padding: "0 1.5rem 6rem",
        }}
      >
        {/* ====================================================
            HERO SECTION
            ==================================================== */}
        <section style={{ paddingTop: "5rem", textAlign: "center" }}>
          {/* WELCOME label */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            style={{ marginBottom: "1.5rem" }}
          >
            <span className="section-label">{t("welcomeLabel")}</span>
          </motion.div>

          {/* Hero headline */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            style={{ marginBottom: "2.5rem" }}
          >
            <h1
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                fontWeight: "800",
                lineHeight: "1.05",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: "var(--foreground)",
                margin: 0,
              }}
            >
              {t("headline1")}
            </h1>
            <h1
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                fontWeight: "800",
                fontStyle: "italic",
                lineHeight: "1.05",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: "var(--color-accent-text-bright)",
                margin: 0,
                textShadow: "0 0 40px oklch(0.52 0.28 290 / 0.5)",
              }}
            >
              {t("headline2")}
            </h1>
          </motion.div>

          {/* OVERVIEW label */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            style={{ marginBottom: "1.75rem" }}
          >
            <span className="section-label">{t("overviewLabel")}</span>
          </motion.div>

          {/* Body paragraphs */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
          >
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1rem",
                fontWeight: "300",
                lineHeight: "1.65",
                color: "var(--muted-foreground)",
                textAlign: "center",
                marginBottom: "1.75rem",
              }}
            >
              <Trans i18nKey="p1" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
                Your agents are performing actions with APIs and MCP servers you don't know exist. Salt secures all of it, from code to runtime. An AI Agent is like a digital employee. And like any employee, what matters isn't what they think. <l1>It's what they do.</l1>
              </Trans>
            </p>

            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1rem",
                fontWeight: "300",
                lineHeight: "1.65",
                color: "var(--muted-foreground)",
                textAlign: "center",
                marginBottom: "1.75rem",
              }}
            >
              <Trans i18nKey="p2" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
                Visibility isn't enough, you need context. While most AI security stops at the model, attackers don't. Not every agent carries the same risk. Salt's Agentic Security platform contextualizes risk across your entire environment, <l1>separating the agents that can cause real damage from those that cannot.</l1>
              </Trans>
            </p>

            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1rem",
                fontWeight: "300",
                lineHeight: "1.65",
                color: "var(--muted-foreground)",
                textAlign: "center",
                marginBottom: "2rem",
              }}
            >
              <Trans i18nKey="p3" t={t} components={{ l1: <a href="#" className="accent-link" /> }}>
                In this hands-on workshop, you will walk through three scenarios following a simple progression: <l1>Agentic Discovery → Posture Management → Runtime Protection</l1>.
              </Trans>
            </p>

            {/* Bullet list */}
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 2rem",
                textAlign: "left",
              }}
            >
              {(t("bullets", { returnObjects: true }) as { label: string; body: string }[]).map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.95rem",
                    fontWeight: "300",
                    lineHeight: "1.65",
                    color: "var(--muted-foreground)",
                  }}
                >
                  <span style={{ color: "var(--color-accent-text)", marginTop: "2px", flexShrink: 0 }}>•</span>
                  <span>
                    <a href="#" className="accent-link">
                      {item.label}
                    </a>{" "}
                    {item.body}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </section>

        <hr className="section-divider" />

        {/* ====================================================
            SALT ACCESS CTA
            ==================================================== */}
        <section style={{ paddingTop: "1rem", textAlign: "center" }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: "800",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                margin: "0 0 2rem",
              }}
            >
              <span style={{ color: "var(--foreground)" }}>{t("saltAccessHeading1")}</span>
              <span
                style={{
                  color: "var(--color-accent-text-bright)",
                  textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.5)",
                }}
              >
                {t("saltAccessHeading2")}
              </span>
            </h2>

            <button
              className="btn-salt-primary"
              style={{ borderRadius: "2px" }}
              onClick={() =>
                window.open("https://salt-labs.secured-api.com", "_blank", "noopener,noreferrer")
              }
            >
              <span style={{ position: "relative", zIndex: 1 }}>{t("launchButton")}</span>
            </button>
          </motion.div>
        </section>

        <hr className="section-divider" />

        {/* ====================================================
            NAVIGATION BUTTON — Begin
            ==================================================== */}
        <section
          style={{
            paddingTop: "1rem",
            paddingBottom: "4rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <MagicRingsButton label={t("beginButton")} onClick={() => navigate("/scenario/1")} />
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
