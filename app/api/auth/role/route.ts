import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAuthToken, jsonError } from "@/lib/firebase/server-auth";
import { DEFAULT_ROLE, isUserRole, type UserRole } from "@/lib/types/user";
import { cleanText } from "@/lib/server/report-security";

const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

/**
 * GET /api/auth/role
 * Returns the caller's role, read only from the verified token's custom claim.
 */
export async function GET(req: NextRequest) {
  const authRes = await verifyAuthToken(req);
  if (!authRes.success) return authRes.response;
  return NextResponse.json({ role: authRes.user.role });
}

/**
 * POST /api/auth/role
 * Called by the client after sign-in to set up the account.
 *
 * SECURITY: this endpoint NEVER accepts a role from the request. A new account gets the
 * default "victim" role. Elevated roles (medical, rescue, admin) can only be granted by a
 * trusted administrator with `node scripts/set-role.mjs` (Firebase Admin SDK, run locally).
 * The existing role is read from the authoritative Auth record and only mirrored into
 * users/{uid} for display; Firestore rules and API routes trust the token claim only.
 */
export async function POST(req: NextRequest) {
  const authRes = await verifyAuthToken(req);
  if (!authRes.success) return authRes.response;
  const { uid, email, decoded } = authRes.user;

  try {
    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = await req.json();
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // An empty or invalid body is fine: nothing in it is needed to set up the account.
    }

    // Authoritative claims come from the Auth record, not the (possibly stale) request token.
    const userRecord = await adminAuth.getUser(uid);
    const currentClaims = userRecord.customClaims ?? {};
    let role: UserRole;
    let claimsUpdated = false;

    if (isUserRole(currentClaims.role)) {
      role = currentClaims.role;
    } else {
      role = DEFAULT_ROLE;
      await adminAuth.setCustomUserClaims(uid, { ...currentClaims, role });
      claimsUpdated = true;
    }

    if (body.role !== undefined && body.role !== role) {
      console.warn(`POST /api/auth/role: ignored client-supplied role for uid ${uid}`);
    }

    const displayName =
      cleanText(body.displayName, 1, 100) ??
      (typeof decoded.name === "string" ? cleanText(decoded.name, 1, 100) : null) ??
      (email ? cleanText(email.split("@")[0], 1, 100) : null) ??
      "User";

    const userRef = adminDb.collection("users").doc(uid);
    const existing = await userRef.get();

    const update: Record<string, unknown> = {
      userId: uid,
      role, // mirror of the claim, for display only
      displayName,
      email: email ?? null,
      lastActiveAt: FieldValue.serverTimestamp(),
    };

    if (typeof body.preferredLanguage === "string" && LANGUAGE_PATTERN.test(body.preferredLanguage)) {
      update.preferredLanguage = body.preferredLanguage;
    }

    if (!existing.exists) {
      update.createdAt = FieldValue.serverTimestamp();
      update.fcmToken = null;
      if (update.preferredLanguage === undefined) update.preferredLanguage = "en";
    }

    await userRef.set(update, { merge: true });

    return NextResponse.json({ success: true, role, claimsUpdated });
  } catch (err) {
    console.error("POST /api/auth/role error:", err);
    return jsonError("Failed to set up user account", 500);
  }
}
