import type { RoleViewConfig } from "@/lib/types/rescue";

export function AcknowledgementWatch({ view }: { view: RoleViewConfig }) {
  const watch = view.ackWatch;

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <h2 className="text-[15px] font-semibold text-white">Acknowledgement watch</h2>
      <p className="mt-0.5 text-[12.5px] text-text-inverse-muted">
        {watch.incidentId} · {watch.priorityLabel}
      </p>

      <p className="mt-4 text-3xl font-semibold text-[#ffb36b]">{watch.remaining}</p>
      <p className="text-[12px] text-text-inverse-muted">until escalation</p>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-2/3 rounded-full bg-high" />
      </div>

      <div className="mt-3 flex items-center justify-between text-[12px] text-text-inverse-muted">
        <span>Elapsed {watch.elapsed}</span>
        <span>Deadline {watch.deadline}</span>
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[12.5px] font-medium text-white/85">L1 · Duty coordinator</p>
        <p className="mt-0.5 text-[12px] text-text-inverse-muted">
          Central coordination notified of critical reports.
        </p>
        <p className="mt-1 text-[11px] text-text-inverse-muted/70">14:30 · L1 watch started · System</p>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          ["Critical", "2m"],
          ["High", "5m"],
          ["Medium", "10m"],
          ["Normal", "20m"],
        ].map(([label, time]) => (
          <div key={label} className="rounded border border-white/10 py-1.5">
            <p className="text-[10.5px] text-text-inverse-muted">{label}</p>
            <p className="text-[12px] font-medium text-white/80">{time}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10.5px] text-text-inverse-muted/60">
        Demo acknowledgement thresholds
      </p>
    </div>
  );
}