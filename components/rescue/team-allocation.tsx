import { cn } from "@/lib/utils";
import type { RoleViewConfig } from "@/lib/types/rescue";

export function TeamAllocation({ view }: { view: RoleViewConfig }) {
  const availableCount = view.teams.filter((t) => t.availability === "Available").length;

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <h2 className="text-[15px] font-semibold text-white">{view.teamsPanelTitle}</h2>
      <p className="mt-0.5 text-[12.5px] text-text-inverse-muted">
        {availableCount} {view.teamsAvailableLabel}
      </p>

      <div className="mt-3 space-y-2">
        {view.teams.map((team) => (
          <div
            key={team.id}
            className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2.5"
          >
            <div>
              <p className="text-[13.5px] font-medium text-white">{team.id}</p>
              <p className="text-[12px] text-text-inverse-muted">{team.capacityLabel}</p>
              <p
                className={cn(
                  "text-[11.5px] font-medium",
                  team.availability === "Available" ? "text-[#5fd996]" : "text-[#6fb6ff]"
                )}
              >
                {team.availability}
              </p>
            </div>
            {team.availability === "Available" ? (
              <button className="flex-none rounded-md bg-white/10 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-white/15">
                Assign
              </button>
            ) : (
              <a href="#" className="flex-none text-[12.5px] font-medium text-brand-teal hover:underline">
                View →
              </a>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-text-inverse-muted/70">
        Fictional units · Capacity verified before assignment
      </p>
    </div>
  );
}