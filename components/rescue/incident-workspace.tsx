"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionAlert } from "@/components/responder/queue-state";
import { AssignUnitDialog } from "@/components/rescue/dialogs/assign-unit-dialog";
import { EscalateDialog } from "@/components/rescue/dialogs/escalate-dialog";
import { ResolveDialog } from "@/components/rescue/dialogs/resolve-dialog";
import { RESCUE_VIEW, type RescueIncident } from "@/lib/types/rescue";
import { NO_AI_SUMMARY_LABEL } from "@/lib/types/report";
import { acknowledgeReport } from "@/lib/firebase/firestore";
import { useActionSubmit } from "@/lib/hooks/use-action-submit";

const URGENCY_CLASS: Record<string, string> = {
  Critical: "text-[#ff8a8d]",
  High: "text-[#ffb36b]",
  Normal: "text-[#e8cb57]",
};

/**
 * Workspace for one incident. It never patches local state: after a successful action the live
 * Firestore snapshot updates the incident. Render it with `key={incident.id}` so the notice and
 * open dialog reset when the selection changes.
 */
export function IncidentWorkspace({ incident }: { incident: RescueIncident }) {
  const [dialog, setDialog] = useState<"assign" | "escalate" | "resolve" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const ack = useActionSubmit();
  const resolved = incident.status === "Resolved";

  const done = (message: string) => {
    setDialog(null);
    setNotice(message);
  };

  const handleAcknowledge = async () => {
    setNotice(null);
    if (await ack.run(() => acknowledgeReport(incident.id))) {
      setNotice("Acknowledgement saved. The incident updates from the live feed.");
    }
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Incident workspace
      </p>
      <h2 className="mt-1 text-[17px] font-semibold text-white">{incident.id}</h2>
      <p className="mt-2 text-[15px] font-medium text-white">{incident.title}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-text-inverse-muted">{incident.description}</p>

      <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Location
      </p>
      <p className="text-[13.5px] text-white/85">
        {incident.location} · {incident.zone}
      </p>
      <p className="text-[13px] text-text-inverse-muted">
        {incident.people} people · {incident.extra}
      </p>

      <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Access conditions
      </p>
      <p className="text-[13.5px] leading-relaxed text-text-inverse-muted">
        {incident.accessConditions ?? "Not provided by the reporter."}
      </p>

      {incident.contextLinks.length > 0 && (
        <p className="mt-2 text-[12.5px] text-brand-teal">{incident.contextLinks.join(" · ")}</p>
      )}
      <p className="mt-1 text-[12px] text-text-inverse-muted/80">{incident.sourceNote}</p>

      {incident.aiTriageSummary !== NO_AI_SUMMARY_LABEL && (
        <div className="mt-4 rounded-md border-l-2 border-brand-blue bg-brand-blue/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-blue">Stored triage note</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/85">{incident.aiTriageSummary}</p>
          <p className="mt-1.5 text-[11px] text-text-inverse-muted">Recorded on the report. Responders decide.</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div>
          <p className="text-[11px] text-text-inverse-muted">Priority</p>
          <p className={`text-[13.5px] font-medium ${URGENCY_CLASS[incident.urgency]}`}>
            {incident.urgency}
            {incident.isSOS ? " · SOS" : ""}
          </p>
        </div>
        <p className="text-[12px] text-text-inverse-muted">
          {incident.escalationLevel > 0 ? `Escalation level ${incident.escalationLevel}` : "Not escalated"}
        </p>
      </div>

      <p className="mt-2 text-[13px] text-text-inverse-muted">
        Assigned unit:{" "}
        <span className="text-white/85">
          {incident.unit ?? "Not assigned"}
          {incident.acknowledgedAt ? ` · Acknowledged ${incident.acknowledgedAt}` : ""}
        </span>
      </p>

      {notice && (
        <p className="mt-4 rounded-md bg-normal-soft px-3 py-2 text-[12.5px] text-[#5fd996]" role="status">
          {notice}
        </p>
      )}
      <ActionAlert message={ack.error} />

      <div className="mt-5 space-y-2">
        {incident.awaitingAcknowledgement && !resolved ? (
          <Button className="w-full" onClick={handleAcknowledge} disabled={ack.submitting}>
            {ack.submitting ? "Acknowledging..." : "Acknowledge incident"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full cursor-default bg-transparent text-[#5fd996] border-[#5fd996]/30"
            disabled
          >
            {incident.acknowledgedBy ? "✓ Acknowledged" : "Acknowledgement not pending"}
          </Button>
        )}

        <Button
          variant="secondary"
          className="w-full bg-transparent text-white border-white/15 hover:bg-white/5"
          disabled={resolved}
          onClick={() => setDialog("assign")}
        >
          {RESCUE_VIEW.assignLabel}
        </Button>

        <div className="flex gap-2">
          <Button
            className="flex-1 bg-high text-white hover:brightness-110"
            disabled={resolved}
            onClick={() => setDialog("escalate")}
          >
            Escalate
          </Button>
          <Button
            className="flex-1 bg-normal text-white hover:brightness-110"
            disabled={resolved}
            onClick={() => setDialog("resolve")}
          >
            Resolve
          </Button>
        </div>
      </div>

      <p className="mt-4 text-[12px] text-text-inverse-muted">
        The server checks your role and the report&apos;s current status on every action.
      </p>

      <AssignUnitDialog
        incident={incident}
        open={dialog === "assign"}
        onClose={() => setDialog(null)}
        onSuccess={() => done("Unit recorded. The incident updates from the live feed.")}
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
