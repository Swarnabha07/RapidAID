/**
 * T4 - truthful synchronisation summary for the citizen portal.
 *
 * Pure and Firebase-free. Every label here must be something we actually know:
 *  - "saved on this device" = a Firestore snapshot says the document has a pending write;
 *  - "received" = the snapshot has no pending write and did not come from the local cache;
 *  - "offline" = the browser says there is no network (a reliable signal; "online" is only a hint).
 * Nothing here says or implies that responders have seen, accepted or will act on a report.
 */
import type { CitizenRequest, SyncState } from "@/lib/types/citizen-request";
import type { SubmissionRecord } from "@/lib/firebase/submission-tracker";
import { formatCategoryLabel, mapReportUrgencyToCitizen } from "@/lib/types/report";

export type SyncSummaryKind =
  | "checking"
  | "failed"
  | "offline-pending"
  | "offline-idle"
  | "sending"
  | "unconfirmed"
  | "all-sent";

export type SyncTone = "neutral" | "amber" | "green" | "red";

export interface SyncSummaryInput {
  /** The first snapshot of the user's reports has arrived. */
  loaded: boolean;
  /** `navigator.onLine !== false`. */
  online: boolean;
  /** The latest snapshot was served from the local cache (no server confirmation yet). */
  fromCache: boolean;
  requests: readonly CitizenRequest[];
  /** Number of failed submissions from this page session. */
  failedCount: number;
}

export interface SyncSummary {
  kind: SyncSummaryKind;
  tone: SyncTone;
  online: boolean;
  /** Short badge for the page header. */
  badge: string;
  headline: string;
  detail: string;
  pendingCount: number;
  failedCount: number;
  /** Latest server-confirmed time among synchronized reports, or null. */
  lastConfirmedMs: number | null;
}

export const SYNC_PENDING_STATES: readonly SyncState[] = ["Pending sync", "Saved offline"];

export function countPending(requests: readonly CitizenRequest[]): number {
  return requests.filter((r) => SYNC_PENDING_STATES.includes(r.sync)).length;
}

