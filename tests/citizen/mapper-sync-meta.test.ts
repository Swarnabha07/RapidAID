/** T4: mapReportToCitizenRequest uses Firestore snapshot metadata when supplied. */
import test from "node:test";
import assert from "node:assert/strict";
import { mapReportToCitizenRequest, type Report } from "../../lib/types/report";

function report(over: Partial<Report> = {}): Report {
  return {
    reportId: "report-12345678",
    userId: "u1",
    category: "medical",
    urgency: "critical",
    status: "pending",
    description: "d",
    location: { lat: 1, lng: 2 },
    createdAt: { toDate: () => new Date("2026-01-01T10:00:00Z") },
    syncedAt: { toDate: () => new Date("2026-01-01T10:00:05Z") },
    ...over,
  } as unknown as Report;
}

test("a document with a pending write is Pending sync even if syncedAt is an estimate", () => {
  const r = mapReportToCitizenRequest(report(), { hasPendingWrites: true });
  assert.equal(r.sync, "Pending sync");
  assert.equal(r.syncedAtMs, null);
});

test("an acknowledged document is Synchronized with the server time", () => {
  const r = mapReportToCitizenRequest(report(), { hasPendingWrites: false });
  assert.equal(r.sync, "Synchronized");
  assert.equal(r.syncedAtMs, new Date("2026-01-01T10:00:05Z").getTime());
});

test("without metadata the legacy syncedAt inference is unchanged", () => {
  assert.equal(mapReportToCitizenRequest(report()).sync, "Synchronized");
  assert.equal(mapReportToCitizenRequest(report({ syncedAt: undefined })).sync, "Pending sync");
});
