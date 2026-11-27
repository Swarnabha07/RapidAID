export type RequestUrgency = "High" | "Medium" | "Low";
/**
 * "Synchronized": the server has acknowledged the report (Firestore snapshot has no pending write).
 * "Pending sync" / "Saved offline": the report exists only on this device so far (the UI shows
 * "Saved offline" instead of "Pending sync" while the browser reports no network).
 * "Failed": a submission made in THIS page session was rejected and could not be sent (T4).
 */
export type SyncState = "Synchronized" | "Pending sync" | "Saved offline" | "Failed";
export type OperationalStatus = "Submitted" | "Acknowledged" | "Assigned" | "Resolved";

export interface CitizenRequest {
  id: string;
  category: string;
  location: string;
  reportedLabel: string;
  urgency: RequestUrgency;
  sync: SyncState;
  status: OperationalStatus;
  /** Server-confirmed time (ms since epoch). Only meaningful when `sync` is "Synchronized". */
  syncedAtMs?: number | null;
  /** User-safe explanation, only for `sync: "Failed"`. */
  failure?: string;
}

export const CITIZEN_REQUESTS: CitizenRequest[] = [
  {
    id: "RA-84721",
    category: "Medical Assistance",
    location: "Riverside Community Center",
    reportedLabel: "Today, 10:42 AM",
    urgency: "High",
    sync: "Synchronized",
    status: "Acknowledged",
  },
  {
    id: "RA-84198",
    category: "Food & Water",
    location: "North Ward, Block C",
    reportedLabel: "Yesterday, 4:15 PM",
    urgency: "Medium",
    sync: "Synchronized",
    status: "Assigned",
  },
];
