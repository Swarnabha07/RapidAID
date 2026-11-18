"use client";

import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { OperationsOverview } from "@/components/dashboard/operations-overview";
import { IncidentQueue } from "@/components/dashboard/incident-queue";
import { FieldMap } from "@/components/dashboard/field-map";
import { EscalationWatch } from "@/components/dashboard/escalation-watch";
import { ActivityTrail } from "@/components/dashboard/activity-trail";
import { IncidentDetailPanel } from "@/components/dashboard/incident-detail-panel";
import { INCIDENTS, type Incident } from "@/lib/types/incident";
import { subscribeToMedicalQueue } from "@/lib/firebase/firestore";

export function MedicalDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>(INCIDENTS);
  const [selectedId, setSelectedId] = useState<string>(INCIDENTS[0].id);

  useEffect(() => {
    const unsubscribe = subscribeToMedicalQueue(
      (liveIncidents) => {
        if (liveIncidents && liveIncidents.length > 0) {
          setIncidents(liveIncidents);
          setSelectedId((prev) => {
            if (prev && liveIncidents.some((i) => i.id === prev)) {
              return prev;
            }
            return liveIncidents[0].id;
          });
        } else {
          // Fallback to initial mock data if queue in Firestore is empty
          setIncidents(INCIDENTS);
          setSelectedId((prev) => prev || INCIDENTS[0].id);
        }
      },
      (err) => {
        console.warn("subscribeToMedicalQueue listener warning:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  const selected = incidents.find((i) => i.id === selectedId) ?? incidents[0];

  function updateSelected(patch: Partial<Incident>) {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === selectedId ? { ...inc, ...patch } : inc))
    );
  }

  return (
    <div className="flex min-h-screen bg-ink">
      <DashboardSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader />

        <main className="flex-1 space-y-4 p-4 sm:p-6">
          <OperationsOverview />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <IncidentQueue
                incidents={incidents}
                selectedId={selected.id}
                onSelect={(incident) => setSelectedId(incident.id)}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldMap selected={selected} />
                <EscalationWatch incident={selected} />
              </div>

              <ActivityTrail />
            </div>

            <div className="lg:col-span-1">
              <IncidentDetailPanel incident={selected} onUpdate={updateSelected} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
