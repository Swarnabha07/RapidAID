"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ActionAlert } from "@/components/responder/queue-state";
import type { Incident } from "@/lib/types/incident";
import { useAuth } from "@/lib/firebase/auth";
import { assignResponderUnit } from "@/lib/firebase/firestore";
import { useActionSubmit } from "@/lib/hooks/use-action-submit";
import { responderLabel } from "@/lib/utils/action-errors";
import { ACTION_LIMITS, lengthOk } from "@/lib/utils/report-action-payloads";

const FIELD =
  "mt-2 w-full rounded-md border border-white/10 bg-ink p-3 text-sm text-white placeholder:text-text-inverse-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-blue";
const LABEL = "mt-5 block text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70";

export function AssignTeamDialog({
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
  const [unitName, setUnitName] = useState("");
  const [note, setNote] = useState("");
  const responderName = responderLabel(user, role);
  const valid = lengthOk(unitName, ACTION_LIMITS.unitName) && lengthOk(note, ACTION_LIMITS.note);

  const close = () => {
    if (submitting) return;
    clearError();
    onClose();
  };

  const handleConfirm = async () => {
    if (!valid) return;
    if (await run(() => assignResponderUnit(incident.id, unitName, note))) {
      setUnitName("");
      setNote("");
      onSuccess();
    }
  };

  return (
    <Modal open={open} onClose={close} labelledBy="assign-title">
      <p className="text-xs font-medium text-brand-blue">Confirm assignment</p>
      <h2 id="assign-title" className="mt-2 text-2xl font-semibold text-white">
        Assign team / unit
      </h2>
      <p className="mt-1 text-sm text-text-inverse-muted">
        {incident.id} · {incident.category}
        {incident.team ? ` · currently ${incident.team}` : ""}
      </p>

      <label htmlFor="assign-unit" className={LABEL}>
        Team / unit name <span className="text-[#ff8a8d]">*</span>
      </label>
      <input
        id="assign-unit"
        value={unitName}
        onChange={(e) => setUnitName(e.target.value)}
        maxLength={ACTION_LIMITS.unitName.max}
        placeholder="e.g. Alpha 03"
        className={FIELD}
      />

      <label htmlFor="assign-note" className={LABEL}>
        Note (optional)
      </label>
      <textarea
        id="assign-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={ACTION_LIMITS.note.max}
        rows={3}
        className={`${FIELD} resize-none`}
      />

      <p className="mt-4 text-sm leading-relaxed text-text-inverse-muted">
        This records the name you enter against the report. It does not dispatch or notify anyone, and RapidAID does not
        check that the team exists or is available.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-md bg-normal-soft px-3 py-2.5 text-sm text-[#5fd996]">
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
        <Button onClick={handleConfirm} disabled={!valid || submitting}>
          {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {submitting ? "Saving..." : "Confirm assignment"}
        </Button>
      </div>
    </Modal>
  );
}
