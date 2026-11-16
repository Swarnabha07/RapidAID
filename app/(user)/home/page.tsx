import { CitizenHeader } from "@/components/citizen/citizen-header";
import { EmergencyCtaCard } from "@/components/citizen/emergency-cta-card";
import { QuickStartSection } from "@/components/citizen/quick-start-section";
import { RequestHistorySection } from "@/components/citizen/request-history-section";
import { BePreparedSection } from "@/components/citizen/be-prepared-section";
import { CitizenFooter } from "@/components/citizen/citizen-footer";
import { RoleGate } from "@/components/layout/RoleGate";

export default function CitizenDashboardPage() {
  return (
    <RoleGate allowedRoles={["victim", "admin"]}>
      <div className="flex min-h-screen flex-col bg-subtle">
        <CitizenHeader />

        <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-5 py-8 sm:px-6 sm:py-10">
          <EmergencyCtaCard />
          <QuickStartSection />
          <RequestHistorySection />
          <BePreparedSection />
        </main>

        <CitizenFooter />
      </div>
    </RoleGate>
  );
}
