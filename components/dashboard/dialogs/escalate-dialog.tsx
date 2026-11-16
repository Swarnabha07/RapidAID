import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { Incident } from "@/lib/types/incident";

export function EscalateDialog({
  incident,
  open,
  onClose,
  onConfirm,
}: {
  incident: Incident;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const level = incident.escalationLevel || 1;

  return (
    <Modal open={open} onClose={onClose} labelledBy="escalate-title">
      <p className="text-xs font-medium text-[#ffb36b]">Confirm escalation</p>
      <h2 id="escalate-title" className="mt-2 text-2xl font-semibold text-white">
        Escalate to district coordination?
      </h2>
      <p className="mt-1 text-sm text-text-inverse-muted">
        {incident.id} / Level {level} → Level {level + 1}
      </p>

      <div className="mt-5 rounded-md bg-ink px-4 py-3 text-sm leading-relaxed text-white/85">
        Reason: Critical case remains unacknowledged after the demo threshold.
        Request district-level coordination support.
      </div>

      <p className="mt-5 text-sm leading-relaxed text-text-inverse-muted">
        Notifies authorized district coordinators only. No medical team is
        automatically dispatched; no treatment recommendation is made.
      </p>

      <p className="mt-5 text-sm text-brand-teal">
        Dr. Maya Chen · backend-authorized coordinator
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" className="bg-transparent text-white border-white/15 hover:bg-white/5" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className="bg-high text-white hover:brightness-110"
        >
          Confirm escalation
        </Button>
      </div>
    </Modal>
  );
}
