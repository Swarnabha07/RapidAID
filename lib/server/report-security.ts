/**
 * Server-side responder-action rules (state machine) for reports.
 * Used by PATCH /api/reports/[id] so every privileged write is checked in one place, and so the
 * logic can be unit-tested without Firestore.
 *
 * Shared constants and the citizen-report validation now live in `lib/constants/report.ts` and
 * `lib/validation/report.ts` (browser-safe, used by the client too). They are re-exported here so
 * existing imports keep working.
 */
import type { ReportStatus, ReportUrgency } from "@/lib/constants/report";
import {
  REPORT_LIMITS,
  REPORT_URGENCIES,
  urgencyWeightOf,
} from "@/lib/constants/report";
import { cleanText } from "@/lib/validation/report";
import type { EscalationLogEntry } from "@/lib/types/escalation-log";

export {
  REPORT_CATEGORIES,
  REPORT_URGENCIES,
  urgencyWeightOf,
  dashboardForCategory,
} from "@/lib/constants/report";
export { cleanText, validateNewReport } from "@/lib/validation/report";
export type { ValidatedNewReport } from "@/lib/validation/report";

const MAX_NOTE = REPORT_LIMITS.note;
const MAX_RESOLUTION_NOTE = REPORT_LIMITS.resolutionNote;
const MAX_UNIT_NAME = REPORT_LIMITS.unitName;

