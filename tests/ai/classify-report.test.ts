import test from "node:test";
import assert from "node:assert/strict";
import {
  createClassifier,
  mapAiError,
  type ClassifierRuntime,
  type ModelKind,
  type ModelLike,
} from "../../lib/ai/classify-report";
import type { AppCheckStatus } from "../../lib/firebase/app-check";
import type { OnDeviceAvailability } from "../../lib/ai/types";

const READY: AppCheckStatus = { ready: true, mode: "debug" };
const NOT_READY: AppCheckStatus = { ready: false, mode: "disabled", reason: "no-site-key" };

const good = (over: Record<string, unknown> = {}) => ({
  category: "medical",
  urgency: "critical",
  language: "en",
  translation: "",
  peopleAffectedStated: 0,
  confidence: 0.95,
  ...over,
});
const reply = (obj: unknown, source: string | undefined) => ({
  response: { text: () => JSON.stringify(obj), inferenceSource: source },
});

type Handler = (prompt: string, signal?: AbortSignal) => Promise<ReturnType<typeof reply>>;

function harness(
  handlers: Partial<Record<ModelKind, Handler>>,
  opts: { appCheck?: AppCheckStatus; online?: boolean; availability?: OnDeviceAvailability[] } = {},
) {
  const calls: ModelKind[] = [];
  const clock = { t: 0 };
  const availability = [...(opts.availability ?? ["available"])];
  const initCalls: number[] = [];
  const runtime: ClassifierRuntime = {
    now: () => clock.t,
    isOnline: () => opts.online ?? true,
    ensureAppCheck: async () => opts.appCheck ?? READY,
    getModel: async (kind) => {
      const model: ModelLike = {
        generateContent: (prompt, o) => {
          calls.push(kind);
          const h = handlers[kind];
          if (!h) throw new Error(`no handler for ${kind}`);
          return h(prompt, o?.signal);
        },
        initializeDeviceModel: async (cb) => {
          initCalls.push(1);
          cb?.(0.5);
        },
      };
      return model;
    },
    onDeviceAvailability: async () => availability.length > 1 ? availability.shift()! : availability[0],
  };
  return { runtime, calls, clock, initCalls };
}
const fast = { cooldownMs: 0, attemptTimeoutMs: 200, overallTimeoutMs: 1000 };

test("rejects empty input without calling any model", async () => {
  const h = harness({});
  const c = createClassifier(h.runtime, fast);
  const r = await c.classify("   ");
  assert.deepEqual([r.ok, !r.ok && r.code], [false, "empty-input"]);
  assert.equal(h.calls.length, 0);
});

test("on-device success with high confidence: no cloud call, source on-device", async () => {
  const h = harness({ hybrid: async () => reply(good(), "on_device") });
  const r = await createClassifier(h.runtime, fast).classify("Man bleeding badly");
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.source, "on-device");
    assert.equal(r.lowConfidence, false);
    assert.equal(r.retriedInCloud, false);
  }
  assert.deepEqual(h.calls, ["hybrid"]);
});

test("hybrid that fell back inside the SDK reports cloud", async () => {
  const h = harness({ hybrid: async () => reply(good(), "in_cloud") });
  const r = await createClassifier(h.runtime, fast).classify("Man bleeding badly");
  assert.ok(r.ok && r.source === "cloud" && !r.retriedInCloud);
});

test("low-confidence on-device answer is retried once in cloud", async () => {
  const h = harness({
    hybrid: async () => reply(good({ confidence: 0.4, category: "other" }), "on_device"),
    cloud: async () => reply(good({ confidence: 0.92 }), "in_cloud"),
  });
  const r = await createClassifier(h.runtime, fast).classify("Man bleeding badly");
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.source, "cloud");
    assert.equal(r.suggestion.category, "medical");
    assert.equal(r.retriedInCloud, true);
    assert.equal(r.lowConfidence, false);
  }
  assert.deepEqual(h.calls, ["hybrid", "cloud"]);
});

test("failed cloud retry keeps the on-device answer flagged low-confidence", async () => {
  const h = harness({
    hybrid: async () => reply(good({ confidence: 0.5 }), "on_device"),
    cloud: async () => {
      throw Object.assign(new Error("x"), { code: "fetch-error", customErrorData: { status: 429 } });
    },
  });
  const r = await createClassifier(h.runtime, fast).classify("Man bleeding badly");
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.source, "on-device");
    assert.equal(r.lowConfidence, true);
    assert.equal(r.retriedInCloud, true);
  }
  assert.equal(h.calls.filter((k) => k === "cloud").length, 1);
});

