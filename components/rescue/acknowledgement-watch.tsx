import type { RescueIncident } from "@/lib/types/rescue";
import {
  POLICY_NOTE,
  clockLabel,
  elapsedLabel,
  oldestAwaiting,
  policyThresholdLabel,
} from "@/lib/utils/responder-view";

const THRESHOLDS = [
  ["Critical", "critical"],
  ["High", "high"],
  ["Normal", "normal"],
] as const;

export function AcknowledgementWatch({
  incidents,
  now,
}: {
  incidents: readonly RescueIncident[];
  now: number;
}) {
  const oldest = oldestAwaiting(incidents);

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <h2 className="text-[15px] font-semibold text-white">Acknowledgement watch</h2>
      {oldest ? (
        <>
          <p className="mt-0.5 text-[12.5px] text-text-inverse-muted">
            {oldest.id} · reported {oldest.urgency.toLowerCase()}
          </p>
          <p className="mt-4 text-3xl font-semibold text-[#ffb36b]">{elapsedLabel(oldest.createdAtMs, now)}</p>
          <p className="text-[12px] text-text-inverse-muted">waiting for acknowledgement (oldest report)</p>
          <p className="mt-3 text-[12px] text-text-inverse-muted">Reported at {clockLabel(oldest.createdAtMs)}</p>
        </>
      ) : (
        <p className="mt-3 text-[13px] text-text-inverse-muted">No reports are awaiting acknowledgement.</p>
      )}

      <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Policy thresholds (informational)
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {THRESHOLDS.map(([label, key]) => (
          <div key={label} className="rounded border border-white/10 py-1.5">
            <p className="text-[10.5px] text-text-inverse-muted">{label}</p>
            <p className="text-[12px] font-medium text-white/80">{policyThresholdLabel(key)}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10.5px] text-text-inverse-muted/60">{POLICY_NOTE}</p>
    </div>
  );
}
