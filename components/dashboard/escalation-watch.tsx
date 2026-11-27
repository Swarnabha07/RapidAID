import { Badge } from "@/components/ui/badge";
import type { Incident } from "@/lib/types/incident";
import {
  POLICY_NOTE,
  clockLabel,
  elapsedLabel,
  isResolved,
  policyThresholdLabel,
} from "@/lib/utils/responder-view";

const THRESHOLDS = [
  { label: "Critical", key: "critical" },
  { label: "High", key: "high" },
  { label: "Normal", key: "normal" },
] as const;

export function EscalationWatch({ incident, now }: { incident: Incident | null; now: number }) {
  if (!incident) {
    return (
      <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
        <h2 className="text-[15px] font-semibold text-white">Escalation watch</h2>
        <p className="mt-2 text-[13px] text-text-inverse-muted">Select an incident to see its timings.</p>
      </div>
    );
  }

  const waiting = incident.awaitingAcknowledgement && !isResolved(incident);

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">Escalation watch</h2>
        {incident.escalationLevel > 0 ? (
          <Badge tone="high">Level {incident.escalationLevel}</Badge>
        ) : (
          <Badge tone="normal">Not escalated</Badge>
        )}
      </div>
      <p className="mt-1 text-[13px] text-text-inverse-muted">
        {incident.id} · {waiting ? "Awaiting acknowledgement" : isResolved(incident) ? "Resolved" : "Acknowledgement not pending"}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[11px] text-text-inverse-muted">Since report</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {isResolved(incident) ? "—" : elapsedLabel(incident.createdAtMs, now)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-inverse-muted">Awaiting ack.</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {waiting ? elapsedLabel(incident.createdAtMs, now) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-inverse-muted">Escalated at</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {incident.escalated ? clockLabel(incident.escalatedAtMs) : "—"}
          </p>
        </div>
      </div>

      <p className="mt-5 text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Policy thresholds (informational)
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {THRESHOLDS.map((t) => (
          <div key={t.label} className="rounded border border-white/10 py-1.5">
            <p className="text-[11px] text-text-inverse-muted">{t.label}</p>
            <p className="text-[12px] font-medium text-white/80">{policyThresholdLabel(t.key)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-text-inverse-muted">
        <p>{POLICY_NOTE}</p>
      </div>
    </div>
  );
}
