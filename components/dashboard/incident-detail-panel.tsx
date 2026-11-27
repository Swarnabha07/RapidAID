"use client";

import { useState } from "react";
import { Paperclip, X } from "lucide-react";
import { UrgencyPill } from "@/components/dashboard/status-pills";
import { Button } from "@/components/ui/button";
import { AcknowledgeDialog } from "@/components/dashboard/dialogs/acknowledge-dialog";
import { AssignTeamDialog } from "@/components/dashboard/dialogs/assign-team-dialog";
import { EscalateDialog } from "@/components/dashboard/dialogs/escalate-dialog";
import { ResolveDialog } from "@/components/dashboard/dialogs/resolve-dialog";
import type { Incident } from "@/lib/types/incident";
import { NO_AI_SUMMARY_LABEL } from "@/lib/types/report";

/**
 * Detail view for one incident. It never patches local state: after a successful action the live
 * Firestore snapshot updates the incident. Render it with `key={incident.id}` so the notice and
 * open dialog reset when the selection changes.
 */
export function IncidentDetailPanel({
  incident,
  onDeselect,
}: {
  incident: Incident;
  onDeselect?: () => void;
}) {
  const [dialog, setDialog] = useState<"ack" | "assign" | "escalate" | "resolve" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resolved = incident.status === "Resolved";
  const done = (message: string) => {
    setDialog(null);
    setNotice(message);
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
            Selected incident
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-white">{incident.id}</h2>
            <UrgencyPill value={incident.urgency} />
            {incident.isSOS && (
              <span className="rounded-full bg-critical-soft px-2 py-0.5 text-[11px] font-semibold text-[#ff8a8d]">SOS</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
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
        {incident.lat !== null && incident.lng !== null && (
          <p className="mt-0.5 text-[12px] text-text-inverse-muted/70">
            {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}
          </p>
        )}
      </div>

      {incident.attachment && (
        <div className="mt-3 flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-[12.5px] text-text-inverse-muted">
          <span className="flex items-center gap-2">
            <Paperclip size={13} /> {incident.attachment}
          </span>
          <span>1 attachment</span>
        </div>
      )}

      {incident.aiTriageSummary !== NO_AI_SUMMARY_LABEL && (
        <div className="mt-4 rounded-md border-l-2 border-brand-blue bg-brand-blue/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-blue">
            Stored triage note
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/85">{incident.aiTriageSummary}</p>
          <p className="mt-1.5 text-[11px] text-text-inverse-muted">
            Recorded on the report. Not a diagnosis. Authorized human review required.
          </p>
        </div>
      )}

      <div className="mt-4">
        <p className="text-[11px] text-text-inverse-muted">Priority</p>
        <div className="mt-1 flex items-center gap-2">
          <UrgencyPill value={incident.urgency} />
          <span className="text-[12px] text-text-inverse-muted">
            As reported{incident.escalationLevel > 0 ? ` · escalation level ${incident.escalationLevel}` : ""}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div>
          <p className="text-[11px] text-text-inverse-muted">Assigned team / unit</p>
          <p className="text-[13.5px] font-medium text-white">
            {incident.team ?? "None recorded"}
          </p>
        </div>
        {!resolved && (
          <button
            onClick={() => setDialog("assign")}
            className="text-[12.5px] text-brand-teal hover:underline"
          >
            {incident.team ? "Change →" : "Assign →"}
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
          Incident timeline
        </p>
        <ol className="mt-2 space-y-2">
          {incident.timeline.map((entry, i) => (
            <li key={`${entry.time}-${entry.label}-${i}`} className="flex items-start gap-2.5">
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

      {notice && (
        <p className="mt-4 rounded-md bg-normal-soft px-3 py-2 text-[12.5px] text-[#5fd996]" role="status">
          {notice}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          onClick={() => setDialog("ack")}
          disabled={!incident.awaitingAcknowledgement || resolved}
          title={!incident.awaitingAcknowledgement ? "Only reports awaiting acknowledgement can be acknowledged" : undefined}
        >
          {incident.acknowledgedBy ? "Acknowledged" : "Acknowledge incident"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-transparent text-white border-white/15 hover:bg-white/5"
          disabled={resolved}
          onClick={() => setDialog("assign")}
        >
          Assign team / unit
        </Button>
        <Button
          size="sm"
          className="bg-high text-white hover:brightness-110"
          disabled={resolved}
          onClick={() => setDialog("escalate")}
        >
          Escalate
        </Button>
        <Button
          size="sm"
          className="bg-normal text-white hover:brightness-110"
          disabled={resolved}
          onClick={() => setDialog("resolve")}
        >
          Resolve incident
        </Button>
      </div>

      <AcknowledgeDialog
        incident={incident}
        open={dialog === "ack"}
        onClose={() => setDialog(null)}
        onSuccess={() => done("Acknowledgement saved. The incident updates from the live feed.")}
      />
      <AssignTeamDialog
        incident={incident}
        open={dialog === "assign"}
        onClose={() => setDialog(null)}
        onSuccess={() => done("Team / unit recorded. The incident updates from the live feed.")}
      />
      <EscalateDialog
        incident={incident}
        open={dialog === "escalate"}
        onClose={() => setDialog(null)}
        onSuccess={() => done("Escalation recorded. The incident updates from the live feed.")}
      />
      <ResolveDialog
        incident={incident}
        open={dialog === "resolve"}
        onClose={() => setDialog(null)}
        onSuccess={() => done("Resolution saved. The incident updates from the live feed.")}
      />
    </div>
  );
}
