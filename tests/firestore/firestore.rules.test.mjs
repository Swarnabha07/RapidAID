import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const PROJECT_ID = "demo-rapidaid-rules";

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

function user(uid = "victim-1", role = "victim") {
  return testEnv.authenticatedContext(uid, role ? { role } : {}).firestore();
}

function unauthenticated() {
  return testEnv.unauthenticatedContext().firestore();
}

function validReport(uid = "victim-1", id = "report-1") {
  return {
    reportId: id,
    userId: uid,
    category: "medical",
    urgency: "high",
    urgencyWeight: 2,
    description: "Person needs medical assistance",
    translatedDescription: null,
    originalLanguage: "en",
    isSOS: false,
    location: {
      lat: 22.5726,
      lng: 88.3639,
    },
    mediaUrl: null,
    processedBy: "manual",
    confidenceScore: null,
    status: "received",
    assignedDashboard: "medical",
    isDuplicateOf: null,
    escalated: false,
    escalatedAt: null,
    createdAt: serverTimestamp(),
    syncedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    assignedTeamOrUnit: null,
    acknowledgedAt: null,
    resolvedNotes: null,
    activityTrail: [
      {
        id: "activity-1",
        action: "Emergency report created",
        actorRole: "citizen",
        note: null,
        timestamp: new Date().toISOString(),
      },
    ],
    peopleAffected: 1,
    reportedInjuries: null,
  };
}

