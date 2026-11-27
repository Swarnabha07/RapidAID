"use client";

import { useSyncExternalStore } from "react";
import {
  submissionTracker,
  type SubmissionRecord,
} from "@/lib/firebase/submission-tracker";

const EMPTY: readonly SubmissionRecord[] = [];

/** All submissions started during this page session (newest first). */
export function useSubmissions(): readonly SubmissionRecord[] {
  return useSyncExternalStore(
    submissionTracker.subscribe,
    submissionTracker.snapshot,
    () => EMPTY,
  );
}

/** One submission by id, or undefined when unknown (or dismissed, or the page was reloaded). */
export function useSubmission(reportId: string | null | undefined): SubmissionRecord | undefined {
  const all = useSubmissions();
  return reportId ? all.find((record) => record.reportId === reportId) : undefined;
}
