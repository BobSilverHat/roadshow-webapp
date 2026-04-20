/**
 * StepSection — reusable section wrapper for a single step inside a scenario
 * page. Renders a hairline divider, a small `STEP / 0X` label, a heading, and
 * the step body.
 *
 * Each section carries `id` + `data-step-id` attributes so the WorkshopLayout
 * sidebar can scroll-spy to highlight the step currently in view.
 */
import type { ReactNode } from "react";

interface StepSectionProps {
  stepNumber: string;
  title: string;
  id: string;
  children: ReactNode;
}

export default function StepSection({ stepNumber, title, id, children }: StepSectionProps) {
  return (
    <section
      id={id}
      data-step-id={id}
      style={{
        paddingTop: "3rem",
        scrollMarginTop: "90px",
      }}
    >
      <hr className="section-divider" />
      <div style={{ marginTop: "2rem", marginBottom: "3.5rem" }}>
        <span
          style={{
            display: "block",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.72rem",
            fontWeight: "700",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(200,200,220,0.78)",
            marginBottom: "1.25rem",
          }}
        >
          Step / {stepNumber}
        </span>
        <h2
          style={{
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: "1.35rem",
            fontWeight: "500",
            lineHeight: "1.3",
            color: "rgba(232,232,240,0.97)",
            margin: "0 0 1.5rem",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
