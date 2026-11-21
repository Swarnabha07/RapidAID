import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  verifyAuthToken,
  isResponderRole,
  getDashboardForRole,
  jsonError,
} from "@/lib/firebase/server-auth";
import {
  validateNewReport,
  urgencyWeightOf,
  dashboardForCategory,
} from "@/lib/server/report-security";

const MAX_BODY_BYTES = 20_000;

/**
 * POST /api/reports
 * Server-side fallback for creating a report when the client SDK write is rejected.
 * The owner is ALWAYS the authenticated caller. Status, escalation, assignment, urgency weight,
 * dashboard routing and timestamps are computed here and can never be chosen by the caller.
 * An existing report is never overwritten.
 */
export async function POST(req: NextRequest) {
  const authRes = await verifyAuthToken(req);
  if (!authRes.success) return authRes.response;
  const { uid, role } = authRes.user;

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) return jsonError("Request body too large.", 413);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const validated = validateNewReport(body);
  if (!validated.ok) return jsonError(validated.error, validated.status);
  const v = validated.value;

  try {
    const col = adminDb.collection("reports");
    const ref = v.reportId ? col.doc(v.reportId) : col.doc();
    const reportId = ref.id;

    const reportDocument: Record<string, unknown> = {
      reportId,
      userId: uid,
      category: v.category,
      urgency: v.urgency,
      urgencyWeight: urgencyWeightOf(v.urgency),
      description: v.description,
      translatedDescription: v.translatedDescription,
      originalLanguage: v.originalLanguage,
      isSOS: v.isSOS,
      location: v.location,
      mediaUrl: null, // uploads are not supported yet; never store caller-supplied URLs
      processedBy: v.processedBy,
      confidenceScore: v.confidenceScore,
      status: "received",
      assignedDashboard: dashboardForCategory(v.category),
      isDuplicateOf: null,
      escalated: false,
      escalatedAt: null,
      assignedTeamOrUnit: null,
      acknowledgedAt: null,
      resolvedNotes: null,
      peopleAffected: v.peopleAffected,
      reportedInjuries: v.reportedInjuries,
      activityTrail: [
        {
          id: randomUUID(),
          action: v.isSOS ? "Emergency SOS Triggered" : "Report Created",
          actorRole: role === "victim" ? "citizen" : role,
          note: v.isSOS
            ? "Immediate SOS emergency beacon recorded"
            : "Report submitted via RapidAID server fallback",
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      syncedAt: FieldValue.serverTimestamp(),
    };
    if (v.accessConditions) reportDocument.accessConditions = v.accessConditions;

    try {
      // create() fails if the document exists, so an existing report can never be overwritten.
      await ref.create(reportDocument);
    } catch (err) {
      const code = (err as { code?: unknown })?.code;
      const message = err instanceof Error ? err.message : "";
      if (code === 6 || /ALREADY_EXISTS/.test(message)) {
        const snap = await ref.get();
        if (snap.exists && snap.data()?.userId === uid) {
          // Safe retry of the caller's own report: succeed without writing anything.
          return NextResponse.json({ success: true, reportId, duplicate: true }, { status: 200 });
        }
        return jsonError("A report with this ID already exists.", 409);
      }
      throw err;
    }

    return NextResponse.json({ success: true, reportId }, { status: 201 });
  } catch (err) {
    console.error("POST /api/reports error:", err);
    return jsonError("Failed to create report", 500);
  }
}

/**
 * GET /api/reports
 * Citizens: their own reports. Medical/rescue: only their own dashboard. Admin: any dashboard.
 */
export async function GET(req: NextRequest) {
  const authRes = await verifyAuthToken(req);
  if (!authRes.success) return authRes.response;
  const { uid, role } = authRes.user;

  try {
    const { searchParams } = new URL(req.url);
    const requested = searchParams.get("dashboard");
    let query: FirebaseFirestore.Query = adminDb.collection("reports");

    if (!isResponderRole(role)) {
      query = query.where("userId", "==", uid).orderBy("createdAt", "desc");
    } else {
      const allowed = getDashboardForRole(role);
      if (requested !== null && requested !== "medical" && requested !== "rescue") {
        return jsonError("dashboard must be 'medical' or 'rescue'.", 400);
      }
      if (allowed !== "all" && requested !== null && requested !== allowed) {
        return jsonError("Forbidden: you cannot read another dashboard's queue.", 403);
      }
      const dashboard = allowed === "all" ? requested : allowed;
      if (dashboard) {
        // Matches the existing (assignedDashboard, urgencyWeight, createdAt) index.
        query = query
          .where("assignedDashboard", "==", dashboard)
          .orderBy("urgencyWeight", "desc")
          .orderBy("createdAt", "desc");
      } else {
        query = query.orderBy("createdAt", "desc");
      }
    }

    const snapshot = await query.limit(50).get();
    return NextResponse.json({ success: true, reports: snapshot.docs.map((d) => d.data()) });
  } catch (err) {
    console.error("GET /api/reports error:", err);
    return jsonError("Failed to retrieve reports", 500);
  }
}
