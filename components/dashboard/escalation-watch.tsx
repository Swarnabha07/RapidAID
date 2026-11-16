import { Badge } from "@/components/ui/badge";
import type { Incident } from "@/lib/types/incident";

const THRESHOLDS = [
  { label: "Critical", time: "2m" },
  { label: "High", time: "5m" },
  { label: "Medium", time: "10m" },
  { label: "Normal", time: "20m" },
];

export function EscalationWatch({ incident }: { incident: Incident }) {
  const overdue = incident.acknowledgementOverdueBy;

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">Escalation watch</h2>
        <Badge tone="high">Level {incident.escalationLevel || 1}</Badge>
      </div>
      <p className="mt-1 text-[13px] text-text-inverse-muted">
        {incident.id} · Acknowledgement overdue
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[11px] text-text-inverse-muted">Since report</p>
          <p className="mt-1 text-lg font-semibold text-white">04:12</p>
        </div>
        <div>
          <p className="text-[11px] text-text-inverse-muted">Awaiting ack.</p>
          <p className="mt-1 text-lg font-semibold text-white">04:12</p>
        </div>
        <div>
          <p className="text-[11px] text-text-inverse-muted">Overdue by</p>
          <p className="mt-1 text-lg font-semibold text-[#ff8a8d]">
            {overdue ?? "00:00"}
          </p>
        </div>
      </div>

      <p className="mt-5 text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Acknowledgement thresholds
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        {THRESHOLDS.map((t) => (
          <div key={t.label} className="rounded border border-white/10 py-1.5">
            <p className="text-[11px] text-text-inverse-muted">{t.label}</p>
            <p className="text-[12px] font-medium text-white/80">{t.time}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-text-inverse-muted">
        <p>14:29:48 · L1 coordination alert sent</p>
        <p className="mt-0.5 text-text-inverse-muted/60">
          Demo configuration · not clinical response standards
        </p>
      </div>
    </div>
  );
}
