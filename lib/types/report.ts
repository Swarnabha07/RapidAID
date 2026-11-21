import type { Timestamp } from "firebase/firestore";
import type {
  Incident,
  IncidentStatus,
  Urgency as MedicalUrgency,
  TimelineEntry as MedicalTimelineEntry,
} from "@/lib/types/incident";
import type {
  RescueIncident,
  RescueStatus,
  RescueUrgency,
} from "@/lib/types/rescue";
import type {
  CitizenRequest,
  RequestUrgency,
  SyncState,
  OperationalStatus,
} from "@/lib/types/citizen-request";

export type ReportCategory =
  | "medical"
  | "water"
  | "shelter"
  | "missing_person"
  | "other";

export type ReportUrgency = "critical" | "high" | "normal";

export type ReportUrgencyWeight = 3 | 2 | 1;

export type ReportStatus =
  | "received"
  | "in_progress"
  | "dispatched"
  | "resolved";

export type ReportDashboard = "medical" | "rescue";

export type ReportProcessor = "on-device" | "cloud";

export interface ReportLocation {
  lat: number;
  lng: number;
  address?: string;
  zone?: string;
}

export interface ReportActivityEntry {
  id: string;
  action: string;
  actorRole: string;
  /** Set by the server for responder actions (trusted, from the verified token). */
  actorUid?: string;
  actorName?: string;
  note?: string | null;
  timestamp: Timestamp | string | number | Date;
}

export interface Report {
  // Core Firestore fields
  reportId: string;
  userId: string;
  category: ReportCategory;
  urgency: ReportUrgency;
  urgencyWeight: ReportUrgencyWeight;
  description: string;
  translatedDescription: string | null;
  originalLanguage: string;
  isSOS: boolean;
  location: ReportLocation;
  mediaUrl: string | null;
  processedBy: ReportProcessor;
  confidenceScore: number;
  status: ReportStatus;
  assignedDashboard: ReportDashboard;
  isDuplicateOf: string | null;
  escalated: boolean;
  escalatedAt: Timestamp | string | number | null;
  createdAt: Timestamp | string | number | Date;
  syncedAt: Timestamp | string | number | Date | null;
  updatedAt: Timestamp | string | number | Date;

  // Optional responder fields
  assignedTeamOrUnit?: string | null;
  acknowledgedAt?: Timestamp | string | number | Date | null;
  resolvedNotes?: string | null;
  activityTrail?: ReportActivityEntry[];

  // Optional triage & coordination enrichment fields
  acknowledgedBy?: string | null;
  acknowledgedByUid?: string | null;
  peopleAffected?: number;
  reportedInjuries?: string | null;
  aiTriageSummary?: string | null;
  aiTriageLabel?: string | null;
  priorityConfirmedBy?: string | null;
  escalationLevel?: number;
  reviewedBy?: string | null;
  accessConditions?: string | null;
}

// ---------------------------------------------------------------------------
// Timestamp & formatting helpers
// ---------------------------------------------------------------------------

function toDate(ts: Timestamp | string | number | Date | null | undefined): Date {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts === "number") return new Date(ts);
  if (typeof ts === "string") {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof ts === "object" && "toDate" in ts && typeof ts.toDate === "function") {
    return ts.toDate();
  }
  if (typeof ts === "object" && "seconds" in ts && typeof ts.seconds === "number") {
    return new Date(ts.seconds * 1000);
  }
  return new Date();
}

function formatTimeToHHMM(dateInput: Timestamp | string | number | Date | null | undefined): string {
  const d = toDate(dateInput);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}

