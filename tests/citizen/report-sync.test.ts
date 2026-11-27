/** T4 truthful sync summary + wording. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  countPending,
  describeSubmission,
  displaySyncState,
  mergeFailedSubmissions,
  summarizeSync,
  type SyncSummaryInput,
} from "../../lib/utils/report-sync";
import type { CitizenRequest } from "../../lib/types/citizen-request";
import type { SubmissionRecord } from "../../lib/firebase/submission-tracker";

function req(id: string, sync: CitizenRequest["sync"], syncedAtMs: number | null = null): CitizenRequest {
  return {
    id,
    category: "Medical",
    location: "Lat: 1.000, Lng: 2.000",
    reportedLabel: "Today",
    urgency: "High",
    sync,
    status: "Submitted",
    syncedAtMs,
  };
}

function input(over: Partial<SyncSummaryInput> = {}): SyncSummaryInput {
  return { loaded: true, online: true, fromCache: false, requests: [], failedCount: 0, ...over };
}

test("before the first snapshot nothing is claimed", () => {
  assert.equal(summarizeSync(input({ loaded: false })).kind, "checking");
  assert.equal(summarizeSync(input({ loaded: false, online: false })).kind, "checking");
});

test("pending reports are never 'all sent', online or offline", () => {
  const requests = [req("a", "Pending sync"), req("b", "Synchronized", 5)];
  const online = summarizeSync(input({ requests }));
  assert.equal(online.kind, "sending");
  assert.equal(online.pendingCount, 1);
  const offline = summarizeSync(input({ requests, online: false, fromCache: true }));
  assert.equal(offline.kind, "offline-pending");
  assert.match(offline.detail, /not been received/);
});

test("'all sent' requires online, nothing pending, nothing failed and a non-cache snapshot", () => {
  assert.equal(summarizeSync(input({ requests: [req("a", "Synchronized", 1)] })).kind, "all-sent");
  assert.equal(summarizeSync(input({ fromCache: true })).kind, "unconfirmed");
  assert.equal(summarizeSync(input({ online: false, fromCache: true })).kind, "offline-idle");
  assert.equal(summarizeSync(input({ failedCount: 1 })).kind, "failed");
});

test("failed beats everything else, including a not-yet-loaded list", () => {
  assert.equal(summarizeSync(input({ loaded: false, failedCount: 2 })).kind, "failed");
  assert.equal(
    summarizeSync(input({ requests: [req("a", "Pending sync")], failedCount: 1 })).kind,
    "failed",
  );
});

test("last confirmed time only comes from synchronized reports", () => {
  const s = summarizeSync(
    input({ requests: [req("a", "Synchronized", 100), req("b", "Synchronized", 300), req("c", "Pending sync", 999)] }),
  );
  assert.equal(s.lastConfirmedMs, 300);
  assert.equal(summarizeSync(input({ requests: [req("c", "Pending sync", 999)] })).lastConfirmedMs, null);
});

test("countPending counts both pending wordings only", () => {
  assert.equal(countPending([req("a", "Pending sync"), req("b", "Saved offline"), req("c", "Synchronized"), req("d", "Failed")]), 2);
});

test("displaySyncState words pending as 'Saved offline' only while offline", () => {
  assert.equal(displaySyncState("Pending sync", false), "Saved offline");
  assert.equal(displaySyncState("Pending sync", true), "Pending sync");
  assert.equal(displaySyncState("Synchronized", false), "Synchronized");
  assert.equal(displaySyncState("Failed", false), "Failed");
});

function failedRecord(id: string): SubmissionRecord {
  return {
    reportId: id,
    kind: "form",
    state: "failed",
    startedAt: 1,
    error: "nope",
    input: {
      userId: "u1",
      category: "water",
      urgency: "normal",
      description: "x",
      location: { lat: 1, lng: 2 },
    },
  };
}

test("failed session submissions become 'Failed' rows; ids already in the snapshot are not duplicated", () => {
  const merged = mergeFailedSubmissions([req("a", "Synchronized", 1)], [failedRecord("f1"), failedRecord("a")]);
  assert.deepEqual(merged.map((r) => r.id), ["f1", "a"]);
  assert.equal(merged[0].sync, "Failed");
  assert.equal(merged[0].failure, "nope");
  assert.equal(merged[0].urgency, "Low");
});

test("submission wording never over-claims", () => {
  const offline = describeSubmission("form", "saved-locally", false);
  assert.equal(offline.tone, "pending");
  assert.match(offline.body, /not been received/);
  const sending = describeSubmission("sos", "saved-locally", true);
  assert.equal(sending.tone, "pending");
  assert.doesNotMatch(sending.title + sending.body, /received by/i);
  const done = describeSubmission("sos", "synced", true);
  assert.equal(done.tone, "success");
  assert.match(done.body, /does not guarantee a response/);
  const failed = describeSubmission("quick-start", "failed", true);
  assert.equal(failed.tone, "error");
  assert.match(failed.body, /not received/);
});
