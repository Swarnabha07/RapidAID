/**
 * Regression test for the production bug where importing firebase-admin/auth crashed with
 * ERR_REQUIRE_ESM. firebase-admin -> jwks-rsa -> jose@6.x (pure ESM, "type": "module") but
 * jwks-rsa's utils.js does a plain `require("jose")`, which Node/Turpoback's CJS loader
 * cannot satisfy against an ESM-only package.
 *
 * The fix pins jose to a CJS-compatible major (5.x) ONLY inside jwks-rsa's dependency tree via
 * an `overrides` entry in package.json, without touching firebase-admin, jwks-rsa, or any
 * application code. These tests fail loudly if that override is ever removed, if npm stops
 * honouring it, or if a jwks-rsa/firebase-admin upgrade changes the dependency shape.
 *
 * Run:  npx tsx --test tests/security/admin-auth-load.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

test("firebase-admin/auth loads without throwing ERR_REQUIRE_ESM", () => {
  assert.doesNotThrow(() => {
    require("firebase-admin/auth");
  });
});

test("firebase-admin/firestore (used alongside admin auth) loads cleanly", () => {
  assert.doesNotThrow(() => {
    require("firebase-admin/firestore");
  });
});

test("jwks-rsa resolves a CJS-compatible jose build, not the ESM-only 6.x line", () => {
  // Resolve "jose" exactly as jwks-rsa's own require("jose") call would.
  const jwksRsaEntry = require.resolve("jwks-rsa");
  const josePath = require.resolve("jose", { paths: [jwksRsaEntry] });
  const joseVersion: string = require(require.resolve("jose/package.json", {
    paths: [jwksRsaEntry],
  })).version;

  // jose 6.x ships "type": "module" with no CJS build; jose <=5.x does. Guard the major
  // directly so this fails clearly if the override is ever dropped or outranged.
  const major = Number(joseVersion.split(".")[0]);
  assert.ok(
    major < 6,
    `jwks-rsa resolved jose@${joseVersion} (from ${josePath}), which is ESM-only and will ` +
      `reintroduce ERR_REQUIRE_ESM. Check the "overrides" entry for jwks-rsa -> jose in package.json.`
  );
});
