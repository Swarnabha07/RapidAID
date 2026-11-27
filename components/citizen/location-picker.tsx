"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, LocateFixed, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { REPORT_LIMITS } from "@/lib/constants/report";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { getCurrentLocation } from "@/lib/utils/get-current-location";
import {
  formatCoordinates,
  normalizeLatLng,
  parseCoordinateInput,
  type LatLng,
} from "@/lib/utils/location-math";

// Leaflet needs `window`, so the map is client-only and code-split away from every other page.
const LeafletMap = dynamic(() => import("@/components/citizen/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-[var(--radius-md)] border border-black/10 bg-subtle text-[13px] text-text-secondary sm:h-72">
      <Loader2 size={16} className="mr-2 animate-spin" /> Loading map…
    </div>
  ),
});

export interface LocationPickerProps {
  value: LatLng | null;
  onChange: (point: LatLng | null) => void;
  landmark: string;
  onLandmarkChange: (landmark: string) => void;
  disabled?: boolean;
  /** Error to show under the coordinate fields (for example from form validation). */
  error?: string | null;
}

/**
 * Incident location selection (T4). The map is a convenience, never a requirement: GPS and typed
 * coordinates always work, including offline and when Leaflet or its tiles fail to load. The
 * stored `location` is `{lat, lng, address?}`; the landmark text becomes `address` only when the
 * user typed one (it is never invented).
 */
export function LocationPicker({
  value,
  onChange,
  landmark,
  onLandmarkChange,
  disabled = false,
  error = null,
}: LocationPickerProps) {
  const online = useOnlineStatus();
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  // Text being typed in the coordinate fields; null means "show the selected point".
  const [draft, setDraft] = useState<{ lat: string; lng: string } | null>(null);
  const [coordError, setCoordError] = useState<string | null>(null);

  const latText = draft ? draft.lat : value ? String(value.lat) : "";
  const lngText = draft ? draft.lng : value ? String(value.lng) : "";

  const handlePick = (point: LatLng) => {
    setDraft(null);
    setCoordError(null);
    setGpsError(null);
    onChange(point);
  };

  const handleUseMyLocation = async () => {
    setLocating(true);
    setGpsError(null);
    try {
      const here = await getCurrentLocation();
      const point = normalizeLatLng(here.lat, here.lng);
      if (!point) throw new Error("Your device returned an invalid location.");
      handlePick(point);
    } catch (err) {
      setGpsError(
        err instanceof Error ? err.message : "Unable to obtain your current location.",
      );
    } finally {
      setLocating(false);
    }
  };

  const commitDraft = (nextLat: string, nextLng: string) => {
    if (!nextLat.trim() && !nextLng.trim()) {
      setDraft(null);
      setCoordError(null);
      onChange(null);
      return;
    }
    const parsed = parseCoordinateInput(nextLat, nextLng);
    if (parsed.ok) {
      setDraft(null);
      setCoordError(null);
      onChange(parsed.value);
    } else {
      setCoordError(parsed.error);
    }
  };

  const showTileNotice = !online || tilesUnavailable;
  const shownError = coordError ?? gpsError ?? error;

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-[13.5px] font-medium text-text-primary">
        Incident location <span className="text-critical">*</span>
      </legend>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleUseMyLocation}
          disabled={locating || disabled}
        >
          {locating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LocateFixed size={14} />
          )}
          {locating ? "Finding you…" : "Use my location"}
        </Button>
        <p className="text-[12.5px] text-text-secondary">
          {value
            ? `Selected: ${formatCoordinates(value)}`
            : "Tap the map, use your location, or type coordinates."}
        </p>
      </div>

      <LeafletMap
        value={value}
        onPick={handlePick}
        onTilesUnavailable={setTilesUnavailable}
        disabled={disabled}
      />

      {showTileNotice && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-900"
        >
          <MapPinOff size={15} className="mt-0.5 flex-none" />
          <span>
            Map images cannot load without a working connection, so the map may look
            blank. You can still use your location or type coordinates below, and you
            can submit without the map.
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Latitude"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 22.5726"
          value={latText}
          error={Boolean(coordError)}
          onChange={(e) => setDraft({ lat: e.target.value, lng: lngText })}
          onBlur={() => draft && commitDraft(draft.lat, draft.lng)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft(latText, lngText);
            }
          }}
        />
        <TextField
          label="Longitude"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 88.3639"
          value={lngText}
          error={Boolean(coordError)}
          onChange={(e) => setDraft({ lat: latText, lng: e.target.value })}
          onBlur={() => draft && commitDraft(draft.lat, draft.lng)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft(latText, lngText);
            }
          }}
        />
      </div>

      {shownError && (
        <p role="alert" className="text-[12.5px] font-medium text-critical">
          {shownError}
        </p>
      )}

      <TextField
        label="Nearby landmark or address (optional)"
        maxLength={REPORT_LIMITS.address}
        placeholder="e.g. next to the primary school, ground floor"
        value={landmark}
        onChange={(e) => onLandmarkChange(e.target.value)}
      />
    </fieldset>
  );
}
