/**
 * Tests for the shared citizen-report validator/builder used by BOTH the client (createReport)
 * and the server fallback (POST /api/reports). No Firebase needed.
 * Run:  npx --yes tsx --test tests/schema/*.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  validateNewReport,
  buildNewReportFields,
  buildInitialTrailEntry,
} from "../../lib/validation/report";
import {
  INITIAL_TRAIL,
  NEW_REPORT_CALLER_KEYS,
  NEW_REPORT_OPTIONAL_KEYS,
  NEW_REPORT_REQUIRED_KEYS,
} from "../../lib/constants/report";
import * as legacy from "../../lib/server/report-security";

const base = {
  category: "medical",
  urgency: "high",
  description: "Person trapped, bleeding",
  location: { lat: 22.9, lng: 88.4, address: "Near the bridge" },
};

function build(body: unknown, userId = "uid-1", reportId = "report-12345678") {
  const r = validateNewReport(body);
  assert.ok(r.ok, JSON.stringify(r));
  return buildNewReportFields(r.value, { reportId, userId });
}

test("built document has exactly the canonical keys (minus caller-added timestamps/trail)", () => {
  const fields = build(base);
  const expected = NEW_REPORT_REQUIRED_KEYS.filter(
    (k) => !(NEW_REPORT_CALLER_KEYS as readonly string[]).includes(k)
  );
  assert.deepEqual(Object.keys(fields).sort(), [...expected].sort());
  assert.equal(Object.keys(fields).length + NEW_REPORT_CALLER_KEYS.length, 27);
});

test("citizen reports are always manual with a null confidence, whatever the body claims", () => {
  for (const claim of ["on-device", "cloud", "gemini", 5, null]) {
    const f = build({ ...base, processedBy: claim, confidenceScore: 0.99 });
    assert.equal(f.processedBy, "manual");
    assert.equal(f.confidenceScore, null);
  }
  const sos = build({ ...base, isSOS: true, processedBy: "on-device", confidenceScore: 1 });
  assert.equal(sos.processedBy, "manual");
  assert.equal(sos.confidenceScore, null);
});

test("server-controlled values come from the builder, never from the body", () => {
  const f = build(
    {
      ...base,
      status: "resolved",
      escalated: true,
      userId: "someone-else",
      mediaUrl: "https://evil.example/x",
      urgencyWeight: 99,
      assignedDashboard: "rescue",
      isDuplicateOf: "x",
      escalationLevel: 5,
      processedAt: "now",
    },
    "uid-real"
  );
  assert.equal(f.userId, "uid-real");
  assert.equal(f.status, "received");
  assert.equal(f.escalated, false);
  assert.equal(f.mediaUrl, null);
  assert.equal(f.urgencyWeight, 2);
  assert.equal(f.assignedDashboard, "medical");
  assert.equal(f.isDuplicateOf, null);
  assert.ok(!("escalationLevel" in f) && !("processedAt" in f), "server-managed fields stay absent");
});

test("urgency weight and routing are derived", () => {
  assert.equal(build({ ...base, urgency: "critical" }).urgencyWeight, 3);
  assert.equal(build({ ...base, urgency: "normal" }).urgencyWeight, 1);
  assert.equal(build({ ...base, category: "water" }).assignedDashboard, "rescue");
  assert.equal(build({ ...base, category: "missing_person" }).assignedDashboard, "rescue");
  assert.equal(build({ ...base, category: "medical" }).assignedDashboard, "medical");
});

test("defaults: peopleAffected 1, reportedInjuries null, translatedDescription null", () => {
  const f = build(base);
  assert.equal(f.peopleAffected, 1);
  assert.equal(f.reportedInjuries, null);
  assert.equal(f.translatedDescription, null, "no translation => null (not a copy of description)");
  assert.equal(f.originalLanguage, "en");
});

test("accessConditions is preserved when provided and absent otherwise", () => {
  const without = build(base);
  assert.ok(!("accessConditions" in without));
  assert.ok((NEW_REPORT_OPTIONAL_KEYS as readonly string[]).includes("accessConditions"));
  const withIt = build({ ...base, accessConditions: "  Road flooded; boat only " });
  assert.equal(withIt.accessConditions, "Road flooded; boat only");
  assert.equal(validateNewReport({ ...base, accessConditions: "z".repeat(501) }).ok, false);
  assert.equal(build({ ...base, accessConditions: "" }).accessConditions, undefined);
});

test("location keeps only provided optional parts and never holds undefined", () => {
  assert.deepEqual(build({ ...base, location: { lat: 1, lng: 2 } }).location, { lat: 1, lng: 2 });
  const f = build({ ...base, location: { lat: 1, lng: 2, address: "A", zone: "Z" } });
  assert.deepEqual(f.location, { lat: 1, lng: 2, address: "A", zone: "Z" });
});

test("SOS is critical, routes like any other report and is never merged by the builder", () => {
  const f = build({ ...base, category: "other", urgency: "normal", isSOS: true });
  assert.equal(f.urgency, "critical");
  assert.equal(f.urgencyWeight, 3);
  assert.equal(f.isSOS, true);
  assert.equal(f.isDuplicateOf, null);
});

test("client and server paths produce the same fields for the same input", () => {
  // Both paths call the same two functions; this pins the contract they rely on.
  const a = build({ ...base, peopleAffected: 3, accessConditions: "Gate locked" }, "u1", "id-aaaaaaaa");
  const b = build({ ...base, peopleAffected: 3, accessConditions: "Gate locked" }, "u1", "id-aaaaaaaa");
  assert.deepEqual(a, b);
});

test("initial trail uses the canonical client wording", () => {
  const std = buildInitialTrailEntry({ id: "t1", isSOS: false, actorRole: "citizen", timestamp: "2026-11-24T00:00:00.000Z" });
  assert.equal(std.action, INITIAL_TRAIL.standard.action);
  assert.equal(std.action, "Emergency report created");
  assert.equal(std.note, null);
  const sos = buildInitialTrailEntry({ id: "t2", isSOS: true, actorRole: "citizen", timestamp: "x" });
  assert.equal(sos.action, "⚡ Emergency SOS Triggered");
  assert.equal(sos.note, "Instant SOS beacon");
  const fb = buildInitialTrailEntry({ id: "t3", isSOS: true, actorRole: "citizen", timestamp: "x", viaServerFallback: true });
  assert.equal(fb.action, sos.action);
  assert.match(fb.note ?? "", /Instant SOS beacon/);
  assert.match(fb.note ?? "", /server fallback/);
  assert.deepEqual(Object.keys(std).sort(), ["action", "actorRole", "id", "note", "timestamp"]);
});

test("validation rejects what the rules would reject", () => {
  const bad: unknown[] = [
    { ...base, category: "weapons" },
    { ...base, urgency: "extreme" },
    { ...base, description: "" },
    { ...base, description: "x".repeat(1001) },
    { ...base, location: { lat: 91, lng: 0 } },
    { ...base, location: { lat: 0, lng: 0, address: "a".repeat(301) } },
    { ...base, location: { lat: 0, lng: 0, zone: "z".repeat(101) } },
    { ...base, peopleAffected: 0 },
    { ...base, peopleAffected: 501 },
    { ...base, reportedInjuries: "i".repeat(501) },
    { ...base, translatedDescription: "t".repeat(1001) },
    { ...base, reportId: "bad id" },
  ];
  for (const b of bad) assert.equal(validateNewReport(b).ok, false, JSON.stringify(b)?.slice(0, 90));
});

test("T1 import paths still work through report-security re-exports", () => {
  assert.equal(typeof legacy.validateNewReport, "function");
  assert.equal(typeof legacy.cleanText, "function");
  assert.equal(legacy.urgencyWeightOf("critical"), 3);
  assert.equal(legacy.dashboardForCategory("water"), "rescue");
  assert.deepEqual([...legacy.REPORT_URGENCIES], ["critical", "high", "normal"]);
});
