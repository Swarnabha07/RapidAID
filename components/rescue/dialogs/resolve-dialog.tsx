"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ActionAlert } from "@/components/responder/queue-state";
import type { RescueIncident } from "@/lib/types/rescue";
import { useAuth } from "@/lib/firebase/auth";
import { resolveReport } from "@/lib/firebase/firestore";
import { useActionSubmit } from "@/lib/hooks/use-action-submit";
import { responderLabel } from "@/lib/utils/action-errors";
import { ACTION_LIMITS, lengthOk } from "@/lib/utils/report-action-payloads";

export function ResolveDialog({
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
  const [note, setNote] = useState("");
  const responderName = responderLabel(user, role);
  const valid = lengthOk(note, ACTION_LIMITS.resolution);

  const close = () => {
    if (submitting) return;
    clearError();
    onClose();
  };

  const handleConfirm = async () => {
    if (!valid) return;
    if (await run(() => resolveReport(incident.id, note))) {
      setNote("");
      onSuccess();
    }
  };

  return (
    <Modal open={open} onClose={close} labelledBy="resolve-title">
      <p className="text-xs font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Authorized action / Confirmation
      </p>
      <h2 id="resolve-title" className="mt-3 text-[1.6rem] font-semibold text-white">
        Resolve {incident.id}?
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-text-inverse-muted">
        Only resolve once the response is complete. This closes the active case and keeps your note in the audit trail.
      </p>

      <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-[13.5px]">
        <Row label="Incident" value={`${incident.id} · ${incident.location}`} />
        <Row label="Assigned unit" value={incident.unit ?? "None recorded"} />
        <Row label="Final status" value="Resolved · Audit history retained" />
      </div>

      <label htmlFor="rescue-resolve-note" className="mt-5 block text-[13px] font-medium text-white">
        Resolution note <span className="text-[#ff8a8d]">*</span>
      </label>
      <textarea
        id="rescue-resolve-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={ACTION_LIMITS.resolution.max}
        rows={3}
        placeholder="Describe the outcome and any handover details."
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
        <Button className="flex-1" onClick={handleConfirm} disabled={!valid || submitting}>
          {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {submitting ? "Resolving..." : "Confirm resolution"}
        </Button>
      </div>

      <p className="mt-4 text-[12px] text-text-inverse-muted/70">No autonomous deployment or dispatch.</p>
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
