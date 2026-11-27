"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { RESCUE_VIEW, type RescueIncident } from "@/lib/types/rescue";
import { agoLabel, isResolved } from "@/lib/utils/responder-view";

const URGENCY_CLASS: Record<string, string> = {
  Critical: "text-[#ff8a8d]",
  High: "text-[#ffb36b]",
  Normal: "text-[#e8cb57]",
};

const SELECT_CLASS =
  "h-8 rounded-md border border-white/10 bg-ink-raised px-2.5 text-[12px] text-text-inverse-muted hover:text-white focus:outline-none focus:ring-1 focus:ring-brand-blue";

type PriorityFilter = "all" | "Critical" | "High" | "Normal";
type StatusFilter = "all" | "open" | "resolved";

export function IncidentQueue({
  incidents,
  selectedId,
  onSelect,
  now,
}: {
  incidents: RescueIncident[];
  selectedId: string | null;
  onSelect: (incident: RescueIncident) => void;
  now: number;
}) {
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(
    () =>
      incidents.filter(
        (i) =>
          (priority === "all" || i.urgency === priority) &&
          (status === "all" || (status === "resolved" ? isResolved(i) : !isResolved(i)))
      ),
    [incidents, priority, status]
  );

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-white">{RESCUE_VIEW.queueTitle}</h2>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-text-inverse-muted">
            {filtered.length} shown
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="rescue-priority-filter">Filter by urgency</label>
          <select
            id="rescue-priority-filter"
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityFilter)}
            className={SELECT_CLASS}
          >
            <option value="all">All urgencies</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
          </select>
          <label className="sr-only" htmlFor="rescue-status-filter">Filter by status</label>
          <select
            id="rescue-status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className={SELECT_CLASS}
          >
            <option value="all">All incidents</option>
            <option value="open">Open incidents</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-text-inverse-muted/70">
              <th className="px-4 py-2.5 font-medium">Incident</th>
              <th className="px-3 py-2.5 font-medium">Location</th>
              <th className="px-3 py-2.5 font-medium">People</th>
              <th className="px-3 py-2.5 font-medium">Reported urgency</th>
              <th className="px-3 py-2.5 font-medium">Reported</th>
              <th className="px-3 py-2.5 font-medium">Unit</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((incident) => (
              <tr
                key={incident.id}
                onClick={() => onSelect(incident)}
                className={cn(
                  "cursor-pointer border-t border-white/5 text-[13.5px] transition-colors",
                  selectedId === incident.id ? "bg-brand-blue/10" : "hover:bg-white/5"
                )}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{incident.id}</p>
                  <p className="text-[12px] text-text-inverse-muted">{incident.title}</p>
                </td>
                <td className="px-3 py-3 text-text-inverse-muted">{incident.location}</td>
                <td className="px-3 py-3 text-white/80">{String(incident.people).padStart(2, "0")}</td>
                <td className={cn("px-3 py-3 font-medium", URGENCY_CLASS[incident.urgency])}>
                  {incident.urgency}
                  {incident.isSOS && <span className="ml-1.5 text-[11px] text-[#ff8a8d]">SOS</span>}
                </td>
                <td className="px-3 py-3 text-text-inverse-muted">{agoLabel(incident.createdAtMs, now)}</td>
                <td className="px-3 py-3 text-text-inverse-muted">{incident.unit ?? "Unassigned"}</td>
                <td className="px-3 py-3 text-white/80">{incident.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="border-t border-white/5 px-4 py-6 text-center text-[13px] text-text-inverse-muted">
          No incidents match these filters.
        </p>
      )}

      {/* Mobile / tablet cards */}
      <div className="divide-y divide-white/5 xl:hidden">
        {filtered.map((incident) => (
          <button
            key={incident.id}
            onClick={() => onSelect(incident)}
            className={cn(
              "flex w-full flex-col gap-1.5 p-4 text-left transition-colors",
              selectedId === incident.id ? "bg-brand-blue/10" : "hover:bg-white/5"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-white">{incident.id}</p>
              <span className={cn("text-[13px] font-medium", URGENCY_CLASS[incident.urgency])}>
                {incident.urgency}
                {incident.isSOS ? " · SOS" : ""}
              </span>
            </div>
            <p className="text-[13px] text-white/80">{incident.title}</p>
            <p className="text-[12px] text-text-inverse-muted">
              {incident.location} · {String(incident.people).padStart(2, "0")} people
            </p>
            <div className="flex items-center justify-between text-[12px] text-text-inverse-muted">
              <span>{incident.unit ?? "Unassigned"}</span>
              <span>{incident.status}</span>
            </div>
          </button>
        ))}
      </div>

      <p className="border-t border-white/10 px-4 py-3 text-[12px] text-text-inverse-muted">
        Showing {filtered.length} of {incidents.length} loaded incidents, sorted by urgency then newest. Urgency is as
        reported, raised only by a recorded escalation; responders make operational decisions.
      </p>
    </div>
  );
}
