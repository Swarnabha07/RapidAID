"use client";

import { useState } from "react";
import { Check, Search, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MEDICAL_TEAMS, type Incident } from "@/lib/types/incident";
import { useAuth } from "@/lib/firebase/auth";
import { assignResponderUnit } from "@/lib/firebase/firestore";

export function AssignTeamDialog({
  incident,
  open,
  onClose,
  onConfirm,
}: {
  incident: Incident;
  open: boolean;
  onClose: () => void;
  onConfirm: (teamName: string) => void;
}) {
  const { user, profile } = useAuth();
  const [selected, setSelected] = useState(MEDICAL_TEAMS[0].id);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const responderName =
    profile?.displayName || user?.displayName || "Dr. Maya Chen";

  const filteredTeams = MEDICAL_TEAMS.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.capability.toLowerCase().includes(search.toLowerCase())
  );

  const available = filteredTeams.filter((t) => t.availability === "Available").length;
  const team = MEDICAL_TEAMS.find((t) => t.id === selected) || MEDICAL_TEAMS[0];

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await assignResponderUnit(
        incident.id,
        team.name,
        `Assigned ${team.name} (${team.capability}) to incident ${incident.id}`,
        responderName
      );
    } catch (err) {
      console.warn("assignResponderUnit error:", err);
    } finally {
      setSubmitting(false);
      onConfirm(team.name);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="assign-title">
      <p className="text-xs font-medium text-brand-blue">Team assignment</p>
      <h2 id="assign-title" className="mt-2 text-2xl font-semibold text-white">
        Assign medical team
      </h2>
      <p className="mt-1 text-sm text-text-inverse-muted">
        {incident.id} · {incident.location} · {incident.peopleAffected} affected people
      </p>

      {incident.acknowledgedBy && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-normal-soft px-3 py-2.5 text-sm text-[#5fd996]">
          <Check size={15} /> Acknowledged by {incident.acknowledgedBy}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-text-inverse-muted/70">
            Current assignment
          </p>
          <p className="text-sm font-medium text-white">
            {incident.team ?? "No team assigned"}
          </p>
        </div>
        <span className="text-[13px] text-[#ff8a8d]">
          Human-confirmed priority: {incident.humanPriority}
        </span>
      </div>

      <div className="relative mt-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-inverse-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team name or capability..."
          className="h-10 w-full rounded-md border border-white/10 bg-ink pl-9 pr-3 text-sm text-white placeholder:text-text-inverse-muted/70 focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-wide text-text-inverse-muted/70">
        <span>Available teams</span>
        <span>{available} available · {filteredTeams.length} total</span>
      </div>

      <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
        {filteredTeams.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t.id)}
            disabled={t.availability !== "Available"}
            className={cn(
              "flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              selected === t.id
                ? "border-brand-blue bg-brand-blue/10"
                : "border-white/10 hover:border-white/20"
            )}
          >
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-4 w-4 flex-none items-center justify-center rounded-full border",
                  selected === t.id ? "border-brand-blue" : "border-white/30"
                )}
              >
                {selected === t.id && <span className="h-2 w-2 rounded-full bg-brand-blue" />}
              </span>
              <span>
                <span className="block text-sm font-medium text-white">{t.name}</span>
                <span className="block text-[12px] text-text-inverse-muted">
                  {t.capability} · {t.responders} responders
                </span>
              </span>
            </span>
            <span className="text-right">
              <span
                className={cn(
                  "block text-[13px] font-medium",
                  t.availability === "Available" ? "text-[#5fd996]" : "text-white/70"
                )}
              >
                {t.availability}
              </span>
              <span className="block text-[12px] text-text-inverse-muted">
                {t.assignedTo ? `Assigned · ${t.assignedTo}` : "No current assignment"}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-md bg-ink px-4 py-3">
        <p className="text-sm font-medium text-white">
          Assign {team.name} to {incident.id}
        </p>
        <p className="mt-0.5 text-[12.5px] text-text-inverse-muted">
          Your authorization as {responderName} is checked before saving.
        </p>
      </div>

      <p className="mt-4 text-[12.5px] text-text-inverse-muted">
        Assignment is a human decision. No autonomous dispatch.
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
        <Button onClick={handleConfirm} disabled={submitting}>
          {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          {submitting ? "Assigning team..." : "Confirm assignment"}
        </Button>
      </div>
    </Modal>
  );
}
