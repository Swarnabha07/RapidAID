"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { OperationsOverview } from "@/components/dashboard/operations-overview";
import { IncidentQueue } from "@/components/dashboard/incident-queue";
import { FieldMap } from "@/components/dashboard/field-map";
import { EscalationWatch } from "@/components/dashboard/escalation-watch";
import { ActivityTrail } from "@/components/dashboard/activity-trail";
import { IncidentDetailPanel } from "@/components/dashboard/incident-detail-panel";
import { QueueEmpty, QueueError, QueueLoading, QueueNotices } from "@/components/responder/queue-state";
import type { Incident } from "@/lib/types/incident";
import { subscribeToMedicalQueue } from "@/lib/firebase/firestore";
import { useResponderQueue } from "@/lib/hooks/use-responder-queue";
import { useNow } from "@/lib/hooks/use-now";
import { liveStateOf } from "@/lib/utils/responder-view";

export function MedicalDashboard() {
  const { state, retry } = useResponderQueue<Incident>(subscribeToMedicalQueue);
  const now = useNow();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const incidents = state.items;
  const ready = state.status === "ready";
  // Derived, never stored: falls back to the first incident when the selection disappears.
  const selected = incidents.find((i) => i.id === selectedId) ?? incidents[0] ?? null;

  return (
    <div className="flex min-h-screen bg-ink">
      <DashboardSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader liveState={liveStateOf(state)} />

        <main className="flex-1 space-y-4 p-4 sm:p-6">
          <QueueNotices fromCache={ready && state.fromCache} truncated={state.truncated} skipped={state.skipped} />

          <OperationsOverview incidents={incidents} loaded={ready} now={now} />

          {state.status === "loading" && <QueueLoading label="medical reports" />}
          {state.status === "error" && <QueueError error={state.error} onRetry={retry} />}
          {ready && incidents.length === 0 && <QueueEmpty label="medical" />}

          {ready && incidents.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <IncidentQueue
                  incidents={incidents}
                  selectedId={selected?.id ?? null}
                  onSelect={(incident) => setSelectedId(incident.id)}
                  now={now}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldMap incidents={incidents} selected={selected} onSelect={setSelectedId} loaded={ready} />
                  <EscalationWatch incident={selected} now={now} />
                </div>

                <ActivityTrail incidents={incidents} />
              </div>

              <div className="lg:col-span-1">
                {selected && <IncidentDetailPanel key={selected.id} incident={selected} />}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
