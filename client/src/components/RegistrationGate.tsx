import { useState } from "react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useAttendee } from "@/hooks/useAttendee";

interface RegistrationGateProps {
  children: (attendee: { id: string; name: string; email: string }) => ReactNode;
}

const ERROR_COPY: Record<string, string> = {
  email_claimed: "That email is already competing. Use a different one.",
  missing_fields: "Both name and email are required.",
  not_authenticated: "Session failed to start. Refresh and try again.",
  anonymous_signin_failed:
    "Couldn't start a session. Anonymous auth may be disabled on the project.",
  attendee_fetch_failed: "Registered, but couldn't load your profile. Refresh.",
  session_lost: "Your session expired. Refresh and try again.",
  registration_failed: "Registration failed. Try again.",
};

const labelStyle = {
  display: "block",
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  color: "oklch(0.65 0.25 290)",
  marginBottom: "0.5rem",
};

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "4px",
  padding: "0.85rem 1rem",
  color: "rgba(232,232,240,0.97)",
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontSize: "0.9rem",
  outline: "none",
  transition: "border-color 0.2s, background 0.2s",
};

export default function RegistrationGate({ children }: RegistrationGateProps) {
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
          color: "rgba(200,200,220,0.45)",
        }}
      >
        Checking session…
      </div>
    );
  }

  if (status === "registered" && attendee) {
    return <>{children(attendee)}</>;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    if (!name.trim() || !email.trim()) {
      setLocalError("Both fields are required.");
      return;
    }
    setSubmitting(true);
    const result = await register(name.trim(), email.trim());
    setSubmitting(false);
    if (!result.ok) {
      setLocalError(ERROR_COPY[result.error ?? ""] ?? result.error ?? "Unknown error");
    }
  }

  const visibleError = localError ?? (error ? ERROR_COPY[error] ?? error : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        maxWidth: "440px",
        margin: "8rem auto 4rem",
        padding: "2.25rem 2rem",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "6px",
        background: "rgba(10,10,15,0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <span
        className="section-label"
        style={{ display: "block", marginBottom: "1rem" }}
      >
        Registration
      </span>
      <h2
        style={{
          fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
          fontSize: "1.65rem",
          fontWeight: 800,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          color: "rgba(232,232,240,0.97)",
          margin: "0 0 0.75rem",
        }}
      >
        Enter the Arena
      </h2>
      <p
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: "0.82rem",
          fontWeight: 300,
          lineHeight: 1.55,
          color: "rgba(200,200,220,0.75)",
          marginBottom: "1.75rem",
        }}
      >
        Your name and email lock you to this session. One registration per email — no
        second chances, no do-overs.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <label htmlFor="reg-name" style={labelStyle}>
            Name
          </label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.65 0.25 290)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
          />
        </div>
        <div>
          <label htmlFor="reg-email" style={labelStyle}>
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.65 0.25 290)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
          />
        </div>

        {visibleError && (
          <div
            style={{
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: "0.78rem",
              color: "oklch(0.7 0.2 25)",
              padding: "0.7rem 0.9rem",
              border: "1px solid oklch(0.55 0.2 25 / 0.4)",
              borderRadius: "4px",
              background: "oklch(0.4 0.15 25 / 0.15)",
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
            {submitting ? "Registering…" : "Begin"}
          </span>
        </button>
      </form>
    </motion.div>
  );
}
