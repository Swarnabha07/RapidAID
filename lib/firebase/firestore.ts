import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";
import type {
  Report,
  ReportCategory,
  ReportUrgency,
  ReportLocation,
} from "@/lib/types/report";
import {
  validateNewReport,
  buildNewReportFields,
  buildInitialTrailEntry,
} from "@/lib/validation/report";
import {
  mapReportToMedicalIncident,
  mapReportToRescueIncident,
  mapReportToCitizenRequest,
} from "@/lib/types/report";
import type { Incident } from "@/lib/types/incident";
import type { RescueIncident } from "@/lib/types/rescue";
import type { CitizenRequest } from "@/lib/types/citizen-request";

/**
 * What a citizen may provide when creating a report. Everything else (owner check, status,
 * urgency weight, dashboard routing, timestamps, provenance) is computed by the shared builder,
 * so a caller cannot choose it. In particular a citizen report is always `processedBy: "manual"`
 * with `confidenceScore: null`: no AI provenance can be claimed from the client.
 */
export interface CreateReportInput {
  reportId?: string;
  userId: string;
  category: ReportCategory;
  urgency: ReportUrgency;
  description: string;
  translatedDescription?: string | null;
  originalLanguage?: string;
  isSOS?: boolean;
  location: ReportLocation;
  peopleAffected?: number;
  reportedInjuries?: string | null;
  accessConditions?: string | null;
}

function newTrailId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Creates a new emergency report in Firestore with automatic fallback to POST /api/reports.
 * Supports citizen text reports and one-tap SOS emergency submissions.
 *
 * The document is built by the same shared validator/builder the server fallback uses, and it
 * must match isValidNewReport in firestore.rules. The offline-first client write (setDoc, which
 * Firestore queues locally while offline) is unchanged: there is no second offline queue.
 */
