import fs from "fs";
import path from "path";
// Parse .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  }
}

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID;
const API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY;

if (!PROJECT_ID) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID in environment or .env.local");
  process.exit(1);
}

if (!API_KEY) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_API_KEY in environment or .env.local");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// SAFETY GUARD - this script creates test accounts (including an admin) and OVERWRITES
// reports/users documents. Run it ONLY against a separate development project, never production.
// No passwords are stored in this repository: supply your own through the environment.
//   SEED_TEST_PASSWORD   a strong password (14+ characters) used for the test accounts
//   SEED_CONFIRM_PROJECT must equal the project id you are about to seed
// ---------------------------------------------------------------------------
const SEED_PASSWORD = process.env.SEED_TEST_PASSWORD;
if (!SEED_PASSWORD || SEED_PASSWORD.length < 14) {
  console.error("Set SEED_TEST_PASSWORD to a strong password (at least 14 characters). Nothing was changed.");
  process.exit(1);
}
if (process.env.SEED_CONFIRM_PROJECT !== PROJECT_ID) {
  console.error(
    `Safety check failed: set SEED_CONFIRM_PROJECT=${PROJECT_ID} to confirm this is a DEVELOPMENT project. Nothing was changed.`
  );
  process.exit(1);
}

// Read OAuth access token from firebase-tools.json
const configPath = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".config",
  "configstore",
  "firebase-tools.json"
);

if (!fs.existsSync(configPath)) {
  console.error("Could not find firebase-tools.json at:", configPath);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const ACCESS_TOKEN = config.tokens?.access_token;

if (!ACCESS_TOKEN) {
  console.error("No access token found in firebase-tools.json");
  process.exit(1);
}

console.log("Using Firebase Project:", PROJECT_ID);

// ---------------------------------------------------------------------------
// Firestore REST Serializer
// ---------------------------------------------------------------------------
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val)
      ? { integerValue: val.toString() }
      : { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return { fields };
}

async function writeFirestoreDocument(collection, docId, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  const docPayload = toFirestoreDoc(data);

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(docPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to write doc ${collection}/${docId}: ${res.status} ${errText}`);
  }

  return await res.json();
}

async function listCollections() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:listCollectionIds`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(`Failed to list collections: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.collectionIds || [];
}

async function listDocumentsInCollection(collection) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to list documents in ${collection}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.documents || [];
}

// ---------------------------------------------------------------------------
// Firebase Auth Helpers
// ---------------------------------------------------------------------------
async function findOrCreateUser(email, password, displayName, role) {
  let uid = null;

  // 1. Try to look up existing user
  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: [email] }),
    }
  );

  const lookupData = await lookupRes.json();
  if (lookupData.users && lookupData.users.length > 0) {
    uid = lookupData.users[0].localId;
    console.log(`User ${email} already exists (UID: ${uid})`);
  } else {
    // 2. Create user with email and password
    const createRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const createData = await createRes.json();
    if (!createRes.ok) {
      throw new Error(`Failed to create user ${email}: ${JSON.stringify(createData)}`);
    }
    uid = createData.localId;
    console.log(`Created user ${email} (UID: ${uid})`);
  }

  // 3. Set display name and custom claims (role)
  const updateRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        localId: uid,
        displayName,
        customAttributes: JSON.stringify({ role }),
      }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Failed to update claims for ${email}: ${updateRes.status} ${errText}`);
  }

  console.log(`Updated claims for ${email} -> role: "${role}"`);

  // 4. Create / update users/{userId} document in Firestore
  const now = new Date();
  await writeFirestoreDocument("users", uid, {
    userId: uid,
    role,
    displayName,
    preferredLanguage: "en",
    fcmToken: null,
    createdAt: now,
    lastActiveAt: now,
  });
  console.log(`Written Firestore doc users/${uid}`);

  return uid;
}

