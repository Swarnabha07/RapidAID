import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * T4 source-level guards.
 *  1. One-tap SOS (and everything it imports for submission) must never touch AI.
 *  2. The AI panel and report form never persist AI output or change provenance:
 *     reports stay `manual` / `confidenceScore: null` (T3 decision D1, kept in T4).
 */
const root = join(__dirname, "..", "..");
const code = (rel: string) =>
  readFileSync(join(root, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

test("SOS card does not import any AI module", () => {
  for (const file of [
    "components/citizen/emergency-cta-card.tsx",
    "lib/utils/submit-flow.ts",
    "lib/firebase/submission-tracker.ts",
  ]) {
    const src = code(file);
    assert.doesNotMatch(src, /lib\/ai\//, `${file} must not import lib/ai`);
    assert.doesNotMatch(src, /components\/ai\//, `${file} must not import components/ai`);
    assert.doesNotMatch(src, /ai-suggestion-panel/, `${file} must not import the AI panel`);
  }
});

test("quick-start does not use AI either", () => {
  const src = code("components/citizen/quick-start-section.tsx");
  assert.doesNotMatch(src, /lib\/ai\/|ai-suggestion-panel/);
});

test("AI panel and form never write provenance or persist AI output", () => {
  for (const file of [
    "components/citizen/ai-suggestion-panel.tsx",
    "components/citizen/report-form.tsx",
  ]) {
    const src = code(file);
    for (const forbidden of ["processedBy", "confidenceScore", "aiAssist", "setDoc", "addDoc", "updateDoc", "createReport"]) {
      assert.ok(!src.includes(forbidden), `${file} must not reference ${forbidden}`);
    }
  }
  const panel = code("components/citizen/ai-suggestion-panel.tsx");
  assert.ok(!panel.includes("firebase/firestore"));
  assert.ok(!panel.includes("lib/firebase/firestore"));
});

test("the AI panel applies nothing without an explicit action", () => {
  const panel = code("components/citizen/ai-suggestion-panel.tsx");
  // Field checkboxes start unchecked and the only path to onApply is the Apply handler.
  assert.match(panel, /category: false/);
  assert.equal((panel.match(/onApply\(/g) ?? []).length, 1);
});
