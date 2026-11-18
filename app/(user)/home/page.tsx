"use client";

import { useEffect, useState } from "react";
import { CitizenHeader } from "@/components/citizen/citizen-header";
import { EmergencyCtaCard } from "@/components/citizen/emergency-cta-card";
import { QuickStartSection } from "@/components/citizen/quick-start-section";
import { RequestHistorySection } from "@/components/citizen/request-history-section";
import { BePreparedSection } from "@/components/citizen/be-prepared-section";
import { CitizenFooter } from "@/components/citizen/citizen-footer";
import { RoleGate } from "@/components/layout/RoleGate";
import { useAuth } from "@/lib/firebase/auth";
import { subscribeToUserRequests } from "@/lib/firebase/firestore";
import type { CitizenRequest } from "@/lib/types/citizen-request";

export default function CitizenDashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CitizenRequest[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUserRequests(
      user.uid,
      (userRequests) => {
        setRequests(userRequests);
        setHasLoaded(true);
      },
      (err) => {
        console.warn("subscribeToUserRequests in CitizenDashboardPage:", err);
        setHasLoaded(true);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Compute pending count and last synced indicator
  const pendingCount = requests.filter((r) => r.sync === "Pending sync").length;
  const lastSyncedTime = requests[0]?.reportedLabel || "10:42 AM";

  return (
    <RoleGate allowedRoles={["victim", "admin"]}>
      <div className="flex min-h-screen flex-col bg-subtle">
        <CitizenHeader />

        <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-5 py-8 sm:px-6 sm:py-10">
          <EmergencyCtaCard
            pendingCount={pendingCount}
            lastSyncedTime={lastSyncedTime}
          />
          <QuickStartSection />
          <RequestHistorySection
            requests={hasLoaded ? requests : undefined}
          />
          <BePreparedSection />
        </main>

        <CitizenFooter />
      </div>
    </RoleGate>
  );
}