export function latestConfirmedMs(requests: readonly CitizenRequest[]): number | null {
  let latest: number | null = null;
  for (const r of requests) {
    if (r.sync === "Synchronized" && typeof r.syncedAtMs === "number") {
      if (latest === null || r.syncedAtMs > latest) latest = r.syncedAtMs;
    }
  }
  return latest;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function summarizeSync(input: SyncSummaryInput): SyncSummary {
  const { loaded, online, fromCache, requests, failedCount } = input;
  const pendingCount = countPending(requests);
  const lastConfirmedMs = latestConfirmedMs(requests);
  const base = { online, pendingCount, failedCount, lastConfirmedMs };

  if (failedCount > 0) {
    return {
      ...base,
      kind: "failed",
      tone: "red",
      badge: `${failedCount} not sent`,
      headline: `${failedCount} ${plural(failedCount, "report", "reports")} could not be sent`,
      detail:
        "These were not received by RapidAID. Use Retry below. If this is an emergency, contact local emergency services directly.",
    };
  }

  if (!loaded) {
    return {
      ...base,
      kind: "checking",
      tone: "neutral",
      badge: online ? "Checking…" : "Offline",
      headline: "Checking your reports…",
      detail: "Loading the reports saved on this device.",
    };
  }

  if (pendingCount > 0) {
    if (!online) {
      return {
        ...base,
        kind: "offline-pending",
        tone: "amber",
        badge: `Offline · ${pendingCount} waiting`,
        headline: `${pendingCount} ${plural(pendingCount, "report", "reports")} saved on this device`,
        detail:
          "No network connection detected. Saved reports are sent automatically when the connection returns. They have not been received yet.",
      };
    }
    return {
      ...base,
      kind: "sending",
      tone: "amber",
      badge: `Sending ${pendingCount}`,
      headline: `Sending ${pendingCount} ${plural(pendingCount, "report", "reports")}…`,
      detail:
        "Saved on this device and waiting for the server to confirm. Keep this page open if you can.",
    };
  }

  if (!online) {
    return {
      ...base,
      kind: "offline-idle",
      tone: "neutral",
      badge: "Offline",
      headline: "No network connection detected",
      detail:
        "You can still write a report: it is saved on this device and sent when the connection returns. Reports shown here may be out of date.",
    };
  }

  if (fromCache) {
    return {
      ...base,
      kind: "unconfirmed",
      tone: "neutral",
      badge: "Connecting…",
      headline: "Waiting for the server to confirm",
      detail: "Showing reports saved on this device. Server status has not been confirmed yet.",
    };
  }

  return {
    ...base,
    kind: "all-sent",
    tone: "green",
    badge: "All sent",
    headline: requests.length === 0 ? "No pending reports" : "Every report has reached the server",
    detail:
      "Nothing is waiting on this device. This confirms delivery to RapidAID's servers only, not that a responder has acted.",
  };
}

/** Pending reports read "Saved offline" while the browser reports no network. */
export function displaySyncState(state: SyncState, online: boolean): SyncState {
  if (state === "Pending sync" && !online) return "Saved offline";
  return state;
}

/** Turns a failed in-session submission into a history row (it is not in Firestore). */
export function failedSubmissionToRequest(record: SubmissionRecord): CitizenRequest {
  const input = record.input;
  const location =
    input?.location?.address ??
    (input?.location
      ? `Lat: ${input.location.lat.toFixed(3)}, Lng: ${input.location.lng.toFixed(3)}`
      : "Location unavailable");
  return {
    id: record.reportId,
    category: input ? formatCategoryLabel(input.category) : "Report",
    location,
    reportedLabel: "Not sent",
    urgency: input ? mapReportUrgencyToCitizen(input.urgency) : "High",
    sync: "Failed",
    status: "Submitted",
    failure: record.error,
  };
}

/** Failed rows first, then Firestore's own list. A failed id is never also in the snapshot. */
export function mergeFailedSubmissions(
  requests: readonly CitizenRequest[],
  records: readonly SubmissionRecord[],
): CitizenRequest[] {
  const present = new Set(requests.map((r) => r.id));
  const failed = records
    .filter((r) => r.state === "failed" && !present.has(r.reportId))
    .map(failedSubmissionToRequest);
  return [...failed, ...requests];
}

export type SubmissionOutcomeTone = "success" | "pending" | "error";

export interface SubmissionOutcome {
  tone: SubmissionOutcomeTone;
  title: string;
  body: string;
}

/**
 * Wording for the result of one submission started in this session. `saved-locally` while online
 * means "sent, awaiting the server's acknowledgement"; it is never reported as received.
 */
export function describeSubmission(
  kind: "sos" | "quick-start" | "form",
  state: SubmissionRecord["state"],
  online: boolean,
): SubmissionOutcome {
  const noun = kind === "sos" ? "SOS" : "report";
  if (state === "failed") {
    return {
      tone: "error",
      title: `${kind === "sos" ? "SOS" : "Report"} not sent`,
      body: "It was not received by RapidAID. Try again, or contact local emergency services directly.",
    };
  }
  if (state === "synced") {
    return {
      tone: "success",
      title: `${kind === "sos" ? "SOS" : "Report"} received by RapidAID`,
      body: "The server has confirmed it. This does not guarantee a response: if you are in danger, contact local emergency services.",
    };
  }
  if (!online) {
    return {
      tone: "pending",
      title: `Saved on this device`,
      body: `No connection detected. Your ${noun} will be sent automatically when the connection returns. It has not been received yet.`,
    };
  }
  return {
    tone: "pending",
    title: `Sending your ${noun}…`,
    body: "Saved on this device. Waiting for the server to confirm receipt.",
  };
}
