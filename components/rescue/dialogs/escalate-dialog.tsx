"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { RescueIncident } from "@/lib/types/rescue";

export function EscalateDialog({
  incident,
  open,
  onClose,
  onConfirm,
}: {
  incident: RescueIncident;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [reason, setReason] = useState(
    "Potential entrapment. Requesting cross-team coordination and review of access conditions."
  );
  const [authorized, setAuthorized] = useState(true);

  return (
    <Modal open={open} onClose={onClose} labelledBy="escalate-title">
      <p className="text-xs font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Action review / {incident.id.split("-")[0]} response
      </p>
      <h2 id="escalate-title" className="mt-3 text-[1.6rem] font-semibold text-white">
        Escalate {incident.id}?
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-text-inverse-muted">
        Notify central coordination of this {incident.confirmedPriority.toLowerCase()} incident.
        This action does not deploy or dispatch a unit.
      </p>

      <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-[13.5px]">
        <Row label="Confirmed priority" value={`${incident.confirmedPriority} · M. Chen`} tone="text-[#ff8a8d]" />
        <Row label="Current level" value="L1 · Duty coordinator" />
        <Row label="Escalate to" value="L2 · Central coordination" />
      </div>

      <label className="mt-5 block text-[13px] font-medium text-white">
        Reason for escalation
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        className="mt-2 w-full resize-none rounded-md border border-brand-blue bg-ink p-3 text-[13.5px] text-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />

      <label className="mt-4 flex items-center gap-2 text-[13px] text-brand-teal">
        <input
          type="checkbox"
          checked={authorized}
          onChange={(e) => setAuthorized(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 text-brand-teal"
        />
        Authorized as Fire Rescue Coordinator
      </label>

      <p className="mt-4 text-[12.5px] text-text-inverse-muted">
        Your identity, reason and timestamp will be recorded.
      </p>

      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          className="flex-1 bg-transparent text-white border-white/15 hover:bg-white/5"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button className="flex-1" disabled={!authorized || !reason.trim()} onClick={onConfirm}>
          Confirm escalation
        </Button>
      </div>

      <p className="mt-4 text-[12px] text-text-inverse-muted/70">
        Human approval required · No autonomous dispatch
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