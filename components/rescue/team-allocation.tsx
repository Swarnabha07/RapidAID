import { RESCUE_VIEW, type RescueIncident } from "@/lib/types/rescue";
import { summarizeUnits } from "@/lib/utils/responder-view";

export function TeamAllocation({ incidents }: { incidents: readonly RescueIncident[] }) {
  const units = summarizeUnits(incidents, (i) => i.unit);

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <h2 className="text-[15px] font-semibold text-white">{RESCUE_VIEW.teamsPanelTitle}</h2>
      <p className="mt-0.5 text-[12.5px] text-text-inverse-muted">
        {units.length === 0
          ? "No units recorded on active incidents"
          : `${units.length} unit${units.length === 1 ? "" : "s"} on active incidents`}
      </p>

      <div className="mt-3 space-y-2">
        {units.map((u) => (
          <div key={u.unit} className="rounded-md border border-white/10 px-3 py-2.5">
            <p className="text-[13.5px] font-medium text-white">{u.unit}</p>
            <p className="text-[12px] text-text-inverse-muted">{u.incidentIds.join(", ")}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-text-inverse-muted/70">
        Unit names are entered by responders. RapidAID does not track unit availability or capacity.
      </p>
    </div>
  );
}
