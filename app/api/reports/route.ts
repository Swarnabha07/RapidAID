import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAuthToken, isResponderRole } from "@/lib/firebase/server-auth";
import type {
  ReportCategory,
  ReportUrgency,
  ReportUrgencyWeight,
  ReportDashboard,
  ReportProcessor,
  ReportLocation,
} from "@/lib/types/report";

const VALID_CATEGORIES: ReportCategory[] = [
  "medical",
  "water",
  "shelter",
  "missing_person",
  "other",
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

function computeAssignedDashboard(category: ReportCategory): ReportDashboard {
  return category === "medical" ? "medical" : "rescue";
}

/**
 * POST /api/reports
 * Server-side fallback for creating disaster / medical / rescue reports.
 */
export async function POST(req: NextRequest) {
  const authRes = await verifyAuthToken(req);
  if (!authRes.success) return authRes.response;

  try {
    const body = await req.json();

    // 1. Validate category
    if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        {
          error: `Invalid or missing category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    const category: ReportCategory = body.category;

    // 2. Validate urgency
    if (!body.urgency || !VALID_URGENCIES.includes(body.urgency)) {
      return NextResponse.json(
        {
          error: `Invalid or missing urgency. Must be one of: ${VALID_URGENCIES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    const urgency: ReportUrgency = body.urgency;

    // 3. Validate description
    if (!body.description || typeof body.description !== "string" || !body.description.trim()) {
      return NextResponse.json(
        { error: "Description is required and must be a non-empty string." },
        { status: 400 }
      );
    }
    const description = body.description.trim();

    // 4. Validate location
    if (
      !body.location ||
      typeof body.location.lat !== "number" ||
      typeof body.location.lng !== "number" ||
      isNaN(body.location.lat) ||
      isNaN(body.location.lng)
    ) {
      return NextResponse.json(
        { error: "Valid location with numeric 'lat' and 'lng' is required." },
        { status: 400 }
      );
    }
    const location: ReportLocation = {
      lat: body.location.lat,
      lng: body.location.lng,
      address: body.location.address || "",
      zone: body.location.zone || "",
    };

    // 5. Compute derived weights and routing
    const urgencyWeight = computeUrgencyWeight(urgency);
    const assignedDashboard = computeAssignedDashboard(category);

    // 6. Optional & normalized fields
    const isSOS = Boolean(body.isSOS);
    const originalLanguage = typeof body.originalLanguage === "string" ? body.originalLanguage : "en";
    const translatedDescription =
      typeof body.translatedDescription === "string" && body.translatedDescription.trim()
        ? body.translatedDescription.trim()
        : description;
    const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl : null;
    const processedBy: ReportProcessor = body.processedBy === "on-device" ? "on-device" : "cloud";
    const confidenceScore =
      typeof body.confidenceScore === "number" && !isNaN(body.confidenceScore)
        ? Math.max(0, Math.min(1, body.confidenceScore))
        : 0.95;

    // 7. Generate reportId
    const reportId =
      typeof body.reportId === "string" && body.reportId.trim()
        ? body.reportId.trim()
        : `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 8. Build initial activityTrail
    const initialActivity = [
      {
        id: `act-${Date.now()}-1`,
        action: isSOS ? "Emergency SOS Triggered" : "Report Created",
        actorRole: authRes.user.role || "victim",
        note: isSOS
          ? "Immediate SOS emergency beacon recorded"
          : "Report successfully submitted via RapidAID API",
        timestamp: new Date().toISOString(),
      },
    ];

    const reportDocument: Record<string, any> = {
      reportId,
      userId: authRes.user.uid,
      category,
      urgency,
      urgencyWeight,
      description,
      translatedDescription,
      originalLanguage,
      isSOS,
      location,
      mediaUrl,
      processedBy,
      confidenceScore,
      status: "received",
      assignedDashboard,
      isDuplicateOf: null,
      escalated: false,
      escalatedAt: null,
      assignedTeamOrUnit: null,
      acknowledgedAt: null,
      resolvedNotes: null,
      activityTrail: initialActivity,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      syncedAt: FieldValue.serverTimestamp(),
    };

    // Optional enrichment fields
    if (typeof body.peopleAffected === "number") {
      reportDocument.peopleAffected = body.peopleAffected;
    }
    if (body.reportedInjuries) {
      reportDocument.reportedInjuries = String(body.reportedInjuries);
    }
    if (body.accessConditions) {
      reportDocument.accessConditions = String(body.accessConditions);
    }

    await adminDb.collection("reports").doc(reportId).set(reportDocument);

    return NextResponse.json(
      {
        success: true,
        reportId,
        data: {
          ...reportDocument,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create report" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports
 * Returns list of reports filtered by assignedDashboard or caller's own reports.
 */
export async function GET(req: NextRequest) {
  const authRes = await verifyAuthToken(req);
  if (!authRes.success) return authRes.response;

  try {
    const { searchParams } = new URL(req.url);
    const dashboard = searchParams.get("dashboard");
    const isResponder = isResponderRole(authRes.user.role);

    let query: FirebaseFirestore.Query = adminDb.collection("reports");

    if (!isResponder) {
      // Citizens can only view their own reports
      query = query.where("userId", "==", authRes.user.uid);
    } else if (dashboard === "medical" || dashboard === "rescue") {
      query = query.where("assignedDashboard", "==", dashboard);
    }

    const snapshot = await query.orderBy("createdAt", "desc").limit(50).get();
    const reports = snapshot.docs.map((doc) => doc.data());

    return NextResponse.json({ success: true, reports });
  } catch (err: any) {
    console.error("GET /api/reports error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve reports" },
      { status: 500 }
    );
  }
}