function formatTimeToHHMMSS(dateInput: Timestamp | string | number | Date | null | undefined): string {
  const d = toDate(dateInput);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${mins}:${secs}`;
}

function formatTimeToAgo(dateInput: Timestamp | string | number | Date | null | undefined): string {
  const d = toDate(dateInput);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60000) return "Just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimeToCitizenLabel(dateInput: Timestamp | string | number | Date | null | undefined): string {
  const d = toDate(dateInput);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
}

export function formatCategoryLabel(category: ReportCategory | string): string {
  switch (category) {
    case "medical":
      return "Medical Assistance";
    case "water":
      return "Food & Water";
    case "shelter":
      return "Emergency Shelter";
    case "missing_person":
      return "Missing Person Search";
    case "other":
    default:
      return "General Assistance";
  }
}

// ---------------------------------------------------------------------------
// Urgency & status mappers
// ---------------------------------------------------------------------------

export function mapReportUrgencyToMedical(urgency: ReportUrgency): MedicalUrgency {
  switch (urgency) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "normal":
    default:
      return "Normal";
  }
}

export function mapReportUrgencyToRescue(urgency: ReportUrgency): RescueUrgency {
  switch (urgency) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "normal":
    default:
      return "Medium";
  }
}

export function mapReportUrgencyToCitizen(urgency: ReportUrgency): RequestUrgency {
  switch (urgency) {
    case "critical":
      return "High";
    case "high":
      return "High";
    case "normal":
    default:
      return "Low";
  }
}

export function mapReportStatusToIncidentStatus(
  status: ReportStatus,
  hasAssignedTeam: boolean
): IncidentStatus {
  switch (status) {
    case "resolved":
      return "Resolved";
    case "dispatched":
      return "En route";
    case "in_progress":
      return "In progress";
    case "received":
    default:
      return hasAssignedTeam ? "Assigned" : "Open";
  }
}

export function mapReportStatusToRescueStatus(
  status: ReportStatus,
  hasAssignedUnit: boolean,
  isAcknowledged: boolean
): RescueStatus {
  switch (status) {
    case "resolved":
      return "Resolved";
    case "dispatched":
    case "in_progress":
      return "In progress";
    case "received":
    default:
      if (hasAssignedUnit) return "Assigned";
      if (isAcknowledged) return "Acknowledged";
      return "Awaiting ack.";
  }
}

export function mapReportStatusToCitizenStatus(
  status: ReportStatus,
  hasAssignedTeam: boolean,
  isAcknowledged: boolean
): OperationalStatus {
  if (status === "resolved") return "Resolved";
  if (hasAssignedTeam || status === "dispatched" || status === "in_progress") {
    return "Assigned";
  }
  if (isAcknowledged) return "Acknowledged";
  return "Submitted";
}

// ---------------------------------------------------------------------------
// Document -> UI shape mappers
// ---------------------------------------------------------------------------

/**
 * Maps a Firestore Report document to the Incident interface expected by the Medical Dashboard.
 */
export function mapReportToMedicalIncident(report: Report): Incident {
  const hasTeam = Boolean(report.assignedTeamOrUnit);
  const isAck = Boolean(report.acknowledgedAt || report.acknowledgedBy);
  const locationLabel =
    report.location.address ||
    `Coordinates: ${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`;

  const timeline: MedicalTimelineEntry[] =
    report.activityTrail && report.activityTrail.length > 0
      ? report.activityTrail.map((entry) => ({
          time: formatTimeToHHMMSS(entry.timestamp),
          label: entry.action,
          actor: entry.actorRole,
        }))
      : [
          {
            time: formatTimeToHHMMSS(report.createdAt),
            label: "Report received",
            actor: report.processedBy === "on-device" ? "⚡ On-device Gemini Nano" : "Citizen portal",
          },
          ...(report.syncedAt
            ? [
                {
                  time: formatTimeToHHMMSS(report.syncedAt),
                  label: "Incident synchronized",
                  actor: "Sync service",
                },
              ]
            : []),
          ...(report.acknowledgedAt
            ? [
                {
                  time: formatTimeToHHMMSS(report.acknowledgedAt),
                  label: "Incident acknowledged",
                  actor: report.acknowledgedBy ?? "Medical Coordinator",
                },
              ]
            : []),
          ...(report.assignedTeamOrUnit
            ? [
                {
                  time: formatTimeToHHMMSS(report.updatedAt),
                  label: `${report.assignedTeamOrUnit} assigned`,
                  actor: report.acknowledgedBy ?? "Medical Coordinator",
                },
              ]
            : []),
          ...(report.status === "resolved"
            ? [
                {
                  time: formatTimeToHHMMSS(report.updatedAt),
                  label: "Incident resolved",
                  actor: report.acknowledgedBy ?? "Attending Lead",
                },
              ]
            : []),
        ];

  return {
    id: report.reportId,
    category: formatCategoryLabel(report.category),
    location: locationLabel,
    zone: report.location.zone ?? "North District · Sector 1",
    peopleAffected: report.peopleAffected ?? (report.isSOS ? 1 : 1),
    reportedAt: formatTimeToHHMM(report.createdAt),
    reportedAgo: formatTimeToAgo(report.createdAt),
    aiUrgency: mapReportUrgencyToMedical(report.urgency),
    humanPriority: mapReportUrgencyToMedical(report.urgency),
    priorityConfirmedBy:
      report.priorityConfirmedBy ?? (isAck ? report.acknowledgedBy ?? null : null),
    team: report.assignedTeamOrUnit ?? null,
    acknowledgedBy:
      report.acknowledgedBy ?? (isAck ? "Verified Coordinator" : null),
    status: mapReportStatusToIncidentStatus(report.status, hasTeam),
    citizenReport: report.translatedDescription || report.description,
    citizenReportTime: formatTimeToHHMMSS(report.createdAt),
    reportedInjuries:
      report.reportedInjuries ??
      (report.category === "medical" ? "Medical triage indicated · Field verification pending" : "None reported"),
    attachment: report.mediaUrl ?? undefined,
    aiTriageSummary:
      report.aiTriageSummary ??
      (report.processedBy === "on-device"
        ? "⚡ Triage classified on-device via Gemini Nano 4. Immediate responder review recommended."
        : "☁ Cloud-enhanced triage inference completed. Cross-referenced against regional reports."),
    escalationLevel: report.escalationLevel ?? (report.escalated ? 1 : 0),
    acknowledgementOverdueBy: report.escalated ? "Overdue" : undefined,
    timeline,
  };
}

/**
 * Maps a Firestore Report document to the RescueIncident interface expected by the Rescue Dashboard.
 */
export function mapReportToRescueIncident(report: Report): RescueIncident {
  const hasUnit = Boolean(report.assignedTeamOrUnit);
  const isAck = Boolean(report.acknowledgedAt || report.acknowledgedBy);
  const locationLabel =
    report.location.address ||
    `Coordinates: ${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`;

  const contextLinks: string[] = [];
  if (report.isSOS) contextLinks.push("⚡ SOS Emergency Flag");
  if (report.mediaUrl) contextLinks.push("Field Attachment ↗");
  if (report.isDuplicateOf) contextLinks.push(`Merged: ${report.isDuplicateOf}`);

  return {
    id: report.reportId,
    title: report.isSOS
      ? `SOS: Emergency ${formatCategoryLabel(report.category)}`
      : formatCategoryLabel(report.category),
    location: locationLabel,
    zone: report.location.zone ?? "North District · Sector N-01",
    people: report.peopleAffected ?? 1,
    extra: report.isSOS ? "SOS emergency flag · Immediate action" : `${report.peopleAffected ?? 1} affected`,
    aiUrgency: mapReportUrgencyToRescue(report.urgency),
    confirmedPriority: mapReportUrgencyToRescue(report.urgency),
    reportedAgo: formatTimeToAgo(report.createdAt),
    unit: report.assignedTeamOrUnit ?? null,
    status: mapReportStatusToRescueStatus(report.status, hasUnit, isAck),
    acknowledgedBy: report.acknowledgedBy ?? (isAck ? "Verified Coordinator" : null),
    acknowledgedAt: report.acknowledgedAt ? formatTimeToHHMMSS(report.acknowledgedAt) : undefined,
    description: report.translatedDescription || report.description,
    accessConditions: report.accessConditions ?? "Field route access unverified. Confirm with lead before entry.",
    aiTriageLabel: report.aiTriageLabel ?? `ESTIMATED ${report.urgency.toUpperCase()}`,
    aiTriageSummary:
      report.aiTriageSummary ??
      (report.processedBy === "on-device"
        ? "⚡ On-device Gemini Nano classified priority offline. Safe access and unit headcount verification needed."
        : "☁ Cloud Gemini multi-source synthesis. De-duplicated and prioritized across regional reports."),
    contextLinks,
    lastVerified: `Last verified via ${report.processedBy} sync`,
    reviewedBy: report.reviewedBy ?? (report.acknowledgedBy ? `${report.acknowledgedBy} · Reviewed` : "Unreviewed"),
  };
}

/**
 * Maps a Firestore Report document to the CitizenRequest interface expected by Citizen Portal.
 */
export function mapReportToCitizenRequest(report: Report): CitizenRequest {
  const hasTeam = Boolean(report.assignedTeamOrUnit);
  const isAck = Boolean(report.acknowledgedAt || report.acknowledgedBy);
  const locationLabel =
    report.location.address ||
    `Lat: ${report.location.lat.toFixed(3)}, Lng: ${report.location.lng.toFixed(3)}`;

  return {
    id: report.reportId,
    category: formatCategoryLabel(report.category),
    location: locationLabel,
    reportedLabel: formatTimeToCitizenLabel(report.createdAt),
    urgency: mapReportUrgencyToCitizen(report.urgency),
    sync: report.syncedAt ? "Synchronized" : "Pending sync",
    status: mapReportStatusToCitizenStatus(report.status, hasTeam, isAck),
  };
}
