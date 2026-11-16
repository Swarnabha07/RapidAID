import type { Timestamp } from "firebase/firestore";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  alertId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  area: string;
  createdBy: string;
  createdAt: Timestamp | string | number;
  expiresAt: Timestamp | string | number;
  active?: boolean;
  coordinates?: { lat: number; lng: number };
  radiusKm?: number;
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