export async function createReport(data: CreateReportInput): Promise<string> {
  const reportsCol = collection(db, "reports");
  const reportDoc = data.reportId ? doc(reportsCol, data.reportId) : doc(reportsCol);
  const reportId = reportDoc.id;

  const validated = validateNewReport({
    reportId,
    category: data.category,
    urgency: data.urgency,
    description: data.description,
    translatedDescription: data.translatedDescription,
    originalLanguage: data.originalLanguage,
    isSOS: data.isSOS,
    location: data.location,
    peopleAffected: data.peopleAffected,
    reportedInjuries: data.reportedInjuries,
    accessConditions: data.accessConditions,
  });
  if (!validated.ok) throw new Error(validated.error);
  const v = validated.value;

  const payload = {
    ...buildNewReportFields(v, { reportId, userId: data.userId }),
    createdAt: serverTimestamp(),
    syncedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    activityTrail: [
      buildInitialTrailEntry({
        id: newTrailId(),
        isSOS: v.isSOS,
        actorRole: "citizen",
        timestamp: new Date().toISOString(),
      }),
    ],
  };

  try {
    await setDoc(reportDoc, payload);
    return reportId;
  } catch (firestoreErr) {
    console.warn("Direct Firestore setDoc failed, attempting /api/reports fallback:", firestoreErr);
    try {
      const { auth } = await import("@/lib/firebase/config");
      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : "";

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // Only citizen-provided content. The server derives owner, status, provenance, etc.
        body: JSON.stringify({
          reportId,
          category: v.category,
          urgency: v.urgency,
          description: v.description,
          translatedDescription: v.translatedDescription,
          originalLanguage: v.originalLanguage,
          isSOS: v.isSOS,
          location: v.location,
          peopleAffected: v.peopleAffected,
          reportedInjuries: v.reportedInjuries,
          accessConditions: v.accessConditions,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server fallback failed with status ${res.status}`);
      }

      const resJson = await res.json();
      return resJson.reportId || reportId;
    } catch (fallbackErr) {
      console.error("Both direct Firestore setDoc and /api/reports fallback failed:", fallbackErr);
      throw firestoreErr;
    }
  }
}

/**
 * Convenience alias for creating a report with server-side fallback.
 */
export const submitReportWithFallback = createReport;

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

  let activeUnsubscribe: Unsubscribe | null = null;

  activeUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const incidents = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Report;
        return mapReportToMedicalIncident({ ...data, reportId: docSnap.id });
      });
      callback(incidents);
    },
    (err) => {
      console.warn("subscribeToMedicalQueue indexed query warning, trying non-indexed listener:", err);
      const fallbackQuery = query(
        collection(db, "reports"),
        where("assignedDashboard", "==", "medical")
      );

      activeUnsubscribe = onSnapshot(
        fallbackQuery,
        (snapshot) => {
          const docs = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Report),
            reportId: docSnap.id,
          }));
          docs.sort((a, b) => {
            const wDiff = (b.urgencyWeight || 1) - (a.urgencyWeight || 1);
            if (wDiff !== 0) return wDiff;
            const timeA = a.createdAt
              ? typeof (a.createdAt as any).toDate === "function"
                ? (a.createdAt as any).toDate().getTime()
                : new Date(a.createdAt as any).getTime()
              : 0;
            const timeB = b.createdAt
              ? typeof (b.createdAt as any).toDate === "function"
                ? (b.createdAt as any).toDate().getTime()
                : new Date(b.createdAt as any).getTime()
              : 0;
            return timeB - timeA;
          });
          callback(docs.map(mapReportToMedicalIncident));
        },
        (fallbackErr) => {
          console.error("subscribeToMedicalQueue fallback failed:", fallbackErr);
          if (onError) onError(fallbackErr);
        }
      );
    }
  );

  return () => {
    if (activeUnsubscribe) activeUnsubscribe();
  };
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

  let activeUnsubscribe: Unsubscribe | null = null;

  activeUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const incidents = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Report;
        return mapReportToRescueIncident({ ...data, reportId: docSnap.id });
      });
      callback(incidents);
    },
    (err) => {
      console.warn("subscribeToRescueQueue indexed query warning, trying non-indexed listener:", err);
      const fallbackQuery = query(
        collection(db, "reports"),
        where("assignedDashboard", "==", "rescue")
      );

      activeUnsubscribe = onSnapshot(
        fallbackQuery,
        (snapshot) => {
          const docs = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Report),
            reportId: docSnap.id,
          }));
          docs.sort((a, b) => {
            const wDiff = (b.urgencyWeight || 1) - (a.urgencyWeight || 1);
            if (wDiff !== 0) return wDiff;
            const timeA = a.createdAt
              ? typeof (a.createdAt as any).toDate === "function"
                ? (a.createdAt as any).toDate().getTime()
                : new Date(a.createdAt as any).getTime()
              : 0;
            const timeB = b.createdAt
              ? typeof (b.createdAt as any).toDate === "function"
                ? (b.createdAt as any).toDate().getTime()
                : new Date(b.createdAt as any).getTime()
              : 0;
            return timeB - timeA;
          });
          callback(docs.map(mapReportToRescueIncident));
        },
        (fallbackErr) => {
          console.error("subscribeToRescueQueue fallback failed:", fallbackErr);
          if (onError) onError(fallbackErr);
        }
      );
    }
  );

  return () => {
    if (activeUnsubscribe) activeUnsubscribe();
  };
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

  let activeUnsubscribe: Unsubscribe | null = null;

  activeUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const requests = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Report;
        return mapReportToCitizenRequest({ ...data, reportId: docSnap.id });
      });
      callback(requests);
    },
    (err) => {
      console.warn("subscribeToUserRequests indexed query warning, trying non-indexed listener:", err);
      // Fallback: query by userId alone and sort client-side (in case index is provisioning)
      const fallbackQuery = query(
        collection(db, "reports"),
        where("userId", "==", userId)
      );

      activeUnsubscribe = onSnapshot(
        fallbackQuery,
        (snapshot) => {
          const docs = snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Report),
            reportId: docSnap.id,
          }));
          docs.sort((a, b) => {
            const timeA = a.createdAt
              ? typeof (a.createdAt as any).toDate === "function"
                ? (a.createdAt as any).toDate().getTime()
                : new Date(a.createdAt as any).getTime()
              : 0;
            const timeB = b.createdAt
              ? typeof (b.createdAt as any).toDate === "function"
                ? (b.createdAt as any).toDate().getTime()
                : new Date(b.createdAt as any).getTime()
              : 0;
            return timeB - timeA;
          });
          callback(docs.map(mapReportToCitizenRequest));
        },
        (fallbackErr) => {
          console.error("subscribeToUserRequests fallback failed:", fallbackErr);
          if (onError) onError(fallbackErr);
        }
      );
    }
  );

  return () => {
    if (activeUnsubscribe) activeUnsubscribe();
  };
}

// ---------------------------------------------------------------------------
// Responder Dialog Action Helpers
// ---------------------------------------------------------------------------

/**
 * Sends a responder action to the server. Responders can NOT write reports directly
 * (Firestore rules block it); the server verifies the token, role, dashboard ownership and
 * state transition, then records the trusted actor and timestamp.
 */
async function sendReportAction(
  reportId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("You must be signed in to update a report.");
  const token = await currentUser.getIdToken();
  const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Report update failed with HTTP ${res.status}`);
  }
}

/**
 * Acknowledges an incident from the AcknowledgeDialog.
 * Stops the overdue countdown. The acknowledging responder is taken from the verified token,
 * so `responderName` is kept only for backward compatibility and is ignored.
 */
export async function acknowledgeReport(
  reportId: string,
  note?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  responderName?: string
): Promise<void> {
  await sendReportAction(reportId, { action: "acknowledge", note });
}

/**
 * Assigns a responder unit/team from the AssignTeamDialog or AssignUnitDialog.
 */
export async function assignResponderUnit(
  reportId: string,
  unitName: string,
  note?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  responderName?: string
): Promise<void> {
  await sendReportAction(reportId, { action: "assign", unitName, note });
}

/**
 * Manually escalates a report from EscalateDialog. Urgency can only be raised, never lowered.
 */
export async function escalateReportManual(
  reportId: string,
  urgency: ReportUrgency,
  reason: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  responderName?: string
): Promise<void> {
  await sendReportAction(reportId, { action: "escalate", urgency, reason });
}

/**
 * Resolves an incident from the ResolveDialog.
 */
export async function resolveReport(
  reportId: string,
  resolutionNote: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  responderName?: string
): Promise<void> {
  await sendReportAction(reportId, { action: "resolve", resolutionNote });
}
