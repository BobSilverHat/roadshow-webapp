/**
 * Challenge 2 — Protect
 * Route: /challenge/2
 */

import WorkshopLayout from "@/components/WorkshopLayout";
import RegistrationGate from "@/components/RegistrationGate";
import ChallengePage from "@/components/ChallengePage";

export default function Challenge2() {
  return (
    <WorkshopLayout activeId="challenge-2">
      <div style={{ maxWidth: "1360px", margin: "0 auto", padding: "0 2rem 6rem" }}>
        <RegistrationGate>
          {(attendee) => (
            <ChallengePage
              challengeId={2}
              challengeNumber="02"
              attendee={attendee}
              nextPath="/completed"
              nextLabel="Finish"
            />
          )}
        </RegistrationGate>
      </div>
    </WorkshopLayout>
  );
}
