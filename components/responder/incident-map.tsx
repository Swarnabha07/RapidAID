"use client";

/**
 * T5 - shared READ-ONLY responder map (Leaflet + OpenStreetMap). Loaded only through
 * `map-frame.tsx` (`next/dynamic`, ssr: false). No react-leaflet; the Leaflet CSS lives in this
 * dynamic chunk, so it never reaches the citizen pages or the initial bundle.
 *
 * Pins are updated in place (diffed by id) so a snapshot update never recreates the map or moves
 * the view. The view fits the pins once, when the first pins arrive; after that the user's own
 * panning/zooming is respected and only a selected pin that is off-screen is brought into view.
 */
import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PIN_COLORS, type MapPin } from "@/lib/utils/map-pins";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
// Capped below street-level detail: tile requests reveal approximate viewed locations to OSM.
const MAX_ZOOM = 17;
const TILE_ERROR_LIMIT = 4;

function pinIcon(pin: MapPin, selected: boolean): L.DivIcon {
  const color = PIN_COLORS[pin.resolved ? "resolved" : pin.urgency];
  const size = selected ? 24 : 16;
  const ring = pin.isSOS ? `0 0 0 4px ${color}55,` : "";
  const border = selected ? "3px solid #ffffff" : "2px solid rgba(255,255,255,0.85)";
  const html = `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:${border};box-shadow:${ring}0 1px 4px rgba(0,0,0,.6);opacity:${pin.resolved ? 0.65 : 1}"></span>`;
  return L.divIcon({ className: "", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

export interface IncidentMapProps {
  pins: MapPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTilesUnavailable: () => void;
  className?: string;
}

export default function IncidentMap({
  pins,
  selectedId,
  onSelect,
  onTilesUnavailable,
  className,
}: IncidentMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: L.Marker; key: string }>>(new Map());
  const fittedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const onTilesRef = useRef(onTilesUnavailable);
  const pinsRef = useRef(pins);
  const selectedRef = useRef(selectedId);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onTilesRef.current = onTilesUnavailable;
  });

  // Create the map once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, { center: [20, 0], zoom: 2, zoomControl: true, attributionControl: true });
    const tiles = L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: MAX_ZOOM, crossOrigin: true });
    let errors = 0;
    tiles.on("tileerror", () => {
      errors += 1;
      if (errors === TILE_ERROR_LIMIT) onTilesRef.current();
    });
    tiles.on("tileload", () => {
      errors = 0;
    });
    tiles.addTo(map);
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el);
    const markers = markersRef.current;
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markers.clear();
      fittedRef.current = false;
    };
  }, []);

  // Sync pins and selection.
  useEffect(() => {
    pinsRef.current = pins;
    selectedRef.current = selectedId;
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const seen = new Set<string>();

    for (const pin of pins) {
      seen.add(pin.id);
      const selected = pin.id === selectedId;
      const key = `${pin.urgency}|${pin.resolved}|${pin.isSOS}|${selected}`;
      const existing = markers.get(pin.id);
      if (existing) {
        existing.marker.setLatLng([pin.lat, pin.lng]);
        if (existing.key !== key) {
          existing.marker.setIcon(pinIcon(pin, selected));
          existing.marker.setZIndexOffset(selected ? 1000 : 0);
          existing.key = key;
        }
      } else {
        const marker = L.marker([pin.lat, pin.lng], {
          icon: pinIcon(pin, selected),
          title: `${pin.id} · ${pin.resolved ? "resolved" : pin.urgency}${pin.isSOS ? " · SOS" : ""}`,
          keyboard: true,
          zIndexOffset: selected ? 1000 : 0,
        });
        marker.on("click", () => onSelectRef.current(pin.id));
        marker.addTo(map);
        markers.set(pin.id, { marker, key });
      }
    }
    for (const [id, entry] of markers) {
      if (!seen.has(id)) {
        entry.marker.remove();
        markers.delete(id);
      }
    }

    if (!fittedRef.current && pins.length > 0) {
      fittedRef.current = true;
      if (pins.length === 1) {
        map.setView([pins[0].lat, pins[0].lng], 14, { animate: false });
      } else {
        map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), {
          padding: [32, 32],
          maxZoom: 15,
          animate: false,
        });
      }
    } else if (selectedId) {
      const sel = pins.find((p) => p.id === selectedId);
      if (sel && !map.getBounds().contains([sel.lat, sel.lng])) {
        map.panTo([sel.lat, sel.lng], { animate: false });
      }
    }
  }, [pins, selectedId]);

  return <div ref={containerRef} className={`isolate ${className ?? ""}`} />;
}
