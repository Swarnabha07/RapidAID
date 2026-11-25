import test from "node:test";
import assert from "node:assert/strict";
import { ensureAppCheck, resolveAppCheckMode } from "../../lib/firebase/app-check";

const base = { isBrowser: true, hostname: "rapid-aid-two.vercel.app", nodeEnv: "production", siteKey: "key" };

test("server rendering never initialises App Check", () => {
  assert.deepEqual(resolveAppCheckMode({ ...base, isBrowser: false }), { mode: "disabled", reason: "server" });
});

test("debug provider only on localhost in a non-production build", () => {
  assert.equal(resolveAppCheckMode({ ...base, hostname: "localhost", nodeEnv: "development" }).mode, "debug");
  assert.equal(resolveAppCheckMode({ ...base, hostname: "127.0.0.1", nodeEnv: "development", siteKey: undefined }).mode, "debug");
  assert.equal(resolveAppCheckMode({ ...base, hostname: "localhost", nodeEnv: "production" }).mode, "recaptcha-enterprise");
  assert.equal(resolveAppCheckMode({ ...base, hostname: "rapid-aid-two.vercel.app", nodeEnv: "development" }).mode, "recaptcha-enterprise");
});

test("production uses reCAPTCHA Enterprise only with a site key", () => {
  assert.equal(resolveAppCheckMode(base).mode, "recaptcha-enterprise");
  assert.deepEqual(resolveAppCheckMode({ ...base, siteKey: undefined }), { mode: "disabled", reason: "no-site-key" });
  assert.deepEqual(resolveAppCheckMode({ ...base, siteKey: "   " }), { mode: "disabled", reason: "no-site-key" });
});

test("ensureAppCheck is safe outside a browser (never throws, stays disabled)", async () => {
  const status = await ensureAppCheck();
  assert.deepEqual(status, { ready: false, mode: "disabled", reason: "server" });
});
