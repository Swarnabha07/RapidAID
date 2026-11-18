import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { verifyResponderAuth } from "@/lib/firebase/server-auth";
import type { AlertSeverity } from "@/lib/types/alert";

const VALID_SEVERITIES: AlertSeverity[] = ["info", "warning", "critical"];

/**
 * POST /api/alerts
 * Broadcasts a new emergency public alert.
 * Restricted to responders: "medical", "rescue", "admin".
 */
export async function POST(req: NextRequest) {
  const authRes = await verifyResponderAuth(req);
  if (!authRes.success) return authRes.response;

  try {
    const body = await req.json();

    // 1. Validate title & message
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Title is required and must be a non-empty string" },
        { status: 400 }
      );
    }
    if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json(
        { error: "Message is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // 2. Validate severity
    if (!body.severity || !VALID_SEVERITIES.includes(body.severity)) {
      return NextResponse.json(
        {
          error: `Invalid severity '${body.severity}'. Must be one of: ${VALID_SEVERITIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 3. Normalize area and geo boundaries ({ lat, lng, radiusKm })
    let areaLabel = "Affected Area";
    let coordinates: { lat: number; lng: number } | null = null;
    let radiusKm: number | null = null;

    if (typeof body.area === "string" && body.area.trim()) {
      areaLabel = body.area.trim();
      if (
        body.coordinates &&
        typeof body.coordinates.lat === "number" &&
        typeof body.coordinates.lng === "number"
      ) {
        coordinates = { lat: body.coordinates.lat, lng: body.coordinates.lng };
      }
      if (typeof body.radiusKm === "number") {
        radiusKm = body.radiusKm;
      }
    } else if (typeof body.area === "object" && body.area !== null) {
      areaLabel =
        body.area.name ||
        body.area.address ||
        body.area.label ||
        body.area.zone ||
        "Designated Alert Zone";

      if (typeof body.area.lat === "number" && typeof body.area.lng === "number") {
        coordinates = { lat: body.area.lat, lng: body.area.lng };
      }
      if (typeof body.area.radiusKm === "number") {
        radiusKm = body.area.radiusKm;
      }
    }

    // 4. Validate & parse expiration
    let expiresAtDate: Date;
    if (body.expiresAt) {
      const parsed = new Date(body.expiresAt);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiresAt date format. Must be an ISO string or timestamp." },
          { status: 400 }
        );
      }
      expiresAtDate = parsed;
    } else if (typeof body.expiresInHours === "number" && body.expiresInHours > 0) {
      expiresAtDate = new Date(Date.now() + body.expiresInHours * 3600 * 1000);
    } else {
      // Default: 24 hours expiry
      expiresAtDate = new Date(Date.now() + 24 * 3600 * 1000);
    }

    const alertId =
      typeof body.alertId === "string" && body.alertId.trim()
        ? body.alertId.trim()
        : `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const alertDoc = {
      alertId,
      title: body.title.trim(),
      message: body.message.trim(),
      severity: body.severity as AlertSeverity,
      area: areaLabel,
      coordinates,
      radiusKm,
      active: body.active !== undefined ? Boolean(body.active) : true,
      createdBy: authRes.user.uid,
      createdByName: authRes.user.name || "Incident Coordinator",
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAtDate),
    };

    await adminDb.collection("alerts").doc(alertId).set(alertDoc);

    return NextResponse.json(
      {
        success: true,
        alertId,
        alert: {
          ...alertDoc,
          createdAt: new Date().toISOString(),
          expiresAt: expiresAtDate.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/alerts error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create alert" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts
 * Returns currently active alerts where expiresAt is null or in the future,
 * ordered by expiresAt ascending.
 */
export async function GET() {
  try {
    const now = new Date();

    // Query future expiring alerts
    const activeFutureSnap = await adminDb
      .collection("alerts")
      .where("expiresAt", ">=", Timestamp.fromDate(now))
      .orderBy("expiresAt", "asc")
      .get();

    // Query non-expiring alerts (expiresAt == null)
    let nullExpirySnap: FirebaseFirestore.QuerySnapshot;
    try {
      nullExpirySnap = await adminDb
        .collection("alerts")
        .where("expiresAt", "==", null)
        .get();
    } catch {
      nullExpirySnap = { docs: [] } as any;
    }

    const alertsMap = new Map<string, any>();

    const formatDoc = (doc: FirebaseFirestore.DocumentSnapshot) => {
      const data = doc.data() || {};
      return {
        ...data,
        createdAt:
          data.createdAt && typeof data.createdAt.toDate === "function"
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        expiresAt:
          data.expiresAt && typeof data.expiresAt.toDate === "function"
            ? data.expiresAt.toDate().toISOString()
            : data.expiresAt,
      };
    };

    activeFutureSnap.docs.forEach((doc) => {
      alertsMap.set(doc.id, formatDoc(doc));
    });

    nullExpirySnap.docs.forEach((doc) => {
      if (!alertsMap.has(doc.id)) {
        alertsMap.set(doc.id, formatDoc(doc));
      }
    });

    const alerts = Array.from(alertsMap.values());

    return NextResponse.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (err: any) {
    console.error("GET /api/alerts error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve active alerts" },
      { status: 500 }
    );
  }
}
