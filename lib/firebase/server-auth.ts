import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { UserRole } from "@/lib/types/user";

/**
 * Extracts Bearer token from the incoming Request Authorization header.
 */
export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.substring(7).trim();
}

export interface AuthContext {
  decoded: DecodedIdToken;
  uid: string;
  role: UserRole;
  email?: string;
  name?: string;
}

export type AuthResult =
  | { success: true; user: AuthContext }
  | { success: false; response: NextResponse };

/**
 * Verifies the Bearer ID token and resolves the user's role.
 */
export async function verifyAuthToken(req: NextRequest): Promise<AuthResult> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Unauthorized: Missing or invalid Bearer token" },
        { status: 401 }
      ),
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    let role = (decoded.role as UserRole) || null;

    if (!role) {
      const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
      if (userDoc.exists) {
        role = (userDoc.data()?.role as UserRole) || "victim";
      }
    }

    return {
      success: true,
      user: {
        decoded,
        uid: decoded.uid,
        role: role || "victim",
        email: decoded.email,
        name: decoded.name || decoded.displayName,
      },
    };
  } catch (err: any) {
    console.error("verifyAuthToken verification failure:", err.message);
    return {
      success: false,
      response: NextResponse.json(
        { error: `Unauthorized: ${err.message || "Invalid authentication token"}` },
        { status: 401 }
      ),
    };
  }
}

/**
 * Validates if the user role is authorized as a responder.
 */
export function isResponderRole(role: UserRole | string): boolean {
  return role === "medical" || role === "rescue" || role === "admin";
}

/**
 * Verifies Bearer token AND confirms the caller has responder privileges (medical, rescue, admin).
 */
export async function verifyResponderAuth(req: NextRequest): Promise<AuthResult> {
  const authRes = await verifyAuthToken(req);
  if (!authRes.success) return authRes;

  if (!isResponderRole(authRes.user.role)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Forbidden: Responder privileges (medical, rescue, admin) required" },
        { status: 403 }
      ),
    };
  }

  return authRes;
}
