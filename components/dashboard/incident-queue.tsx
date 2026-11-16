"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Incident } from "@/lib/types/incident";
import { UrgencyPill, StatusLabel } from "@/components/dashboard/status-pills";

const TABS = ["All incidents", "Critical", "High", "Unacknowledged", "In progress", "Resolved"] as const;

export function IncidentQueue({
  incidents,
  selectedId,
  onSelect,
}: {
  incidents: Incident[];
  selectedId: string;
  onSelect: (incident: Incident) => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All incidents");

  const filtered = useMemo(() => {
    switch (tab) {
      case "Critical":
        return incidents.filter((i) => i.humanPriority === "Critical");
      case "High":
        return incidents.filter((i) => i.humanPriority === "High");
      case "Unacknowledged":
        return incidents.filter((i) => !i.acknowledgedBy);
      case "In progress":
        return incidents.filter((i) => i.status === "In progress");
      case "Resolved":
        return incidents.filter((i) => i.status === "Resolved");
      default:
        return incidents;
    }
  }, [tab, incidents]);

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised">
      <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-white">Incident queue</h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-text-inverse-muted">
              {incidents.length} active
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-text-inverse-muted">
            Review, prioritize and coordinate medical response.
          </p>
        </div>
        <button className="flex h-9 w-fit items-center gap-1.5 rounded-md border border-white/10 px-3 text-[12.5px] text-text-inverse-muted hover:text-white">
          Newest reported <ChevronDown size={14} />
        </button>
      </div>

      <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-white/10 px-4 pt-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-none whitespace-nowrap rounded-t-md px-3 py-2 text-[12.5px] font-medium transition-colors",
              tab === t
                ? "border-b-2 border-brand-blue text-white"
                : "border-b-2 border-transparent text-text-inverse-muted hover:text-white"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-text-inverse-muted/70">
              <th className="px-4 py-2.5 font-medium">Incident / Category</th>
              <th className="px-3 py-2.5 font-medium">Location</th>
              <th className="px-3 py-2.5 font-medium">People</th>
              <th className="px-3 py-2.5 font-medium">Reported</th>
              <th className="px-3 py-2.5 font-medium">AI urgency</th>
              <th className="px-3 py-2.5 font-medium">Priority¹</th>
              <th className="px-3 py-2.5 font-medium">Team / Ack.</th>
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
                  <p className="text-[12px] text-text-inverse-muted">{incident.category}</p>
                </td>
                <td className="px-3 py-3 text-text-inverse-muted">
                  <p className="text-white/80">{incident.location}</p>
                  <p className="text-[12px]">{incident.zone}</p>
                </td>
                <td className="px-3 py-3 text-white/80">
                  {String(incident.peopleAffected).padStart(2, "0")}
                </td>
                <td className="px-3 py-3 text-text-inverse-muted">
                  {incident.reportedAt}
                  <p className="text-[12px]">{incident.reportedAgo}</p>
                </td>
                <td className="px-3 py-3">
                  <UrgencyPill value={incident.aiUrgency} />
                </td>
                <td className="px-3 py-3">
                  <UrgencyPill value={incident.humanPriority} />
                </td>
                <td className="px-3 py-3 text-text-inverse-muted">
                  {incident.team ?? "Unassigned"}
                  <p className="text-[12px]">
                    {incident.acknowledgedBy ? `Ack. ${incident.acknowledgedBy}` : "Unacknowl."}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <StatusLabel value={incident.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet cards */}
      <div className="divide-y divide-white/5 lg:hidden">
        {filtered.map((incident) => (
          <button
            key={incident.id}
            onClick={() => onSelect(incident)}
            className={cn(
              "flex w-full flex-col gap-2 p-4 text-left transition-colors",
              selectedId === incident.id ? "bg-brand-blue/10" : "hover:bg-white/5"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-white">{incident.id}</p>
              <UrgencyPill value={incident.humanPriority} />
            </div>
            <p className="text-[13px] text-white/80">{incident.category}</p>
            <p className="text-[12px] text-text-inverse-muted">
              {incident.location} · {incident.zone}
            </p>
            <div className="flex items-center justify-between text-[12px] text-text-inverse-muted">
              <span>{incident.reportedAgo}</span>
              <StatusLabel value={incident.status} />
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-[12px] text-text-inverse-muted">
        <span>
          Showing {filtered.length} of {incidents.length} incidents{" "}
          <sup>¹</sup> Human-confirmed priority
        </span>
        <div className="flex items-center gap-2">
          <button className="flex h-7 w-7 items-center justify-center rounded border border-white/10 disabled:opacity-40" disabled>
            <ChevronLeft size={14} />
          </button>
          <span>1 of {Math.max(1, Math.ceil(incidents.length / 6))}</span>
          <button className="flex h-7 w-7 items-center justify-center rounded border border-white/10">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
