import type { Incident } from "@/lib/types/incident";
import { elapsedLabel, oldestAwaiting, summarizeQueue } from "@/lib/utils/responder-view";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function OperationsOverview({
  incidents,
  loaded,
  now,
}: {
  incidents: readonly Incident[];
  loaded: boolean;
  now: number;
}) {
  const s = summarizeQueue(incidents, (i) => i.team);
  const oldest = oldestAwaiting(incidents);
  const show = (n: number) => (loaded ? pad(n) : "—");

  const stats = [
    {
      label: "Active medical incidents",
      value: show(s.active),
      detail: loaded ? `${s.awaitingAck} awaiting ack. · ${s.inProgress} in progress · ${s.assigned} assigned` : "Loading…",
      valueTone: "text-white",
    },
    {
      label: "Critical cases",
      value: show(s.critical),
      detail: loaded ? `${s.criticalAwaiting} awaiting acknowledgement` : "Loading…",
      valueTone: "text-[#ff8a8d]",
    },
    {
      label: "Awaiting acknowledgement",
      value: show(s.awaitingAck),
      detail: loaded
        ? oldest
          ? `Oldest report · ${elapsedLabel(oldest.createdAtMs, now)}`
          : "None waiting"
        : "Loading…",
      valueTone: "text-[#ffb36b]",
    },
    {
      label: "Assigned units",
      value: show(s.units),
      detail: loaded ? "Names entered by responders" : "Loading…",
      valueTone: "text-[#5fd996]",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
          Operations overview
        </p>
        <p className="text-[11px] text-text-inverse-muted/70">
          {loaded ? `Counts cover the ${s.total} loaded report${s.total === 1 ? "" : "s"}` : "Loading reports…"}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
            <p className={`text-2xl font-semibold ${stat.valueTone}`}>{stat.value}</p>
            <p className="mt-1 text-[13px] text-white/80">{stat.label}</p>
            <p className="mt-0.5 text-[11px] text-text-inverse-muted">{stat.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
