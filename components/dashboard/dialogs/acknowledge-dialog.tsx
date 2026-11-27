"use client";

import { Check, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ActionAlert } from "@/components/responder/queue-state";
import type { Incident } from "@/lib/types/incident";
import { useAuth } from "@/lib/firebase/auth";
import { acknowledgeReport } from "@/lib/firebase/firestore";
import { useActionSubmit } from "@/lib/hooks/use-action-submit";
import { responderLabel } from "@/lib/utils/action-errors";

export function AcknowledgeDialog({
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
  const responderName = responderLabel(user, role);

  const close = () => {
    if (submitting) return;
    clearError();
    onClose();
  };

  const handleConfirm = async () => {
    if (await run(() => acknowledgeReport(incident.id))) onSuccess();
  };

  return (
    <Modal open={open} onClose={close} labelledBy="ack-title">
      <p className="text-xs font-medium text-brand-blue">Confirm status change</p>
      <h2 id="ack-title" className="mt-2 text-2xl font-semibold text-white">
        Acknowledge incident?
      </h2>
      <p className="mt-1 text-sm text-text-inverse-muted">
        {incident.id} · {incident.category}
      </p>

      <div className="mt-5 flex items-center justify-between rounded-md bg-ink px-4 py-3 text-sm">
        <span className="text-[#ffb36b]">Unacknowledged</span>
        <span className="text-text-inverse-muted">→</span>
        <span className="text-[#5fd996]">Acknowledged</span>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-text-inverse-muted">
        You will be recorded as the acknowledging responder, and the report moves to in progress.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-text-inverse-muted">
        No team is assigned or dispatched by this action.
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-md bg-normal-soft px-3 py-2.5 text-sm text-[#5fd996]">
        <Check size={15} /> Recorded as {responderName}
      </div>

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
        <Button onClick={handleConfirm} disabled={submitting}>
          {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {submitting ? "Acknowledging..." : "Acknowledge incident"}
        </Button>
      </div>
    </Modal>
  );
}
