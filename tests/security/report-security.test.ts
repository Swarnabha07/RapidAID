/**
 * Unit tests for the pure report security logic (no Firebase needed).
 * Run:  npx tsx --test tests/security/report-security.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  validateNewReport,
  planReportAction,
  cleanText,
} from "../../lib/server/report-security";

const goodReport = {
  category: "medical",
  urgency: "high",
  description: "Person trapped, bleeding",
  location: { lat: 22.9, lng: 88.4, address: "Near the bridge" },
};

const medic = { uid: "uid-medic", role: "medical", name: "Dr Test" };
const rescuer = { uid: "uid-rescue", role: "rescue", name: "Rescue Lead" };
const admin = { uid: "uid-admin", role: "admin", name: "Ops Admin" };
const citizen = { uid: "uid-citizen", role: "victim", name: "Citizen" };

function plan(report: Record<string, unknown>, actor: typeof medic, body: unknown) {
  return planReportAction({
    reportId: "rep-12345678",
    report,
    actor,
    body,
    now: new Date("2026-11-20T10:00:00.000Z"),
    newId: () => "trail-id-1",
  });
}

const medicalReceived = { assignedDashboard: "medical", status: "received", urgency: "high" };

// ---------------------------------------------------------------- creation
test("valid report passes and server fields are not taken from the body", () => {
  const r = validateNewReport({
    ...goodReport,
    status: "resolved",
    escalated: true,
    userId: "someone-else",
    mediaUrl: "https://evil.example/x",
    urgencyWeight: 99,
    assignedDashboard: "rescue",
    acknowledgedBy: "Dr Fake",
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const keys = Object.keys(r.value);
  for (const forbidden of ["status", "escalated", "userId", "mediaUrl", "urgencyWeight", "assignedDashboard", "acknowledgedBy"]) {
    assert.ok(!keys.includes(forbidden), `${forbidden} must not be accepted from the client`);
  }
  assert.equal(r.value.urgency, "high");
});

test("SOS is always critical", () => {
  const r = validateNewReport({ ...goodReport, urgency: "normal", isSOS: true });
  assert.ok(r.ok && r.value.urgency === "critical" && r.value.isSOS === true);
});

test("rejects bad input", () => {
  const cases: unknown[] = [
    null,
    "text",
    [],
    { ...goodReport, category: "hacking" },
    { ...goodReport, urgency: "extreme" },
    { ...goodReport, description: "" },
    { ...goodReport, description: "   " },
    { ...goodReport, description: "x".repeat(1001) },
    { ...goodReport, location: { lat: 91, lng: 0 } },
    { ...goodReport, location: { lat: 0, lng: -181 } },
    { ...goodReport, location: { lat: "1", lng: 2 } },
    { ...goodReport, location: { lat: NaN, lng: 2 } },
    { ...goodReport, reportId: "../etc" },
    { ...goodReport, reportId: "short" },
    { ...goodReport, originalLanguage: "english-us-long" },
    { ...goodReport, peopleAffected: 0 },
    { ...goodReport, peopleAffected: 501 },
    { ...goodReport, peopleAffected: 2.5 },
    { ...goodReport, reportedInjuries: "y".repeat(501) },
  ];
  for (const c of cases) assert.equal(validateNewReport(c).ok, false, JSON.stringify(c)?.slice(0, 80));
});

test("accepts a safe client reportId and strips control characters", () => {
  const r = validateNewReport({ ...goodReport, reportId: "abcDEF123_-xyz", description: "a\u0000b\u0007c" });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.reportId, "abcDEF123_-xyz");
    assert.equal(r.value.description, "abc");
  }
});

test("cleanText enforces ranges", () => {
  assert.equal(cleanText(5, 1, 10), null);
  assert.equal(cleanText("  hi ", 1, 10), "hi");
  assert.equal(cleanText("abc", 5, 10), null);
});

// ---------------------------------------------------------------- authorization
test("citizens cannot run responder actions", () => {
  const r = plan(medicalReceived, citizen, { action: "acknowledge" });
  assert.ok(!r.ok && r.status === 403);
});

test("a medical responder cannot act on a rescue report; rescue and admin can", () => {
  const rescueReport = { assignedDashboard: "rescue", status: "received", urgency: "normal" };
  assert.ok(!plan(rescueReport, medic, { action: "acknowledge" }).ok);
  assert.ok(plan(rescueReport, rescuer, { action: "acknowledge" }).ok);
  assert.ok(plan(rescueReport, admin, { action: "acknowledge" }).ok);
  assert.ok(plan(medicalReceived, admin, { action: "acknowledge" }).ok);
});

// ---------------------------------------------------------------- transitions
test("acknowledge: trusted actor, ignores body-supplied identity/status", () => {
  const r = plan(medicalReceived, medic, {
    action: "acknowledge",
    acknowledgedBy: "Dr Fake",
    status: "resolved",
    urgencyWeight: 99,
    acknowledgedAt: "1999-01-01",
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.fields, {
    status: "in_progress",
    acknowledgedBy: "Dr Test",
    acknowledgedByUid: "uid-medic",
  });
  assert.deepEqual(r.serverTimestampFields, ["acknowledgedAt"]);
  assert.equal(r.trailEntry.actorUid, "uid-medic");
  assert.equal(r.trailEntry.actorRole, "medical");
  assert.equal(r.trailEntry.timestamp, "2026-11-20T10:00:00.000Z");
});

test("acknowledge only from 'received'", () => {
  for (const status of ["in_progress", "dispatched", "resolved"]) {
    const r = plan({ ...medicalReceived, status }, medic, { action: "acknowledge" });
    assert.ok(!r.ok && r.status === 409, status);
  }
});

test("assign requires a unit and cannot reopen a resolved report", () => {
  assert.ok(!plan(medicalReceived, medic, { action: "assign" }).ok);
  assert.ok(!plan(medicalReceived, medic, { action: "assign", unitName: "x".repeat(81) }).ok);
  const ok = plan(medicalReceived, medic, { action: "assign", unitName: "Team Alpha" });
  assert.ok(ok.ok && ok.fields.status === "dispatched" && ok.fields.assignedTeamOrUnit === "Team Alpha");
  const closed = plan({ ...medicalReceived, status: "resolved" }, medic, { action: "assign", unitName: "Team Alpha" });
  assert.ok(!closed.ok && closed.status === 409);
});

test("resolve requires a note and is final", () => {
  assert.ok(!plan(medicalReceived, medic, { action: "resolve" }).ok);
  const ok = plan({ ...medicalReceived, status: "dispatched" }, medic, { action: "resolve", resolutionNote: "Patient handed to hospital" });
  assert.ok(ok.ok && ok.fields.status === "resolved");
  const again = plan({ ...medicalReceived, status: "resolved" }, medic, { action: "resolve", resolutionNote: "again" });
  assert.ok(!again.ok && again.status === 409);
});

test("escalate: can raise, cannot lower, weight is computed, audit log has the uid", () => {
  const r = plan(medicalReceived, medic, { action: "escalate", urgency: "critical", reason: "No response", urgencyWeight: 1 });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.fields.urgency, "critical");
  assert.equal(r.fields.urgencyWeight, 3);
  assert.equal(r.fields.escalated, true);
  assert.equal(r.incrementEscalationLevel, true);
  assert.deepEqual(r.serverTimestampFields, ["escalatedAt"]);
  assert.equal(r.escalationLog?.actor, "uid-medic");
  assert.equal(r.escalationLog?.previousUrgency, "high");
  assert.equal(r.escalationLog?.newUrgency, "critical");

  const lower = plan({ ...medicalReceived, urgency: "critical" }, medic, { action: "escalate", urgency: "high", reason: "lower it" });
  assert.ok(!lower.ok && lower.status === 400);
  const toNormal = plan(medicalReceived, medic, { action: "escalate", urgency: "normal", reason: "downgrade" });
  assert.ok(!toNormal.ok);
  const noReason = plan(medicalReceived, medic, { action: "escalate", urgency: "critical" });
  assert.ok(!noReason.ok);
  // escalating an already-critical report again is allowed (raises the level)
  const again = plan({ ...medicalReceived, urgency: "critical", escalated: true }, medic, { action: "escalate", urgency: "critical", reason: "Still waiting" });
  assert.ok(again.ok);
});

test("unknown action, bad body and corrupt status are rejected", () => {
  assert.ok(!plan(medicalReceived, medic, { action: "delete" }).ok);
  assert.ok(!plan(medicalReceived, medic, { status: "resolved" }).ok);
  assert.ok(!plan(medicalReceived, medic, null).ok);
  assert.ok(!plan(medicalReceived, medic, "acknowledge").ok);
  const weird = plan({ ...medicalReceived, status: "banana" }, medic, { action: "acknowledge" });
  assert.ok(!weird.ok && weird.status === 409);
});
