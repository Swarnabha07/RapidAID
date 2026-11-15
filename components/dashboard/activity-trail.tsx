const EVENTS = [
  { time: "14:32", text: "MED-009 · Report created", actor: "Citizen portal" },
  { time: "14:31", text: "MED-009 · Synchronized", actor: "Sync service" },
  { time: "14:30", text: "MED-002 · Acknowledged", actor: "Dr. J. Patel" },
  { time: "14:30", text: "MED-002 · Alpha 03 assigned", actor: "Dr. J. Patel" },
  { time: "14:29", text: "MED-005 · In progress", actor: "A. Rivera" },
  { time: "14:28", text: "MED-008 · Escalated to L2", actor: "Dr. M. Chen" },
  { time: "14:26", text: "MED-011 · Resolved", actor: "Dr. S. Okafor" },
];

export function ActivityTrail() {
  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">Activity &amp; audit trail</h2>
        <a href="#" className="text-[12px] text-brand-teal hover:underline">
          Attributed actions · immutable event history ↗
        </a>
      </div>

      <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {EVENTS.map((event, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 border-b border-white/5 py-1.5 text-[12.5px]"
          >
            <span className="flex min-w-0 items-center gap-2 text-text-inverse-muted">
              <span className="flex-none text-white/40">{event.time}</span>
              <span className="truncate text-white/80">{event.text}</span>
            </span>
            <span className="flex-none text-text-inverse-muted/70">{event.actor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
