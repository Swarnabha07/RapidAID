/**
 * T5 - the UI's action payloads are checked against the REAL server validator (planReportAction),
 * and the action client's failure handling is exercised with a fake fetch.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { planReportAction } from "../../lib/server/report-security";
import {
  acknowledgePayload,
  assignPayload,
  defaultEscalationTarget,
  escalatePayload,
  escalationTargets,
  lengthOk,
  ACTION_LIMITS,
  resolvePayload,
} from "../../lib/utils/report-action-payloads";
import {
  ResponderActionError,
  actionErrorFromResponse,
  describeActionFailure,
  responderLabel,
} from "../../lib/utils/action-errors";
import { performReportAction } from "../../lib/utils/report-action-client";

const medic = { uid: "uid-medic", role: "medical", name: "Dr Test" };

function base(over: Record<string, unknown> = {}) {
  return {
    category: "medical",
    status: "received",
    assignedDashboard: "medical",
    urgency: "normal",
    urgencyWeight: 1,
    ...over,
  };
}

function plan(report: Record<string, unknown>, body: unknown) {
  return planReportAction({
    reportId: "rep-12345678",
    report,
    actor: medic,
    body,
    now: new Date("2026-11-20T10:00:00.000Z"),
    newId: () => "trail-id-1",
  });
}

test("acknowledge payload is accepted by the server for a received report", () => {
  assert.equal(plan(base(), acknowledgePayload()).ok, true);
  assert.equal(plan(base(), acknowledgePayload("  seen  ")).ok, true);
});

test("assign payload (free-text unit) is accepted; blank or too long is rejected by the server", () => {
  assert.equal(plan(base({ status: "in_progress" }), assignPayload("  Alpha 03 ", "note")).ok, true);
  assert.equal(plan(base(), assignPayload("")).ok, false);
  assert.equal(plan(base(), assignPayload("x".repeat(81))).ok, false);
  // The dialog's own length check agrees with the server.
  assert.equal(lengthOk("Alpha 03", ACTION_LIMITS.unitName), true);
  assert.equal(lengthOk("   ", ACTION_LIMITS.unitName), false);
  assert.equal(lengthOk("x".repeat(81), ACTION_LIMITS.unitName), false);
});

test("escalate payload: reason is required and targets never go below the current urgency", () => {
  assert.deepEqual(escalationTargets("normal"), ["high", "critical"]);
  assert.deepEqual(escalationTargets("high"), ["high", "critical"]);
  assert.deepEqual(escalationTargets("critical"), ["critical"]);
  assert.equal(defaultEscalationTarget("normal"), "high");
  assert.equal(defaultEscalationTarget("high"), "critical");
  assert.equal(defaultEscalationTarget("critical"), "critical");

  for (const current of ["normal", "high", "critical"] as const) {
    const weight = { normal: 1, high: 2, critical: 3 }[current];
    for (const target of escalationTargets(current)) {
      const r = plan(base({ urgency: current, urgencyWeight: weight, status: "in_progress" }), escalatePayload(target, "Needs more help"));
      assert.equal(r.ok, true, `${current} -> ${target}`);
    }
  }
  // Lowering is rejected by the server, and the UI never offers it.
  const lower = plan(base({ urgency: "critical", urgencyWeight: 3 }), escalatePayload("high", "Lowering"));
  assert.equal(lower.ok, false);
  assert.equal(escalationTargets("critical").includes("high"), false);
  // Empty reason is rejected by the server, and the dialog's check agrees.
  assert.equal(plan(base(), escalatePayload("high", "")).ok, false);
  assert.equal(lengthOk("ab", ACTION_LIMITS.reason), false);
  assert.equal(lengthOk("abc", ACTION_LIMITS.reason), true);
});

test("resolve payload requires a note", () => {
  assert.equal(plan(base({ status: "in_progress" }), resolvePayload("Handed over")).ok, true);
  assert.equal(plan(base({ status: "in_progress" }), resolvePayload("")).ok, false);
  assert.equal(lengthOk("", ACTION_LIMITS.resolution), false);
});

test("an acknowledge from a non-received report is a server conflict (why 'Mark in progress' was removed)", () => {
  const r = plan(base({ status: "dispatched" }), acknowledgePayload());
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.status, 409);
});

// ---------------------------------------------------------------------------
// Action client: rejection must surface, never look like success
// ---------------------------------------------------------------------------

function res(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

async function failure(p: Promise<void>): Promise<ResponderActionError> {
  try {
    await p;
  } catch (e) {
    assert.ok(e instanceof ResponderActionError);
    return e;
  }
  assert.fail("expected the action to be rejected");
}

test("a 2xx response resolves", async () => {
  await performReportAction("rep-1", { action: "acknowledge" }, {
    getToken: async () => "tok",
    fetchImpl: async () => res(200, { ok: true }),
  });
});

test("409 / 403 / 400 / 404 / 500 each reject with a distinct, honest kind", async () => {
  const cases: Array<[number, string, RegExp]> = [
    [409, "conflict", /changed before your action/],
    [403, "forbidden", /Not allowed/],
    [400, "invalid", /rejected this action: reason is required/],
    [404, "not-found", /no longer exists/],
    [500, "server", /may not have been saved/],
  ];
  for (const [status, kind, pattern] of cases) {
    const err = await failure(
      performReportAction("rep-1", {}, {
        getToken: async () => "tok",
        fetchImpl: async () => res(status, { error: status === 400 ? "reason is required" : "Cannot acknowledge a report that is 'in_progress'." }),
      })
    );
    assert.equal(err.kind, kind);
    assert.match(err.message, pattern);
    assert.equal(err.status, status);
  }
});

test("a network failure rejects as 'network' and does not claim the action was applied", async () => {
  const err = await failure(
    performReportAction("rep-1", {}, {
      getToken: async () => "tok",
      fetchImpl: async () => {
        throw new TypeError("Failed to fetch");
      },
    })
  );
  assert.equal(err.kind, "network");
  assert.match(err.message, /not confirmed/);
});

test("signed-out users get an auth error and nothing is sent", async () => {
  let sent = false;
  const err = await failure(
    performReportAction("rep-1", {}, {
      getToken: async () => null,
      fetchImpl: async () => {
        sent = true;
        return res(200);
      },
    })
  );
  assert.equal(err.kind, "auth");
  assert.equal(sent, false);
});

test("a 401 retries once with a forced token refresh, then succeeds", async () => {
  const forced: boolean[] = [];
  let calls = 0;
  await performReportAction("rep-1", {}, {
    getToken: async (force) => {
      forced.push(force);
      return "tok";
    },
    fetchImpl: async () => (++calls === 1 ? res(401, { error: "expired" }) : res(200)),
  });
  assert.deepEqual(forced, [false, true]);
  assert.equal(calls, 2);
});

test("a persistent 401 rejects after exactly one retry", async () => {
  let calls = 0;
  const err = await failure(
    performReportAction("rep-1", {}, {
      getToken: async () => "tok",
      fetchImpl: async () => {
        calls += 1;
        return res(401, { error: "revoked" });
      },
    })
  );
  assert.equal(err.kind, "auth");
  assert.equal(calls, 2);
});

test("a non-JSON error body still rejects", async () => {
  const err = await failure(
    performReportAction("rep-1", {}, {
      getToken: async () => "tok",
      fetchImpl: async () => new Response("<html>bad gateway</html>", { status: 502 }),
    })
  );
  assert.equal(err.kind, "server");
});

test("the request goes only to the existing authenticated route with the bearer token", async () => {
  let seen: { url: string; init: RequestInit } | null = null;
  await performReportAction("rep/12 34", { action: "resolve", resolutionNote: "ok" }, {
    getToken: async () => "tok",
    fetchImpl: async (url, init) => {
      seen = { url, init };
      return res(200);
    },
  });
  assert.ok(seen);
  const s = seen as { url: string; init: RequestInit };
  assert.equal(s.url, "/api/reports/rep%2F12%2034");
  assert.equal(s.init.method, "PATCH");
  assert.equal((s.init.headers as Record<string, string>).Authorization, "Bearer tok");
});

test("describeActionFailure never returns an empty string and responderLabel mirrors the server", () => {
  assert.ok(describeActionFailure(new Error("x")).length > 0);
  assert.ok(describeActionFailure(actionErrorFromResponse(409)).length > 0);
  assert.equal(responderLabel({ displayName: "Dr Test", email: "a@b.c" }, "medical"), "Dr Test");
  assert.equal(responderLabel({ displayName: null, email: "medic@x.org" }, "medical"), "medic");
  assert.equal(responderLabel(null, "rescue"), "rescue");
  assert.equal(responderLabel(null, null), "Responder");
  assert.equal(responderLabel({ displayName: "x".repeat(200) }, null).length, 80);
});
