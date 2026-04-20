/**
 * Scenario 2 Page — Posture Management
 * Design: Cyber-Noir / Dark Ops Terminal
 * Route: /scenario/2
 *
 * Walkthrough: Posture Gaps dashboard → filter to criticals → drill the gap
 * drawer → investigate the offending API → correlate to active attackers and
 * transition into the Protect workflow. Screenshots live under
 * client/public/steps/scenario2/.
 */

import { motion } from "framer-motion";
import { useLocation } from "wouter";
import WorkshopLayout from "@/components/WorkshopLayout";
import MagicRingsButton from "@/components/MagicRingsButton";
import StepSection from "@/components/StepSection";
import EvervaultCard from "@/components/EvervaultCard";
import ZoomableImage from "@/components/ZoomableImage";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.12 },
  }),
};

const bodyParagraphStyle = {
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  fontSize: "0.875rem",
  fontWeight: "300",
  lineHeight: "1.65",
  color: "rgba(200,200,220,0.85)",
  marginBottom: "1.5rem",
} as const;

const stepImageStyle = {
  width: "100%",
  height: "auto",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.08)",
  marginTop: "0.5rem",
  marginBottom: "1.5rem",
  display: "block",
} as const;

export default function Scenario2() {
  const [, navigate] = useLocation();

  return (
    <WorkshopLayout activeId="scenario-2">
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "0 2rem 6rem",
        }}
      >
        {/* ====================================================
            OVERVIEW
            ==================================================== */}
        <section id="overview" data-step-id="overview" style={{ paddingTop: "5rem", scrollMarginTop: "90px" }}>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} style={{ marginBottom: "0.75rem" }}>
            <span className="section-label">Scenario 2</span>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} style={{ marginBottom: "2rem" }}>
            <h1
              style={{
                fontFamily: "'Nostalgic Whispers', 'Barlow Condensed', serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                fontWeight: "800",
                lineHeight: "1.05",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "rgba(232,232,240,0.97)",
                margin: 0,
              }}
            >
              Posture{" "}
              <span
                style={{
                  color: "oklch(0.72 0.28 290)",
                  textShadow: "0 0 30px oklch(0.52 0.28 290 / 0.4)",
                }}
              >
                Management
              </span>
            </h1>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            <p style={bodyParagraphStyle}>
              Discovery gave you the map. Posture shows you where the cracks are. With your Agentic Security Graph
              established, Salt analyzes every MCP server, tool, and API inside it for misconfigurations, exposed
              secrets, missing authentication, and sensitive data leaking where it shouldn't — before an attacker
              turns any of it into a breach.
            </p>

            <p style={bodyParagraphStyle}>
              Not every agent carries the same blast radius. Salt's posture engine scores each finding by what the
              compromised tool can actually reach — which MCPs, which downstream APIs, which data categories — so your
              team spends its time on the{" "}
              <a href="#" className="accent-link">
                handful of agents and tools that can cause real damage
              </a>
              , not the entire backlog.
            </p>

            <p style={{ ...bodyParagraphStyle, marginBottom: "2rem" }}>
              Posture runs continuously, not at scan time. Salt tracks{" "}
              <a href="#" className="accent-link">
                compliance drift, unauthenticated MCPs, hardcoded credentials in tool configs, and sensitive data
                exposed by the capabilities behind every agent, 
              </a>
              {" "}
               as your graph evolves, so does the finding list. You see new risk the moment it appears, not at the
              next quarterly audit.
            </p>

            {/* Key objectives */}
            <EvervaultCard style={{ padding: "1.5rem", marginBottom: "2rem" }}>
              <p
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "oklch(0.65 0.25 290)",
                  marginBottom: "1rem",
                }}
              >
                Key Objectives
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "Rank every posture finding across MCPs, tools, and APIs by severity and blast radius",
                  "Expose hardcoded secrets, unauthenticated MCPs, and sensitive data leaking through tool responses",
                  "Correlate findings to the attackers actively probing those same endpoints",
                ].map((obj, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginBottom: "0.6rem",
                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      fontSize: "0.9rem",
                      fontWeight: "300",
                      lineHeight: "1.6",
                      color: "rgba(200,200,220,0.8)",
                    }}
                  >
                    <span style={{ color: "oklch(0.65 0.25 290)", flexShrink: 0, marginTop: "2px" }}>◆</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </EvervaultCard>
          </motion.div>
        </section>

        {/* ====================================================
            STEP 01 — Posture Gaps Overview
            ==================================================== */}
        <StepSection stepNumber="01" title="Posture Gaps Overview" id="step-01">
          <p style={bodyParagraphStyle}>
            Open the Posture Gaps dashboard to see every policy violation across your entire Agentic Security Graph, 
            ranked by severity. <a href="#" className="accent-link">400+ gaps</a> detected here: shadow APIs, PII
            without authentication, strict-transport headers missing, MCPs exposed externally. The donut on the right
            breaks severity; the table below is the full, sortable worklist.
          </p>
          <ZoomableImage
            src="/steps/scenario2/step01-posture-gaps.png"
            alt="Posture Gaps dashboard — severity breakdown and full gap list"
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            Not sure where to start? Ask Pepper AI, {" "}
            <a href="#" className="accent-link">"What APIs have the highest risk score?"</a>, {" "}and Pepper surfaces a
            ranked list of the APIs contributing the most exposure, pulled live from the same graph data. Natural
            language in, prioritized triage out.
          </p>
          <ZoomableImage
            src="/steps/scenario2/step01-pepper-ai.png"
            alt="Pepper AI answering which APIs have the highest risk score"
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 02 — Filter to What Matters
            ==================================================== */}
        <StepSection stepNumber="02" title="Filter to What Matters" id="step-02">
          <p style={bodyParagraphStyle}>
            400+ findings can be alot to digest. Filter it. Here we narrow to{" "}
            <a href="#" className="accent-link">
              MCP servers exposed externally returning sensitive data
            </a>{" "}
            and{" "}
            <a href="#" className="accent-link">exposed hardcoded secrets</a>, {" "}two critical-only policies, collapsing
            the list to 28 items you can actually take action on this week. Every filter condition is a Salt policy primitive,
            so the filtered worklist is also a saved query you can re-run any time.
          </p>
          <ZoomableImage
            src="/steps/scenario2/step02-filter.png"
            alt="Posture Gaps filtered to externally-exposed MCPs and hardcoded secrets"
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 03 — The Posture Gap Drawer
            ==================================================== */}
        <StepSection stepNumber="03" title="The Posture Gap Drawer" id="step-03">
          <p style={bodyParagraphStyle}>
            Click any posture gap to open its side-drawer. The{" "}
            <a href="#" className="accent-link">Description</a> explains what's wrong in plain language; the{" "}
            <a href="#" className="accent-link">Remediation Suggestion</a> is a concrete action list, disable external
            access, apply authentication, sanitize responses. API Details pins the exact endpoint that triggered the
            finding.
          </p>
          <ZoomableImage
            src="/steps/scenario2/step03-drawer-full.png"
            alt="Posture gap side drawer — full view"
            style={stepImageStyle}
          />
          <ZoomableImage
            src="/steps/scenario2/step03-remediation.png"
            alt="Description, Remediation Suggestion, and API Details"
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            Scroll for the <a href="#" className="accent-link">Policy Conditions</a>, {" "} the exact rule Salt matched
            (Technology IS MCP AND Internal/External IS External AND Response Content WITH Sensitive Parameter IS
            True), and <a href="#" className="accent-link">Evidence</a>: the actual parameter samples proving the
            violation, including phone numbers and email addresses pulled from live response content.
          </p>
          <ZoomableImage
            src="/steps/scenario2/step03-conditions-evidence.png"
            alt="Policy Conditions rule construction and Evidence parameter samples"
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 04 — Investigate the API
            ==================================================== */}
        <StepSection stepNumber="04" title="Investigate the API" id="step-04">
          <p style={bodyParagraphStyle}>
            Click the API link inside the side-drawer to pivot from the posture finding into the full{" "}
            <a href="#" className="accent-link">API investigation</a>, {" "} where Salt keeps everything it knows about
            that specific endpoint.
          </p>
          <ZoomableImage
            src="/steps/scenario2/step04-investigate-link.png"
            alt="Navigation arrow from the gap drawer into the API details"
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            The API Overview opens on a radar plotting all five risk dimensions with a single{" "}
            <a href="#" className="accent-link">composite score of 8.4 (HIGH)</a>. Pepper AI auto-summarizes what the
            endpoint actually does: retrieves Stripe order details via MCP, authenticated, returning email, phone, and
            payment card data. No spec hunting.
          </p>
          <ZoomableImage
            src="/steps/scenario2/step04-api-overview.png"
            alt="API Overview — risk radar and Pepper AI summary"
            style={stepImageStyle}
          />
          <ZoomableImage
            src="/steps/scenario2/step04-pepper-summary.png"
            alt="Pepper AI summary of the API — purpose, data, protocol"
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            <a href="#" className="accent-link">Data &amp; Structure → Sensitive Data</a> lists every parameter
            returning sensitive content, access tokens in request headers, emails and phone numbers in response
            bodies, IP addresses forwarded, with data-type tags so you can see exactly what's leaking and where.
          </p>
          <ZoomableImage
            src="/steps/scenario2/step04-sensitive-data.png"
            alt="Sensitive Data tab — parameters carrying sensitive content"
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            The <a href="#" className="accent-link">Details</a> tab carries the full metadata: source, labels, auth
            type, content type, MCP technology tags, activity timeline, and extended metadata, all the context an
            investigator needs without leaving the view.
          </p>
          <ZoomableImage
            src="/steps/scenario2/step04-api-details.png"
            alt="API Details tab — full metadata and activity"
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            STEP 05 — Attacker Correlation
            ==================================================== */}
        <StepSection stepNumber="05" title="Attacker Correlation" id="step-05">
          <p style={bodyParagraphStyle}>
            Posture tells you what's exposed. <a href="#" className="accent-link">Attackers</a> tells you who's
            already probing it. The Attackers tab on the API drawer correlates every adversary that has touched this
            exact endpoint, with severity, risk type (Broken User Auth, Parameter Tampering, Security Misconfig,
            Injection), status, and detection time.
          </p>
          <ZoomableImage
            src="/steps/scenario2/step05-attackers.png"
            alt="Attackers tab — correlated adversaries against this API"
            style={stepImageStyle}
          />
          <p style={bodyParagraphStyle}>
            Click through to Protect for the full attacker profile: categorized{" "}
            <a href="#" className="accent-link">risk types</a>, most-attacked APIs, server-response distribution, and
            a timeline of every attempt. This is where posture management hands off to runtime protection, the
            subject of the next scenario.
          </p>
          <ZoomableImage
            src="/steps/scenario2/step05-protect.png"
            alt="Attacker detail inside Protect — full adversary profile"
            style={stepImageStyle}
          />
        </StepSection>

        {/* ====================================================
            SUMMARY
            ==================================================== */}
        <section id="summary" data-step-id="summary" style={{ paddingTop: "3rem", scrollMarginTop: "90px" }}>
          <hr className="section-divider" />
          <div style={{ marginTop: "2rem", marginBottom: "3rem" }}>
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
              Summary
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
              From 480 gaps to a named adversary.
            </h2>
            <p style={bodyParagraphStyle}>
              You walked the triage path: overview the full gap list, filter to criticals, open a gap drawer for its
              conditions and evidence, pivot into the offending API to see its risk radar and sensitive-data exposure,
              and correlate it to active attackers. Posture stopped being a static scan, it became a{" "}
              <a href="#" className="accent-link">live bridge into runtime protection</a>, which is Scenario 3.
            </p>
          </div>
        </section>

        <hr className="section-divider" />

        {/* Navigation button */}
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
            <MagicRingsButton label="Next" onClick={() => navigate("/scenario/3")} />
          </motion.div>
        </section>
      </div>
    </WorkshopLayout>
  );
}
