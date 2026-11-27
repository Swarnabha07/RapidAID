"use client";

import { useState } from "react";
import { RescueSidebar } from "@/components/rescue/rescue-sidebar";
import { RescueHeader } from "@/components/rescue/rescue-header";
import { OperationsStats } from "@/components/rescue/operations-stats";
import { LiveMap } from "@/components/rescue/live-map";
import { IncidentQueue } from "@/components/rescue/incident-queue";
import { IncidentWorkspace } from "@/components/rescue/incident-workspace";
import { TeamAllocation } from "@/components/rescue/team-allocation";
import { AcknowledgementWatch } from "@/components/rescue/acknowledgement-watch";
import { OperationalActivity } from "@/components/rescue/operational-activity";
import { QueueEmpty, QueueError, QueueLoading, QueueNotices } from "@/components/responder/queue-state";
import { RESCUE_VIEW, type RescueIncident } from "@/lib/types/rescue";
import { subscribeToRescueQueue } from "@/lib/firebase/firestore";
import { useResponderQueue } from "@/lib/hooks/use-responder-queue";
import { useNow } from "@/lib/hooks/use-now";
import { LIVE_STATE_TEXT, liveStateOf } from "@/lib/utils/responder-view";

export function RescueDashboard() {
  const { state, retry } = useResponderQueue<RescueIncident>(subscribeToRescueQueue);
  const now = useNow();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const incidents = state.items;
  const ready = state.status === "ready";
  const liveState = liveStateOf(state);
  // Derived, never stored: falls back to the first incident when the selection disappears.
  const selected = incidents.find((i) => i.id === selectedId) ?? incidents[0] ?? null;

  return (
    <div className="flex min-h-screen bg-ink">
      <RescueSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <RescueHeader liveState={liveState} />

        <main className="flex-1 space-y-4 p-4 sm:p-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">{RESCUE_VIEW.pageTitle}</h1>
            <p className="mt-0.5 text-[13px] text-text-inverse-muted">
              {RESCUE_VIEW.pageSubtitle} · {LIVE_STATE_TEXT[liveState]}
            </p>
          </div>

          <QueueNotices fromCache={ready && state.fromCache} truncated={state.truncated} skipped={state.skipped} />

          <OperationsStats incidents={incidents} loaded={ready} now={now} />

          {state.status === "loading" && <QueueLoading label="rescue reports" />}
          {state.status === "error" && <QueueError error={state.error} onRetry={retry} />}
          {ready && incidents.length === 0 && <QueueEmpty label="rescue" />}

          {ready && incidents.length > 0 && (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  <LiveMap incidents={incidents} selected={selected} onSelect={setSelectedId} loaded={ready} />
                  <IncidentQueue
                    incidents={incidents}
                    selectedId={selected?.id ?? null}
                    onSelect={(incident) => setSelectedId(incident.id)}
                    now={now}
                  />
                </div>

                <div className="lg:col-span-1">
                  {selected && <IncidentWorkspace key={selected.id} incident={selected} />}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <TeamAllocation incidents={incidents} />
                <AcknowledgementWatch incidents={incidents} now={now} />
                <OperationalActivity incidents={incidents} />
              </div>
            </>
          )}

          <p className="text-center text-[11px] text-text-inverse-muted/60">
            Restricted operations / Server-checked roles only / People decide; RapidAID does not dispatch or notify
          </p>
        </main>
      </div>
    </div>
  );
}
