/**
 * UI shapes for the rescue dashboard. Produced ONLY by lib/types/report.ts from real reports.
 * This file holds no sample data (T5 removed the mock incidents, teams and role views).
 */
import type { TimelineEntry } from "@/lib/types/incident";

export type RescueUrgency = "Critical" | "High" | "Normal";

export type RescueStatus =
  | "Awaiting ack."
  | "Acknowledged"
  | "Assigned"
  | "In progress"
  | "Resolved";

export type { TimelineEntry };

export interface RescueIncident {
  id: string;
  title: string;
  location: string;
  zone: string;
  people: number;
  extra: string;
  /** The report's urgency as submitted, raised only by a recorded escalation. Not AI-assessed. */
  urgency: RescueUrgency;
  reportedAgo: string;
  createdAtMs: number | null;
  unit: string | null;
  status: RescueStatus;
  awaitingAcknowledgement: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt?: string;
  description: string;
  /** Null when the reporter gave no access information. */
  accessConditions: string | null;
  aiTriageSummary: string;
  contextLinks: string[];
  /** How the report was produced, e.g. "Report source: Manual report, no AI processing". */
  sourceNote: string;
  escalationLevel: number;
  escalated: boolean;
  escalatedAtMs: number | null;
  isSOS: boolean;
  lat: number | null;
  lng: number | null;
  timeline: TimelineEntry[];
}

/** Static labels for the (single) rescue view. No operational data. */
export const RESCUE_VIEW = {
  pageTitle: "Rescue operations",
  pageSubtitle: "Reports assigned to the rescue dashboard",
  queueTitle: "Rescue incident queue",
  mapTitle: "Incident map",
  unitNoun: "unit",
  assignLabel: "Assign unit",
  teamsPanelTitle: "Assigned units",
} as const;
