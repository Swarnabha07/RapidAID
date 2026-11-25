import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * T3 decision D1 (Option A): AI output is advisory and never persisted.
 * These source-level guards fail if AI code starts touching Firestore, report
 * creation, provenance fields or secrets.
 */
const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const list = (dir: string) =>
  readdirSync(join(root, dir)).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => `${dir}/${f}`);

const AI_FILES = [
  ...list("lib/ai"),
  ...list("components/ai"),
  ...list("app/ai-check"),
  "lib/firebase/app-check.ts",
  "lib/constants/ai.ts",
];

function code(rel: string): string {
  return read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const FORBIDDEN = [
  "processedBy",
  "confidenceScore",
  "createReport",
  "firebase/firestore",
  "lib/firebase/firestore",
  "firebase-admin",
  "addDoc",
  "setDoc",
  "updateDoc",
  "GEMINI_API_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
];

test("AI modules never write reports, provenance or use secrets", () => {
  assert.ok(AI_FILES.length >= 8, "expected the T3 AI files to exist");
  for (const file of AI_FILES) {
    const src = code(file);
    for (const token of FORBIDDEN) {
      assert.ok(!src.includes(token), `${file} must not reference ${token}`);
    }
  }
});

test("legacy unvalidated AI module is gone", () => {
  assert.equal(existsSync(join(root, "lib/firebase/ai.ts")), false);
});

test("only the AI SDK wrapper imports firebase/ai, always lazily", () => {
  for (const file of AI_FILES) {
    const src = code(file);
    const staticImport = /^\s*import\s[^;]*from\s+["']firebase\/(ai|app-check)["']/m.test(src);
    assert.equal(staticImport, false, `${file} must import firebase/ai and firebase/app-check dynamically`);
  }
  const offenders = AI_FILES.filter((f) => /firebase\/ai/.test(code(f)));
  assert.deepEqual(offenders, ["lib/ai/classify-report.ts"]);
});

test(".env.example documents the site key and holds no Gemini API key", () => {
  const env = read(".env.example");
  assert.match(env, /^NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY=/m);
  assert.match(env, /^NEXT_PUBLIC_GEMINI_MODEL=gemini-3\.5-flash-lite$/m);
  assert.doesNotMatch(env, /GEMINI_API_KEY/);
});

test("T2 report provenance is still manual-only", () => {
  const constants = read("lib/constants/report.ts");
  assert.match(constants, /CITIZEN_PROCESSED_BY: ReportProcessor = "manual"/);
  assert.match(constants, /CITIZEN_CONFIDENCE_SCORE = null/);
  assert.match(read("firestore.rules"), /processedBy == 'manual'/);
});
