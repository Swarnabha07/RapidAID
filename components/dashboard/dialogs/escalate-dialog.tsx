"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { Incident } from "@/lib/types/incident";
import { useAuth } from "@/lib/firebase/auth";
import { escalateReportManual } from "@/lib/firebase/firestore";

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
  const { user, profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const level = incident.escalationLevel || 1;

  const responderName =
    profile?.displayName || user?.displayName || "Dr. Maya Chen";

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await escalateReportManual(
        incident.id,
        "critical",
        "Critical case escalated to district coordination. Level increased.",
        responderName
      );
    } catch (err) {
      console.warn("escalateReportManual error:", err);
    } finally {
      setSubmitting(false);
      onConfirm();
    }
  };

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
        Reason: Critical case remains unacknowledged after the threshold.
        Request district-level coordination support.
      </div>

      <p className="mt-5 text-sm leading-relaxed text-text-inverse-muted">
        Notifies authorized district coordinators only. No medical team is
        automatically dispatched; no treatment recommendation is made.
      </p>

      <p className="mt-5 text-sm text-brand-teal">
        {responderName} · backend-authorized coordinator
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          className="bg-transparent text-white border-white/15 hover:bg-white/5"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={submitting}
          className="bg-high text-white hover:brightness-110"
        >
          {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {submitting ? "Escalating..." : "Confirm escalation"}
        </Button>
      </div>
    </Modal>
  );
}
