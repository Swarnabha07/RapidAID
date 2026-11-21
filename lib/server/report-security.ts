/**
 * Pure (Firebase-free) validation and state-transition rules for reports.
 * Used by the server routes so every privileged write is checked in one place,
 * and so the logic can be unit-tested without Firestore.
 */
import type {
  ReportCategory,
  ReportUrgency,
  ReportUrgencyWeight,
  ReportStatus,
  ReportDashboard,
  ReportProcessor,
} from "@/lib/types/report";

export const REPORT_CATEGORIES: readonly ReportCategory[] = [
  "medical",
  "water",
  "shelter",
  "missing_person",
  "other",
];
export const REPORT_URGENCIES: readonly ReportUrgency[] = ["critical", "high", "normal"];

const MAX_DESCRIPTION = 1000;
const MAX_ADDRESS = 300;
const MAX_ZONE = 100;
const MAX_SHORT_TEXT = 500;
const MAX_NOTE = 500;
const MAX_RESOLUTION_NOTE = 1000;
const MAX_UNIT_NAME = 80;

const REPORT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

export function urgencyWeightOf(urgency: ReportUrgency): ReportUrgencyWeight {
  if (urgency === "critical") return 3;
  if (urgency === "high") return 2;
  return 1;
}

export function dashboardForCategory(category: ReportCategory): ReportDashboard {
  return category === "medical" ? "medical" : "rescue";
}

type Failure = { ok: false; status: 400 | 403 | 404 | 409; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Trims text, removes control characters (keeps newlines/tabs) and enforces a length range.
 * Returns null when the value is not a string or is out of range.
 */
export function cleanText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (cleaned.length < min || cleaned.length > max) return null;
  return cleaned;
}

// ---------------------------------------------------------------------------
// Report creation (server fallback for POST /api/reports)
// ---------------------------------------------------------------------------

export interface ValidatedNewReport {
  reportId: string | null;
  category: ReportCategory;
  urgency: ReportUrgency;
  description: string;
  translatedDescription: string | null;
  originalLanguage: string;
  isSOS: boolean;
  location: { lat: number; lng: number; address: string; zone: string };
  processedBy: ReportProcessor;
  confidenceScore: number;
  peopleAffected: number;
  reportedInjuries: string | null;
  accessConditions: string | null;
}

