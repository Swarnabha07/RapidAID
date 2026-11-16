"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RescueIncident, RoleViewConfig } from "@/lib/types/rescue";

const URGENCY_CLASS: Record<string, string> = {
  Critical: "text-[#ff8a8d]",
  High: "text-[#ffb36b]",
  Medium: "text-[#e8cb57]",
};

export function IncidentQueue({
  view,
  selectedId,
  onSelect,
}: {
  view: RoleViewConfig;
  selectedId: string;
  onSelect: (incident: RescueIncident) => void;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-white">{view.queueTitle}</h2>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-text-inverse-muted">
            {view.incidents.length} shown
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-3 text-[12px] text-text-inverse-muted hover:text-white">
            All priorities <ChevronDown size={13} />
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-3 text-[12px] text-text-inverse-muted hover:text-white">
            Open incidents <ChevronDown size={13} />
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-text-inverse-muted/70">
              <th className="px-4 py-2.5 font-medium">{view.queueColumnLabel}</th>
              <th className="px-3 py-2.5 font-medium">Location</th>
              <th className="px-3 py-2.5 font-medium">People</th>
              <th className="px-3 py-2.5 font-medium">AI urgency</th>
              <th className="px-3 py-2.5 font-medium">Priority</th>
              <th className="px-3 py-2.5 font-medium">Reported</th>
              <th className="px-3 py-2.5 font-medium">Unit</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {view.incidents.map((incident) => (
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
                <td className="px-3 py-3 text-white/80">
                  {String(incident.people).padStart(2, "0")}
                </td>
                <td className={cn("px-3 py-3 font-medium", URGENCY_CLASS[incident.aiUrgency])}>
                  {incident.aiUrgency}
                </td>
                <td className={cn("px-3 py-3 font-medium", URGENCY_CLASS[incident.confirmedPriority])}>
                  {incident.confirmedPriority}
                </td>
                <td className="px-3 py-3 text-text-inverse-muted">{incident.reportedAgo}</td>
                <td className="px-3 py-3 text-text-inverse-muted">{incident.unit ?? "Unassigned"}</td>
                <td className="px-3 py-3 text-white/80">{incident.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet cards */}
      <div className="divide-y divide-white/5 xl:hidden">
        {view.incidents.map((incident) => (
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
              <span className={cn("text-[13px] font-medium", URGENCY_CLASS[incident.confirmedPriority])}>
                {incident.confirmedPriority}
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
        AI urgency is advisory. Operational priority is confirmed by a responder.{" "}
        <a href="#" className="text-brand-teal hover:underline">View all incidents →</a>
      </p>
    </div>
  );
}