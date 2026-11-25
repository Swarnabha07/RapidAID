import type { ReportCategory, ReportUrgency } from "@/lib/constants/report";

/** Validated, advisory output of the classifier. Never persisted by T3. */
export interface AiSuggestion {
  category: ReportCategory;
  urgency: ReportUrgency;
  /** Lower-case ISO 639-1/-2 style code, or null when the model gave none. */
  language: string | null;
  /** English translation for non-English reports, otherwise null. */
  translation: string | null;
  /**
   * Only set when the report text explicitly states a number of people.
   * Never an estimate. null means "leave the user's / default value".
   */
  peopleAffectedStated: number | null;
  /** Model-estimated, uncalibrated, 0..1. */
  confidence: number;
}

/** Where the answer actually came from, as reported by the SDK. Transient. */
export type AiSource = "on-device" | "cloud";

export const AI_FAILURE_CODES = [
  "empty-input",
  "cooldown",
  "offline",
  "ai-unavailable",
  "access-denied",
  "rate-limited",
  "timeout",
  "invalid-output",
  "cancelled",
] as const;
export type AiFailureCode = (typeof AI_FAILURE_CODES)[number];

/** Neutral, user-safe wording. Never blames the user, never mentions keys. */
export const AI_FAILURE_MESSAGES: Record<AiFailureCode, string> = {
  "empty-input": "Write a short description first.",
  cooldown: "Please wait a few seconds before asking again.",
  offline: "You appear to be offline. Continue with the manual options.",
  "ai-unavailable": "AI suggestions are unavailable right now. Continue with the manual options.",
  "access-denied": "AI suggestions are unavailable right now. Continue with the manual options.",
  "rate-limited": "AI suggestions are busy. Continue with the manual options.",
  timeout: "AI suggestions took too long. Continue with the manual options.",
  "invalid-output": "AI could not produce a usable suggestion. Continue with the manual options.",
  cancelled: "Cancelled.",
};

export type ClassifyOutcome =
  | {
      ok: true;
      suggestion: AiSuggestion;
      source: AiSource;
      /** Final confidence is below the retry threshold. Show with extra caution. */
      lowConfidence: boolean;
      /** A cloud retry was attempted after an on-device answer. */
      retriedInCloud: boolean;
      durationMs: number;
    }
  | {
      ok: false;
      code: AiFailureCode;
      /** Short non-sensitive diagnostic hint for /ai-check. Never report text. */
      detail?: string;
      durationMs: number;
    };

export type OnDeviceAvailability =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable"
  | "unsupported";

export type PrepareOutcome =
  | { ok: true; availability: OnDeviceAvailability }
  | { ok: false; code: AiFailureCode; availability: OnDeviceAvailability };

export interface ClassifyOptions {
  signal?: AbortSignal;
}

export type UrgencyChange = "none-selected" | "same" | "raise" | "lower";
