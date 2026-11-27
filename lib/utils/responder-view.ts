/**
 * T5 - pure, Firebase-free helpers for the responder dashboards.
 *
 * Everything here derives its answer from REAL loaded reports. Nothing is invented: when there
 * is no data the helpers return zeros / nulls and the UI shows an honest empty state.
 *
 * Deliberately NOT here: duplicate hiding, merging, automatic escalation or acknowledgement
 * timers. Those belong to T6. Every report that is loaded stays visible (SOS reports included).
 */
import { ESCALATION_POLICY, type ReportUrgency } from "@/lib/constants/report";

/** Maximum number of reports a responder queue loads (Firestore `limit`). */
export const RESPONDER_QUEUE_LIMIT = 100;

// ---------------------------------------------------------------------------
// Shapes the helpers need (both Incident and RescueIncident satisfy these)
// ---------------------------------------------------------------------------

export interface QueueLike {
  id: string;
  /** Display label: "Critical" | "High" | "Normal". */
  urgency: string;
  /** Display status; "Resolved" is final. */
  status: string;
  /** True only while the report is still `received` (the policy's "unacknowledged"). */
  awaitingAcknowledgement: boolean;
  createdAtMs: number | null;
  timeline: TimelineLike[];
}

export interface TimelineLike {
  time: string;
  label: string;
  actor: string;
  atMs: number | null;
}

export function urgencyKey(label: string | null | undefined): ReportUrgency {
  const v = (label ?? "").toLowerCase();
  return v === "critical" ? "critical" : v === "high" ? "high" : "normal";
}

// ---------------------------------------------------------------------------
// Counts
// ---------------------------------------------------------------------------

export interface QueueSummary {
  total: number;
  active: number;
  critical: number;
  criticalAwaiting: number;
  awaitingAck: number;
  inProgress: number;
  assigned: number;
  resolved: number;
  units: number;
}

export function isResolved(item: Pick<QueueLike, "status">): boolean {
  return item.status === "Resolved";
}

export function summarizeQueue<T extends QueueLike>(
  items: readonly T[],
  getUnit: (item: T) => string | null,
): QueueSummary {
  const units = new Set<string>();
  const s: QueueSummary = {
    total: items.length,
    active: 0,
    critical: 0,
    criticalAwaiting: 0,
    awaitingAck: 0,
    inProgress: 0,
    assigned: 0,
    resolved: 0,
    units: 0,
  };
  for (const item of items) {
    if (isResolved(item)) {
      s.resolved += 1;
      continue;
    }
    s.active += 1;
    const critical = item.urgency === "Critical";
    if (critical) s.critical += 1;
    if (item.awaitingAcknowledgement) {
      s.awaitingAck += 1;
      if (critical) s.criticalAwaiting += 1;
    }
    if (item.status === "In progress") s.inProgress += 1;
    if (item.status === "Assigned") s.assigned += 1;
    const unit = getUnit(item);
    if (unit) units.add(unit);
  }
  s.units = units.size;
  return s;
}

export interface UnitSummary {
  unit: string;
  incidentIds: string[];
}

/** Distinct unit/team names entered by responders on ACTIVE incidents (RapidAID has no roster). */
export function summarizeUnits<T extends QueueLike>(
  items: readonly T[],
  getUnit: (item: T) => string | null,
): UnitSummary[] {
  const map = new Map<string, string[]>();
  for (const item of items) {
    if (isResolved(item)) continue;
    const unit = getUnit(item);
    if (!unit) continue;
    map.set(unit, [...(map.get(unit) ?? []), item.id]);
  }
  return [...map.entries()]
    .map(([unit, incidentIds]) => ({ unit, incidentIds }))
    .sort((a, b) => a.unit.localeCompare(b.unit));
}

/** The oldest active report that is still awaiting acknowledgement, or null. */
export function oldestAwaiting<T extends QueueLike>(items: readonly T[]): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (isResolved(item) || !item.awaitingAcknowledgement || item.createdAtMs === null) continue;
    if (best === null || item.createdAtMs < (best.createdAtMs ?? Infinity)) best = item;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Time labels (real timestamps only)
// ---------------------------------------------------------------------------

