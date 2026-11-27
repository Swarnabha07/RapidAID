import type { RescueIncident } from "@/lib/types/rescue";
import { elapsedLabel, oldestAwaiting, summarizeQueue } from "@/lib/utils/responder-view";

export function OperationsStats({
  incidents,
  loaded,
  now,
}: {
  incidents: readonly RescueIncident[];
  loaded: boolean;
  now: number;
}) {
  const s = summarizeQueue(incidents, (i) => i.unit);
  const oldest = oldestAwaiting(incidents);
  const show = (n: number) => (loaded ? String(n) : "—");
  const note = (text: string) => (loaded ? text : "Loading…");

  const stats = [
    { label: "Active rescue incidents", value: show(s.active), detail: note("Not resolved"), tone: "text-white" },
    { label: "Critical incidents", value: show(s.critical), detail: note("Reported critical, active"), tone: "text-[#ff8a8d]" },
    {
      label: "Awaiting acknowledgement",
      value: show(s.awaitingAck),
      detail: note(oldest ? `Oldest · ${elapsedLabel(oldest.createdAtMs, now)}` : "None waiting"),
      tone: "text-[#ffb36b]",
    },
    { label: "In progress", value: show(s.inProgress), detail: note("Acknowledged, no unit recorded"), tone: "text-white" },
    { label: "Assigned units", value: show(s.units), detail: note("Names entered by responders"), tone: "text-[#5fd996]" },
    { label: "Resolved", value: show(s.resolved), detail: note(`Of ${s.total} loaded reports`), tone: "text-white" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
          <p className={`text-xl font-semibold ${stat.tone}`}>{stat.value}</p>
          <p className="mt-1 text-[12.5px] text-white/80">{stat.label}</p>
          <p className="mt-0.5 text-[11px] text-text-inverse-muted">{stat.detail}</p>
        </div>
      ))}
    </div>
  );
}
