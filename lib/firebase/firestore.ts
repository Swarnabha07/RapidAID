import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type QuerySnapshot,
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
import {
  submissionTracker,
  type SubmissionKind,
} from "@/lib/firebase/submission-tracker";
import { startSubmission, type SubmitSettlement } from "@/lib/utils/submit-flow";
import {
  RESPONDER_QUEUE_LIMIT,
  type QueueErrorLike,
  type QueueMetaLike,
} from "@/lib/utils/responder-view";
import { performReportAction } from "@/lib/utils/report-action-client";
import {
  acknowledgePayload,
  assignPayload,
  escalatePayload,
  resolvePayload,
} from "@/lib/utils/report-action-payloads";

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

/** Everything needed to write one report, built once by the shared validator/builder. */
interface PreparedReport {
  reportDoc: ReturnType<typeof doc>;
  reportId: string;
  payload: Record<string, unknown>;
  /** Citizen-provided content only (what the server fallback accepts). */
  fallbackBody: Record<string, unknown>;
  /** The validated input, so a failed submission can be retried with the same reportId. */
  input: CreateReportInput;
}

/**
 * Validates and builds the report document. Shared by createReport (awaits the backend) and
 * submitReport (does not), so the payload, validation and idempotency rules cannot drift.
 * Throws an Error with a user-readable message when the input is invalid.
 */
function prepareReport(data: CreateReportInput): PreparedReport {
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

  return {
    reportDoc,
    reportId,
    payload,
    // Only citizen-provided content. The server derives owner, status, provenance, etc.
    fallbackBody: {
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
    },
    // `userId` is re-supplied on retry; `reportId` is pinned so the retry is idempotent.
    input: { ...data, reportId },
  };
}

/**
 * Server fallback: POST /api/reports. Idempotent by reportId (an own retry returns 200
 * `duplicate: true`; someone else's id is 409). Returns the report id, throws on failure.
 */
async function postReportToServer(prepared: PreparedReport): Promise<string> {
  const currentUser = auth.currentUser;
  const token = currentUser ? await currentUser.getIdToken() : "";

  const res = await fetch("/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(prepared.fallbackBody),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server fallback failed with status ${res.status}`);
  }

  const resJson = await res.json();
  return resJson.reportId || prepared.reportId;
}

/**
 * Creates a new emergency report in Firestore with automatic fallback to POST /api/reports.
 * Supports citizen text reports and one-tap SOS emergency submissions.
 *
 * The document is built by the same shared validator/builder the server fallback uses, and it
 * must match isValidNewReport in firestore.rules. The offline-first client write (setDoc, which
 * Firestore queues locally while offline) is unchanged: there is no second offline queue.
 *
 * NOTE: this awaits the BACKEND's acknowledgement, so offline it does not resolve until the
 * connection returns. New UI should use `submitReport` (non-blocking) instead; this function is
 * kept unchanged in behaviour for existing callers.
 */
export async function createReport(data: CreateReportInput): Promise<string> {
  const prepared = prepareReport(data);

  try {
    await setDoc(prepared.reportDoc, prepared.payload);
    return prepared.reportId;
  } catch (firestoreErr) {
    console.warn("Direct Firestore setDoc failed, attempting /api/reports fallback:", firestoreErr);
    try {
      return await postReportToServer(prepared);
    } catch (fallbackErr) {
      console.error("Both direct Firestore setDoc and /api/reports fallback failed:", fallbackErr);
      throw firestoreErr;
    }
  }
}

export interface SubmitReportOptions {
  kind?: SubmissionKind;
}

export interface SubmitReportResult {
  reportId: string;
  /**
   * Settles when the backend answered (acknowledged, or rejected and the server fallback was
   * tried). NEVER rejects. Offline it stays pending until the connection returns; callers must
   * not block the UI on it. The user-facing state is read from the submission tracker.
   */
  settled: Promise<SubmitSettlement>;
}

/**
 * Non-blocking, offline-first submission. The write is applied to the local Firestore cache
 * immediately (and persisted in IndexedDB), so this returns the new reportId at once, online or
 * offline. Backend acknowledgement, rejection handling and the server fallback happen in the
 * background and are recorded in the session submission tracker.
 *
 * Throws synchronously (before anything is written or tracked) only when the input is invalid.
 */
