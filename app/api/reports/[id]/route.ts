import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { verifyResponderAuth, verifyAuthToken, isResponderRole } from "@/lib/firebase/server-auth";
import type {
  ReportStatus,
  ReportUrgency,
  ReportUrgencyWeight,
  ReportDashboard,
} from "@/lib/types/report";

const VALID_STATUSES: ReportStatus[] = [
  "received",
  "in_progress",
  "dispatched",
  "resolved",
];

const VALID_URGENCIES: ReportUrgency[] = ["critical", "high", "normal"];

function computeUrgencyWeight(urgency: ReportUrgency): ReportUrgencyWeight {
  switch (urgency) {
    case "critical":
      return 3;
    case "high":
      return 2;
    case "normal":
    default:
      return 1;
  }
}

/**
 * PATCH /api/reports/[id]
 * Updates status, responder assignment, triage urgency, and escalation audit trail.
 * Requires responder privileges: "medical", "rescue", or "admin".
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authRes = await verifyResponderAuth(req);
  if (!authRes.success) return authRes.response;

  try {
    const { id: reportId } = await params;
    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const reportRef = adminDb.collection("reports").doc(reportId);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return NextResponse.json({ error: `Report '${reportId}' not found` }, { status: 404 });
    }

    const existingData = reportDoc.data() || {};
    const body = await req.json();
    const updates: Record<string, any> = {};

    // 1. Status update
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          {
            error: `Invalid status '${body.status}'. Must be one of: ${VALID_STATUSES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    // 2. Urgency & urgencyWeight
    if (body.urgency !== undefined) {
      if (!VALID_URGENCIES.includes(body.urgency)) {
        return NextResponse.json(
          {
            error: `Invalid urgency '${body.urgency}'. Must be one of: ${VALID_URGENCIES.join(", ")}`,
          },
          { status: 400 }
        );
      }
      updates.urgency = body.urgency;
      updates.urgencyWeight =
        typeof body.urgencyWeight === "number"
          ? body.urgencyWeight
          : computeUrgencyWeight(body.urgency);
    } else if (typeof body.urgencyWeight === "number") {
      updates.urgencyWeight = body.urgencyWeight;
    }

    // 3. Assigned Dashboard
    if (body.assignedDashboard !== undefined) {
      if (body.assignedDashboard === "medical" || body.assignedDashboard === "rescue") {
        updates.assignedDashboard = body.assignedDashboard as ReportDashboard;
      }
    }

    // 4. Assigned Team or Unit
    if (body.assignedTeamOrUnit !== undefined) {
      updates.assignedTeamOrUnit = body.assignedTeamOrUnit ? String(body.assignedTeamOrUnit) : null;
      if (body.assignedTeamOrUnit && !updates.status && existingData.status === "received") {
        updates.status = "dispatched";
      }
    }

    // 5. Acknowledged timestamp / attribution
    if (body.acknowledgedAt !== undefined) {
      updates.acknowledgedAt =
        body.acknowledgedAt === true || body.acknowledgedAt === null
          ? FieldValue.serverTimestamp()
          : body.acknowledgedAt;
      if (body.acknowledgedBy || authRes.user.name) {
        updates.acknowledgedBy = body.acknowledgedBy || authRes.user.name;
      }
      if (!updates.status && existingData.status === "received") {
        updates.status = "in_progress";
      }
    }

    // 6. Resolved notes
    if (body.resolvedNotes !== undefined) {
      updates.resolvedNotes = body.resolvedNotes ? String(body.resolvedNotes) : null;
      if (body.resolvedNotes && !updates.status) {
        updates.status = "resolved";
      }
    }

    // 7. Escalation handling & audit document in escalationLog/{logId}
    const isEscalating =
      body.escalated === true ||
      (body.escalate === true && !existingData.escalated);

    if (isEscalating) {
      updates.escalated = true;
      updates.escalatedAt = FieldValue.serverTimestamp();
      if (body.urgency && !updates.urgency) {
        updates.urgency = body.urgency;
        updates.urgencyWeight = computeUrgencyWeight(body.urgency);
      }

      const logId = `esc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const previousUrgency = body.previousUrgency || existingData.urgency || "normal";
      const newUrgency = body.newUrgency || updates.urgency || "critical";
      const reason =
        body.reason ||
        body.escalationReason ||
        body.activityNote ||
        "Manual priority escalation recorded by responder";

      await adminDb.collection("escalationLog").doc(logId).set({
        logId,
        reportId,
        triggeredAt: FieldValue.serverTimestamp(),
        escalatedAt: FieldValue.serverTimestamp(),
        escalatedBy: authRes.user.uid,
        responderRole: authRes.user.role,
        previousUrgency,
        newUrgency,
        reason,
      });
    } else if (body.escalated === false) {
      updates.escalated = false;
    }

    // 8. Append activityTrail entry
    if (body.action || body.activityNote || body.note || isEscalating) {
      const actionName =
        body.action ||
        (isEscalating
          ? `Priority Escalated to ${(updates.urgency || "CRITICAL").toUpperCase()}`
          : updates.status
          ? `Status changed to ${updates.status}`
          : updates.assignedTeamOrUnit
          ? `Unit assigned: ${updates.assignedTeamOrUnit}`
          : "Incident updated");

      const activityNote =
        body.activityNote ||
        body.note ||
        body.reason ||
        (updates.resolvedNotes ? updates.resolvedNotes : null);

      const trailEntry = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        action: actionName,
        actorRole: authRes.user.role,
        note: activityNote,
        timestamp: new Date().toISOString(),
      };

      updates.activityTrail = FieldValue.arrayUnion(trailEntry);
    }

    // 9. Timestamp
    updates.updatedAt = FieldValue.serverTimestamp();

    // Execute update
    await reportRef.update(updates);

    return NextResponse.json({
      success: true,
      reportId,
      updatedFields: Object.keys(updates),
    });
  } catch (err: any) {
    console.error("PATCH /api/reports/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update report" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports/[id]
 * Retrieves a single report document.
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
    const docRef = adminDb.collection("reports").doc(reportId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const data = snap.data()!;
    const isResponder = isResponderRole(authRes.user.role);

    if (!isResponder && data.userId !== authRes.user.uid) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to access this report" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, report: data });
  } catch (err: any) {
    console.error("GET /api/reports/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch report" },
      { status: 500 }
    );
  }
}
