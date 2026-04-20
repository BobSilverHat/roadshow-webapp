/**
 * Challenge 1 — Discover & Govern
 * Route: /challenge/1
 *
 * Phase 2 shell: renders the RegistrationGate; once registered shows a
 * placeholder acknowledging the attendee. The full challenge UI (timer,
 * Begin button, question cards grid) lands in Phase 3.
 */

import WorkshopLayout from "@/components/WorkshopLayout";
import RegistrationGate from "@/components/RegistrationGate";
import ChallengeShellPlaceholder from "@/components/ChallengeShellPlaceholder";

export default function Challenge1() {
  return (
    <WorkshopLayout activeId="challenge-1">
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 2rem 6rem" }}>
        <RegistrationGate>
          {(attendee) => (
            <ChallengeShellPlaceholder
              challengeNumber="01"
              title="Discover & Govern"
              attendeeName={attendee.name}
            />
          )}
        </RegistrationGate>
      </div>
    </WorkshopLayout>
  );
}
