"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ActionAlert } from "@/components/responder/queue-state";
import { Button } from "@/components/ui/button";
import type { Incident } from "@/lib/types/incident";
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
  incident: Incident;
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
      <p className="text-xs font-medium text-brand-blue">Confirm status change</p>
      <h2 id="resolve-title" className="mt-2 text-2xl font-semibold text-white">
        Resolve incident?
      </h2>
      <p className="mt-1 text-sm text-text-inverse-muted">
        {incident.id} · {incident.category}
      </p>

      <div className="mt-5 flex items-center justify-between rounded-md bg-ink px-4 py-3 text-sm">
        <span className="text-[#6fb6ff]">{incident.status}</span>
        <span className="text-text-inverse-muted">→</span>
        <span className="text-[#5fd996]">Resolved</span>
      </div>

      <label className="mt-5 block text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Resolution note <span className="text-[#ff8a8d]">*</span>
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        maxLength={ACTION_LIMITS.resolution.max}
        placeholder="Describe the outcome and any handover details."
        className="mt-2 w-full resize-none rounded-md border border-white/10 bg-ink p-3 text-sm text-white placeholder:text-text-inverse-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />

      <p className="mt-4 text-sm leading-relaxed text-text-inverse-muted">
        This action closes the active case and adds your identity, timestamp
        and resolution note to the audit trail.
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
        <Button disabled={!valid || submitting} onClick={handleConfirm}>
          {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {submitting ? "Resolving..." : "Resolve incident"}
        </Button>
      </div>
    </Modal>
  );
}
