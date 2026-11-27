/**
 * T5 guard: the responder UI must contain no sample operational data or fabricated identities,
 * and must not reintroduce actions the server does not support or T6 behaviour.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

const UI = [
  ...files("components/dashboard"),
  ...files("components/rescue"),
  ...files("components/responder"),
  "lib/types/incident.ts",
  "lib/types/rescue.ts",
  "lib/firebase/firestore.ts",
];

const BANNED: Array<[RegExp, string]> = [
  [/\bINCIDENTS\b/, "mock INCIDENTS"],
  [/MEDICAL_TEAMS|ROLE_VIEWS|RoleViewConfig/, "mock teams / role views"],
  [/Maya Chen|M\. Chen|Dr\. J\. Patel|Riverton|North district|Fictional|fictional/, "fabricated identity or place"],
  [/Human-confirmed|AI urgency|En route/, "label that implies a confirmation or AI step that did not happen"],
  [/Mark in progress|handleMarkInProgress/, "action the server does not support"],
  [/isDuplicateOf\s*(===|!==|==|!=)|hideDuplicates|filterDuplicates/, "duplicate hiding (T6)"],
  [/localStorage|sessionStorage/, "browser storage"],
];

test("responder UI has no sample data, fabricated identities or unsupported actions", () => {
  for (const file of UI) {
    const text = readFileSync(file, "utf8");
    for (const [pattern, why] of BANNED) {
      assert.doesNotMatch(text, pattern, `${file}: ${why}`);
    }
  }
});

test("responder listeners use limit(100), the existing index order, and no unbounded fallback", () => {
  const text = readFileSync("lib/firebase/firestore.ts", "utf8");
  assert.match(text, /limit\(RESPONDER_QUEUE_LIMIT\)/);
  assert.match(text, /orderBy\("urgencyWeight", "desc"\)/);
  assert.match(text, /includeMetadataChanges: true/);
  const queueSection = text.slice(text.indexOf("subscribeToDashboardQueue<T>"), text.indexOf("export interface UserRequestsMeta"));
  assert.doesNotMatch(queueSection, /as any/);
  assert.equal((queueSection.match(/onSnapshot\(/g) ?? []).length, 1, "exactly one query, no fallback");
});

test("the server route, rules, indexes and constants are untouched by T5 expectations", () => {
  // T5 must not move the contract: these anchors exist in the files T5 may not change.
  assert.ok(existsSync("app/api/reports/[id]/route.ts"));
  assert.match(readFileSync("firestore.indexes.json", "utf8"), /urgencyWeight/);
  assert.match(readFileSync("lib/server/report-security.ts", "utf8"), /Cannot \$\{action\} a report that is/);
});

test("the map uses the existing Leaflet dependency only", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
  assert.equal("react-leaflet" in pkg.dependencies, false);
  assert.ok("leaflet" in pkg.dependencies);
  const map = readFileSync("components/responder/incident-map.tsx", "utf8");
  assert.match(map, /tile\.openstreetmap\.org/);
  assert.match(map, /OpenStreetMap/);
});
