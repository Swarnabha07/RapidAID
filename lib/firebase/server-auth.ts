import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import { normalizeRole, type UserRole } from "@/lib/types/user";
import type { ReportDashboard } from "@/lib/types/report";

/**
 * Extracts Bearer token from the incoming Request Authorization header.
 */
export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.substring(7).trim() || null;
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

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Verifies the Bearer ID token (including revocation) and resolves the caller's role.
 *
 * SECURITY: the role comes ONLY from the signed custom claim inside the verified token.
 * The users/{uid} Firestore document is user-writable display data and is never trusted
 * for authorization. A missing or unknown claim means the least-privileged "victim" role.
 */
export async function verifyAuthToken(req: NextRequest): Promise<AuthResult> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      success: false,
      response: jsonError("Unauthorized: Missing or invalid Bearer token", 401),
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    return {
      success: true,
      user: {
        decoded,
        uid: decoded.uid,
        role: normalizeRole(decoded.role),
        email: decoded.email,
        name: typeof decoded.name === "string" ? decoded.name : undefined,
      },
    };
  } catch (err) {
    console.error("verifyAuthToken failure:", err instanceof Error ? err.message : err);
    return {
      success: false,
      response: jsonError("Unauthorized: invalid, expired or revoked token", 401),
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
      response: jsonError("Forbidden: Responder privileges (medical, rescue, admin) required", 403),
    };
  }

  return authRes;
}

/**
 * Which dashboard a role may act on. "all" is admin only; null means none (citizens).
 */
export function getDashboardForRole(role: UserRole | string): ReportDashboard | "all" | null {
  if (role === "medical") return "medical";
  if (role === "rescue") return "rescue";
  if (role === "admin") return "all";
  return null;
}

/**
 * Display name used in audit entries. Derived from the verified token, never from the request body.
 */
export function resolveActorName(user: AuthContext): string {
  const raw = user.name || user.email?.split("@")[0] || user.role;
  return raw.slice(0, 80);
}
