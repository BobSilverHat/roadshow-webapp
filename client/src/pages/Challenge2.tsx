/**
 * Challenge 2 — Protect
 * Route: /challenge/2
 *
 * Phase 2 shell: same pattern as Challenge1.
 */

import WorkshopLayout from "@/components/WorkshopLayout";
import RegistrationGate from "@/components/RegistrationGate";
import ChallengeShellPlaceholder from "@/components/ChallengeShellPlaceholder";

export default function Challenge2() {
  return (
    <WorkshopLayout activeId="challenge-2">
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 2rem 6rem" }}>
        <RegistrationGate>
          {(attendee) => (
            <ChallengeShellPlaceholder
              challengeNumber="02"
              title="Protect"
              attendeeName={attendee.name}
            />
          )}
        </RegistrationGate>
      </div>
    </WorkshopLayout>
  );
}
