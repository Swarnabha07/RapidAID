/**
 * Canonical report constants: the single source for the client, the server routes, the unit
 * tests and (by comment + drift test) `firestore.rules`.
 *
 * This module has NO imports so it is safe in the browser, in Next.js route handlers and in
 * plain node tests. `firestore.rules` cannot import TypeScript, so the rules repeat these
 * values; `tests/schema/constants-rules-drift.test.ts` fails if the two disagree.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const REPORT_CATEGORIES = [
  "medical",
  "water",
  "shelter",
  "missing_person",
  "other",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_URGENCIES = ["critical", "high", "normal"] as const;
export type ReportUrgency = (typeof REPORT_URGENCIES)[number];

export const REPORT_STATUSES = [
  "received",
  "in_progress",
  "dispatched",
  "resolved",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_DASHBOARDS = ["medical", "rescue"] as const;
export type ReportDashboard = (typeof REPORT_DASHBOARDS)[number];

/**
 * How a report's category/urgency was produced.
 *  - "manual":     a person chose them; NO AI ran. The only value a citizen write may carry.
 *  - "on-device" / "cloud": reserved for trusted processing that really ran (T3 onwards).
 */
export const REPORT_PROCESSORS = ["on-device", "cloud", "manual"] as const;
export type ReportProcessor = (typeof REPORT_PROCESSORS)[number];

/** Provenance stamped on every citizen-created report. Citizens cannot choose another one. */
export const CITIZEN_PROCESSED_BY: ReportProcessor = "manual";
/** Confidence stamped on every citizen-created report (no AI ran, so there is none). */
export const CITIZEN_CONFIDENCE_SCORE = null;

// ---------------------------------------------------------------------------
// Urgency weight and dashboard routing
// ---------------------------------------------------------------------------

export const URGENCY_WEIGHTS = { critical: 3, high: 2, normal: 1 } as const;
export type ReportUrgencyWeight = (typeof URGENCY_WEIGHTS)[ReportUrgency];

export function urgencyWeightOf(urgency: ReportUrgency): ReportUrgencyWeight {
  return URGENCY_WEIGHTS[urgency] ?? URGENCY_WEIGHTS.normal;
}

/** "medical" category goes to the medical dashboard; every other category goes to rescue. */
export function dashboardForCategory(category: ReportCategory): ReportDashboard {
  return category === "medical" ? "medical" : "rescue";
}

// ---------------------------------------------------------------------------
// Limits and patterns
// ---------------------------------------------------------------------------

export const REPORT_LIMITS = {
  description: 1000,
  translatedDescription: 1000,
  address: 300,
  zone: 100,
  reportedInjuries: 500,
  accessConditions: 500,
  note: 500,
  resolutionNote: 1000,
  unitName: 80,
  peopleAffectedMin: 1,
  peopleAffectedMax: 500,
} as const;

export const REPORT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
export const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

// ---------------------------------------------------------------------------
// Citizen-create document shape (must match isValidNewReport in firestore.rules)
// ---------------------------------------------------------------------------

/** Keys every citizen-created report must contain. */
export const NEW_REPORT_REQUIRED_KEYS = [
  "reportId",
  "userId",
  "category",
  "urgency",
  "urgencyWeight",
  "description",
  "translatedDescription",
  "originalLanguage",
  "isSOS",
  "location",
  "mediaUrl",
  "processedBy",
  "confidenceScore",
  "status",
  "assignedDashboard",
  "isDuplicateOf",
  "escalated",
  "escalatedAt",
  "createdAt",
  "syncedAt",
  "updatedAt",
  "assignedTeamOrUnit",
  "acknowledgedAt",
  "resolvedNotes",
  "activityTrail",
  "peopleAffected",
  "reportedInjuries",
] as const;

/** Keys a citizen-created report MAY contain; written only when the citizen provided a value. */
export const NEW_REPORT_OPTIONAL_KEYS = ["accessConditions"] as const;

/**
 * Keys the caller adds itself because the timestamp / server-timestamp types differ between the
 * client SDK and the Admin SDK. Everything else comes from buildNewReportFields().
 */
export const NEW_REPORT_CALLER_KEYS = [
  "createdAt",
  "syncedAt",
  "updatedAt",
  "activityTrail",
] as const;

// ---------------------------------------------------------------------------
// Initial activity-trail wording (client wording is canonical)
// ---------------------------------------------------------------------------

export const INITIAL_TRAIL = {
  sos: { action: "⚡ Emergency SOS Triggered", note: "Instant SOS beacon" },
  standard: { action: "Emergency report created", note: null },
} as const;

/** Appended to the note when the report was created by the server fallback route. */
export const SERVER_FALLBACK_NOTE = "Submitted via server fallback";

// ---------------------------------------------------------------------------
// Escalation policy (consumed by the T6 sweep and the Escalation Watch UI; not used before T6)
// ---------------------------------------------------------------------------

export const ESCALATION_POLICY = {
  /** Unacknowledged = status "received". Minutes before an unacknowledged report escalates. */
  criticalAfterMinutes: 10,
  highAfterMinutes: 20,
  /** Interval of the scheduled / on-demand sweep. */
  sweepIntervalMinutes: 5,
} as const;