async function seed(path, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

test("allows a citizen to create a valid initial report", async () => {
  const db = user();
  await assertSucceeds(setDoc(doc(db, "reports/report-1"), validReport()));
});

test("allows anonymous users to create only their own reports without responder privileges", async () => {
  const anonymousDb = testEnv
    .authenticatedContext("anonymous-guest-1")
    .firestore();

  // Anonymous users can submit their own emergency reports.
  await assertSucceeds(
    setDoc(
      doc(anonymousDb, "reports/anonymous-report-1"),
      validReport("anonymous-guest-1", "anonymous-report-1"),
    ),
  );

  // They cannot submit reports for another user.
  await assertFails(
    setDoc(
      doc(anonymousDb, "reports/anonymous-report-2"),
      validReport("another-user", "anonymous-report-2"),
    ),
  );

  // They cannot modify or delete reports.
  await assertFails(
    updateDoc(doc(anonymousDb, "reports/anonymous-report-1"), {
      status: "resolved",
    }),
  );

  await assertFails(deleteDoc(doc(anonymousDb, "reports/anonymous-report-1")));

  // They cannot access responder-only escalation logs.
  await seed("escalationLog/log-1", { action: "test" });

  await assertFails(getDoc(doc(anonymousDb, "escalationLog/log-1")));
});

test("rejects a report created for another user", async () => {
  const db = user("victim-1");
  await assertFails(
    setDoc(doc(db, "reports/report-2"), validReport("victim-2", "report-2")),
  );
});

test("rejects extra or unauthorized report fields", async () => {
  const report = {
    ...validReport(),
    role: "admin",
  };

  await assertFails(setDoc(doc(user(), "reports/report-extra"), report));
});

test("rejects an SOS report that is not critical", async () => {
  const report = {
    ...validReport(),
    isSOS: true,
    urgency: "normal",
    urgencyWeight: 1,
  };

  await assertFails(setDoc(doc(user(), "reports/report-sos"), report));
});

test("rejects a report that does not start in received status", async () => {
  const report = {
    ...validReport(),
    status: "resolved",
  };

  await assertFails(setDoc(doc(user(), "reports/report-status"), report));
});

test("rejects citizen reports that claim on-device or cloud AI processing", async () => {
  for (const processedBy of ["on-device", "cloud", "gemini", "", null]) {
    await assertFails(
      setDoc(doc(user(), `reports/claim-${String(processedBy)}`), {
        ...validReport("victim-1", `claim-${String(processedBy)}`),
        processedBy,
      }),
    );
  }
});

test("rejects citizen reports with any numeric or non-null confidence score", async () => {
  for (const confidenceScore of [0, 0.5, 0.95, 1, "0.9"]) {
    await assertFails(
      setDoc(doc(user(), `reports/conf-${String(confidenceScore)}`), {
        ...validReport("victim-1", `conf-${String(confidenceScore)}`),
        confidenceScore,
      }),
    );
  }
});

test("rejects citizen reports that omit processedBy or confidenceScore", async () => {
  const noProcessor = validReport("victim-1", "no-processor");
  delete noProcessor.processedBy;
  await assertFails(setDoc(doc(user(), "reports/no-processor"), noProcessor));

  const noConfidence = validReport("victim-1", "no-confidence");
  delete noConfidence.confidenceScore;
  await assertFails(setDoc(doc(user(), "reports/no-confidence"), noConfidence));
});

test("allows a manual SOS report and a rescue-routed report", async () => {
  await assertSucceeds(
    setDoc(doc(user(), "reports/sos-ok"), {
      ...validReport("victim-1", "sos-ok"),
      isSOS: true,
      urgency: "critical",
      urgencyWeight: 3,
    }),
  );

  await assertSucceeds(
    setDoc(doc(user(), "reports/water-ok"), {
      ...validReport("victim-1", "water-ok"),
      category: "water",
      assignedDashboard: "rescue",
    }),
  );
});

test("rejects a report routed to the wrong dashboard for its category", async () => {
  await assertFails(
    setDoc(doc(user(), "reports/route-1"), {
      ...validReport("victim-1", "route-1"),
      category: "medical",
      assignedDashboard: "rescue",
    }),
  );

  await assertFails(
    setDoc(doc(user(), "reports/route-2"), {
      ...validReport("victim-1", "route-2"),
      category: "shelter",
      assignedDashboard: "medical",
    }),
  );
});

test("accessConditions is optional, bounded and must be a string or null", async () => {
  await assertSucceeds(
    setDoc(doc(user(), "reports/access-1"), {
      ...validReport("victim-1", "access-1"),
      accessConditions: "Road flooded; boat access only",
    }),
  );

  await assertSucceeds(
    setDoc(doc(user(), "reports/access-2"), {
      ...validReport("victim-1", "access-2"),
      accessConditions: null,
    }),
  );

  await assertFails(
    setDoc(doc(user(), "reports/access-3"), {
      ...validReport("victim-1", "access-3"),
      accessConditions: "x".repeat(501),
    }),
  );

  await assertFails(
    setDoc(doc(user(), "reports/access-4"), {
      ...validReport("victim-1", "access-4"),
      accessConditions: 42,
    }),
  );
});

test("anonymous users are held to the same manual-provenance rules", async () => {
  const anonymousDb = testEnv.authenticatedContext("anonymous-guest-9").firestore();

  await assertSucceeds(
    setDoc(
      doc(anonymousDb, "reports/anon-manual"),
      validReport("anonymous-guest-9", "anon-manual"),
    ),
  );

  await assertFails(
    setDoc(doc(anonymousDb, "reports/anon-cloud"), {
      ...validReport("anonymous-guest-9", "anon-cloud"),
      processedBy: "cloud",
      confidenceScore: 0.99,
    }),
  );
});

test("allows the report owner to read their report", async () => {
  await seed("reports/report-1", validReport());

  await assertSucceeds(getDoc(doc(user("victim-1"), "reports/report-1")));
});

test("prevents another citizen from reading the report", async () => {
  await seed("reports/report-1", validReport());

  await assertFails(getDoc(doc(user("victim-2"), "reports/report-1")));
});

test("allows medical, rescue and admin claims to read reports", async () => {
  await seed("reports/report-1", validReport());

  for (const role of ["medical", "rescue", "admin"]) {
    await assertSucceeds(
      getDoc(doc(user(`${role}-1`, role), "reports/report-1")),
    );
  }
});

test("prevents clients from updating or deleting reports", async () => {
  await seed("reports/report-1", validReport());

  const db = user();

  await assertFails(
    updateDoc(doc(db, "reports/report-1"), {
      status: "resolved",
    }),
  );

  await assertFails(deleteDoc(doc(db, "reports/report-1")));
});

test("does not grant responder access from a Firestore role document", async () => {
  await seed("users/legacy-admin", {
    role: "admin",
    displayName: "Legacy Admin",
  });

  await seed("escalationLog/log-1", {
    action: "test",
  });

  const db = user("legacy-admin", null);

  await assertFails(getDoc(doc(db, "escalationLog/log-1")));
});

test("allows a user to update permitted profile fields", async () => {
  await seed("users/victim-1", {
    displayName: "Old Name",
    preferredLanguage: "en",
    role: "victim",
  });

  await assertSucceeds(
    updateDoc(doc(user(), "users/victim-1"), {
      displayName: "New Name",
      preferredLanguage: "bn",
    }),
  );
});

test("prevents a user from changing their own role", async () => {
  await seed("users/victim-1", {
    displayName: "Citizen",
    role: "victim",
  });

  await assertFails(
    updateDoc(doc(user(), "users/victim-1"), {
      role: "admin",
    }),
  );
});

test("prevents users from creating or deleting user documents", async () => {
  const db = user();

  await assertFails(
    setDoc(doc(db, "users/new-user"), {
      role: "admin",
    }),
  );

  await seed("users/victim-1", {
    displayName: "Citizen",
    role: "victim",
  });

  await assertFails(deleteDoc(doc(db, "users/victim-1")));
});

test("allows users to read their own profile but not another user's", async () => {
  await seed("users/victim-1", { role: "victim" });
  await seed("users/victim-2", { role: "victim" });

  const db = user("victim-1");

  await assertSucceeds(getDoc(doc(db, "users/victim-1")));

  await assertFails(getDoc(doc(db, "users/victim-2")));
});

test("allows admins to read other user profiles", async () => {
  await seed("users/victim-1", { role: "victim" });

  await assertSucceeds(getDoc(doc(user("admin-1", "admin"), "users/victim-1")));
});

test("allows signed-in users to read alerts and resources", async () => {
  await seed("alerts/alert-1", { title: "Test alert" });
  await seed("resources/resource-1", { name: "Test resource" });

  const db = user();

  await assertSucceeds(getDoc(doc(db, "alerts/alert-1")));

  await assertSucceeds(getDoc(doc(db, "resources/resource-1")));
});

test("prevents client writes to alerts and resources", async () => {
  const db = user();

  await assertFails(
    setDoc(doc(db, "alerts/new-alert"), { title: "Fake alert" }),
  );

  await assertFails(
    setDoc(doc(db, "resources/new-resource"), { name: "Fake resource" }),
  );
});

test("allows responders to read escalation logs", async () => {
  await seed("escalationLog/log-1", { action: "test" });

  await assertSucceeds(
    getDoc(doc(user("rescue-1", "rescue"), "escalationLog/log-1")),
  );
});

test("prevents citizens from reading escalation logs", async () => {
  await seed("escalationLog/log-1", { action: "test" });

  await assertFails(getDoc(doc(user(), "escalationLog/log-1")));
});

test("prevents client writes to escalation logs", async () => {
  const db = user("admin-1", "admin");

  await assertFails(
    setDoc(doc(db, "escalationLog/fake-log"), {
      action: "unauthorized",
    }),
  );
});

test("denies unauthenticated access to protected collections", async () => {
  const db = unauthenticated();

  await assertFails(getDoc(doc(db, "reports/report-1")));

  await assertFails(getDoc(doc(db, "users/victim-1")));

  await assertFails(getDocs(collection(db, "alerts")));
});
