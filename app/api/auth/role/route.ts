import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { UserRole } from "@/lib/types/user";

function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.substring(7).trim();
}

const VALID_ROLES: UserRole[] = ["victim", "medical", "rescue", "admin"];

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();

    let role = (decoded.role as UserRole) || null;
    if (!role && userDoc.exists) {
      role = (userDoc.data()?.role as UserRole) || "victim";
    }

    return NextResponse.json({ role: role || "victim" });
  } catch (err: any) {
    console.error("GET /api/auth/role error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve user role" },
      { status: 401 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const body = await req.json();

    const requestedRole: UserRole = body.role || decoded.role || "victim";
    const role: UserRole = VALID_ROLES.includes(requestedRole) ? requestedRole : "victim";
    const displayName = body.displayName || decoded.name || "User";
    const preferredLanguage = body.preferredLanguage || "en";

    // Set custom user claims in Firebase Auth for Firestore rules verification
    const userRecord = await adminAuth.getUser(decoded.uid);
    const currentClaims = userRecord.customClaims || {};
    await adminAuth.setCustomUserClaims(decoded.uid, {
      ...currentClaims,
      role,
    });

    // Upsert into Firestore users collection
    await adminDb.collection("users").doc(decoded.uid).set(
      {
        userId: decoded.uid,
        role,
        displayName,
        preferredLanguage,
        email: decoded.email || null,
        lastActiveAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, role });
  } catch (err: any) {
    console.error("POST /api/auth/role error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to set user role claims" },
      { status: 500 }
    );
  }
}
