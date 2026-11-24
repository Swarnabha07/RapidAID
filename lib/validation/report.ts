/**
 * Shared, browser-safe report validation and document building.
 *
 * Used by BOTH the client (`createReport` in lib/firebase/firestore.ts) and the server fallback
 * (`POST /api/reports`), so the two creation paths always produce the same document.
 * It must stay free of Firebase, Firebase Admin and any server-only import.
 */
import {
  CITIZEN_CONFIDENCE_SCORE,
  CITIZEN_PROCESSED_BY,
  INITIAL_TRAIL,
  LANGUAGE_PATTERN,
  REPORT_CATEGORIES,
  REPORT_ID_PATTERN,
  REPORT_LIMITS,
  REPORT_URGENCIES,
  SERVER_FALLBACK_NOTE,
  dashboardForCategory,
  urgencyWeightOf,
  type ReportCategory,
  type ReportDashboard,
  type ReportProcessor,
  type ReportStatus,
  type ReportUrgency,
  type ReportUrgencyWeight,
} from "@/lib/constants/report";

export type ValidationFailure = { ok: false; status: 400; error: string };

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
// Validation of a citizen report request
// ---------------------------------------------------------------------------

export interface ValidatedNewReport {
  reportId: string | null;
  category: ReportCategory;
  urgency: ReportUrgency;
  description: string;
  translatedDescription: string | null;
  originalLanguage: string;
  isSOS: boolean;
  location: { lat: number; lng: number; address?: string; zone?: string };
  peopleAffected: number;
  reportedInjuries: string | null;
  accessConditions: string | null;
}

/**
 * Validates and normalises what a citizen may send. Server-controlled values (owner, status,
 * weight, dashboard, timestamps, media) are never read from the input, and neither are
 * `processedBy` / `confidenceScore`: a citizen cannot claim that AI processed a report.
 */
