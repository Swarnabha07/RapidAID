"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ActionAlert } from "@/components/responder/queue-state";
import type { RescueIncident } from "@/lib/types/rescue";
import type { ReportUrgency } from "@/lib/constants/report";
import { useAuth } from "@/lib/firebase/auth";
import { escalateReportManual } from "@/lib/firebase/firestore";
import { useActionSubmit } from "@/lib/hooks/use-action-submit";
import { responderLabel } from "@/lib/utils/action-errors";
import {
  ACTION_LIMITS,
  defaultEscalationTarget,
  escalationTargets,
  lengthOk,
} from "@/lib/utils/report-action-payloads";
import { urgencyKey } from "@/lib/utils/responder-view";

export function EscalateDialog({
  incident,
  open,
  onClose,
  onSuccess,
}: {
  incident: RescueIncident;
  open: boolean;
  onClose: () => void;
  /** Called ONLY after the server accepted the action. */
  onSuccess: () => void;
}) {
  const { user, role } = useAuth();
  const { submitting, error, run, clearError } = useActionSubmit();
  const current = urgencyKey(incident.urgency);
  const targets = escalationTargets(current);
  const [chosen, setChosen] = useState<ReportUrgency>(defaultEscalationTarget(current));
  const [reason, setReason] = useState("");
  const target = targets.includes(chosen) ? chosen : targets[0];
  const valid = lengthOk(reason, ACTION_LIMITS.reason);
  const responderName = responderLabel(user, role);

  const close = () => {
    if (submitting) return;
    clearError();
    onClose();
  };

  const handleConfirm = async () => {
    if (!valid) return;
    if (await run(() => escalateReportManual(incident.id, target, reason))) {
      setReason("");
      onSuccess();
    }
  };

  return (
    <Modal open={open} onClose={close} labelledBy="escalate-title">
      <p className="text-xs font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Action review / {incident.id.split("-")[0]} response
      </p>
      <h2 id="escalate-title" className="mt-3 text-[1.6rem] font-semibold text-white">
        Escalate {incident.id}?
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-text-inverse-muted">
        This raises the urgency and records the escalation, with your reason, in the audit log. It does not notify anyone
        or dispatch a unit. Urgency can only be raised, never lowered.
      </p>

      <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-[13.5px]">
        <Row label="Current urgency" value={incident.urgency} />
        <Row label="Escalation level" value={`${incident.escalationLevel} → ${incident.escalationLevel + 1}`} />
      </div>

      <label htmlFor="rescue-escalate-target" className="mt-5 block text-[13px] font-medium text-white">
        Raise urgency to
      </label>
      <select
        id="rescue-escalate-target"
        value={target}
        onChange={(e) => setChosen(e.target.value as ReportUrgency)}
        className="mt-2 w-full rounded-md border border-white/10 bg-ink p-3 text-[13.5px] text-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
      >
        {targets.map((t) => (
          <option key={t} value={t}>
            {t === "critical" ? "Critical" : "High"}
          </option>
        ))}
      </select>

      <label htmlFor="rescue-escalate-reason" className="mt-4 block text-[13px] font-medium text-white">
        Reason for escalation <span className="text-[#ff8a8d]">*</span>
      </label>
      <textarea
        id="rescue-escalate-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={ACTION_LIMITS.reason.max}
        rows={3}
        placeholder="Why is this incident being escalated?"
        className="mt-2 w-full resize-none rounded-md border border-white/10 bg-ink p-3 text-[13.5px] text-white placeholder:text-text-inverse-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />

      <p className="mt-4 text-[12.5px] text-text-inverse-muted">Recorded as {responderName}</p>

      <ActionAlert message={error} />

      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          className="flex-1 bg-transparent text-white border-white/15 hover:bg-white/5"
          onClick={close}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button className="flex-1" disabled={!valid || submitting} onClick={handleConfirm}>
          {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {submitting ? "Escalating..." : "Confirm escalation"}
        </Button>
      </div>

      <p className="mt-4 text-[12px] text-text-inverse-muted/70">Human approval required · No autonomous dispatch</p>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-inverse-muted">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}
