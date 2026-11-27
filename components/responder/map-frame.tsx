"use client";

/**
 * T5 - wrapper used by both responder dashboards. Handles every non-happy path so the dashboard
 * stays usable: loading chunk, no data, no coordinates, tiles unavailable/offline, and a failed
 * Leaflet load (error boundary). The incident list never depends on the map.
 */
import dynamic from "next/dynamic";
import { Component, useMemo, useState, type ReactNode } from "react";
import { MapPinOff } from "lucide-react";
import { buildMapPins, PIN_COLORS, type MapIncidentLike } from "@/lib/utils/map-pins";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

const IncidentMap = dynamic(() => import("@/components/responder/incident-map"), {
  ssr: false,
  loading: () => <MapMessage text="Loading map…" />,
});

function MapMessage({ text, tall = false }: { text: string; tall?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center rounded-md border border-white/8 bg-ink px-4 text-center text-[13px] text-text-inverse-muted ${tall ? "h-64 sm:h-72" : "h-56"}`}
      role="status"
    >
      <span className="flex items-center gap-2">
        <MapPinOff size={15} className="shrink-0" /> {text}
      </span>
    </div>
  );
}

class MapBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("Responder map failed to load:", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function MapLegend() {
  const items: Array<[string, string]> = [
    ["Critical", PIN_COLORS.critical],
    ["High", PIN_COLORS.high],
    ["Normal", PIN_COLORS.normal],
    ["Resolved", PIN_COLORS.resolved],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-inverse-muted">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-transparent ring-2 ring-white/50" /> Halo = SOS
      </span>
    </div>
  );
}

export function MapFrame({
  incidents,
  selectedId,
  onSelect,
  loaded,
  tall = false,
}: {
  incidents: readonly (MapIncidentLike & { id: string })[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** False until the first snapshot arrives. */
  loaded: boolean;
  tall?: boolean;
}) {
  const online = useOnlineStatus();
  const [tilesDown, setTilesDown] = useState(false);
  const { pins, missing } = useMemo(() => buildMapPins(incidents), [incidents]);
  const heightClass = tall ? "h-64 sm:h-72" : "h-56";

  if (!loaded) return <MapMessage text="Waiting for reports…" tall={tall} />;
  if (incidents.length === 0) return <MapMessage text="No reports to show on the map." tall={tall} />;
  if (pins.length === 0) {
    return <MapMessage text="None of the loaded reports has usable coordinates, so none can be placed on the map." tall={tall} />;
  }

  return (
    <div>
      <MapBoundary fallback={<MapMessage text="The map could not be loaded. The incident list is unaffected." tall={tall} />}>
        <IncidentMap
          pins={pins}
          selectedId={selectedId}
          onSelect={onSelect}
          onTilesUnavailable={() => setTilesDown(true)}
          className={`${heightClass} w-full overflow-hidden rounded-md`}
        />
      </MapBoundary>
      {(!online || tilesDown) && (
        <p className="mt-2 text-[12px] text-[#ffb36b]" role="status">
          Map tiles are unavailable{!online ? " (offline)" : ""}. Pins may appear without a background; the incident list is unaffected.
        </p>
      )}
      {missing > 0 && (
        <p className="mt-2 text-[12px] text-text-inverse-muted">
          {missing} report{missing === 1 ? "" : "s"} without usable coordinates {missing === 1 ? "is" : "are"} not shown on the map.
        </p>
      )}
    </div>
  );
}
