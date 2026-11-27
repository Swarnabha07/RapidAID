/**
 * T4 - in-memory tracker for reports submitted during THIS page session.
 *
 * What it is: a small observable store (no Firebase import) that remembers, per reportId,
 *   saved-locally -> synced | failed
 * so the UI can show a truthful result for what the user just submitted and offer Retry.
 *
 * What it is NOT: persistent failure recovery. State is lost on reload or tab close. A report
 * queued offline stays queued in Firestore's own IndexedDB cache and is sent by the SDK later;
 * if the server then rejects it after a reload, nothing here can tell (the write is dropped and
 * the document never appears). The authoritative pending/synced view for the history list comes
 * from Firestore snapshot metadata, not from this tracker.
 */
import type { CreateReportInput } from "@/lib/firebase/firestore";

export type SubmissionKind = "sos" | "quick-start" | "form";
export type SubmissionState = "saved-locally" | "synced" | "failed";

export interface SubmissionRecord<TInput = CreateReportInput> {
  reportId: string;
  kind: SubmissionKind;
  state: SubmissionState;
  startedAt: number;
  settledAt?: number;
  /** User-safe message, only when state is "failed". */
  error?: string;
  /** The validated input, kept ONLY for failed submissions so Retry can reuse the same id. */
  input?: TInput;
}

export interface SubmissionTracker<TInput = CreateReportInput> {
  begin(record: { reportId: string; kind: SubmissionKind }): void;
  markSynced(reportId: string): void;
  markFailed(reportId: string, error: string, input: TInput): void;
  dismiss(reportId: string): void;
  get(reportId: string): SubmissionRecord<TInput> | undefined;
  /** Stable reference until something changes (required by useSyncExternalStore). */
  snapshot(): readonly SubmissionRecord<TInput>[];
  subscribe(listener: () => void): () => void;
}

export function createSubmissionTracker<TInput = CreateReportInput>(
  now: () => number = Date.now,
): SubmissionTracker<TInput> {
  let records = new Map<string, SubmissionRecord<TInput>>();
  let cached: readonly SubmissionRecord<TInput>[] = [];
  const listeners = new Set<() => void>();

  function commit(next: Map<string, SubmissionRecord<TInput>>) {
    records = next;
    cached = Array.from(records.values()).sort((a, b) => b.startedAt - a.startedAt);
    listeners.forEach((listener) => listener());
  }

  return {
    begin({ reportId, kind }) {
      const next = new Map(records);
      // A retry reuses the reportId: it replaces the failed record and drops the stored input.
      next.set(reportId, { reportId, kind, state: "saved-locally", startedAt: now() });
      commit(next);
    },
    markSynced(reportId) {
      const current = records.get(reportId);
      if (!current) return;
      const next = new Map(records);
      next.set(reportId, {
        reportId: current.reportId,
        kind: current.kind,
        state: "synced",
        startedAt: current.startedAt,
        settledAt: now(),
      });
      commit(next);
    },
    markFailed(reportId, error, input) {
      const current = records.get(reportId);
      if (!current) return;
      const next = new Map(records);
      next.set(reportId, { ...current, state: "failed", error, input, settledAt: now() });
      commit(next);
    },
    dismiss(reportId) {
      if (!records.has(reportId)) return;
      const next = new Map(records);
      next.delete(reportId);
      commit(next);
    },
    get: (reportId) => records.get(reportId),
    snapshot: () => cached,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** The single tracker used by the app. Tests create their own with createSubmissionTracker(). */
export const submissionTracker: SubmissionTracker = createSubmissionTracker();
