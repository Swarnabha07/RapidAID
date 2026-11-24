/**
 * Mapper truthfulness tests: no canned AI text, no invented model names, no crash on partial
 * documents. Run:  npx --yes tsx --test tests/schema/*.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  mapReportToMedicalIncident,
  mapReportToRescueIncident,
  mapReportToCitizenRequest,
  describeLocation,
  describeProcessing,
  NO_AI_SUMMARY_LABEL,
  ZONE_UNKNOWN_LABEL,
  type Report,
} from "../../lib/types/report";

function report(overrides: Partial<Report> = {}): Report {
  return {
    reportId: "report-12345678",
    userId: "uid-1",
    category: "medical",
    urgency: "high",
    urgencyWeight: 2,
    description: "Person needs help",
    translatedDescription: null,
    originalLanguage: "en",
    isSOS: false,
    location: { lat: 22.5726, lng: 88.3639 },
    mediaUrl: null,
    processedBy: "manual",
    confidenceScore: null,
    status: "received",
    assignedDashboard: "medical",
    isDuplicateOf: null,
    escalated: false,
    escalatedAt: null,
    createdAt: new Date("2026-11-24T10:00:00Z"),
    syncedAt: new Date("2026-11-24T10:00:01Z"),
    updatedAt: new Date("2026-11-24T10:00:01Z"),
    ...overrides,
  };
}

const FORBIDDEN = /gemini|nano|cross-referenced|multi-source|de-duplicated|cloud-enhanced|north district/i;

test("no mapper invents AI text, model names or districts, for any provenance", () => {
  for (const processedBy of ["manual", "on-device", "cloud"] as const) {
    for (const category of ["medical", "water"] as const) {
      const r = report({ processedBy, category, assignedDashboard: category === "medical" ? "medical" : "rescue" });
      const text = JSON.stringify([
        mapReportToMedicalIncident(r),
        mapReportToRescueIncident(r),
        mapReportToCitizenRequest(r),
      ]);
      assert.doesNotMatch(text, FORBIDDEN, `${processedBy}/${category}`);
    }
  }
});

test("without a stored AI summary the mappers say so plainly", () => {
  const r = report();
  assert.equal(mapReportToMedicalIncident(r).aiTriageSummary, NO_AI_SUMMARY_LABEL);
  assert.equal(mapReportToRescueIncident(r).aiTriageSummary, NO_AI_SUMMARY_LABEL);
});

test("a stored AI summary is passed through unchanged", () => {
  const r = report({ aiTriageSummary: "Stored summary text", aiTriageLabel: "STORED LABEL" });
  assert.equal(mapReportToMedicalIncident(r).aiTriageSummary, "Stored summary text");
  const rescue = mapReportToRescueIncident(r);
  assert.equal(rescue.aiTriageSummary, "Stored summary text");
  assert.equal(rescue.aiTriageLabel, "STORED LABEL");
});

test("rescue labels describe the report source truthfully", () => {
  assert.match(mapReportToRescueIncident(report({ processedBy: "manual" })).lastVerified, /no AI processing/i);
  assert.doesNotMatch(mapReportToRescueIncident(report({ processedBy: "manual" })).lastVerified, /verified via/i);
  assert.match(mapReportToRescueIncident(report({ processedBy: "cloud" })).lastVerified, /as recorded on the report/);
  assert.match(mapReportToRescueIncident(report({ urgency: "critical" })).aiTriageLabel, /^REPORTED CRITICAL$/);
  assert.equal(describeProcessing(undefined), "Processing source not recorded");
});

test("missing or partial location never throws", () => {
  const noLocation = report({ location: undefined as unknown as Report["location"] });
  assert.doesNotThrow(() => mapReportToMedicalIncident(noLocation));
  assert.doesNotThrow(() => mapReportToRescueIncident(noLocation));
  assert.doesNotThrow(() => mapReportToCitizenRequest(noLocation));
  assert.equal(mapReportToMedicalIncident(noLocation).location, "Location unavailable");
  assert.equal(mapReportToMedicalIncident(noLocation).zone, ZONE_UNKNOWN_LABEL);
  assert.equal(describeLocation({ lat: NaN, lng: 2 } as never), "Location unavailable");
  assert.equal(describeLocation({ lat: 1.23456, lng: 2.34567 }), "Coordinates: 1.2346, 2.3457");
  assert.equal(describeLocation({ lat: 1.23456, lng: 2.34567 }, "lat-lng"), "Lat: 1.235, Lng: 2.346");
  assert.equal(describeLocation({ lat: 1, lng: 2, address: "Main St" }), "Main St");
});

test("defaults are neutral, not invented", () => {
  const m = mapReportToMedicalIncident(report());
  assert.equal(m.peopleAffected, 1);
  assert.equal(m.reportedInjuries, "Not reported");
  assert.equal(m.zone, ZONE_UNKNOWN_LABEL);
  assert.equal(mapReportToMedicalIncident(report({ zone: undefined } as never)).zone, ZONE_UNKNOWN_LABEL);
  assert.equal(mapReportToMedicalIncident(report({ location: { lat: 1, lng: 2, zone: "Ward 4" } })).zone, "Ward 4");
});

test("timeline fallback does not credit a model that may not have run", () => {
  const m = mapReportToMedicalIncident(report({ processedBy: "on-device", activityTrail: [] }));
  assert.equal(m.timeline[0].actor, "Citizen portal");
});

test("legacy documents that still carry AI provenance and numeric confidence are readable", () => {
  const legacy = report({ processedBy: "cloud", confidenceScore: 0.97 });
  assert.doesNotThrow(() => mapReportToRescueIncident(legacy));
  assert.doesNotThrow(() => mapReportToMedicalIncident(legacy));
});