export function submitReport(
  data: CreateReportInput,
  options: SubmitReportOptions = {},
): SubmitReportResult {
  const prepared = prepareReport(data);
  const settled = startSubmission({
    tracker: submissionTracker,
    reportId: prepared.reportId,
    kind: options.kind ?? "form",
    input: prepared.input,
    write: () => setDoc(prepared.reportDoc, prepared.payload),
    fallback: () => postReportToServer(prepared),
    log: (message, error) => console.warn(`submitReport: ${message}`, error),
  });
  return { reportId: prepared.reportId, settled };
}

/**
 * Retries a submission that FAILED in this page session, with the same reportId. Safe against
 * duplicates: the id is fixed, rules forbid overwriting, and the server fallback answers
 * `duplicate: true` for an own retry. Returns false when there is nothing to retry.
 */
export function retrySubmission(reportId: string): boolean {
  const record = submissionTracker.get(reportId);
  if (!record || record.state !== "failed" || !record.input) return false;
  submitReport(record.input, { kind: record.kind });
  return true;
}

/** Retries every failed submission of this page session. Returns how many were restarted. */
export function retryFailedSubmissions(): number {
  let restarted = 0;
  for (const record of submissionTracker.snapshot()) {
    if (record.state === "failed" && retrySubmission(record.reportId)) restarted += 1;
  }
  return restarted;
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
// Real-time Queue Listeners (responders)
// ---------------------------------------------------------------------------

type ResponderQueueCallback<T> = (items: T[], meta: QueueMetaLike) => void;
type ResponderQueueErrorCallback = (error: QueueErrorLike) => void;

/**
 * One listener for a dashboard queue. Uses the deployed composite index
 * (assignedDashboard, urgencyWeight desc, createdAt desc) with `limit(100)`.
 *
 * There is deliberately NO fallback query: an unordered or unbounded query would show a wrong or
 * unbounded list. If the index is missing, the error is surfaced (failed-precondition) and the UI
 * says so. Server-confirmed vs cached data is reported through `meta.fromCache`.
 */
function subscribeToDashboardQueue<T>(
  dashboard: "medical" | "rescue",
  mapper: (report: Report) => T,
  callback: ResponderQueueCallback<T>,
  onError?: ResponderQueueErrorCallback
): Unsubscribe {
  const q = query(
    collection(db, "reports"),
    where("assignedDashboard", "==", dashboard),
    orderBy("urgencyWeight", "desc"),
    orderBy("createdAt", "desc"),
    limit(RESPONDER_QUEUE_LIMIT)
  );

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const items: T[] = [];
      let skipped = 0;
      for (const docSnap of snapshot.docs) {
        try {
          items.push(mapper({ ...docSnap.data(), reportId: docSnap.id } as Report));
        } catch (err) {
          // One malformed document must not blank the whole queue; it is counted and disclosed.
          skipped += 1;
          console.error(`Could not display report ${docSnap.id}:`, err);
        }
      }
      callback(items, {
        fromCache: snapshot.metadata.fromCache,
        truncated: snapshot.size >= RESPONDER_QUEUE_LIMIT,
        skipped,
      });
    },
    (err) => {
      console.error(`${dashboard} queue listener failed:`, err);
      if (onError) onError({ code: err.code, message: err.message });
    }
  );
}

/** Live medical queue as Incident[] (every loaded report is shown; nothing is hidden). */
export function subscribeToMedicalQueue(
  callback: ResponderQueueCallback<Incident>,
  onError?: ResponderQueueErrorCallback
): Unsubscribe {
  return subscribeToDashboardQueue("medical", mapReportToMedicalIncident, callback, onError);
}

/** Live rescue queue as RescueIncident[] (every loaded report is shown; nothing is hidden). */
export function subscribeToRescueQueue(
  callback: ResponderQueueCallback<RescueIncident>,
  onError?: ResponderQueueErrorCallback
): Unsubscribe {
  return subscribeToDashboardQueue("rescue", mapReportToRescueIncident, callback, onError);
}

