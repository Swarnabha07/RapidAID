/**
 * Fails when lib/constants/report.ts, firestore.rules and firestore.indexes.json disagree.
 * Pure node test (no Firebase emulator): it reads the rules and index files as text/JSON.
 * Run:  npx --yes tsx --test tests/schema/*.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  NEW_REPORT_CALLER_KEYS,
  NEW_REPORT_OPTIONAL_KEYS,
  NEW_REPORT_REQUIRED_KEYS,
  REPORT_CATEGORIES,
  REPORT_DASHBOARDS,
  REPORT_LIMITS,
  REPORT_PROCESSORS,
  REPORT_URGENCIES,
  URGENCY_WEIGHTS,
  CITIZEN_PROCESSED_BY,
  CITIZEN_CONFIDENCE_SCORE,
  dashboardForCategory,
  urgencyWeightOf,
} from "../../lib/constants/report";

const rules = readFileSync(resolve("firestore.rules"), "utf8");
const indexes = JSON.parse(readFileSync(resolve("firestore.indexes.json"), "utf8")) as {
  indexes: { collectionGroup: string; fields: { fieldPath: string; order: string }[] }[];
};

/** Text of the isValidNewReport function (up to the next top-level section banner). */
function newReportRule(): string {
  const start = rules.indexOf("function isValidNewReport");
  assert.ok(start >= 0, "isValidNewReport not found in firestore.rules");
  const end = rules.indexOf("// Default Deny Rule", start);
  assert.ok(end > start, "end of isValidNewReport not found");
  return rules.slice(start, end);
}

function quotedList(text: string): string[] {
  return [...text.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function listAfter(rule: string, marker: string): string[] {
  const i = rule.indexOf(marker);
  assert.ok(i >= 0, `${marker} not found`);
  const open = rule.indexOf("[", i);
  const close = rule.indexOf("]", open);
  return quotedList(rule.slice(open, close));
}

const sorted = (xs: readonly string[]) => [...xs].sort();

test("rules key lists match the canonical citizen-create shape", () => {
  const rule = newReportRule();
  const hasOnly = listAfter(rule, "d.keys().hasOnly(");
  const hasAll = listAfter(rule, "d.keys().hasAll(");
  assert.deepEqual(sorted(hasAll), sorted(NEW_REPORT_REQUIRED_KEYS));
  assert.deepEqual(
    sorted(hasOnly),
    sorted([...NEW_REPORT_REQUIRED_KEYS, ...NEW_REPORT_OPTIONAL_KEYS])
  );
  assert.equal(NEW_REPORT_REQUIRED_KEYS.length, 27);
  for (const k of NEW_REPORT_CALLER_KEYS) assert.ok(NEW_REPORT_REQUIRED_KEYS.includes(k));
});

test("rules enumerations match the constants", () => {
  const rule = newReportRule();
  const enumOf = (field: string) => {
    const m = rule.match(new RegExp(`d\\.${field} in \\[([^\\]]*)\\]`));
    assert.ok(m, `d.${field} in [...] not found in rules`);
    return quotedList(m[1]);
  };
  assert.deepEqual(sorted(enumOf("category")), sorted(REPORT_CATEGORIES));
  assert.deepEqual(sorted(enumOf("urgency")), sorted(REPORT_URGENCIES));
  assert.deepEqual(sorted(enumOf("assignedDashboard")), sorted(REPORT_DASHBOARDS));
});

test("rules enforce manual provenance for citizen writes", () => {
  const rule = newReportRule();
  assert.equal(CITIZEN_PROCESSED_BY, "manual");
  assert.equal(CITIZEN_CONFIDENCE_SCORE, null);
  assert.ok(rule.includes("d.processedBy == 'manual'"), "rules must pin processedBy to 'manual'");
  assert.ok(rule.includes("d.confidenceScore == null"), "rules must pin confidenceScore to null");
  // The two AI values still exist for trusted server writes, but never in the citizen rule.
  assert.ok(REPORT_PROCESSORS.includes("on-device") && REPORT_PROCESSORS.includes("cloud"));
  assert.ok(!/d\.processedBy in/.test(rule));
});

test("rules weight and routing agree with the constants", () => {
  const rule = newReportRule();
  const expected = `d.urgencyWeight == (d.urgency == 'critical' ? ${URGENCY_WEIGHTS.critical} : (d.urgency == 'high' ? ${URGENCY_WEIGHTS.high} : ${URGENCY_WEIGHTS.normal}))`;
  assert.ok(rule.includes(expected), "urgency weight expression differs from URGENCY_WEIGHTS");
  assert.ok(
    rule.includes("d.assignedDashboard == (d.category == 'medical' ? 'medical' : 'rescue')"),
    "dashboard routing expression differs from dashboardForCategory"
  );
  assert.equal(dashboardForCategory("medical"), "medical");
  for (const c of REPORT_CATEGORIES.filter((c) => c !== "medical")) {
    assert.equal(dashboardForCategory(c), "rescue");
  }
  assert.equal(urgencyWeightOf("critical"), 3);
  assert.equal(urgencyWeightOf("high"), 2);
  assert.equal(urgencyWeightOf("normal"), 1);
});

test("rules limits agree with REPORT_LIMITS", () => {
  // Location limits live in isValidLocation, so search the whole rules file.
  const has = (fragment: string) => assert.ok(rules.includes(fragment), `missing in rules: ${fragment}`);
  has(`d.description.size() <= ${REPORT_LIMITS.description}`);
  has(`d.translatedDescription.size() <= ${REPORT_LIMITS.translatedDescription}`);
  has(`loc.address.size() <= ${REPORT_LIMITS.address}`);
  has(`loc.zone.size() <= ${REPORT_LIMITS.zone}`);
  has(`d.reportedInjuries.size() <= ${REPORT_LIMITS.reportedInjuries}`);
  has(`d.accessConditions.size() <= ${REPORT_LIMITS.accessConditions}`);
  has(`d.peopleAffected >= ${REPORT_LIMITS.peopleAffectedMin}`);
  has(`d.peopleAffected <= ${REPORT_LIMITS.peopleAffectedMax}`);
});

test("firestore.indexes.json matches the queries in the code", () => {
  const key = (i: (typeof indexes.indexes)[number]) =>
    `${i.collectionGroup}:` + i.fields.map((f) => `${f.fieldPath} ${f.order}`).join(", ");
  const keys = indexes.indexes.map(key);

  // No index may sort on the string field "urgency" (it sorts alphabetically; never queried).
  assert.ok(indexes.indexes.every((i) => i.fields.every((f) => f.fieldPath !== "urgency")));

  // Existing queries (firestore.ts queues, GET /api/reports, T6 escalation sweep) + T6 dedupe.
  for (const expected of [
    "reports:assignedDashboard ASCENDING, urgencyWeight DESCENDING, createdAt DESCENDING",
    "reports:userId ASCENDING, createdAt DESCENDING",
    "reports:status ASCENDING, escalated ASCENDING, createdAt ASCENDING",
    "reports:category ASCENDING, createdAt DESCENDING",
  ]) {
    assert.ok(keys.includes(expected), `missing index: ${expected}`);
  }
  assert.equal(new Set(keys).size, keys.length, "duplicate index definition");
  assert.equal(keys.length, 4);
});
