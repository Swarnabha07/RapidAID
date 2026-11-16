import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type {
  Report,
  ReportCategory,
  ReportUrgency,
  ReportUrgencyWeight,
  ReportStatus,
  ReportDashboard,
  ReportProcessor,
  ReportLocation,
  ReportActivityEntry,
} from "@/lib/types/report";
import {
  mapReportToMedicalIncident,
  mapReportToRescueIncident,
  mapReportToCitizenRequest,
} from "@/lib/types/report";
import type { Incident } from "@/lib/types/incident";
import type { RescueIncident } from "@/lib/types/rescue";
import type { CitizenRequest } from "@/lib/types/citizen-request";

export interface CreateReportInput {
  reportId?: string;
  userId: string;
  category: ReportCategory;
  urgency: ReportUrgency;
  urgencyWeight?: ReportUrgencyWeight;
  description: string;
  translatedDescription?: string | null;
  originalLanguage?: string;
  isSOS?: boolean;
  location: ReportLocation;
  mediaUrl?: string | null;
  processedBy?: ReportProcessor;
  confidenceScore?: number;
  status?: ReportStatus;
  assignedDashboard?: ReportDashboard;
  peopleAffected?: number;
  reportedInjuries?: string | null;
}

/**
 * Calculates urgency weight for fast sorting: critical=3, high=2, normal=1.
 */
function getUrgencyWeight(urgency: ReportUrgency): ReportUrgencyWeight {
  switch (urgency) {
    case "critical":
      return 3;
    case "high":
      return 2;
    case "normal":
    default:
      return 1;
  }
}

/**
 * Generates an activity trail record with fallback timestamp.
 */
function createActivityRecord(
  action: string,
  actorRole: string,
  note: string | null = null
): ReportActivityEntry {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    action,
    actorRole,
    note,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a new emergency report in Firestore.
 * Supports citizen text reports and one-tap SOS emergency submissions.
 */
export async function createReport(data: CreateReportInput): Promise<string> {
  const reportsCol = collection(db, "reports");
  const reportDoc = data.reportId ? doc(reportsCol, data.reportId) : doc(reportsCol);
  const reportId = reportDoc.id;

  const isSOS = Boolean(data.isSOS);
  const urgency = isSOS ? "critical" : data.urgency;
  const urgencyWeight = data.urgencyWeight ?? getUrgencyWeight(urgency);
  const assignedDashboard: ReportDashboard =
    data.assignedDashboard ?? (data.category === "medical" ? "medical" : "rescue");

  const initialAction = isSOS ? "⚡ Emergency SOS Triggered" : "Emergency report created";
  const initialTrail = [createActivityRecord(initialAction, "citizen", isSOS ? "Instant SOS beacon" : null)];

  const payload = {
    reportId,
    userId: data.userId,
    category: data.category,
    urgency,
    urgencyWeight,
    description: data.description,
    translatedDescription: data.translatedDescription ?? null,
    originalLanguage: data.originalLanguage ?? "en",
    isSOS,
    location: data.location,
    mediaUrl: data.mediaUrl ?? null,
    processedBy: data.processedBy ?? (isSOS ? "on-device" : "cloud"),
    confidenceScore: data.confidenceScore ?? (isSOS ? 1.0 : 0.95),
    status: data.status ?? "received",
    assignedDashboard,
    isDuplicateOf: null,
    escalated: false,
    escalatedAt: null,
    createdAt: serverTimestamp(),
    syncedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    assignedTeamOrUnit: null,
    acknowledgedAt: null,
    resolvedNotes: null,
    activityTrail: initialTrail,
    peopleAffected: data.peopleAffected ?? 1,
    reportedInjuries: data.reportedInjuries ?? null,
  };

  await setDoc(reportDoc, payload);
  return reportId;
}

/**
 * Fetches a single report by ID.
 */
export async function getReportById(reportId: string): Promise<Report | null> {
  const ref = doc(db, "reports", reportId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), reportId: snap.id } as Report;
}

// ---------------------------------------------------------------------------
// Real-time Queue Listeners
// ---------------------------------------------------------------------------

/**
 * Subscribes to the live medical queue.
 * Orders reports by urgencyWeight DESC, createdAt DESC and maps to Incident[].
 */
