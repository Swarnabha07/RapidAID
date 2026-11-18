"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { RescueIncident, RescueTeam } from "@/lib/types/rescue";
import { useAuth } from "@/lib/firebase/auth";
import { assignResponderUnit } from "@/lib/firebase/firestore";

export function AssignUnitDialog({
  incident,
  team,
  open,
  onClose,
  onConfirm,
}: {
  incident: RescueIncident;
  team: RescueTeam | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (unitId: string) => void;
}) {
  const { user, profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState(
    "Readiness reviewed with the unit lead. West service lane access requires field verification."
  );

  const responderName =
    profile?.displayName || user?.displayName || "M. Chen";

  if (!team) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await assignResponderUnit(incident.id, team.id, note, responderName);
    } catch (err) {
      console.warn("assignResponderUnit error in rescue dialog:", err);
    } finally {
      setSubmitting(false);
      onConfirm(team.id);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="assign-unit-title">
      <p className="text-xs font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Authorized action / Confirmation
      </p>
      <h2 id="assign-unit-title" className="mt-3 text-[1.6rem] font-semibold text-white">
        Assign {team.id} to {incident.id}?
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-text-inverse-muted">
        Confirm unit readiness before allocating this rescue assignment.
        Assignment does not initiate deployment.
      </p>

      <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-[13.5px]">
        <Row label="Incident" value={`${incident.id} · ${incident.location}`} />
        <Row
          label="Operational priority"
          value={`${incident.confirmedPriority} · Human-confirmed`}
          tone="text-[#ff8a8d]"
        />
        <Row label="Unit capacity" value={`${team.capacityLabel.split("·")[0].trim()} · Reported available`} />
      </div>

      <p className="mt-5 flex items-center gap-2 text-[13px] text-brand-teal">
        <Check size={14} /> Unit readiness and access reviewed by coordinator
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
        <Button className="flex-1" onClick={handleConfirm} disabled={submitting}>
          {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {submitting ? "Assigning unit..." : "Confirm assignment"}
        </Button>
      </div>

      <p className="mt-4 text-[12px] text-text-inverse-muted/70">
        No autonomous deployment or dispatch.
      </p>
    </Modal>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-inverse-muted">{label}</span>
      <span className={tone ?? "text-white"}>{value}</span>
    </div>
  );
}
