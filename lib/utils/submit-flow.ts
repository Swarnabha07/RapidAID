/**
 * T4 - the non-blocking submission state machine, kept free of Firebase imports so it can be
 * unit tested with fakes.
 *
 * Firestore's `setDoc` applies the write to the local cache immediately and returns a promise
 * that settles only when the BACKEND answers. Offline that can be minutes or hours. This module
 * therefore never awaits that promise on the caller's path: it starts the write, records it in
 * the session tracker, and settles the outcome in the background.
 *
 * Guarantees:
 *  - the returned `settled` promise NEVER rejects (no unhandled rejections);
 *  - the server fallback runs only after the direct write was REJECTED (never while it is merely
 *    pending offline), and it is idempotent by reportId (server `create()`), so no duplicates;
 *  - a failure is recorded with the validated input so the same reportId can be retried.
 *
 * Session-only: the tracker lives in memory. A write queued offline that the server rejects
 * AFTER a reload cannot be observed here (the original promise is gone). See T4 docs.
 */
import type { SubmissionTracker, SubmissionKind } from "@/lib/firebase/submission-tracker";

export type SubmitSettlement =
  | { ok: true; via: "firestore" | "server" }
  | { ok: false; error: string };

export const SUBMIT_FAILURE_MESSAGE =
  "This report could not be sent. It was not received by RapidAID. You can try again.";

export interface StartSubmissionDeps<TInput> {
  tracker: SubmissionTracker<TInput>;
  reportId: string;
  kind: SubmissionKind;
  input: TInput;
  /** Starts the direct Firestore write. Must apply locally at once and settle with the backend. */
  write: () => Promise<unknown>;
  /** Server fallback (POST /api/reports). Only called after `write` rejected. */
  fallback: () => Promise<unknown>;
  log?: (message: string, error: unknown) => void;
}

export function startSubmission<TInput>(deps: StartSubmissionDeps<TInput>): Promise<SubmitSettlement> {
  const { tracker, reportId, kind, input, write, fallback } = deps;
  const log = deps.log ?? (() => undefined);

  tracker.begin({ reportId, kind });

  const fail = (): SubmitSettlement => {
    tracker.markFailed(reportId, SUBMIT_FAILURE_MESSAGE, input);
    return { ok: false, error: SUBMIT_FAILURE_MESSAGE };
  };

  let pending: Promise<unknown>;
  try {
    pending = Promise.resolve(write());
  } catch (err) {
    // A synchronous throw from the SDK counts as a rejected direct write.
    pending = Promise.reject(err);
  }

  return pending.then(
    (): SubmitSettlement => {
      tracker.markSynced(reportId);
      return { ok: true, via: "firestore" };
    },
    async (firestoreErr): Promise<SubmitSettlement> => {
      log("Direct Firestore write rejected, trying the server fallback", firestoreErr);
      try {
        await fallback();
        tracker.markSynced(reportId);
        return { ok: true, via: "server" };
      } catch (fallbackErr) {
        log("Server fallback failed", fallbackErr);
        return fail();
      }
    },
  );
}
