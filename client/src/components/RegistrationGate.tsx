import { useState } from "react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAttendee } from "@/hooks/useAttendee";

interface RegistrationGateProps {
  children: (attendee: { id: string; name: string; email: string }) => ReactNode;
}

const labelStyle = {
  display: "block",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  color: "var(--color-accent-text)",
  marginBottom: "0.5rem",
};

const inputStyle = {
  width: "100%",
  background: "oklch(from var(--card) l c h / 0.5)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  padding: "0.85rem 1rem",
  color: "var(--foreground)",
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontSize: "0.9rem",
  outline: "none",
  transition: "border-color 0.2s, background 0.2s",
};

export default function RegistrationGate({ children }: RegistrationGateProps) {
  const { t } = useTranslation("challenge");
  const { status, attendee, error, register } = useAttendee();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "60vh",
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
        {t("registration.sessionLoading")}
      </div>
    );
  }

  if (status === "registered" && attendee) {
    return <>{children(attendee)}</>;
  }

  function resolveError(code: string): string {
    const key = `registration.error.${code}` as const;
    const resolved = t(key);
    // If the key was not found, i18next returns the key itself — fall back to
    // the raw code so novel server errors still surface instead of silently swallowing.
    return resolved === key ? code : resolved;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    if (!name.trim() || !email.trim()) {
      setLocalError(t("registration.fieldRequired"));
      return;
    }
    setSubmitting(true);
    const result = await register(name.trim(), email.trim());
    setSubmitting(false);
    if (!result.ok) {
      setLocalError(resolveError(result.error ?? "unknown"));
    }
  }

  const visibleError = localError ?? (error ? resolveError(error) : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        maxWidth: "440px",
        margin: "8rem auto 4rem",
        padding: "2.25rem 2rem",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        background: "oklch(from var(--background) l c h / 0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <span
        className="section-label"
        style={{ display: "block", marginBottom: "1rem" }}
      >
        {t("registration.sectionLabel")}
      </span>
      <h2
        style={{
          fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
          fontSize: "1.65rem",
          fontWeight: 800,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          color: "var(--foreground)",
          margin: "0 0 0.75rem",
        }}
      >
        {t("registration.heading")}
      </h2>
      <p
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.82rem",
          fontWeight: 300,
          lineHeight: 1.55,
          color: "var(--muted-foreground)",
          marginBottom: "1.75rem",
        }}
      >
        {t("registration.body")}
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <label htmlFor="reg-name" style={labelStyle}>
            {t("registration.labelName")}
          </label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent-text)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </div>
        <div>
          <label htmlFor="reg-email" style={labelStyle}>
            {t("registration.labelEmail")}
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent-text)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </div>

        {visibleError && (
          <div
            style={{
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: "0.78rem",
              color: "var(--color-time-up)",
              padding: "0.7rem 0.9rem",
              border: "1px solid oklch(from var(--color-time-up) l c h / 0.4)",
              borderRadius: "4px",
              background: "oklch(from var(--color-time-up) l c h / 0.15)",
            }}
          >
            {visibleError}
          </div>
        )}

        <button
          type="submit"
          className="btn-salt-primary"
          disabled={submitting}
          style={{
            cursor: submitting ? "wait" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          <span style={{ position: "relative", zIndex: 1 }}>
            {submitting ? t("registration.buttonSubmitting") : t("registration.buttonBegin")}
          </span>
        </button>
      </form>
    </motion.div>
  );
}
