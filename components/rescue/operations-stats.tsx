import type { RoleViewConfig } from "@/lib/types/rescue";

export function OperationsStats({ view }: { view: RoleViewConfig }) {
  const stats = [
    { label: "Active rescue incidents", value: view.stats.active, detail: "North district", tone: "text-white" },
    { label: "Critical incidents", value: view.stats.critical, detail: "Requires attention", tone: "text-[#ff8a8d]" },
    { label: "Awaiting acknowledgement", value: view.stats.awaitingAck, detail: "Within response window", tone: "text-[#ffb36b]" },
    {
      label: "Teams deployed / assigned",
      value: `${view.stats.deployed} / ${view.stats.deployedTotal}`,
      detail: "Human-authorized",
      tone: "text-white",
    },
    { label: "Available units", value: view.stats.availableUnits, detail: "Ready for allocation", tone: "text-[#5fd996]" },
    { label: "Ongoing evacuations", value: view.stats.evacuations, detail: "Across 3 sectors", tone: "text-white" },
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