/**
 * T5 - converts loaded incidents into map pins. Pure. An incident without usable coordinates
 * (legacy / partial documents) is counted as `missing`, never placed at a made-up position.
 */
import type { ReportUrgency } from "@/lib/constants/report";
import { urgencyKey } from "@/lib/utils/responder-view";

export interface MapIncidentLike {
  id: string;
  urgency: string;
  status: string;
  isSOS: boolean;
  lat: number | null;
  lng: number | null;
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  urgency: ReportUrgency;
  isSOS: boolean;
  resolved: boolean;
}

export function hasValidCoordinates(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function buildMapPins(incidents: readonly MapIncidentLike[]): { pins: MapPin[]; missing: number } {
  const pins: MapPin[] = [];
  let missing = 0;
  for (const i of incidents) {
    if (!hasValidCoordinates(i.lat, i.lng)) {
      missing += 1;
      continue;
    }
    pins.push({
      id: i.id,
      lat: i.lat as number,
      lng: i.lng as number,
      urgency: urgencyKey(i.urgency),
      isSOS: i.isSOS,
      resolved: i.status === "Resolved",
    });
  }
  return { pins, missing };
}

export const PIN_COLORS: Record<ReportUrgency | "resolved", string> = {
  critical: "#e5484d",
  high: "#f08c3a",
  normal: "#3b9ae1",
  resolved: "#7b8594",
};
