const STATS = [
  {
    label: "Active medical incidents",
    value: "12",
    detail: "8 open · 4 in progress",
    valueTone: "text-white",
  },
  {
    label: "Critical cases",
    value: "03",
    detail: "2 awaiting acknowledgement",
    valueTone: "text-[#ff8a8d]",
  },
  {
    label: "Awaiting acknowledgement",
    value: "05",
    detail: "Oldest report · 04:12",
    valueTone: "text-[#ffb36b]",
  },
  {
    label: "Teams available",
    value: "06",
    detail: "10 teams · 4 deployed",
    valueTone: "text-[#5fd996]",
  },
];

export function OperationsOverview() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
          Operations overview
        </p>
        <p className="text-[11px] text-text-inverse-muted/70">
          Riverton district · Flood response
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4"
          >
            <p className={`text-2xl font-semibold ${stat.valueTone}`}>{stat.value}</p>
            <p className="mt-1 text-[13px] text-white/80">{stat.label}</p>
            <p className="mt-0.5 text-[11px] text-text-inverse-muted">{stat.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