export function validateNewReport(
  body: unknown
): { ok: true; value: ValidatedNewReport } | Failure {
  const bad = (error: string): Failure => ({ ok: false, status: 400, error });
  if (!isPlainObject(body)) return bad("Request body must be a JSON object.");

  if (typeof body.category !== "string" || !REPORT_CATEGORIES.includes(body.category as ReportCategory)) {
    return bad(`Invalid or missing category. Must be one of: ${REPORT_CATEGORIES.join(", ")}`);
  }
  const category = body.category as ReportCategory;

  if (typeof body.urgency !== "string" || !REPORT_URGENCIES.includes(body.urgency as ReportUrgency)) {
    return bad(`Invalid or missing urgency. Must be one of: ${REPORT_URGENCIES.join(", ")}`);
  }

  const isSOS = body.isSOS === true;
  // An SOS is always critical (same rule as the client).
  const urgency: ReportUrgency = isSOS ? "critical" : (body.urgency as ReportUrgency);

  const description = cleanText(body.description, 1, MAX_DESCRIPTION);
  if (!description) return bad(`Description is required (1-${MAX_DESCRIPTION} characters).`);

  let translatedDescription: string | null = null;
  if (body.translatedDescription !== undefined && body.translatedDescription !== null) {
    translatedDescription = cleanText(body.translatedDescription, 1, MAX_DESCRIPTION);
    if (!translatedDescription) return bad("translatedDescription must be 1-1000 characters when provided.");
  }

  let originalLanguage = "en";
  if (body.originalLanguage !== undefined && body.originalLanguage !== null) {
    if (typeof body.originalLanguage !== "string" || !LANGUAGE_PATTERN.test(body.originalLanguage)) {
      return bad("originalLanguage must be a language code such as 'en' or 'hi'.");
    }
    originalLanguage = body.originalLanguage;
  }

  const loc = body.location;
  if (
    !isPlainObject(loc) ||
    typeof loc.lat !== "number" ||
    typeof loc.lng !== "number" ||
    !Number.isFinite(loc.lat) ||
    !Number.isFinite(loc.lng) ||
    loc.lat < -90 ||
    loc.lat > 90 ||
    loc.lng < -180 ||
    loc.lng > 180
  ) {
    return bad("A valid location with numeric 'lat' (-90..90) and 'lng' (-180..180) is required.");
  }
  let address = "";
  if (loc.address !== undefined && loc.address !== null && loc.address !== "") {
    const a = cleanText(loc.address, 1, MAX_ADDRESS);
    if (!a) return bad(`location.address must be at most ${MAX_ADDRESS} characters.`);
    address = a;
  }
  let zone = "";
  if (loc.zone !== undefined && loc.zone !== null && loc.zone !== "") {
    const z = cleanText(loc.zone, 1, MAX_ZONE);
    if (!z) return bad(`location.zone must be at most ${MAX_ZONE} characters.`);
    zone = z;
  }

  let reportId: string | null = null;
  if (body.reportId !== undefined && body.reportId !== null) {
    if (typeof body.reportId !== "string" || !REPORT_ID_PATTERN.test(body.reportId)) {
      return bad("reportId must be 8-64 characters: letters, digits, '_' or '-'.");
    }
    reportId = body.reportId;
  }

  // Advisory values from the device. They never grant privileges.
  const processedBy: ReportProcessor = body.processedBy === "on-device" ? "on-device" : "cloud";
  const confidenceScore =
    typeof body.confidenceScore === "number" && Number.isFinite(body.confidenceScore)
      ? Math.max(0, Math.min(1, body.confidenceScore))
      : 0.95;

  let peopleAffected = 1;
  if (body.peopleAffected !== undefined && body.peopleAffected !== null) {
    if (
      typeof body.peopleAffected !== "number" ||
      !Number.isInteger(body.peopleAffected) ||
      body.peopleAffected < 1 ||
      body.peopleAffected > 500
    ) {
      return bad("peopleAffected must be a whole number between 1 and 500.");
    }
    peopleAffected = body.peopleAffected;
  }

  let reportedInjuries: string | null = null;
  if (body.reportedInjuries !== undefined && body.reportedInjuries !== null && body.reportedInjuries !== "") {
    reportedInjuries = cleanText(body.reportedInjuries, 1, MAX_SHORT_TEXT);
    if (!reportedInjuries) return bad(`reportedInjuries must be at most ${MAX_SHORT_TEXT} characters.`);
  }

  let accessConditions: string | null = null;
  if (body.accessConditions !== undefined && body.accessConditions !== null && body.accessConditions !== "") {
    accessConditions = cleanText(body.accessConditions, 1, MAX_SHORT_TEXT);
    if (!accessConditions) return bad(`accessConditions must be at most ${MAX_SHORT_TEXT} characters.`);
  }

  return {
    ok: true,
    value: {
      reportId,
      category,
      urgency,
      description,
      // Existing behaviour: fall back to the original text. Schema cleanup is planned for T2.
      translatedDescription: translatedDescription ?? description,
      originalLanguage,
      isSOS,
      location: { lat: loc.lat, lng: loc.lng, address, zone },
      processedBy,
      confidenceScore,
      peopleAffected,
      reportedInjuries,
      accessConditions,
    },
  };
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
  escalationLog: null | {
    reportId: string;
    type: "manual";
    reason: string;
    previousUrgency: ReportUrgency;
    newUrgency: ReportUrgency;
    actor: string;
    actorName: string;
    actorRole: string;
  };
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
