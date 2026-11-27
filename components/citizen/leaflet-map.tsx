"use client";

/**
 * T4 - the imperative Leaflet map used by LocationPicker. Loaded only through next/dynamic with
 * `ssr: false` (Leaflet touches `window` at import time), so it never reaches the server render
 * or the landing page bundle.
 *
 * Tiles come from the public OpenStreetMap tile server (policy: https://operations.osmfoundation.org/policies/tiles/):
 * attribution is always shown, retina tiles are off, there is NO prefetching, bulk download or
 * offline tile caching. Without a connection the tiles simply do not load; LocationPicker keeps
 * working through "Use my location" and typed coordinates.
 *
 * The pin is a divIcon with inline styles on purpose: Leaflet's default marker images do not
 * resolve under bundlers, and no image asset is needed.
 */
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { useEffect, useRef } from "react";
import { normalizeLatLng, type LatLng } from "@/lib/utils/location-math";

export interface LeafletMapProps {
  value: LatLng | null;
  onPick: (point: LatLng) => void;
  /** true after repeated tile failures, false again once a tile loads. */
  onTilesUnavailable: (unavailable: boolean) => void;
  disabled?: boolean;
}

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const TILE_ERROR_THRESHOLD = 3;
const PICKED_ZOOM = 16;

const PIN_HTML =
  '<span style="display:block;width:24px;height:24px;border-radius:50% 50% 50% 0;background:#e5484d;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45);transform:rotate(-45deg)"></span>';

export default function LeafletMap({
  value,
  onPick,
  onTilesUnavailable,
  disabled = false,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Latest props for the long-lived Leaflet event handlers (updated after every render).
  const onPickRef = useRef(onPick);
  const onTilesRef = useRef(onTilesUnavailable);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    onPickRef.current = onPick;
    onTilesRef.current = onTilesUnavailable;
    disabledRef.current = disabled;
  });

  // Create the map once. Cleanup makes React strict-mode's double effect safe.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: [20, 0],
      zoom: 2,
      worldCopyJump: true,
      attributionControl: true,
    });
    mapRef.current = map;

    const tiles = L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: ATTRIBUTION,
      detectRetina: false,
    });
    let consecutiveErrors = 0;
    tiles.on("tileerror", () => {
      consecutiveErrors += 1;
      if (consecutiveErrors === TILE_ERROR_THRESHOLD) onTilesRef.current(true);
    });
    tiles.on("tileload", () => {
      if (consecutiveErrors >= TILE_ERROR_THRESHOLD) onTilesRef.current(false);
      consecutiveErrors = 0;
    });
    tiles.addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      if (disabledRef.current) return;
      const point = normalizeLatLng(event.latlng.lat, event.latlng.lng);
      if (point) onPickRef.current(point);
    });

    // Keep the map correct when its container is shown, hidden or resized.
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => map.invalidateSize())
        : null;
    observer?.observe(container);

    return () => {
      observer?.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Reflect the selected point (from the map, GPS or typed coordinates) as the pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const target = L.latLng(value.lat, value.lng);
    let marker = markerRef.current;
    if (!marker) {
      marker = L.marker(target, {
        draggable: true,
        keyboard: true,
        title: "Incident location. Drag to adjust.",
        icon: L.divIcon({
          className: "",
          html: PIN_HTML,
          iconSize: [24, 24],
          iconAnchor: [6, 24],
        }),
      });
      marker.on("dragend", () => {
        const current = marker?.getLatLng();
        if (!current) return;
        const point = normalizeLatLng(current.lat, current.lng);
        if (point && !disabledRef.current) {
          onPickRef.current(point);
        } else if (point) {
          marker?.setLatLng([point.lat, point.lng]);
        }
      });
      marker.addTo(map);
      markerRef.current = marker;
    } else if (marker.getLatLng().distanceTo(target) > 0.05) {
      marker.setLatLng(target);
    }

    const bounds = map.getBounds();
    if (!bounds.contains(target) || map.getZoom() < 12) {
      map.setView(target, Math.max(map.getZoom(), PICKED_ZOOM), { animate: false });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Map for choosing the incident location. You can also type coordinates below."
      className="h-64 w-full overflow-hidden rounded-[var(--radius-md)] border border-black/10 bg-subtle sm:h-72"
    />
  );
}
