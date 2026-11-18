"use client";

import { useEffect, useState } from "react";
import { RescueSidebar } from "@/components/rescue/rescue-sidebar";
import { RescueHeader } from "@/components/rescue/rescue-header";
import { RoleViewTabs } from "@/components/rescue/role-view-tabs";
import { OperationsStats } from "@/components/rescue/operations-stats";
import { LiveMap } from "@/components/rescue/live-map";
import { IncidentQueue } from "@/components/rescue/incident-queue";
import { IncidentWorkspace } from "@/components/rescue/incident-workspace";
import { TeamAllocation } from "@/components/rescue/team-allocation";
import { AcknowledgementWatch } from "@/components/rescue/acknowledgement-watch";
import { OperationalActivity } from "@/components/rescue/operational-activity";
import { ROLE_VIEWS, type RescueIncident, type RoleViewConfig } from "@/lib/types/rescue";
import { subscribeToRescueQueue } from "@/lib/firebase/firestore";

export function RescueDashboard() {
  const [roleKey, setRoleKey] = useState<RoleViewConfig["key"]>("rescue");
  const [incidentsByRole, setIncidentsByRole] = useState(() =>
    Object.fromEntries(ROLE_VIEWS.map((v) => [v.key, v.incidents]))
  );
  const [selectedId, setSelectedId] = useState<string>(ROLE_VIEWS[0].incidents[0].id);

  useEffect(() => {
    const unsubscribe = subscribeToRescueQueue(
      (liveIncidents) => {
        if (liveIncidents && liveIncidents.length > 0) {
          setIncidentsByRole((prev) => ({
            ...prev,
            rescue: liveIncidents,
          }));
          setSelectedId((prev) => {
            if (prev && liveIncidents.some((i) => i.id === prev)) {
              return prev;
            }
            return liveIncidents[0].id;
          });
        }
      },
      (err) => {
        console.warn("subscribeToRescueQueue listener warning:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  const baseView = ROLE_VIEWS.find((v) => v.key === roleKey)!;
  const view: RoleViewConfig = { ...baseView, incidents: incidentsByRole[roleKey] };
  const selected: RescueIncident =
    view.incidents.find((i) => i.id === selectedId) ?? view.incidents[0];

  function handleRoleChange(key: RoleViewConfig["key"]) {
    setRoleKey(key);
    const nextView = ROLE_VIEWS.find((v) => v.key === key)!;
    setSelectedId(nextView.incidents[0].id);
  }

  function updateSelected(patch: Partial<RescueIncident>) {
    setIncidentsByRole((prev) => ({
      ...prev,
      [roleKey]: prev[roleKey].map((inc) =>
        inc.id === selected.id ? { ...inc, ...patch } : inc
      ),
    }));
  }

  return (
    <div className="flex min-h-screen bg-ink">
      <RescueSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <RescueHeader />

        <main className="flex-1 space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">{view.pageTitle}</h1>
              <p className="mt-0.5 text-[13px] text-text-inverse-muted">
                {view.pageSubtitle} · Synchronized live
              </p>
            </div>
            <RoleViewTabs activeKey={roleKey} onChange={handleRoleChange} />
          </div>

          <OperationsStats view={view} />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <LiveMap view={view} selected={selected} />
              <IncidentQueue
                view={view}
                selectedId={selected.id}
                onSelect={(incident) => setSelectedId(incident.id)}
              />
            </div>

            <div className="lg:col-span-1">
              <IncidentWorkspace view={view} incident={selected} onUpdate={updateSelected} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TeamAllocation view={view} />
            <AcknowledgementWatch view={view} />
            <OperationalActivity view={view} />
          </div>

          <p className="text-center text-[11px] text-text-inverse-muted/60">
            Restricted operations / Backend-authorized roles only / AI estimates inform, people decide
          </p>
        </main>
      </div>
    </div>
  );
}
