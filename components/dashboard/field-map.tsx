import type { Incident } from "@/lib/types/incident";
import { MapFrame, MapLegend } from "@/components/responder/map-frame";

export function FieldMap({
  incidents,
  selected,
  onSelect,
  loaded,
}: {
  incidents: readonly Incident[];
  selected: Incident | null;
  onSelect: (id: string) => void;
  loaded: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">Field map</h2>
        <span className="text-[11px] text-text-inverse-muted">Reported locations</span>
      </div>

      <div className="mt-3">
        <MapFrame incidents={incidents} selectedId={selected?.id ?? null} onSelect={onSelect} loaded={loaded} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <MapLegend />
        {selected && <span className="ml-auto text-[11px] text-text-inverse-muted/70">Selected: {selected.id}</span>}
      </div>
    </div>
  );
}