type Failure = { ok: false; status: 400 | 403 | 404 | 409; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Responder actions (PATCH /api/reports/[id])
// ---------------------------------------------------------------------------

export type ReportActionName = "acknowledge" | "assign" | "escalate" | "resolve";

const ALLOWED_FROM: Record<ReportActionName, readonly ReportStatus[]> = {
  acknowledge: ["received"],
  assign: ["received", "in_progress", "dispatched"],
  escalate: ["received", "in_progress", "dispatched"],
  resolve: ["received", "in_progress", "dispatched"],
};

export interface ReportActor {
  uid: string;
  role: string;
  name: string;
}

export interface ReportActionPlan {
  ok: true;
  action: ReportActionName;
  /** Plain values to write. Server timestamps / increments are listed separately. */
  fields: Record<string, unknown>;
  serverTimestampFields: string[];
  incrementEscalationLevel: boolean;
  trailEntry: {
    id: string;
    action: string;
    actorRole: string;
    actorUid: string;
    actorName: string;
    note: string | null;
    timestamp: string;
  };
  escalationLog: null | (Omit<EscalationLogEntry, "logId" | "triggeredAt" | "type"> & {
    type: "manual";
  });
}

function isStatus(value: unknown): value is ReportStatus {
  return value === "received" || value === "in_progress" || value === "dispatched" || value === "resolved";
}

/**
 * Decides whether a responder action is allowed and what exactly to write.
 * Never trusts identity, timestamps, urgency weights or dashboards from the request body.
 */
export function planReportAction(input: {
  reportId: string;
  report: Record<string, unknown>;
  actor: ReportActor;
  body: unknown;
  now: Date;
  newId: () => string;
}): ReportActionPlan | Failure {
  const { reportId, report, actor, body, now, newId } = input;
  const fail = (status: Failure["status"], error: string): Failure => ({ ok: false, status, error });

  if (!isPlainObject(body)) return fail(400, "Request body must be a JSON object.");

  // Defence in depth: the route already requires a responder token.
  const role = actor.role;
  if (role !== "medical" && role !== "rescue" && role !== "admin") {
    return fail(403, "Forbidden: responder privileges required.");
  }
  // Medical and rescue responders can only act on their own dashboard. Admin can act on both.
  if (role !== "admin" && report.assignedDashboard !== role) {
    return fail(403, `Forbidden: this report belongs to the ${String(report.assignedDashboard)} dashboard.`);
  }

  const action = body.action;
  if (action !== "acknowledge" && action !== "assign" && action !== "escalate" && action !== "resolve") {
    return fail(400, "Invalid action. Must be one of: acknowledge, assign, escalate, resolve.");
  }

  const status = report.status;
  if (!isStatus(status)) return fail(409, "Report has an unrecognised status and cannot be changed.");
  if (!ALLOWED_FROM[action].includes(status)) {
    return fail(409, `Cannot ${action} a report that is '${status}'.`);
  }

  const fields: Record<string, unknown> = {};
  const serverTimestampFields: string[] = [];
  let incrementEscalationLevel = false;
  let escalationLog: ReportActionPlan["escalationLog"] = null;
  let trailAction: string;
  let trailNote: string | null;

  const optionalNote = (value: unknown, max: number): string | null | undefined => {
    if (value === undefined || value === null || value === "") return null;
    const cleaned = cleanText(value, 1, max);
    return cleaned === null ? undefined : cleaned; // undefined = invalid
  };

  if (action === "acknowledge") {
    const note = optionalNote(body.note, MAX_NOTE);
    if (note === undefined) return fail(400, `note must be at most ${MAX_NOTE} characters.`);
    fields.status = "in_progress";
    fields.acknowledgedBy = actor.name;
    fields.acknowledgedByUid = actor.uid;
    serverTimestampFields.push("acknowledgedAt");
    trailAction = "Incident acknowledged";
    trailNote = note ?? "Acknowledgement confirmed by coordinator";
  } else if (action === "assign") {
    const unit = cleanText(body.unitName, 1, MAX_UNIT_NAME);
    if (!unit) return fail(400, `unitName is required (1-${MAX_UNIT_NAME} characters).`);
    const note = optionalNote(body.note, MAX_NOTE);
    if (note === undefined) return fail(400, `note must be at most ${MAX_NOTE} characters.`);
    fields.assignedTeamOrUnit = unit;
    fields.status = "dispatched";
    trailAction = `Unit assigned: ${unit}`;
    trailNote = note ?? `Assigned to ${unit}`;
  } else if (action === "escalate") {
    if (body.urgency !== "critical" && body.urgency !== "high") {
      return fail(400, "Escalation urgency must be 'critical' or 'high'.");
    }
    const target: ReportUrgency = body.urgency;
    const reason = cleanText(body.reason, 3, MAX_NOTE);
    if (!reason) return fail(400, `reason is required (3-${MAX_NOTE} characters).`);
    const previous: ReportUrgency = REPORT_URGENCIES.includes(report.urgency as ReportUrgency)
      ? (report.urgency as ReportUrgency)
      : "normal";
    if (urgencyWeightOf(target) < urgencyWeightOf(previous)) {
      return fail(400, "Escalation cannot lower the urgency of a report.");
    }
    fields.escalated = true;
    fields.urgency = target;
    fields.urgencyWeight = urgencyWeightOf(target);
    serverTimestampFields.push("escalatedAt");
    incrementEscalationLevel = true;
    trailAction = `Escalated to ${target.toUpperCase()}`;
    trailNote = reason;
    escalationLog = {
      reportId,
      type: "manual",
      reason,
      previousUrgency: previous,
      newUrgency: target,
      actor: actor.uid,
      actorName: actor.name,
      actorRole: role,
    };
  } else {
    const resolution = cleanText(body.resolutionNote, 3, MAX_RESOLUTION_NOTE);
    if (!resolution) return fail(400, `resolutionNote is required (3-${MAX_RESOLUTION_NOTE} characters).`);
    fields.status = "resolved";
    fields.resolvedNotes = resolution;
    trailAction = "Incident resolved";
    trailNote = resolution;
  }

  return {
    ok: true,
    action,
    fields,
    serverTimestampFields,
    incrementEscalationLevel,
    trailEntry: {
      id: newId(),
      action: trailAction,
      actorRole: role,
      actorUid: actor.uid,
      actorName: actor.name,
      note: trailNote,
      timestamp: now.toISOString(),
    },
    escalationLog,
  };
}
