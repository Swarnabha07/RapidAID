/**
 * T3 - AI suggestion constants.
 *
 * Deliberately has NO imports so it can be used from tests and from any
 * runtime. AI output is advisory only: nothing in this file (or in lib/ai)
 * is allowed to change how reports are stored (see processedBy in T2).
 */

/** Free-tier Gemini Developer API model used for the cloud path. */
export const DEFAULT_CLOUD_MODEL = "gemini-3.5-flash-lite";

/** Shape check only. A hard-coded allow-list would go stale as models rotate. */
export const MODEL_NAME_PATTERN = /^gemini-[a-z0-9][a-z0-9.-]{1,59}$/;

export function resolveModelName(configured: string | null | undefined): string {
  const candidate = (configured ?? "").trim();
  return MODEL_NAME_PATTERN.test(candidate) ? candidate : DEFAULT_CLOUD_MODEL;
}

/** On-device results below this confidence are retried once in the cloud. */
export const AI_CONFIDENCE_RETRY_THRESHOLD = 0.8;

export const AI_ATTEMPT_TIMEOUT_MS = 10_000;
export const AI_OVERALL_TIMEOUT_MS = 15_000;
/** Courtesy debounce against double taps. NOT a security control. */
export const AI_COOLDOWN_MS = 3_000;

/** Mirrors REPORT_LIMITS.description (asserted in tests). */
export const AI_INPUT_MAX_CHARS = 1000;
/** Mirrors REPORT_LIMITS.peopleAffectedMax (asserted in tests). */
export const AI_PEOPLE_MAX = 500;

export const AI_TEMPERATURE = 0.1;
export const AI_MAX_OUTPUT_TOKENS = 1024;

export const AI_DISCLAIMER = "Not a diagnosis. Authorized human review required.";
export const AI_SUGGESTION_NOTICE =
  "Suggestion only. Nothing is saved or submitted until you confirm it.";
