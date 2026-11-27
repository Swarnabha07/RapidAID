import { RESCUE_VIEW, type RescueIncident } from "@/lib/types/rescue";
import { MapFrame, MapLegend } from "@/components/responder/map-frame";

export function LiveMap({
  incidents,
  selected,
  onSelect,
  loaded,
}: {
  incidents: readonly RescueIncident[];
  selected: RescueIncident | null;
  onSelect: (id: string) => void;
  loaded: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">{RESCUE_VIEW.mapTitle}</h2>
        <span className="text-[11px] text-text-inverse-muted">Reported locations</span>
      </div>
      <p className="mt-0.5 text-[12px] text-text-inverse-muted">
        Read-only map of the loaded reports. Select a pin to open the incident.
      </p>

      <div className="mt-3">
        <MapFrame incidents={incidents} selectedId={selected?.id ?? null} onSelect={onSelect} loaded={loaded} tall />
      </div>

      <div className="mt-3">
        <MapLegend />
      </div>
    </div>
  );
}
