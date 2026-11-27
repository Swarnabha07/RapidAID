/**
 * T4 non-blocking submission state machine + session tracker, with fake write/fallback.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { startSubmission, SUBMIT_FAILURE_MESSAGE } from "../../lib/utils/submit-flow";
import { createSubmissionTracker } from "../../lib/firebase/submission-tracker";

type Input = { id: string };

function setup() {
  const tracker = createSubmissionTracker<Input>(() => 1000);
  return tracker;
}

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("returns before the backend answers: state is saved-locally while the write is pending (offline)", async () => {
  const tracker = setup();
  const write = deferred();
  let fallbackCalls = 0;
  const settled = startSubmission({
    tracker,
    reportId: "r1",
    kind: "form",
    input: { id: "r1" },
    write: () => write.promise,
    fallback: async () => {
      fallbackCalls += 1;
    },
  });
  assert.equal(tracker.get("r1")?.state, "saved-locally");
  // Offline: the write promise never settles; the fallback must NOT fire while merely pending.
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(tracker.get("r1")?.state, "saved-locally");
  assert.equal(fallbackCalls, 0);
  write.resolve();
  assert.deepEqual(await settled, { ok: true, via: "firestore" });
  assert.equal(tracker.get("r1")?.state, "synced");
  assert.equal(fallbackCalls, 0);
});

test("a rejected direct write falls back to the server exactly once and can still succeed", async () => {
  const tracker = setup();
  let fallbackCalls = 0;
  const result = await startSubmission({
    tracker,
    reportId: "r2",
    kind: "quick-start",
    input: { id: "r2" },
    write: () => Promise.reject(new Error("permission-denied")),
    fallback: async () => {
      fallbackCalls += 1;
    },
  });
  assert.deepEqual(result, { ok: true, via: "server" });
  assert.equal(fallbackCalls, 1);
  assert.equal(tracker.get("r2")?.state, "synced");
  assert.equal(tracker.get("r2")?.input, undefined);
});

test("both paths failing marks failed, keeps the input for retry and never rejects", async () => {
  const tracker = setup();
  const unhandled: unknown[] = [];
  const onUnhandled = (e: unknown) => unhandled.push(e);
  process.on("unhandledRejection", onUnhandled);
  try {
    const result = await startSubmission({
      tracker,
      reportId: "r3",
      kind: "sos",
      input: { id: "r3" },
      write: () => Promise.reject(new Error("boom")),
      fallback: () => Promise.reject(new Error("server down")),
    });
    assert.deepEqual(result, { ok: false, error: SUBMIT_FAILURE_MESSAGE });
    const rec = tracker.get("r3");
    assert.equal(rec?.state, "failed");
    assert.deepEqual(rec?.input, { id: "r3" });
    assert.equal(rec?.error, SUBMIT_FAILURE_MESSAGE);
    await new Promise((r) => setTimeout(r, 20));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
});

test("a synchronous throw from the SDK write is treated as a rejected write", async () => {
  const tracker = setup();
  const result = await startSubmission({
    tracker,
    reportId: "r4",
    kind: "form",
    input: { id: "r4" },
    write: () => {
      throw new Error("sync boom");
    },
    fallback: async () => undefined,
  });
  assert.deepEqual(result, { ok: true, via: "server" });
});

test("retry reuses the same reportId and replaces the failed record", async () => {
  const tracker = setup();
  await startSubmission({
    tracker,
    reportId: "r5",
    kind: "form",
    input: { id: "r5" },
    write: () => Promise.reject(new Error("x")),
    fallback: () => Promise.reject(new Error("y")),
  });
  assert.equal(tracker.get("r5")?.state, "failed");
  const failedInput = tracker.get("r5")!.input!;
  const retry = await startSubmission({
    tracker,
    reportId: "r5",
    kind: "form",
    input: failedInput,
    write: async () => undefined,
    fallback: async () => undefined,
  });
  assert.deepEqual(retry, { ok: true, via: "firestore" });
  assert.equal(tracker.snapshot().filter((r) => r.reportId === "r5").length, 1);
  assert.equal(tracker.get("r5")?.state, "synced");
});

test("tracker snapshot is stable until a change and notifies subscribers", () => {
  const tracker = setup();
  const a = tracker.snapshot();
  assert.equal(tracker.snapshot(), a);
  let calls = 0;
  const off = tracker.subscribe(() => {
    calls += 1;
  });
  tracker.begin({ reportId: "x", kind: "form" });
  assert.notEqual(tracker.snapshot(), a);
  assert.equal(calls, 1);
  tracker.dismiss("x");
  assert.equal(tracker.get("x"), undefined);
  off();
  tracker.begin({ reportId: "y", kind: "form" });
  assert.equal(calls, 2);
});
