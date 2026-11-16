export type RequestUrgency = "High" | "Medium" | "Low";
export type SyncState = "Synchronized" | "Pending sync" | "Saved offline";
export type OperationalStatus = "Submitted" | "Acknowledged" | "Assigned" | "Resolved";

export interface CitizenRequest {
  id: string;
  category: string;
  location: string;
  reportedLabel: string;
  urgency: RequestUrgency;
  sync: SyncState;
  status: OperationalStatus;
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
