/**
 * UI shapes for the responder dashboards. They are produced ONLY by the mappers in
 * lib/types/report.ts from real Firestore reports. This file holds no sample data (T5 removed it).
 */
export type Urgency = "Critical" | "High" | "Normal";

export type IncidentStatus = "Open" | "Assigned" | "In progress" | "Resolved";

export interface TimelineEntry {
  /** HH:MM:SS (local time) of the entry. */
  time: string;
  label: string;
  actor: string;
  /** Epoch milliseconds, used to order the activity feed. */
  atMs: number | null;
}

export interface Incident {
  id: string;
  category: string;
  location: string;
  zone: string;
  peopleAffected: number;
  reportedAt: string;
  reportedAgo: string;
  createdAtMs: number | null;
  /** The report's urgency as submitted, raised only by a recorded escalation. Not AI-assessed. */
  urgency: Urgency;
  team: string | null;
  acknowledgedBy: string | null;
  status: IncidentStatus;
  /** True while the report is still `received` (the escalation policy's "unacknowledged"). */
  awaitingAcknowledgement: boolean;
  citizenReport: string;
  citizenReportTime: string;
  reportedInjuries: string;
  attachment?: string;
  /** Stored triage text, or NO_AI_SUMMARY_LABEL when none exists. */
  aiTriageSummary: string;
  escalationLevel: number;
  escalated: boolean;
  escalatedAtMs: number | null;
  isSOS: boolean;
  lat: number | null;
  lng: number | null;
  timeline: TimelineEntry[];
}
