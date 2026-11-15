import { Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { Incident } from "@/lib/types/incident";

export function AcknowledgeDialog({
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
  return (
    <Modal open={open} onClose={onClose} labelledBy="ack-title">
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
        You will be recorded as the acknowledging responder. The current
        acknowledgement countdown will stop.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-text-inverse-muted">
        No team will be assigned or dispatched by this action.
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-md bg-normal-soft px-3 py-2.5 text-sm text-[#5fd996]">
        <Check size={15} /> Dr. Maya Chen · backend-authorized coordinator
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" className="bg-transparent text-white border-white/15 hover:bg-white/5" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>Acknowledge incident</Button>
      </div>
    </Modal>
  );
}
