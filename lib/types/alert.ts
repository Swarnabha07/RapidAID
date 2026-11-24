import type { Timestamp } from "firebase/firestore";

export const ALERT_SEVERITIES = ["info", "warning", "critical"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

/**
 * Document in the `alerts` collection, as written by POST /api/alerts (server only).
 * `area` is a plain label string; the optional geographic circle is `coordinates` + `radiusKm`.
 */
export interface Alert {
  alertId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  area: string;
  coordinates: { lat: number; lng: number } | null;
  radiusKm: number | null;
  active: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp | string | number;
  expiresAt: Timestamp | string | number;
  /** Not written yet. Reserved for the T7 geo-targeting work. */
  geoCells?: string[];
}

export type ResourceDashboard = "medical" | "rescue";

export interface ResourceItem {
  resourceId: string;
  dashboard: ResourceDashboard;
  type: string;
  quantityAvailable: number;
  location: string | { lat: number; lng: number; address?: string };
  updatedAt: Timestamp | string | number;
  unitLabel?: string;
  notes?: string | null;
}