/** Snapshot-level metadata for the citizen's report list (T4). */
export interface UserRequestsMeta {
  /** The snapshot came from the local cache: the server has not confirmed it yet. */
  fromCache: boolean;
  /** At least one report in the snapshot has a write that the server has not acknowledged. */
  hasPendingWrites: boolean;
}

function timeOf(value: unknown): number {
  if (!value) return 0;
  const withToDate = value as { toDate?: () => Date };
  if (typeof withToDate.toDate === "function") return withToDate.toDate().getTime();
  return new Date(value as string | number | Date).getTime();
}

/**
 * Maps a citizen snapshot to CitizenRequest[] using Firestore's own per-document metadata, so a
 * report with a pending write is "Pending sync" and an acknowledged one is "Synchronized".
 * `serverTimestamps: "estimate"` gives a just-written report a real local time instead of null.
 */
function mapUserSnapshot(
  snapshot: QuerySnapshot,
  sortClientSide: boolean,
): { requests: CitizenRequest[]; meta: UserRequestsMeta } {
  let docs = snapshot.docs.map((docSnap) => ({
    report: {
      ...(docSnap.data({ serverTimestamps: "estimate" }) as Report),
      reportId: docSnap.id,
    },
    hasPendingWrites: docSnap.metadata.hasPendingWrites,
  }));
  if (sortClientSide) {
    docs = [...docs].sort((a, b) => timeOf(b.report.createdAt) - timeOf(a.report.createdAt));
  }
  return {
    requests: docs.map((d) =>
      mapReportToCitizenRequest(d.report, { hasPendingWrites: d.hasPendingWrites }),
    ),
    meta: {
      fromCache: snapshot.metadata.fromCache,
      hasPendingWrites: snapshot.metadata.hasPendingWrites,
    },
  };
}

/**
 * Subscribes to reports filed by a specific citizen.
 * Maps documents to CitizenRequest[] for the request history list.
 *
 * T4: listens with `includeMetadataChanges` so the pending -> acknowledged transition (and the
 * cache/server state) is delivered even when the document data itself does not change. The
 * second callback argument is optional, so existing callers keep working.
 */
export function subscribeToUserRequests(
  userId: string,
  callback: (requests: CitizenRequest[], meta?: UserRequestsMeta) => void,
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
    { includeMetadataChanges: true },
    (snapshot) => {
      const { requests, meta } = mapUserSnapshot(snapshot, false);
      callback(requests, meta);
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
        { includeMetadataChanges: true },
        (snapshot) => {
          const { requests, meta } = mapUserSnapshot(snapshot, true);
          callback(requests, meta);
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
 * state transition, then records the trusted actor and timestamp. A rejection ALWAYS throws a
 * ResponderActionError, so a dialog can never report success for an action the server refused.
 */
async function sendReportAction(
  reportId: string,
  payload: Record<string, unknown>
): Promise<void> {
  await performReportAction(reportId, payload, {
    getToken: async (forceRefresh) => {
      const currentUser = auth.currentUser;
      return currentUser ? currentUser.getIdToken(forceRefresh) : null;
    },
    fetchImpl: (input, init) => fetch(input, init),
  });
}

/** Acknowledges a report. The acknowledging responder is taken from the verified token. */
export async function acknowledgeReport(reportId: string, note?: string): Promise<void> {
  await sendReportAction(reportId, acknowledgePayload(note));
}

/** Records a free-text unit/team name against the report (no roster exists). */
export async function assignResponderUnit(
  reportId: string,
  unitName: string,
  note?: string
): Promise<void> {
  await sendReportAction(reportId, assignPayload(unitName, note));
}

/** Manually escalates a report. Urgency can only be raised, never lowered (server-enforced). */
export async function escalateReportManual(
  reportId: string,
  urgency: ReportUrgency,
  reason: string
): Promise<void> {
  await sendReportAction(reportId, escalatePayload(urgency, reason));
}

/** Resolves a report with a required resolution note. */
export async function resolveReport(reportId: string, resolutionNote: string): Promise<void> {
  await sendReportAction(reportId, resolvePayload(resolutionNote));
}