/** "mm:ss" under one hour, "Nh MMm" after; "—" when the start time is unknown. Never negative. */
export function elapsedLabel(fromMs: number | null, nowMs: number): string {
  if (fromMs === null || !Number.isFinite(fromMs)) return "—";
  const totalSeconds = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** "Just now", "4m ago", "3h ago", "2d ago" computed from `nowMs` so it can tick. */
export function agoLabel(fromMs: number | null, nowMs: number): string {
  if (fromMs === null || !Number.isFinite(fromMs)) return "Time unknown";
  const diff = nowMs - fromMs;
  if (diff < 60_000) return "Just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function clockLabel(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// ---------------------------------------------------------------------------
// Escalation policy (INFORMATIONAL only in T5; enforcement is T6)
// ---------------------------------------------------------------------------

export function policyThresholdLabel(level: ReportUrgency): string {
  if (level === "critical") return `${ESCALATION_POLICY.criticalAfterMinutes}m`;
  if (level === "high") return `${ESCALATION_POLICY.highAfterMinutes}m`;
  return "No limit";
}

export const POLICY_NOTE =
  "Informational policy thresholds. Automatic escalation is not active yet; escalate manually if needed.";

// ---------------------------------------------------------------------------
// Activity feed (from the real activityTrail of loaded reports)
// ---------------------------------------------------------------------------

export interface ActivityItem {
  ref: string;
  label: string;
  actor: string;
  time: string;
  atMs: number | null;
}

export function buildActivityFeed<T extends QueueLike>(
  items: readonly T[],
  limit = 8,
): ActivityItem[] {
  const all: ActivityItem[] = [];
  for (const item of items) {
    for (const entry of item.timeline) {
      all.push({ ref: item.id, label: entry.label, actor: entry.actor, time: entry.time, atMs: entry.atMs });
    }
  }
  all.sort((a, b) => (b.atMs ?? -Infinity) - (a.atMs ?? -Infinity));
  return all.slice(0, Math.max(0, limit));
}

// ---------------------------------------------------------------------------
// Queue state (loading / ready / error) and honest connection state
// ---------------------------------------------------------------------------

/** What a Firestore listener error looks like to the UI (FirestoreError satisfies this). */
export interface QueueErrorLike {
  code?: string;
  message: string;
}

export interface QueueMetaLike {
  /** The snapshot came from the local cache: the server has not confirmed it. */
  fromCache: boolean;
  /** The limit was reached, so older / lower-priority reports may not be loaded. */
  truncated: boolean;
  /** Documents that could not be displayed because they had an unexpected format. */
  skipped: number;
}

export interface QueueErrorInfo {
  kind: "permission" | "index" | "offline" | "auth" | "unknown";
  title: string;
  message: string;
}

export function describeQueueError(error: QueueErrorLike | null | undefined): QueueErrorInfo {
  const code = (error?.code ?? "").replace(/^firestore\//, "");
  switch (code) {
    case "permission-denied":
      return {
        kind: "permission",
        title: "Access to this queue was denied",
        message:
          "Your account is not allowed to read these reports. Sign out and back in; if it persists, ask an administrator to check your role.",
      };
    case "unauthenticated":
      return {
        kind: "auth",
        title: "You are signed out",
        message: "Sign in again to load the queue.",
      };
    case "failed-precondition":
      return {
        kind: "index",
        title: "The queue query is not ready",
        message:
          "The Firestore index for this queue (assignedDashboard, urgencyWeight, createdAt) is missing or still building. The project owner must deploy firestore.indexes.json and wait for the index to finish. Nothing is shown rather than an incomplete, unordered list.",
      };
    case "unavailable":
      return {
        kind: "offline",
        title: "Cannot reach the server",
        message: "Check your connection. The queue will load when the server is reachable.",
      };
    default:
      return {
        kind: "unknown",
        title: "The queue could not be loaded",
        message: "An unexpected error occurred while loading reports. Try again.",
      };
  }
}

export interface QueueState<T> {
  status: "loading" | "ready" | "error";
  items: T[];
  error: QueueErrorInfo | null;
  fromCache: boolean;
  truncated: boolean;
  skipped: number;
}

export type QueueAction<T> =
  | { type: "snapshot"; items: T[]; meta: QueueMetaLike }
  | { type: "error"; error: QueueErrorLike }
  | { type: "reset" };

export function initialQueueState<T>(): QueueState<T> {
  return { status: "loading", items: [], error: null, fromCache: false, truncated: false, skipped: 0 };
}

export function queueReducer<T>(state: QueueState<T>, action: QueueAction<T>): QueueState<T> {
  switch (action.type) {
    case "snapshot":
      return {
        status: "ready",
        items: action.items,
        error: null,
        fromCache: action.meta.fromCache,
        truncated: action.meta.truncated,
        skipped: action.meta.skipped,
      };
    case "error":
      // Never keep showing old rows as if they were current after the listener has failed.
      return { ...initialQueueState<T>(), status: "error", error: describeQueueError(action.error) };
    case "reset":
      return initialQueueState<T>();
    default:
      return state;
  }
}

export type LiveState = "connecting" | "live" | "cached" | "error";

/** The header's "Live" indicator. "live" only when the server has confirmed the snapshot. */
export function liveStateOf<T>(state: Pick<QueueState<T>, "status" | "fromCache">): LiveState {
  if (state.status === "error") return "error";
  if (state.status === "loading") return "connecting";
  return state.fromCache ? "cached" : "live";
}

export const LIVE_STATE_TEXT: Record<LiveState, string> = {
  connecting: "Connecting…",
  live: "Live · synchronized",
  cached: "Saved data · not confirmed live",
  error: "Not connected",
};
