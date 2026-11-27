"use client";

import { useEffect, useMemo, useState } from "react";
import { CitizenHeader } from "@/components/citizen/citizen-header";
import { EmergencyCtaCard } from "@/components/citizen/emergency-cta-card";
import { QuickStartSection } from "@/components/citizen/quick-start-section";
import { ReportForm } from "@/components/citizen/report-form";
import { RequestHistorySection } from "@/components/citizen/request-history-section";
import { BePreparedSection } from "@/components/citizen/be-prepared-section";
import { CitizenFooter } from "@/components/citizen/citizen-footer";
import { RoleGate } from "@/components/layout/RoleGate";
import { useAuth } from "@/lib/firebase/auth";
import {
  retryFailedSubmissions,
  retrySubmission,
  subscribeToUserRequests,
} from "@/lib/firebase/firestore";
import { useSubmissions } from "@/lib/hooks/use-submissions";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import type { ReportCategory } from "@/lib/constants/report";
import type { CitizenRequest } from "@/lib/types/citizen-request";
import { mergeFailedSubmissions, summarizeSync } from "@/lib/utils/report-sync";

export default function CitizenDashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CitizenRequest[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  // True while the latest snapshot is only the local cache (no server confirmation yet).
  const [fromCache, setFromCache] = useState(true);
  const [prefill, setPrefill] = useState<{ category: ReportCategory; nonce: number } | null>(null);

  const online = useOnlineStatus();
  const submissions = useSubmissions();

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUserRequests(
      user.uid,
      (userRequests, meta) => {
        setRequests(userRequests);
        setFromCache(meta ? meta.fromCache : true);
        setHasLoaded(true);
      },
      (err) => {
        console.warn("subscribeToUserRequests in CitizenDashboardPage:", err);
        // Never claim "all sent" when the list could not be loaded.
        setFromCache(true);
        setHasLoaded(true);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const failedCount = submissions.filter((s) => s.state === "failed").length;
  const syncSummary = useMemo(
    () =>
      summarizeSync({
        loaded: hasLoaded,
        online,
        fromCache,
        requests,
        failedCount,
      }),
    [hasLoaded, online, fromCache, requests, failedCount],
  );
  const historyRows = useMemo(
    () => mergeFailedSubmissions(requests, submissions),
    [requests, submissions],
  );

  const handleAddDetails = (category: ReportCategory) => {
    setPrefill({ category, nonce: Date.now() });
    document.getElementById("report-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <RoleGate allowedRoles={["victim", "admin"]}>
      <div className="flex min-h-screen flex-col bg-subtle">
        <CitizenHeader syncSummary={syncSummary} />

        <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-5 py-8 sm:px-6 sm:py-10">
          <EmergencyCtaCard
            syncSummary={syncSummary}
            onRetryFailed={() => retryFailedSubmissions()}
          />
          <QuickStartSection onAddDetails={handleAddDetails} />
          <ReportForm prefill={prefill} />
          <RequestHistorySection
            requests={hasLoaded ? historyRows : undefined}
            online={online}
            onRetry={(id) => retrySubmission(id)}
          />
          <BePreparedSection />
        </main>

        <CitizenFooter />
      </div>
    </RoleGate>
  );
}
