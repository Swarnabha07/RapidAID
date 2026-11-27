/**
 * T5 helper tests. Run:  npx --yes tsx --test tests/responder/*.test.ts
 * Note what is NOT tested because it does not exist: duplicate hiding (T6) and acknowledgement timers (T6).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  RESPONDER_QUEUE_LIMIT,
  agoLabel,
  buildActivityFeed,
  clockLabel,
  describeQueueError,
  elapsedLabel,
  initialQueueState,
  liveStateOf,
  oldestAwaiting,
  policyThresholdLabel,
  queueReducer,
  summarizeQueue,
  summarizeUnits,
  urgencyKey,
  type QueueLike,
} from "../../lib/utils/responder-view";
import { ESCALATION_POLICY } from "../../lib/constants/report";

type Row = QueueLike & { unit: string | null };

function row(over: Partial<Row> = {}): Row {
  return {
    id: "R1",
    urgency: "Normal",
    status: "Open",
    awaitingAcknowledgement: true,
    createdAtMs: 1_000_000,
    timeline: [],
    unit: null,
    ...over,
  };
}
const unitOf = (r: Row) => r.unit;

test("queue limit is 100", () => {
  assert.equal(RESPONDER_QUEUE_LIMIT, 100);
});

test("an empty queue summarizes to zeros, never invented numbers", () => {
  const s = summarizeQueue([], unitOf);
  assert.deepEqual(s, {
    total: 0, active: 0, critical: 0, criticalAwaiting: 0, awaitingAck: 0,
    inProgress: 0, assigned: 0, resolved: 0, units: 0,
  });
  assert.equal(oldestAwaiting<Row>([]), null);
  assert.deepEqual(summarizeUnits<Row>([], unitOf), []);
  assert.deepEqual(buildActivityFeed<Row>([]), []);
});

test("summarizeQueue counts every loaded report and never drops any", () => {
  const items = [
    row({ id: "A", urgency: "Critical" }),
    row({ id: "B", urgency: "Critical", status: "In progress", awaitingAcknowledgement: false, unit: "U1" }),
    row({ id: "C", status: "Assigned", awaitingAcknowledgement: false, unit: "U1" }),
    row({ id: "D", status: "Resolved", awaitingAcknowledgement: false, unit: "U2" }),
  ];
  const s = summarizeQueue(items, unitOf);
  assert.equal(s.total, 4);
  assert.equal(s.active, 3);
  assert.equal(s.critical, 2);
  assert.equal(s.criticalAwaiting, 1);
  assert.equal(s.awaitingAck, 1);
  assert.equal(s.inProgress, 1);
  assert.equal(s.assigned, 1);
  assert.equal(s.resolved, 1);
  assert.equal(s.units, 1); // U2 is only on a resolved incident
  assert.deepEqual(summarizeUnits(items, unitOf), [{ unit: "U1", incidentIds: ["B", "C"] }]);
});

test("oldestAwaiting picks the oldest active unacknowledged report", () => {
  const items = [
    row({ id: "new", createdAtMs: 5000 }),
    row({ id: "old", createdAtMs: 1000 }),
    row({ id: "ack", createdAtMs: 10, awaitingAcknowledgement: false }),
    row({ id: "done", createdAtMs: 5, status: "Resolved" }),
    row({ id: "unknown", createdAtMs: null }),
  ];
  assert.equal(oldestAwaiting(items)?.id, "old");
});

test("elapsedLabel and agoLabel use real timestamps and never go negative", () => {
  assert.equal(elapsedLabel(0, 252_000), "04:12");
  assert.equal(elapsedLabel(0, 3_660_000), "1h 01m");
  assert.equal(elapsedLabel(10_000, 0), "00:00");
  assert.equal(elapsedLabel(null, 5), "—");
  assert.equal(agoLabel(0, 30_000), "Just now");
  assert.equal(agoLabel(0, 4 * 60_000), "4m ago");
  assert.equal(agoLabel(0, 3 * 3_600_000), "3h ago");
  assert.equal(agoLabel(0, 2 * 86_400_000), "2d ago");
  assert.equal(agoLabel(null, 5), "Time unknown");
  assert.equal(clockLabel(null), "—");
});

test("policy thresholds come from ESCALATION_POLICY and are informational", () => {
  assert.equal(policyThresholdLabel("critical"), `${ESCALATION_POLICY.criticalAfterMinutes}m`);
  assert.equal(policyThresholdLabel("high"), `${ESCALATION_POLICY.highAfterMinutes}m`);
  assert.equal(policyThresholdLabel("normal"), "No limit");
});

test("activity feed is newest first, limited, and attributed", () => {
  const items = [
    row({ id: "A", timeline: [
      { time: "10:00:00", label: "Report submitted", actor: "Citizen", atMs: 1000 },
      { time: "10:05:00", label: "Report acknowledged", actor: "Dr Test", atMs: 5000 },
    ] }),
    row({ id: "B", timeline: [{ time: "10:03:00", label: "Report submitted", actor: "Citizen", atMs: 3000 }] }),
  ];
  const feed = buildActivityFeed(items, 2);
  assert.deepEqual(feed.map((f) => `${f.ref}:${f.atMs}`), ["A:5000", "B:3000"]);
  assert.equal(feed[0].actor, "Dr Test");
});

test("urgencyKey maps labels to server urgency values", () => {
  assert.equal(urgencyKey("Critical"), "critical");
  assert.equal(urgencyKey("High"), "high");
  assert.equal(urgencyKey("Normal"), "normal");
  assert.equal(urgencyKey("Medium"), "normal");
  assert.equal(urgencyKey(undefined), "normal");
});

test("describeQueueError gives a specific message for a missing index and denied access", () => {
  assert.equal(describeQueueError({ code: "failed-precondition", message: "x" }).kind, "index");
  assert.match(describeQueueError({ code: "failed-precondition", message: "x" }).message, /firestore\.indexes\.json/);
  assert.equal(describeQueueError({ code: "permission-denied", message: "x" }).kind, "permission");
  assert.equal(describeQueueError({ code: "firestore/permission-denied", message: "x" }).kind, "permission");
  assert.equal(describeQueueError({ code: "unavailable", message: "x" }).kind, "offline");
  assert.equal(describeQueueError({ message: "boom" }).kind, "unknown");
  assert.equal(describeQueueError(null).kind, "unknown");
});

test("queue reducer: loading -> ready -> error, with no fallback data", () => {
  let s = initialQueueState<string>();
  assert.equal(s.status, "loading");
  assert.deepEqual(s.items, []);

  s = queueReducer(s, { type: "snapshot", items: ["a"], meta: { fromCache: false, truncated: false, skipped: 0 } });
  assert.equal(s.status, "ready");
  assert.deepEqual(s.items, ["a"]);

  s = queueReducer(s, { type: "snapshot", items: [], meta: { fromCache: false, truncated: false, skipped: 0 } });
  assert.equal(s.status, "ready"); // empty is a real state, not a reason to show mock rows
  assert.deepEqual(s.items, []);

  s = queueReducer(s, { type: "error", error: { code: "permission-denied", message: "x" } });
  assert.equal(s.status, "error");
  assert.deepEqual(s.items, []); // old rows are not kept after the listener failed
  assert.equal(s.error?.kind, "permission");

  s = queueReducer(s, { type: "reset" });
  assert.equal(s.status, "loading");
});

test("snapshot meta (cached / truncated / skipped) is carried into the state", () => {
  const s = queueReducer(initialQueueState<string>(), {
    type: "snapshot",
    items: ["a"],
    meta: { fromCache: true, truncated: true, skipped: 2 },
  });
  assert.equal(s.fromCache, true);
  assert.equal(s.truncated, true);
  assert.equal(s.skipped, 2);
});

test("live indicator is green only for a server-confirmed snapshot", () => {
  assert.equal(liveStateOf({ status: "loading", fromCache: false }), "connecting");
  assert.equal(liveStateOf({ status: "ready", fromCache: false }), "live");
  assert.equal(liveStateOf({ status: "ready", fromCache: true }), "cached");
  assert.equal(liveStateOf({ status: "error", fromCache: false }), "error");
});
