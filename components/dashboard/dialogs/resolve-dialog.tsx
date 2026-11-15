"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { Incident } from "@/lib/types/incident";

export function ResolveDialog({
  incident,
  open,
  onClose,
  onConfirm,
}: {
  incident: Incident;
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <Modal open={open} onClose={onClose} labelledBy="resolve-title">
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
        placeholder="Describe the outcome and any handover details."
        className="mt-2 w-full resize-none rounded-md border border-white/10 bg-ink p-3 text-sm text-white placeholder:text-text-inverse-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />

      <p className="mt-4 text-sm leading-relaxed text-text-inverse-muted">
        This action closes the active case and adds your identity, timestamp
        and resolution note to the audit trail.
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-md bg-normal-soft px-3 py-2.5 text-sm text-[#5fd996]">
        <Check size={15} /> Dr. Maya Chen · verified coordinator
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" className="bg-transparent text-white border-white/15 hover:bg-white/5" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!note.trim()} onClick={() => onConfirm(note)}>
          Resolve incident
        </Button>
      </div>
    </Modal>
  );
}
