"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ActionAlert } from "@/components/responder/queue-state";
import type { Incident } from "@/lib/types/incident";
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
  incident: Incident;
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
  const level = incident.escalationLevel;
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
      <p className="text-xs font-medium text-[#ffb36b]">Confirm escalation</p>
      <h2 id="escalate-title" className="mt-2 text-2xl font-semibold text-white">
        Escalate this incident?
      </h2>
      <p className="mt-1 text-sm text-text-inverse-muted">
        {incident.id} · escalation level {level} → {level + 1} · currently {incident.urgency}
      </p>

      <label htmlFor="escalate-target" className="mt-5 block text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Raise urgency to
      </label>
      <select
        id="escalate-target"
        value={target}
        onChange={(e) => setChosen(e.target.value as ReportUrgency)}
        className="mt-2 w-full rounded-md border border-white/10 bg-ink p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
      >
        {targets.map((t) => (
          <option key={t} value={t}>
            {t === "critical" ? "Critical" : "High"}
          </option>
        ))}
      </select>

      <label htmlFor="escalate-reason" className="mt-5 block text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Reason <span className="text-[#ff8a8d]">*</span>
      </label>
      <textarea
        id="escalate-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={ACTION_LIMITS.reason.max}
        rows={3}
        placeholder="Why is this incident being escalated?"
        className="mt-2 w-full resize-none rounded-md border border-white/10 bg-ink p-3 text-sm text-white placeholder:text-text-inverse-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />

      <p className="mt-4 text-sm leading-relaxed text-text-inverse-muted">
        This raises the urgency and records the escalation, with your reason, in the audit log. It does not notify anyone,
        dispatch a team or make a treatment recommendation. Urgency can only be raised, never lowered.
      </p>

      <p className="mt-4 text-sm text-brand-teal">Recorded as {responderName}</p>

      <ActionAlert message={error} />

      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          className="bg-transparent text-white border-white/15 hover:bg-white/5"
          onClick={close}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!valid || submitting}
          className="bg-high text-white hover:brightness-110"
        >
          {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {submitting ? "Escalating..." : "Confirm escalation"}
        </Button>
      </div>
    </Modal>
  );
}
