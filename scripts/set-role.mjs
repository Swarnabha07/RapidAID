#!/usr/bin/env node
/**
 * Trusted role provisioning for RapidAID (Firebase Admin SDK, run locally by an administrator).
 *
 * This is the ONLY supported way to give an account the "medical", "rescue" or "admin" role.
 * The browser can never do it. The role is stored as a signed custom claim on the Auth user,
 * and mirrored into users/{uid}.role for display only.
 *
 * Credentials (never commit them, never put them in NEXT_PUBLIC_* variables):
 *   - set GOOGLE_APPLICATION_CREDENTIALS to the path of a service-account JSON file, or
 *   - pass --key path/to/service-account.json
 *
 * Usage:
 *   node scripts/set-role.mjs --list
 *   node scripts/set-role.mjs --email dr.jones@example.org --role medical
 *   node scripts/set-role.mjs --uid <firebase-uid> --role rescue
 *   node scripts/set-role.mjs --email someone@example.org --role victim     (demote)
 *
 * Options:
 *   --project <id>   Firebase project id (default: FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_PROJECT_ID or .firebaserc)
 *   --yes            Skip the confirmation prompt (for scripted use)
 *   --help           Show this help
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ROLES = ["victim", "medical", "rescue", "admin"];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list" || a === "--yes" || a === "--help" || a === "-h") {
      args[a.replace(/^-+/, "")] = true;
    } else if (a.startsWith("--")) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Missing value for ${a}`);
      }
      args[a.slice(2)] = value;
      i++;
    } else {
      args._.push(a);
    }
  }
  return args;
}

function usage() {
  console.log(
    fs
      .readFileSync(new URL(import.meta.url), "utf8")
      .split("\n")
      .slice(2, 28)
      .map((l) => l.replace(/^ ?\* ?/, ""))
      .join("\n")
  );
}

function resolveProjectId(args) {
  if (args.project) return args.project;
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const rcPath = path.resolve(process.cwd(), ".firebaserc");
  if (fs.existsSync(rcPath)) {
    try {
      return JSON.parse(fs.readFileSync(rcPath, "utf8")).projects?.default;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function initAdmin(args, projectId) {
  const keyPath = args.key || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    throw new Error(
      "No credentials. Set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON path, or pass --key <path>."
    );
  }
  if (!fs.existsSync(keyPath)) throw new Error(`Credentials file not found: ${keyPath}`);
  if (args.key) {
    return initializeApp({
      credential: cert(JSON.parse(fs.readFileSync(keyPath, "utf8"))),
      projectId,
    });
  }
  return initializeApp({ credential: applicationDefault(), projectId });
}

async function confirm(message, skip) {
  if (skip) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${message} Type "yes" to continue: `);
    return answer.trim().toLowerCase() === "yes";
  } finally {
    rl.close();
  }
}

async function listElevated(auth, db) {
  console.log("\nAccounts with an elevated role claim, or a users/{uid}.role that disagrees with the claim:\n");
  let pageToken;
  let total = 0;
  let flagged = 0;
  do {
    const page = await auth.listUsers(1000, pageToken);
    const refs = page.users.map((u) => db.collection("users").doc(u.uid));
    const docs = refs.length ? await db.getAll(...refs) : [];
    page.users.forEach((u, i) => {
      total++;
      const claimRole = u.customClaims?.role ?? "(none)";
      const docRole = docs[i].exists ? docs[i].data()?.role ?? "(none)" : "(no doc)";
      const elevated = claimRole !== "(none)" && claimRole !== "victim";
      const mismatch = docs[i].exists && docRole !== (claimRole === "(none)" ? "victim" : claimRole);
      if (elevated || mismatch) {
        flagged++;
        console.log(
          `${elevated ? "ELEVATED" : "MISMATCH"}  uid=${u.uid}  email=${u.email ?? "-"}  claim=${claimRole}  doc=${docRole}`
        );
      }
    });
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(`\nChecked ${total} account(s); ${flagged} need review.`);
  console.log("Review every ELEVATED line. Demote anyone you do not recognise with --role victim.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h || process.argv.length <= 2) {
    usage();
    return;
  }

  // Validate arguments first, so mistakes fail fast without touching credentials.
  if (!args.list) {
    if (!args.role || !ROLES.includes(args.role)) {
      throw new Error(`--role must be one of: ${ROLES.join(", ")}`);
    }
    if (!args.email && !args.uid) throw new Error("Provide --email or --uid.");
    if (args.email && args.uid) throw new Error("Provide only one of --email or --uid.");
  }

  const projectId = resolveProjectId(args);
  if (!projectId) throw new Error("Could not determine the project id. Pass --project <id>.");

  const app = initAdmin(args, projectId);
  const auth = getAuth(app);
  const db = getFirestore(app);
  console.log(`Firebase project: ${projectId}`);

  if (args.list) {
    await listElevated(auth, db);
    return;
  }

  const user = args.uid ? await auth.getUser(args.uid) : await auth.getUserByEmail(args.email);
  const before = user.customClaims?.role ?? "(none)";

  console.log(`Target: uid=${user.uid} email=${user.email ?? "-"}`);
  console.log(`Role change: ${before} -> ${args.role}`);

  if (before === args.role) {
    console.log("Nothing to change (claim already matches). Refreshing the display copy only.");
  }
  if (!(await confirm(`Apply this change to project "${projectId}"?`, args.yes))) {
    console.log("Cancelled. No changes were made.");
    return;
  }

  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: args.role });
  // Invalidate existing sessions so an old (possibly elevated) token stops working for the API.
  await auth.revokeRefreshTokens(user.uid);

  await db.collection("users").doc(user.uid).set(
    {
      userId: user.uid,
      role: args.role,
      displayName: user.displayName ?? user.email?.split("@")[0] ?? "User",
      email: user.email ?? null,
      roleUpdatedAt: FieldValue.serverTimestamp(),
      roleUpdatedBy: "set-role-script",
    },
    { merge: true }
  );

  console.log(`Done. ${user.email ?? user.uid} is now "${args.role}".`);
  console.log("The user must sign out and sign in again (or wait up to 1 hour) to pick up the new role.");
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
