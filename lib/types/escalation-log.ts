import type { Timestamp } from "firebase/firestore";
import type { ReportUrgency } from "@/lib/constants/report";

/**
 * Audit record in the `escalationLog` collection. Written ONLY by the server (Admin SDK):
 * today by PATCH /api/reports/[id] (type "manual"), from T6 also by the escalation sweep
 * (type "auto"). Responders can read it; no client can write it (see firestore.rules).
 */
export interface EscalationLogEntry {
  logId: string;
  reportId: string;
  triggeredAt: Timestamp | string | number;
  type: "auto" | "manual";
  reason: string;
  previousUrgency: ReportUrgency;
  newUrgency: ReportUrgency;
  /** Responder uid for manual escalations, "system_timeout" for automatic ones (T6). */
  actor: string;
  actorName: string;
  actorRole: string;
}
