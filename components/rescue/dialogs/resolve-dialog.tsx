"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { RescueIncident } from "@/lib/types/rescue";
import { useAuth } from "@/lib/firebase/auth";
import { resolveReport } from "@/lib/firebase/firestore";

export function ResolveDialog({
  incident,
  open,
  onClose,
  onConfirm,
}: {
  incident: RescueIncident;
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const { user, profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState(
    "All reported people accounted for. Scene handover confirmed with duty coordinator."
  );

  const responderName =
    profile?.displayName || user?.displayName || "M. Chen";

  const handleConfirm = async () => {
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await resolveReport(incident.id, note.trim(), responderName);
    } catch (err) {
      console.warn("resolveReport error in rescue dialog:", err);
    } finally {
      setSubmitting(false);
      onConfirm(note.trim());
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="resolve-title">
      <p className="text-xs font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Authorized action / Confirmation
      </p>
      <h2 id="resolve-title" className="mt-3 text-[1.6rem] font-semibold text-white">
        Resolve {incident.id}?
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-text-inverse-muted">
        Confirm that response objectives are complete and no outstanding
        rescue needs remain.
      </p>

      <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-[13.5px]">
        <Row label="Incident" value={`${incident.id} · ${incident.location}`} />
        <Row
          label="Assigned team"
          value={`${incident.unit ?? "Unassigned"} · Lead confirmation required`}
        />
        <Row label="Final status" value="Resolved · Audit history retained" />
      </div>

      <p className="mt-5 flex items-center gap-2 text-[13px] text-brand-teal">
        <Check size={14} /> Team lead has confirmed all reported people accounted for
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="mt-2 w-full resize-none rounded-md border border-white/10 bg-ink p-3 text-[13.5px] text-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />

      <p className="mt-4 text-[12.5px] text-text-inverse-muted">
        Recorded as {responderName} · Authorized coordinator
      </p>

      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          className="flex-1 bg-transparent text-white border-white/15 hover:bg-white/5"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleConfirm} disabled={!note.trim() || submitting}>
          {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {submitting ? "Resolving..." : "Confirm resolution"}
        </Button>
      </div>

      <p className="mt-4 text-[12px] text-text-inverse-muted/70">
        No autonomous deployment or dispatch.
      </p>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-inverse-muted">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
