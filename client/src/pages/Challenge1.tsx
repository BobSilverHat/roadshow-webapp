/**
 * Challenge 1 — Discover & Govern
 * Route: /challenge/1
 */

import WorkshopLayout from "@/components/WorkshopLayout";
import RegistrationGate from "@/components/RegistrationGate";
import ChallengePage from "@/components/ChallengePage";

export default function Challenge1() {
  return (
    <WorkshopLayout activeId="challenge-1">
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 2rem 6rem" }}>
        <RegistrationGate>
          {(attendee) => (
            <ChallengePage
              challengeId={1}
              challengeNumber="01"
              attendee={attendee}
              nextPath="/challenge/2"
              nextLabel="To Challenge 2"
            />
          )}
        </RegistrationGate>
      </div>
    </WorkshopLayout>
  );
}