test("low-confidence cloud answer is flagged but never retried", async () => {
  const h = harness({ cloud: async () => reply(good({ confidence: 0.3 }), "in_cloud") });
  const r = await createClassifier(h.runtime, fast).classify("ঢাকায় বন্যা হয়েছে");
  assert.ok(r.ok && r.lowConfidence && r.source === "cloud" && !r.retriedInCloud);
  assert.deepEqual(h.calls, ["cloud"]);
});

test("Bengali/Hindi go straight to cloud, never to the hybrid model", async () => {
  const h = harness({ cloud: async () => reply(good({ language: "bn" }), "in_cloud") });
  const c = createClassifier(h.runtime, fast);
  assert.ok((await c.classify("ঢাকায় ৫ জন আটকে আছে")).ok);
  assert.ok((await c.classify("५ लोग फंसे हैं")).ok);
  assert.deepEqual(h.calls, ["cloud", "cloud"]);
});

test("non-Latin text while offline or without App Check fails neutrally, no model call", async () => {
  const off = harness({}, { online: false });
  const r1 = await createClassifier(off.runtime, fast).classify("ঢাকায় বন্যা");
  assert.ok(!r1.ok && r1.code === "offline");
  const noAc = harness({}, { appCheck: NOT_READY });
  const r2 = await createClassifier(noAc.runtime, fast).classify("ঢাকায় বন্যা");
  assert.ok(!r2.ok && r2.code === "ai-unavailable");
  assert.equal(off.calls.length + noAc.calls.length, 0);
});

test("without App Check, Latin text uses ONLY on-device (no cloud request is ever attempted)", async () => {
  const h = harness({ "on-device": async () => reply(good({ confidence: 0.4 }), "on_device") }, { appCheck: NOT_READY });
  const r = await createClassifier(h.runtime, fast).classify("Man bleeding badly");
  assert.ok(r.ok && r.source === "on-device" && r.lowConfidence && !r.retriedInCloud);
  assert.deepEqual(h.calls, ["on-device"]);
});

test("offline Latin text uses on-device only", async () => {
  const h = harness({ "on-device": async () => reply(good(), "on_device") }, { online: false });
  const r = await createClassifier(h.runtime, fast).classify("Water is rising");
  assert.ok(r.ok);
  assert.deepEqual(h.calls, ["on-device"]);
});

test("invalid on-device output is retried once in cloud", async () => {
  const h = harness({
    hybrid: async () => ({ response: { text: () => "garbage", inferenceSource: "on_device" } }),
    cloud: async () => reply(good(), "in_cloud"),
  });
  const r = await createClassifier(h.runtime, fast).classify("Man bleeding badly");
  assert.ok(r.ok && r.source === "cloud" && r.retriedInCloud);
});

test("429 and 403 are mapped and NOT retried", async () => {
  for (const [status, code] of [[429, "rate-limited"], [403, "access-denied"]] as const) {
    const h = harness({
      hybrid: async () => {
        throw Object.assign(new Error("denied"), { code: "fetch-error", customErrorData: { status } });
      },
      cloud: async () => reply(good(), "in_cloud"),
    });
    const r = await createClassifier(h.runtime, fast).classify("Man bleeding badly");
    assert.ok(!r.ok && r.code === code);
    assert.deepEqual(h.calls, ["hybrid"]);
  }
});

test("missing inference source is rejected: never claim an unknown source", async () => {
  const h = harness({
    hybrid: async () => reply(good(), undefined),
    cloud: async () => reply(good(), undefined),
  });
  const r = await createClassifier(h.runtime, fast).classify("Man bleeding badly");
  assert.ok(!r.ok && r.code === "invalid-output" && r.detail === "no-inference-source");
  assert.deepEqual(h.calls, ["hybrid", "cloud"]); // retried once, then failed neutrally
});

test("a hung attempt times out and the late result is discarded", async () => {
  const h = harness({ cloud: () => new Promise(() => undefined) });
  const r = await createClassifier(h.runtime, { ...fast, attemptTimeoutMs: 30 }).classify("ঢাকায় বন্যা");
  assert.ok(!r.ok && r.code === "timeout");
});

test("cancel() aborts the in-flight request and discards its late answer", async () => {
  let release: (() => void) | undefined;
  const h = harness({
    cloud: () =>
      new Promise((resolve) => {
        release = () => resolve(reply(good(), "in_cloud"));
      }),
  });
  const c = createClassifier(h.runtime, fast);
  const pending = c.classify("ঢাকায় বন্যা");
  await new Promise((r) => setTimeout(r, 20));
  c.cancel();
  release?.();
  const r = await pending;
  assert.ok(!r.ok && r.code === "cancelled");
});

