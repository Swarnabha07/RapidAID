import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  verifyResponderAuth,
  verifyAuthToken,
  isResponderRole,
  resolveActorName,
  jsonError,
} from "@/lib/firebase/server-auth";
import { planReportAction } from "@/lib/server/report-security";

/** Thrown inside the transaction to return a specific HTTP error. */
class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

const MAX_BODY_BYTES = 10_000;

/**
 * PATCH /api/reports/[id]
 * The ONLY way responders change a report (Firestore rules block direct client updates).
 *
 * Body: { action: "acknowledge" | "assign" | "escalate" | "resolve", ...fields }
 *   acknowledge: { note? }
 *   assign:      { unitName, note? }
 *   escalate:    { urgency: "critical" | "high", reason }
 *   resolve:     { resolutionNote }
 *
 * The caller's identity, role, timestamps, urgency weight and audit entry are all derived on
 * the server. State transitions and dashboard ownership are enforced inside a transaction.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authRes = await verifyResponderAuth(req);
  if (!authRes.success) return authRes.response;

  const { id: reportId } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(reportId)) {
    return jsonError("Invalid report ID.", 400);
  }

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) return jsonError("Request body too large.", 413);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const actor = {
    uid: authRes.user.uid,
    role: authRes.user.role,
    name: resolveActorName(authRes.user),
  };

  try {
    const reportRef = adminDb.collection("reports").doc(reportId);

    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(reportRef);
      if (!snap.exists) throw new HttpError(404, `Report '${reportId}' not found`);

      const plan = planReportAction({
        reportId,
        report: snap.data() ?? {},
        actor,
        body,
        now: new Date(),
        newId: randomUUID,
      });
      if (!plan.ok) throw new HttpError(plan.status, plan.error);

      const updates: Record<string, unknown> = {
        ...plan.fields,
        updatedAt: FieldValue.serverTimestamp(),
        activityTrail: FieldValue.arrayUnion(plan.trailEntry),
      };
      for (const field of plan.serverTimestampFields) updates[field] = FieldValue.serverTimestamp();
      if (plan.incrementEscalationLevel) updates.escalationLevel = FieldValue.increment(1);

      tx.update(reportRef, updates);

      if (plan.escalationLog) {
        const logRef = adminDb.collection("escalationLog").doc();
        tx.set(logRef, {
          ...plan.escalationLog,
          logId: logRef.id,
          triggeredAt: FieldValue.serverTimestamp(),
        });
      }

      return { action: plan.action, updatedFields: Object.keys(updates) };
    });

    return NextResponse.json({ success: true, reportId, ...result });
  } catch (err) {
    if (err instanceof HttpError) return jsonError(err.message, err.status);
    console.error("PATCH /api/reports/[id] error:", err);
    return jsonError("Failed to update report", 500);
  }
}

/**
 * GET /api/reports/[id]
 * Responders can view any report; citizens can only view their own.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authRes = await verifyAuthToken(req);
  if (!authRes.success) return authRes.response;

  try {
    const { id: reportId } = await params;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(reportId)) return jsonError("Invalid report ID.", 400);

    const snap = await adminDb.collection("reports").doc(reportId).get();
    if (!snap.exists) return jsonError("Report not found", 404);

    const data = snap.data()!;
    if (!isResponderRole(authRes.user.role) && data.userId !== authRes.user.uid) {
      return jsonError("Forbidden: You do not have permission to access this report", 403);
    }

    return NextResponse.json({ success: true, report: data });
  } catch (err) {
    console.error("GET /api/reports/[id] error:", err);
    return jsonError("Failed to fetch report", 500);
  }
}
