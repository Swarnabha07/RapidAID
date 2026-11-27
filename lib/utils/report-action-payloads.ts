/**
 * T5 - the exact request bodies for PATCH /api/reports/[id].
 * They match `planReportAction` (lib/server/report-security.ts); tests feed every payload built
 * here to that real validator, so the UI cannot drift from the server contract.
 */
import { REPORT_LIMITS, urgencyWeightOf, type ReportUrgency } from "@/lib/constants/report";

type Payload = Record<string, unknown>;

function optionalNote(note: string | undefined): { note?: string } {
  const trimmed = note?.trim();
  return trimmed ? { note: trimmed } : {};
}

export function acknowledgePayload(note?: string): Payload {
  return { action: "acknowledge", ...optionalNote(note) };
}

export function assignPayload(unitName: string, note?: string): Payload {
  return { action: "assign", unitName: unitName.trim(), ...optionalNote(note) };
}

export function escalatePayload(urgency: ReportUrgency, reason: string): Payload {
  return { action: "escalate", urgency, reason: reason.trim() };
}

export function resolvePayload(resolutionNote: string): Payload {
  return { action: "resolve", resolutionNote: resolutionNote.trim() };
}

/** Targets the server accepts for an escalation: `high` or `critical`, never lower than now. */
export function escalationTargets(current: ReportUrgency): ReportUrgency[] {
  return (["high", "critical"] as const).filter((t) => urgencyWeightOf(t) >= urgencyWeightOf(current));
}

/** The next level up (normal -> high, high -> critical); critical stays critical. */
export function defaultEscalationTarget(current: ReportUrgency): ReportUrgency {
  return current === "normal" ? "high" : "critical";
}

// Client-side input checks mirror the server's cleanText ranges so the dialog can disable Confirm.
export const ACTION_LIMITS = {
  unitName: { min: 1, max: REPORT_LIMITS.unitName },
  note: { min: 0, max: REPORT_LIMITS.note },
  reason: { min: 3, max: REPORT_LIMITS.note },
  resolution: { min: 3, max: REPORT_LIMITS.resolutionNote },
} as const;

export function lengthOk(value: string, range: { min: number; max: number }): boolean {
  const n = value.trim().length;
  return n >= range.min && n <= range.max;
}