test("an external AbortSignal cancels, and an already-aborted signal short-circuits", async () => {
  const h = harness({ cloud: async () => reply(good(), "in_cloud") });
  const c = createClassifier(h.runtime, fast);
  const ac = new AbortController();
  ac.abort();
  const r = await c.classify("ঢাকায় বন্যা", { signal: ac.signal });
  assert.ok(!r.ok && r.code === "cancelled");
  assert.equal(h.calls.length, 0);
});

test("a newer request supersedes the previous one", async () => {
  let n = 0;
  const releases: Array<() => void> = [];
  const h = harness({
    cloud: () =>
      new Promise((resolve) => {
        const id = ++n;
        releases.push(() => resolve(reply(good({ category: id === 1 ? "water" : "shelter" }), "in_cloud")));
      }),
  });
  const c = createClassifier(h.runtime, fast);
  const first = c.classify("ঢাকায় বন্যা এক");
  await new Promise((r) => setTimeout(r, 20));
  const second = c.classify("ঢাকায় বন্যা দুই");
  await new Promise((r) => setTimeout(r, 20));
  releases.forEach((fn) => fn());
  const [a, b] = await Promise.all([first, second]);
  assert.ok(!a.ok && a.code === "cancelled");
  assert.ok(b.ok && b.suggestion.category === "shelter");
});

test("cooldown rejects rapid repeats", async () => {
  const h = harness({ hybrid: async () => reply(good(), "on_device") });
  const c = createClassifier(h.runtime, { ...fast, cooldownMs: 1000 });
  assert.ok((await c.classify("Water is rising")).ok);
  h.clock.t = 500;
  const r = await c.classify("Water is rising");
  assert.ok(!r.ok && r.code === "cooldown");
  h.clock.t = 1500;
  assert.ok((await c.classify("Water is rising")).ok);
});

test("never calls a model with more than the input cap", async () => {
  let seen = "";
  const h = harness({ hybrid: async (p) => ((seen = p), reply(good(), "on_device")) });
  await createClassifier(h.runtime, fast).classify("a".repeat(5000));
  assert.ok(seen.length < 2500);
});

test("prepareOnDeviceModel: unsupported / unavailable / downloadable flows", async () => {
  const unsupported = harness({}, { availability: ["unsupported"] });
  const a = await createClassifier(unsupported.runtime, fast).prepareOnDeviceModel();
  assert.ok(!a.ok && a.code === "ai-unavailable" && a.availability === "unsupported");
  assert.equal(unsupported.initCalls.length, 0);

  const ready = harness({}, { availability: ["available"] });
  const b = await createClassifier(ready.runtime, fast).prepareOnDeviceModel();
  assert.ok(b.ok);
  assert.equal(ready.initCalls.length, 0);

  const dl = harness({}, { availability: ["downloadable", "available"] });
  const progress: number[] = [];
  const c = await createClassifier(dl.runtime, fast).prepareOnDeviceModel((f) => progress.push(f));
  assert.ok(c.ok);
  assert.equal(dl.initCalls.length, 1);
  assert.deepEqual(progress, [0.5]);

  const stuck = harness({}, { availability: ["downloadable", "downloading"] });
  const d = await createClassifier(stuck.runtime, fast).prepareOnDeviceModel();
  assert.ok(!d.ok && d.availability === "downloading");
});

test("mapAiError covers SDK error shapes", () => {
  const sdk = (code: string, status?: number) =>
    Object.assign(new Error("m"), { code, customErrorData: status === undefined ? undefined : { status } });
  assert.equal(mapAiError(sdk("fetch-error", 429), true).code, "rate-limited");
  assert.equal(mapAiError(sdk("fetch-error", 403), true).code, "access-denied");
  assert.equal(mapAiError(sdk("api-not-enabled", 403), true).code, "ai-unavailable");
  assert.equal(mapAiError(sdk("fetch-error"), false).code, "offline");
  assert.equal(mapAiError(sdk("fetch-error"), true).code, "ai-unavailable");
  assert.equal(mapAiError(sdk("response-error"), true).code, "invalid-output");
  assert.equal(mapAiError(sdk("unsupported"), true).code, "ai-unavailable");
  assert.equal(mapAiError(Object.assign(new Error("x"), { name: "AbortError" }), true).code, "cancelled");
  assert.equal(mapAiError(new Error("Error fetching: [429 Too Many] boom"), true).code, "rate-limited");
  assert.equal(mapAiError("weird", true).code, "ai-unavailable");
  assert.equal(mapAiError(null, true).code, "ai-unavailable");
});
