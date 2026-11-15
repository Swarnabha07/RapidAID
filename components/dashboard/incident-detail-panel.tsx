"use client";

import { useState } from "react";
import { ExternalLink, Paperclip, X } from "lucide-react";
import { UrgencyPill } from "@/components/dashboard/status-pills";
import { Button } from "@/components/ui/button";
import { AcknowledgeDialog } from "@/components/dashboard/dialogs/acknowledge-dialog";
import { AssignTeamDialog } from "@/components/dashboard/dialogs/assign-team-dialog";
import { EscalateDialog } from "@/components/dashboard/dialogs/escalate-dialog";
import { ResolveDialog } from "@/components/dashboard/dialogs/resolve-dialog";
import type { Incident } from "@/lib/types/incident";

export function IncidentDetailPanel({
  incident,
  onUpdate,
  onDeselect,
}: {
  incident: Incident;
  onUpdate: (next: Partial<Incident>) => void;
  onDeselect?: () => void;
}) {
  const [dialog, setDialog] = useState<
    "ack" | "assign" | "escalate" | "resolve" | null
  >(null);

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
            Selected incident
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-white">{incident.id}</h2>
            {!incident.acknowledgedBy && <UrgencyPill value="High" />}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="flex h-8 w-8 items-center justify-center rounded text-text-inverse-muted hover:bg-white/10 hover:text-white">
            <ExternalLink size={14} />
          </button>
          {onDeselect && (
            <button
              onClick={onDeselect}
              className="flex h-8 w-8 items-center justify-center rounded text-text-inverse-muted hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close detail"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-[15px] font-medium text-white">{incident.category}</p>

      <div className="mt-3 rounded-md bg-ink p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
          Citizen report · {incident.citizenReportTime}
        </p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/85">
          “{incident.citizenReport}”
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-text-inverse-muted">Affected people</p>
          <p className="text-[13.5px] font-medium text-white">
            {incident.peopleAffected} people
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-inverse-muted">Reported injuries</p>
          <p className="text-[13.5px] font-medium text-white">
            {incident.reportedInjuries}
          </p>
        </div>
      </div>

      <div className="mt-2 text-[13px] text-text-inverse-muted">
        <p className="text-white/80">{incident.location}</p>
        <p>{incident.zone}</p>
        <p className="mt-0.5 text-[12px] text-text-inverse-muted/70">
          Fictional location · View on map ↗
        </p>
      </div>

      {incident.attachment && (
        <div className="mt-3 flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-[12.5px] text-text-inverse-muted">
          <span className="flex items-center gap-2">
            <Paperclip size={13} /> {incident.attachment}
          </span>
          <span>1 attachment ↗</span>
        </div>
      )}

      <div className="mt-4 rounded-md border-l-2 border-brand-blue bg-brand-blue/10 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-blue">
            AI triage / decision support
          </p>
          <UrgencyPill value={incident.aiUrgency} />
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/85">
          {incident.aiTriageSummary}
        </p>
        <p className="mt-1.5 text-[11px] text-text-inverse-muted">
          Not a diagnosis. Authorized human review required.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-text-inverse-muted">Human-confirmed priority</p>
          <div className="mt-1 flex items-center gap-2">
            <UrgencyPill value={incident.humanPriority} />
            {incident.priorityConfirmedBy && (
              <span className="text-[12px] text-text-inverse-muted">
                {incident.priorityConfirmedBy}
              </span>
            )}
          </div>
        </div>
        <button className="text-[12.5px] text-brand-teal hover:underline">
          Edit priority
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div>
          <p className="text-[11px] text-text-inverse-muted">Medical team</p>
          <p className="text-[13.5px] font-medium text-white">
            {incident.team ?? "No team assigned"}
          </p>
        </div>
        <button
          onClick={() => setDialog("assign")}
          className="text-[12.5px] text-brand-teal hover:underline"
        >
          Choose team →
        </button>
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
          Incident timeline
        </p>
        <ol className="mt-2 space-y-2">
          {incident.timeline.map((entry) => (
            <li key={entry.time + entry.label} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-brand-blue" />
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2 text-[12.5px]">
                <span className="truncate text-white/85">
                  {entry.time} {entry.label}
                </span>
                <span className="flex-none text-text-inverse-muted/70">{entry.actor}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button size="sm" onClick={() => setDialog("ack")} disabled={!!incident.acknowledgedBy}>
          {incident.acknowledgedBy ? "Acknowledged" : "Acknowledge incident"}
        </Button>
        <Button size="sm" variant="secondary" className="bg-transparent text-white border-white/15 hover:bg-white/5" onClick={() => setDialog("assign")}>
          Assign medical team
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-transparent text-white border-white/15 hover:bg-white/5"
          disabled={incident.status === "In progress" || incident.status === "Resolved"}
          onClick={() => onUpdate({ status: "In progress" })}
        >
          Mark in progress
        </Button>
        <Button
          size="sm"
          className="bg-high text-white hover:brightness-110"
          onClick={() => setDialog("escalate")}
        >
          Escalate
        </Button>
        <Button
          size="sm"
          className="col-span-2 bg-normal text-white hover:brightness-110"
          disabled={incident.status === "Resolved"}
          onClick={() => setDialog("resolve")}
        >
          Resolve incident
        </Button>
      </div>

      <AcknowledgeDialog
        incident={incident}
        open={dialog === "ack"}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          onUpdate({ acknowledgedBy: "Dr. Maya Chen" });
          setDialog(null);
        }}
      />
      <AssignTeamDialog
        incident={incident}
        open={dialog === "assign"}
        onClose={() => setDialog(null)}
        onConfirm={(teamName) => {
          onUpdate({ team: teamName, status: "Assigned" });
          setDialog(null);
        }}
      />
      <EscalateDialog
        incident={incident}
        open={dialog === "escalate"}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          onUpdate({ escalationLevel: (incident.escalationLevel || 1) + 1 });
          setDialog(null);
        }}
      />
      <ResolveDialog
        incident={incident}
        open={dialog === "resolve"}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          onUpdate({ status: "Resolved" });
          setDialog(null);
        }}
      />
    </div>
  );
}