export function subscribeToMedicalQueue(
  callback: (incidents: Incident[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "reports"),
    where("assignedDashboard", "==", "medical"),
    orderBy("urgencyWeight", "desc"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const incidents = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Report;
        return mapReportToMedicalIncident({ ...data, reportId: docSnap.id });
      });
      callback(incidents);
    },
    (err) => {
      console.error("subscribeToMedicalQueue listener error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to the live rescue & coordination queue.
 * Orders reports by urgencyWeight DESC, createdAt DESC and maps to RescueIncident[].
 */
export function subscribeToRescueQueue(
  callback: (incidents: RescueIncident[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "reports"),
    where("assignedDashboard", "==", "rescue"),
    orderBy("urgencyWeight", "desc"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const incidents = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Report;
        return mapReportToRescueIncident({ ...data, reportId: docSnap.id });
      });
      callback(incidents);
    },
    (err) => {
      console.error("subscribeToRescueQueue listener error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to reports filed by a specific citizen.
 * Maps documents to CitizenRequest[] for the request history list.
 */
export function subscribeToUserRequests(
  userId: string,
  callback: (requests: CitizenRequest[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "reports"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Report;
        return mapReportToCitizenRequest({ ...data, reportId: docSnap.id });
      });
      callback(requests);
    },
    (err) => {
      console.error("subscribeToUserRequests listener error:", err);
      if (onError) onError(err);
    }
  );
}

// ---------------------------------------------------------------------------
// Responder Dialog Action Helpers
// ---------------------------------------------------------------------------

/**
 * Acknowledges an incident from the AcknowledgeDialog.
 * Stops the overdue countdown and records responder attribution.
 */
export async function acknowledgeReport(
  reportId: string,
  note?: string,
  responderName: string = "Verified Coordinator"
): Promise<void> {
  const ref = doc(db, "reports", reportId);
  const record = createActivityRecord(
    "Incident acknowledged",
    responderName,
    note || "Acknowledgement confirmed by coordinator"
  );

  await updateDoc(ref, {
    acknowledgedAt: serverTimestamp(),
    acknowledgedBy: responderName,
    status: "in_progress",
    updatedAt: serverTimestamp(),
    activityTrail: arrayUnion(record),
  });
}

/**
 * Assigns a responder unit/team from the AssignTeamDialog or AssignUnitDialog.
 */
export async function assignResponderUnit(
  reportId: string,
  unitName: string,
  note?: string,
  responderName: string = "Duty Coordinator"
): Promise<void> {
  const ref = doc(db, "reports", reportId);
  const record = createActivityRecord(
    `Unit assigned: ${unitName}`,
    responderName,
    note || `Assigned to ${unitName}`
  );

  await updateDoc(ref, {
    assignedTeamOrUnit: unitName,
    status: "dispatched",
    updatedAt: serverTimestamp(),
    activityTrail: arrayUnion(record),
  });
}

/**
 * Manually escalates a report to higher priority/level from EscalateDialog.
 */
export async function escalateReportManual(
  reportId: string,
  urgency: ReportUrgency,
  reason: string,
  responderName: string = "Authorized Coordinator"
): Promise<void> {
  const ref = doc(db, "reports", reportId);
  const weight = getUrgencyWeight(urgency);
  const record = createActivityRecord(
    `Escalated to ${urgency.toUpperCase()}`,
    responderName,
    reason
  );

  await updateDoc(ref, {
    escalated: true,
    escalatedAt: serverTimestamp(),
    urgency,
    urgencyWeight: weight,
    updatedAt: serverTimestamp(),
    activityTrail: arrayUnion(record),
  });
}

/**
 * Resolves an incident from the ResolveDialog.
 * Closes the active report and logs outcome notes to the audit trail.
 */
export async function resolveReport(
  reportId: string,
  resolutionNote: string,
  responderName: string = "Verified Lead"
): Promise<void> {
  const ref = doc(db, "reports", reportId);
  const record = createActivityRecord(
    "Incident resolved",
    responderName,
    resolutionNote
  );

  await updateDoc(ref, {
    status: "resolved",
    resolvedNotes: resolutionNote,
    updatedAt: serverTimestamp(),
    activityTrail: arrayUnion(record),
  });
}