// ---------------------------------------------------------------------------
// Seed Data Execution
// ---------------------------------------------------------------------------
async function runSeed() {
  console.log("\n--- STEP 1: Creating & Setting Up Test Users ---");
  const testUsers = [
    {
      email: "victim@rapidaid.test",
      password: SEED_PASSWORD,
      displayName: "Citizen User",
      role: "victim",
    },
    {
      email: "medic@rapidaid.test",
      password: SEED_PASSWORD,
      displayName: "Dr. Elena Rostova",
      role: "medical",
    },
    {
      email: "rescue@rapidaid.test",
      password: SEED_PASSWORD,
      displayName: "Captain Marcus Cole",
      role: "rescue",
    },
    {
      email: "admin@rapidaid.test",
      password: SEED_PASSWORD,
      displayName: "Disaster Operations Lead",
      role: "admin",
    },
  ];

  const userIds = {};
  for (const u of testUsers) {
    const uid = await findOrCreateUser(u.email, u.password, u.displayName, u.role);
    userIds[u.role] = uid;
  }

  const victimUid = userIds["victim"];
  const medicUid = userIds["medical"];
  const rescueUid = userIds["rescue"];
  const adminUid = userIds["admin"];

  console.log("\n--- STEP 2: Seeding 8 Realistic Reports ---");
  const now = Date.now();

  const reports = [
    // --- 4 Medical Reports ---
    {
      reportId: "rep-med-001",
      userId: victimUid,
      category: "medical",
      urgency: "critical",
      urgencyWeight: 3,
      description: "Severe crush injury from collapsed concrete pillar in market hall. Patient has shallow breathing and heavy blood loss.",
      translatedDescription: "Severe crush injury from collapsed concrete pillar in market hall. Patient has shallow breathing and heavy blood loss.",
      originalLanguage: "en",
      isSOS: true,
      location: {
        lat: 13.0827,
        lng: 80.2707,
        address: "Sector 4 Main Market, Hall B, Old Town",
        zone: "Zone A - Central",
      },
      mediaUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80",
      processedBy: "cloud",
      confidenceScore: 0.97,
      status: "in_progress",
      assignedDashboard: "medical",
      isDuplicateOf: null,
      escalated: true,
      escalatedAt: new Date(now - 25 * 60 * 1000),
      createdAt: new Date(now - 40 * 60 * 1000),
      syncedAt: new Date(now - 39 * 60 * 1000),
      updatedAt: new Date(now - 15 * 60 * 1000),
      assignedTeamOrUnit: "Medic Unit 1",
      acknowledgedAt: new Date(now - 20 * 60 * 1000),
      acknowledgedBy: "Dr. Elena Rostova",
      peopleAffected: 1,
      reportedInjuries: "Crush injury, suspected pelvic fracture",
      aiTriageSummary: "High probability traumatic hemorrhage requiring immediate surgical stabilization.",
      aiTriageLabel: "Trauma Level 1",
      priorityConfirmedBy: "AI Automated Triage Engine",
      escalationLevel: 2,
      activityTrail: [
        {
          id: "act-m1-1",
          action: "Report Created",
          actorRole: "victim",
          note: "Emergency SOS triggered by citizen via one-tap mobile panic action.",
          timestamp: new Date(now - 40 * 60 * 1000),
        },
        {
          id: "act-m1-2",
          action: "AI Triage Escalation",
          actorRole: "system",
          note: "Vital risk detected. Urgency elevated to Critical.",
          timestamp: new Date(now - 25 * 60 * 1000),
        },
        {
          id: "act-m1-3",
          action: "Acknowledged & Dispatched",
          actorRole: "medical",
          note: "Medic Unit 1 en route with mobile trauma kit.",
          timestamp: new Date(now - 20 * 60 * 1000),
        },
      ],
    },
    {
      reportId: "rep-med-002",
      userId: victimUid,
      category: "medical",
      urgency: "high",
      urgencyWeight: 2,
      description: "Elderly resident experiencing acute respiratory distress and severe wheezing. Power outage cut off home oxygen concentrator.",
      translatedDescription: "Elderly resident experiencing acute respiratory distress and severe wheezing. Power outage cut off home oxygen concentrator.",
      originalLanguage: "en",
      isSOS: false,
      location: {
        lat: 13.0855,
        lng: 80.273,
        address: "Apartment 3B, Golden Heights Towers",
        zone: "Zone A - Central",
      },
      mediaUrl: null,
      processedBy: "cloud",
      confidenceScore: 0.91,
      status: "received",
      assignedDashboard: "medical",
      isDuplicateOf: null,
      escalated: false,
      escalatedAt: null,
      createdAt: new Date(now - 30 * 60 * 1000),
      syncedAt: new Date(now - 29 * 60 * 1000),
      updatedAt: new Date(now - 30 * 60 * 1000),
      assignedTeamOrUnit: null,
      acknowledgedAt: null,
      peopleAffected: 1,
      reportedInjuries: "Asthmatic hypoxia / Respiratory failure risk",
      aiTriageSummary: "Supplemental oxygen required within 45 minutes to prevent hypoxemia.",
      aiTriageLabel: "Respiratory Urgent",
      activityTrail: [
        {
          id: "act-m2-1",
          action: "Report Created",
          actorRole: "victim",
          note: "Submitted through citizen portal by family member.",
          timestamp: new Date(now - 30 * 60 * 1000),
        },
      ],
    },
    {
      reportId: "rep-med-003",
      userId: "usr-ext-101",
      category: "medical",
      urgency: "high",
      urgencyWeight: 2,
      description: "Deep laceration on right forearm from shattered storefront glass during flood surges. Makeshift tourniquet applied.",
      translatedDescription: "Deep laceration on right forearm from shattered storefront glass during flood surges. Makeshift tourniquet applied.",
      originalLanguage: "en",
      isSOS: false,
      location: {
        lat: 13.0789,
        lng: 80.265,
        address: "Bridge Road, Opposite Community Hall",
        zone: "Zone B - Lowlands",
      },
      mediaUrl: null,
      processedBy: "on-device",
      confidenceScore: 0.88,
      status: "dispatched",
      assignedDashboard: "medical",
      isDuplicateOf: null,
      escalated: false,
      escalatedAt: null,
      createdAt: new Date(now - 55 * 60 * 1000),
      syncedAt: new Date(now - 54 * 60 * 1000),
      updatedAt: new Date(now - 20 * 60 * 1000),
      assignedTeamOrUnit: "Rapid Triage Van 3",
      acknowledgedAt: new Date(now - 35 * 60 * 1000),
      acknowledgedBy: "Dr. Elena Rostova",
      peopleAffected: 2,
      reportedInjuries: "Arterial bleed risk controlled, secondary shock",
      activityTrail: [
        {
          id: "act-m3-1",
          action: "Report Created",
          actorRole: "victim",
          note: "Reported with on-device offline cache and uploaded upon network reconnect.",
          timestamp: new Date(now - 55 * 60 * 1000),
        },
        {
          id: "act-m3-2",
          action: "Team Assigned",
          actorRole: "medical",
          note: "Rapid Triage Van 3 responding with wound management kit.",
          timestamp: new Date(now - 20 * 60 * 1000),
        },
      ],
    },
    {
      reportId: "rep-med-004",
      userId: "usr-ext-102",
      category: "medical",
      urgency: "normal",
      urgencyWeight: 1,
      description: "Diabetic patient stranded without insulin refills for 48 hours. Currently ambulatory and stable, requests supply drop.",
      translatedDescription: "Diabetic patient stranded without insulin refills for 48 hours. Currently ambulatory and stable, requests supply drop.",
      originalLanguage: "en",
      isSOS: false,
      location: {
        lat: 13.091,
        lng: 80.281,
        address: "Lane 7, East Riverside Colony",
        zone: "Zone C - Harbor",
      },
      mediaUrl: null,
      processedBy: "cloud",
      confidenceScore: 0.85,
      status: "received",
      assignedDashboard: "medical",
      isDuplicateOf: null,
      escalated: false,
      escalatedAt: null,
      createdAt: new Date(now - 80 * 60 * 1000),
      syncedAt: new Date(now - 79 * 60 * 1000),
      updatedAt: new Date(now - 80 * 60 * 1000),
      assignedTeamOrUnit: null,
      acknowledgedAt: null,
      peopleAffected: 1,
      reportedInjuries: "Maintenance medication exhaustion",
      activityTrail: [
        {
          id: "act-m4-1",
          action: "Report Created",
          actorRole: "victim",
          note: "Routine non-emergency supply request queued for batch dispatch.",
          timestamp: new Date(now - 80 * 60 * 1000),
        },
      ],
    },

    // --- 4 Rescue Reports ---
    {
      reportId: "rep-res-001",
      userId: victimUid,
      category: "water",
      urgency: "critical",
      urgencyWeight: 3,
      description: "Water level rose 1.5m in 20 minutes, submerging ground floor. Family of 5 including 2 infants and wheelchair-bound senior stranded on balcony.",
      translatedDescription: "Water level rose 1.5m in 20 minutes, submerging ground floor. Family of 5 including 2 infants and wheelchair-bound senior stranded on balcony.",
      originalLanguage: "en",
      isSOS: true,
      location: {
        lat: 13.075,
        lng: 80.26,
        address: "Block 14, Riverside Flats, Lowlands",
        zone: "Zone B - Lowlands",
      },
      mediaUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
      processedBy: "cloud",
      confidenceScore: 0.99,
      status: "in_progress",
      assignedDashboard: "rescue",
      isDuplicateOf: null,
      escalated: true,
      escalatedAt: new Date(now - 45 * 60 * 1000),
      createdAt: new Date(now - 60 * 60 * 1000),
      syncedAt: new Date(now - 59 * 60 * 1000),
      updatedAt: new Date(now - 25 * 60 * 1000),
      assignedTeamOrUnit: "Zodiac Boat Alpha",
      acknowledgedAt: new Date(now - 30 * 60 * 1000),
      acknowledgedBy: "Captain Marcus Cole",
      peopleAffected: 5,
      accessConditions: "Severe inundation; navigable only by shallow-draft inflatable rescue boat.",
      aiTriageSummary: "High flash flood surge threat with vulnerable occupants on unprotected second floor.",
      aiTriageLabel: "Water Extraction Priority 1",
      escalationLevel: 2,
      activityTrail: [
        {
          id: "act-r1-1",
          action: "Report Created",
          actorRole: "victim",
          note: "SOS emergency beacon broadcast with high-precision GPS lock.",
          timestamp: new Date(now - 60 * 60 * 1000),
        },
        {
          id: "act-r1-2",
          action: "Auto-Escalated",
          actorRole: "system",
          note: "Matched flood gauge alert: rapid water rise in sector 14.",
          timestamp: new Date(now - 45 * 60 * 1000),
        },
        {
          id: "act-r1-3",
          action: "Boat Dispatched",
          actorRole: "rescue",
          note: "Zodiac Boat Alpha deployed from Pier 2 staging base.",
          timestamp: new Date(now - 25 * 60 * 1000),
        },
      ],
    },
    {
      reportId: "rep-res-002",
      userId: "usr-ext-103",
      category: "shelter",
      urgency: "high",
      urgencyWeight: 2,
      description: "Roof trusses of primary community relief hall damaged by fallen tree limb. Rain flooding interior storage where 20 evacuees are sheltering.",
      translatedDescription: "Roof trusses of primary community relief hall damaged by fallen tree limb. Rain flooding interior storage where 20 evacuees are sheltering.",
      originalLanguage: "en",
      isSOS: false,
      location: {
        lat: 13.08,
        lng: 80.275,
        address: "Municipal Higher Secondary School Grounds",
        zone: "Zone A - Central",
      },
      mediaUrl: null,
      processedBy: "cloud",
      confidenceScore: 0.92,
      status: "received",
      assignedDashboard: "rescue",
      isDuplicateOf: null,
      escalated: false,
      escalatedAt: null,
      createdAt: new Date(now - 70 * 60 * 1000),
      syncedAt: new Date(now - 69 * 60 * 1000),
      updatedAt: new Date(now - 70 * 60 * 1000),
      assignedTeamOrUnit: null,
      acknowledgedAt: null,
      peopleAffected: 20,
      accessConditions: "Access road clear for municipal utility flatbed trucks.",
      activityTrail: [
        {
          id: "act-r2-1",
          action: "Report Created",
          actorRole: "victim",
          note: "Filed by relief shelter coordinator.",
          timestamp: new Date(now - 70 * 60 * 1000),
        },
      ],
    },
    {
      reportId: "rep-res-003",
      userId: "usr-ext-104",
      category: "missing_person",
      urgency: "high",
      urgencyWeight: 2,
      description: "9-year-old child wearing bright yellow raincoat separated from family during sudden surge evacuation at Metro Station entrance 2.",
      translatedDescription: "9-year-old child wearing bright yellow raincoat separated from family during sudden surge evacuation at Metro Station entrance 2.",
      originalLanguage: "en",
      isSOS: false,
      location: {
        lat: 13.084,
        lng: 80.279,
        address: "Central Metro Concourse, Plaza Level, Gate 2",
        zone: "Zone A - Central",
      },
      mediaUrl: null,
      processedBy: "on-device",
      confidenceScore: 0.89,
      status: "dispatched",
      assignedDashboard: "rescue",
      isDuplicateOf: null,
      escalated: false,
      escalatedAt: null,
      createdAt: new Date(now - 50 * 60 * 1000),
      syncedAt: new Date(now - 49 * 60 * 1000),
      updatedAt: new Date(now - 15 * 60 * 1000),
      assignedTeamOrUnit: "Rescue Squad 4 (Ground)",
      acknowledgedAt: new Date(now - 30 * 60 * 1000),
      acknowledgedBy: "Captain Marcus Cole",
      peopleAffected: 1,
      activityTrail: [
        {
          id: "act-r3-1",
          action: "Report Created",
          actorRole: "victim",
          note: "Missing child report filed with station perimeter description.",
          timestamp: new Date(now - 50 * 60 * 1000),
        },
        {
          id: "act-r3-2",
          action: "Patrol Dispatched",
          actorRole: "rescue",
          note: "Ground search squad deployed to sweep concourse and concourse perimeter.",
          timestamp: new Date(now - 15 * 60 * 1000),
        },
      ],
    },
    {
      reportId: "rep-res-004",
      userId: "usr-ext-105",
      category: "other",
      urgency: "normal",
      urgencyWeight: 1,
      description: "Downed live electric transmission line across access road. No fire detected but prevents relief convoy passage.",
      translatedDescription: "Downed live electric transmission line across access road. No fire detected but prevents relief convoy passage.",
      originalLanguage: "en",
      isSOS: false,
      location: {
        lat: 13.089,
        lng: 80.268,
        address: "Cross Street 4, North Industrial Belt",
        zone: "Zone C - Harbor",
      },
      mediaUrl: null,
      processedBy: "cloud",
      confidenceScore: 0.95,
      status: "resolved",
      assignedDashboard: "rescue",
      isDuplicateOf: null,
      escalated: false,
      escalatedAt: null,
      createdAt: new Date(now - 130 * 60 * 1000),
      syncedAt: new Date(now - 129 * 60 * 1000),
      updatedAt: new Date(now - 20 * 60 * 1000),
      assignedTeamOrUnit: "Grid Isolation Utility Crew",
      acknowledgedAt: new Date(now - 90 * 60 * 1000),
      acknowledgedBy: "Captain Marcus Cole",
      resolvedNotes: "Transmission line successfully isolated, grounded, and cleared from the roadway. Convoy path reopened.",
      peopleAffected: 0,
      activityTrail: [
        {
          id: "act-r4-1",
          action: "Report Created",
          actorRole: "victim",
          note: "Hazard alert from evacuation convoy scout.",
          timestamp: new Date(now - 130 * 60 * 1000),
        },
        {
          id: "act-r4-2",
          action: "Crew Dispatched",
          actorRole: "rescue",
          note: "Coordinating with power utility technicians.",
          timestamp: new Date(now - 90 * 60 * 1000),
        },
        {
          id: "act-r4-3",
          action: "Resolved",
          actorRole: "rescue",
          note: "Road confirmed clear by Field Incident Commander.",
          timestamp: new Date(now - 20 * 60 * 1000),
        },
      ],
    },
  ];

  for (const r of reports) {
    await writeFirestoreDocument("reports", r.reportId, r);
    console.log(`Seeded report ${r.reportId} (${r.assignedDashboard}, weight: ${r.urgencyWeight})`);
  }

  console.log("\n--- STEP 3: Seeding Alerts, Resources, and EscalationLog ---");

  // Alerts
  const alerts = [
    {
      alertId: "alert-001",
      title: "Flash Flood Surge Warning - Zone B",
      message: "River basin cresting above critical threshold. Lowland residents instructed to move to vertical shelters immediately.",
      severity: "critical",
      area: "Zone B - Lowlands & River Basin",
      createdBy: "Disaster Operations Lead",
      createdAt: new Date(now - 60 * 60 * 1000),
      expiresAt: new Date(now + 24 * 60 * 60 * 1000),
      active: true,
      coordinates: { lat: 13.075, lng: 80.26 },
      radiusKm: 5,
    },
    {
      alertId: "alert-002",
      title: "Boil Water Advisory - Citywide East",
      message: "Floodwater intrusion detected near water filtration substation 4. Boil all drinking water for minimum 3 minutes.",
      severity: "warning",
      area: "Zone A & Zone C Sectors",
      createdBy: "Disaster Operations Lead",
      createdAt: new Date(now - 120 * 60 * 1000),
      expiresAt: new Date(now + 48 * 60 * 60 * 1000),
      active: true,
    },
    {
      alertId: "alert-003",
      title: "Safe Haven Evacuation Center Operational",
      message: "Indoor sports arena opened with hot meals, dry bedding, and medical triage station. Pet friendly wing available.",
      severity: "info",
      area: "Central Sports Complex, Gate 1",
      createdBy: "Disaster Operations Lead",
      createdAt: new Date(now - 180 * 60 * 1000),
      expiresAt: new Date(now + 72 * 60 * 60 * 1000),
      active: true,
      coordinates: { lat: 13.082, lng: 80.274 },
      radiusKm: 2,
    },
  ];

  for (const a of alerts) {
    await writeFirestoreDocument("alerts", a.alertId, a);
    console.log(`Seeded alert ${a.alertId} (${a.severity})`);
  }

  // Resources
  const resources = [
    {
      resourceId: "res-med-001",
      dashboard: "medical",
      type: "Advanced Trauma Kits",
      quantityAvailable: 45,
      unitLabel: "kits",
      location: "Base Hospital Depot A, Bay 3",
      updatedAt: new Date(now - 10 * 60 * 1000),
      notes: "Fully stocked with tourniquets, hemostatics, and airway tubes.",
    },
    {
      resourceId: "res-med-002",
      dashboard: "medical",
      type: "Mobile Oxygen Cylinders (10L)",
      quantityAvailable: 18,
      unitLabel: "tanks",
      location: "Clinic Substation 3, Storage Yard",
      updatedAt: new Date(now - 15 * 60 * 1000),
      notes: "Filled and pressure-tested.",
    },
    {
      resourceId: "res-res-001",
      dashboard: "rescue",
      type: "Inflatable Rescue Boats (Zodiac)",
      quantityAvailable: 8,
      unitLabel: "boats",
      location: "Harbor Operations Pier 2",
      updatedAt: new Date(now - 12 * 60 * 1000),
      notes: "4 boats with 25hp outboard engines; 4 paddle-assisted.",
    },
    {
      resourceId: "res-res-002",
      dashboard: "rescue",
      type: "High-Volume De-watering Pumps",
      quantityAvailable: 12,
      unitLabel: "units",
      location: "Zone B Central Fire Station",
      updatedAt: new Date(now - 25 * 60 * 1000),
      notes: "Diesel fueled, rated at 500 GPM.",
    },
  ];

  for (const r of resources) {
    await writeFirestoreDocument("resources", r.resourceId, r);
    console.log(`Seeded resource ${r.resourceId} (${r.type}: ${r.quantityAvailable})`);
  }

  // EscalationLog
  const escalationLogs = [
    {
      logId: "esc-log-001",
      reportId: "rep-res-001",
      previousUrgency: "high",
      newUrgency: "critical",
      reason: "Water level rose 1.5m in 20 minutes with infants and wheelchair-bound senior stranded.",
      escalatedBy: "system-flood-gauge-monitor",
      escalatedAt: new Date(now - 45 * 60 * 1000),
    },
    {
      logId: "esc-log-002",
      reportId: "rep-med-001",
      previousUrgency: "high",
      newUrgency: "critical",
      reason: "Victim reported loss of consciousness and suspected arterial crush hemorrhage.",
      escalatedBy: "ai-triage-analyzer",
      escalatedAt: new Date(now - 25 * 60 * 1000),
    },
  ];

  for (const e of escalationLogs) {
    await writeFirestoreDocument("escalationLog", e.logId, e);
    console.log(`Seeded escalationLog ${e.logId} (report: ${e.reportId})`);
  }

  console.log("\n--- STEP 4: Verifying Collections & Documents ---");
  const collections = await listCollections();
  console.log("Existing Firestore Collections:", collections);

  for (const col of collections) {
    const docs = await listDocumentsInCollection(col);
    console.log(`Collection "${col}": ${docs.length} documents`);
    for (const d of docs) {
      const docName = d.name.split("/").pop();
      console.log(`  - ${docName}`);
    }
  }

  console.log("\nSeeding completed successfully!");
}

runSeed().catch((err) => {
  console.error("Seeding failed with error:", err);
  process.exit(1);
});
