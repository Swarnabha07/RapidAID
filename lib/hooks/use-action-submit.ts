"use client";

import { useCallback, useState } from "react";
import { describeActionFailure } from "@/lib/utils/action-errors";

/**
 * Shared submit state for responder dialogs. `run` resolves true ONLY when the server accepted
 * the action; on rejection it keeps the dialog open and exposes a message in `error`.
 */
export function useActionSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      console.warn("Responder action failed:", err);
      setError(describeActionFailure(err));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { submitting, error, run, clearError };
}