export function validateNewReport(
  body: unknown
): { ok: true; value: ValidatedNewReport } | ValidationFailure {
  const bad = (error: string): ValidationFailure => ({ ok: false, status: 400, error });
  if (!isPlainObject(body)) return bad("Request body must be a JSON object.");

  if (
    typeof body.category !== "string" ||
    !(REPORT_CATEGORIES as readonly string[]).includes(body.category)
  ) {
    return bad(`Invalid or missing category. Must be one of: ${REPORT_CATEGORIES.join(", ")}`);
  }
  const category = body.category as ReportCategory;

  if (
    typeof body.urgency !== "string" ||
    !(REPORT_URGENCIES as readonly string[]).includes(body.urgency)
  ) {
    return bad(`Invalid or missing urgency. Must be one of: ${REPORT_URGENCIES.join(", ")}`);
  }

  const isSOS = body.isSOS === true;
  // An SOS is always critical (same rule as the client and firestore.rules).
  const urgency: ReportUrgency = isSOS ? "critical" : (body.urgency as ReportUrgency);

  const description = cleanText(body.description, 1, REPORT_LIMITS.description);
  if (!description) {
    return bad(`Description is required (1-${REPORT_LIMITS.description} characters).`);
  }

  let translatedDescription: string | null = null;
  if (body.translatedDescription !== undefined && body.translatedDescription !== null) {
    translatedDescription = cleanText(
      body.translatedDescription,
      1,
      REPORT_LIMITS.translatedDescription
    );
    if (!translatedDescription) {
      return bad(
        `translatedDescription must be 1-${REPORT_LIMITS.translatedDescription} characters when provided.`
      );
    }
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
  const location: ValidatedNewReport["location"] = { lat: loc.lat, lng: loc.lng };
  if (loc.address !== undefined && loc.address !== null && loc.address !== "") {
    const address = cleanText(loc.address, 1, REPORT_LIMITS.address);
    if (!address) return bad(`location.address must be at most ${REPORT_LIMITS.address} characters.`);
    location.address = address;
  }
  if (loc.zone !== undefined && loc.zone !== null && loc.zone !== "") {
    const zone = cleanText(loc.zone, 1, REPORT_LIMITS.zone);
    if (!zone) return bad(`location.zone must be at most ${REPORT_LIMITS.zone} characters.`);
    location.zone = zone;
  }

  let reportId: string | null = null;
  if (body.reportId !== undefined && body.reportId !== null) {
    if (typeof body.reportId !== "string" || !REPORT_ID_PATTERN.test(body.reportId)) {
      return bad("reportId must be 8-64 characters: letters, digits, '_' or '-'.");
    }
    reportId = body.reportId;
  }

  let peopleAffected: number = REPORT_LIMITS.peopleAffectedMin;
  if (body.peopleAffected !== undefined && body.peopleAffected !== null) {
    if (
      typeof body.peopleAffected !== "number" ||
      !Number.isInteger(body.peopleAffected) ||
      body.peopleAffected < REPORT_LIMITS.peopleAffectedMin ||
      body.peopleAffected > REPORT_LIMITS.peopleAffectedMax
    ) {
      return bad(
        `peopleAffected must be a whole number between ${REPORT_LIMITS.peopleAffectedMin} and ${REPORT_LIMITS.peopleAffectedMax}.`
      );
    }
    peopleAffected = body.peopleAffected;
  }

  let reportedInjuries: string | null = null;
  if (body.reportedInjuries !== undefined && body.reportedInjuries !== null && body.reportedInjuries !== "") {
    reportedInjuries = cleanText(body.reportedInjuries, 1, REPORT_LIMITS.reportedInjuries);
    if (!reportedInjuries) {
      return bad(`reportedInjuries must be at most ${REPORT_LIMITS.reportedInjuries} characters.`);
    }
  }

  let accessConditions: string | null = null;
  if (body.accessConditions !== undefined && body.accessConditions !== null && body.accessConditions !== "") {
    accessConditions = cleanText(body.accessConditions, 1, REPORT_LIMITS.accessConditions);
    if (!accessConditions) {
      return bad(`accessConditions must be at most ${REPORT_LIMITS.accessConditions} characters.`);
    }
  }

  return {
    ok: true,
    value: {
      reportId,
      category,
      urgency,
      description,
      translatedDescription,
      originalLanguage,
      isSOS,
      location,
      peopleAffected,
      reportedInjuries,
      accessConditions,
    },
  };
}

// ---------------------------------------------------------------------------
// Building the initial document
// ---------------------------------------------------------------------------

export interface NewReportFields {
  reportId: string;
  userId: string;
  category: ReportCategory;
  urgency: ReportUrgency;
  urgencyWeight: ReportUrgencyWeight;
  description: string;
  translatedDescription: string | null;
  originalLanguage: string;
  isSOS: boolean;
  location: ValidatedNewReport["location"];
  mediaUrl: null;
  processedBy: ReportProcessor;
  confidenceScore: null;
  status: ReportStatus;
  assignedDashboard: ReportDashboard;
  isDuplicateOf: null;
  escalated: false;
  escalatedAt: null;
  assignedTeamOrUnit: null;
  acknowledgedAt: null;
  resolvedNotes: null;
  peopleAffected: number;
  reportedInjuries: string | null;
  /** Present only when the citizen provided it. */
  accessConditions?: string;
}

/**
 * Builds every non-timestamp field of a new citizen report. The caller adds `createdAt`,
 * `syncedAt`, `updatedAt` (client or server timestamp) and `activityTrail`.
 *
 * Provenance is fixed: `processedBy: "manual"` and `confidenceScore: null`. No AI ran, so no AI
 * provenance or confidence is invented. Trusted server-side processing (T3 onwards) may set other
 * values later, only when processing has really happened.
 */
export function buildNewReportFields(
  v: ValidatedNewReport,
  ctx: { reportId: string; userId: string }
): NewReportFields {
  const fields: NewReportFields = {
    reportId: ctx.reportId,
    userId: ctx.userId,
    category: v.category,
    urgency: v.urgency,
    urgencyWeight: urgencyWeightOf(v.urgency),
    description: v.description,
    translatedDescription: v.translatedDescription,
    originalLanguage: v.originalLanguage,
    isSOS: v.isSOS,
    location: v.location,
    mediaUrl: null, // uploads are not supported; never store caller-supplied URLs
    processedBy: CITIZEN_PROCESSED_BY,
    confidenceScore: CITIZEN_CONFIDENCE_SCORE,
    status: "received",
    assignedDashboard: dashboardForCategory(v.category),
    isDuplicateOf: null,
    escalated: false,
    escalatedAt: null,
    assignedTeamOrUnit: null,
    acknowledgedAt: null,
    resolvedNotes: null,
    peopleAffected: v.peopleAffected,
    reportedInjuries: v.reportedInjuries,
  };
  if (v.accessConditions) fields.accessConditions = v.accessConditions;
  return fields;
}

/** The single initial activity-trail entry of a new citizen report. */
export function buildInitialTrailEntry(input: {
  id: string;
  isSOS: boolean;
  actorRole: string;
  timestamp: string;
  viaServerFallback?: boolean;
}): {
  id: string;
  action: string;
  actorRole: string;
  note: string | null;
  timestamp: string;
} {
  const base = input.isSOS ? INITIAL_TRAIL.sos : INITIAL_TRAIL.standard;
  let note: string | null = base.note;
  if (input.viaServerFallback) {
    note = note ? `${note} · ${SERVER_FALLBACK_NOTE}` : SERVER_FALLBACK_NOTE;
  }
  return {
    id: input.id,
    action: base.action,
    actorRole: input.actorRole,
    note,
    timestamp: input.timestamp,
  };
}
