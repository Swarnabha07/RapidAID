"use client";

import { useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssignUnitDialog } from "@/components/rescue/dialogs/assign-unit-dialog";
import { EscalateDialog } from "@/components/rescue/dialogs/escalate-dialog";
import { ResolveDialog } from "@/components/rescue/dialogs/resolve-dialog";
import type { RescueIncident, RoleViewConfig } from "@/lib/types/rescue";
import { useAuth } from "@/lib/firebase/auth";
import { acknowledgeReport } from "@/lib/firebase/firestore";

const URGENCY_CLASS: Record<string, string> = {
  Critical: "text-[#ff8a8d]",
  High: "text-[#ffb36b]",
  Medium: "text-[#e8cb57]",
};

export function IncidentWorkspace({
  view,
  incident,
  onUpdate,
}: {
  view: RoleViewConfig;
  incident: RescueIncident;
  onUpdate: (patch: Partial<RescueIncident>) => void;
}) {
  const { user, profile } = useAuth();
  const responderName = profile?.displayName || user?.displayName || "M. Chen";
  const [dialog, setDialog] = useState<"assign" | "escalate" | "resolve" | null>(null);
  const availableTeam = view.teams.find((t) => t.availability === "Available") ?? null;

  const handleAcknowledge = async () => {
    try {
      await acknowledgeReport(incident.id, "Acknowledged by rescue coordinator", responderName);
    } catch (err) {
      console.warn("acknowledgeReport error:", err);
    } finally {
      onUpdate({ acknowledgedBy: responderName, status: "Acknowledged" });
    }
  };

  const handleMarkInProgress = async () => {
    try {
      await acknowledgeReport(incident.id, "Status marked as in-progress", responderName);
    } catch (err) {
      console.warn("mark in progress error:", err);
    } finally {
      onUpdate({ status: "In progress" });
    }
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
          Incident workspace
        </p>
        <button className="text-text-inverse-muted hover:text-white">
          <ExternalLink size={14} />
        </button>
      </div>
      <h2 className="mt-1 text-[17px] font-semibold text-white">{incident.id}</h2>
      <p className="mt-2 text-[15px] font-medium text-white">{incident.title}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-text-inverse-muted">
        {incident.description}
      </p>

      <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Location
      </p>
      <p className="text-[13.5px] text-white/85">
        {incident.location} · {incident.zone}
      </p>
      <p className="text-[13px] text-text-inverse-muted">
        {incident.people} people · {incident.extra}
      </p>

      <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Access conditions
      </p>
      <p className="text-[13.5px] leading-relaxed text-text-inverse-muted">
        {incident.accessConditions}
      </p>

      {incident.contextLinks.length > 0 && (
        <p className="mt-2 text-[12.5px] text-brand-teal">
          {incident.contextLinks.join(" · ")}
        </p>
      )}
      <p className="mt-1 text-[12px] text-text-inverse-muted/80">{incident.lastVerified}</p>

      <div className="mt-4 rounded-md border-l-2 border-brand-blue bg-brand-blue/10 p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-blue">
          <Sparkles size={12} /> Triage · {incident.aiTriageLabel}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/85">
          {incident.aiTriageSummary}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div>
          <p className="text-[11px] text-text-inverse-muted">Operational priority</p>
          <p className={`text-[13.5px] font-medium ${URGENCY_CLASS[incident.confirmedPriority]}`}>
            {incident.confirmedPriority} · Human-confirmed
          </p>
        </div>
        <p className="text-[12px] text-text-inverse-muted">{incident.reviewedBy}</p>
      </div>

      <p className="mt-2 text-[13px] text-text-inverse-muted">
        Assigned unit:{" "}
        <span className="text-white/85">
          {incident.unit ?? "Not assigned"}
          {incident.acknowledgedAt ? ` · Acknowledged ${incident.acknowledgedAt}` : ""}
        </span>
      </p>

      <div className="mt-5 space-y-2">
        {!incident.acknowledgedBy ? (
          <Button
            className="w-full"
            onClick={handleAcknowledge}
          >
            Acknowledge incident
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 cursor-default bg-transparent text-[#5fd996] border-[#5fd996]/30" disabled>
              ✓ Acknowledged
            </Button>
            <Button
              variant="secondary"
              className="flex-1 bg-transparent text-white border-white/15 hover:bg-white/5"
              disabled={incident.status === "In progress" || incident.status === "Resolved"}
              onClick={handleMarkInProgress}
            >
              Mark in progress
            </Button>
          </div>
        )}

        <Button
          variant="secondary"
          className="w-full bg-transparent text-white border-white/15 hover:bg-white/5"
          onClick={() => setDialog("assign")}
        >
          {view.assignLabel}
        </Button>

        <div className="flex gap-2">
          <Button
            className="flex-1 bg-high text-white hover:brightness-110"
            onClick={() => setDialog("escalate")}
          >
            Escalate
          </Button>
          <Button
            className="flex-1 bg-normal text-white hover:brightness-110"
            disabled={incident.status === "Resolved"}
            onClick={() => setDialog("resolve")}
          >
            Resolve
          </Button>
        </div>
      </div>

      <p className="mt-4 text-[12px] text-text-inverse-muted">
        Actions require authorized responder approval.
      </p>

      <AssignUnitDialog
        incident={incident}
        team={availableTeam}
        open={dialog === "assign"}
        onClose={() => setDialog(null)}
        onConfirm={(unitId) => {
          onUpdate({ unit: unitId, status: "Assigned" });
          setDialog(null);
        }}
      />
      <EscalateDialog
        incident={incident}
        open={dialog === "escalate"}
        onClose={() => setDialog(null)}
        onConfirm={() => setDialog(null)}
      />
      <ResolveDialog
        incident={incident}
        open={dialog === "resolve"}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          onUpdate({ status: "Resolved" });
          setDialog(null);
        }}
      />
    </div>
  );
}