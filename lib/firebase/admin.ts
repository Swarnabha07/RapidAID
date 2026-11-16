import fs from "fs";
import path from "path";
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore as AdminFirestore } from "firebase-admin/firestore";
import { getAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { getMessaging, type Messaging as AdminMessaging } from "firebase-admin/messaging";

if (typeof window !== "undefined") {
  throw new Error("Firebase Admin SDK can only be imported in server-side code.");
}

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "rapidaid-9c11e";

let adminApp: App;

if (getApps().length === 0) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const localKeyPath = path.resolve(process.cwd(), "service-account.json");

  if (serviceAccountJson) {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({
        credential: cert(credentials),
        projectId,
      });
    } catch {
      adminApp = initializeApp({ projectId });
    }
  } else if (fs.existsSync(localKeyPath)) {
    try {
      const credentials = JSON.parse(fs.readFileSync(localKeyPath, "utf8"));
      adminApp = initializeApp({
        credential: cert(credentials),
        projectId,
      });
    } catch {
      adminApp = initializeApp({ projectId });
    }
  } else if (
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      projectId,
    });
  } else {
    try {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    } catch {
      adminApp = initializeApp({ projectId });
    }
  }
} else {
  adminApp = getApps()[0];
}

export const adminDb: AdminFirestore = getFirestore(adminApp);
export const adminAuth: AdminAuth = getAuth(adminApp);
export const adminMessaging: AdminMessaging = getMessaging(adminApp);
export { adminApp };
