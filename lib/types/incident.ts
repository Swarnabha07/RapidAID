export type Urgency = "Critical" | "High" | "Medium" | "Normal";

export type IncidentStatus =
  | "Open"
  | "En route"
  | "Assigned"
  | "In progress"
  | "Resolved";

export interface TimelineEntry {
  time: string;
  label: string;
  actor: string;
}

export interface MedicalTeam {
  id: string;
  name: string;
  capability: string;
  responders: number;
  availability: "Available" | "En route" | "In progress";
  assignedTo: string | null;
}

export interface Incident {
  id: string;
  category: string;
  location: string;
  zone: string;
  peopleAffected: number;
  reportedAt: string;
  reportedAgo: string;
  aiUrgency: Urgency;
  humanPriority: Urgency;
  priorityConfirmedBy: string | null;
  team: string | null;
  acknowledgedBy: string | null;
  status: IncidentStatus;
  citizenReport: string;
  citizenReportTime: string;
  reportedInjuries: string;
  attachment?: string;
  aiTriageSummary: string;
  escalationLevel: number;
  acknowledgementOverdueBy?: string;
  timeline: TimelineEntry[];
}

export const MEDICAL_TEAMS: MedicalTeam[] = [
  {
    id: "alpha-01",
    name: "Alpha 01",
    capability: "Advanced life support",
    responders: 4,
    availability: "Available",
    assignedTo: null,
  },
  {
    id: "bravo-02",
    name: "Bravo 02",
    capability: "Evacuation support",
    responders: 3,
    availability: "Available",
    assignedTo: null,
  },
  {
    id: "alpha-03",
    name: "Alpha 03",
    capability: "Advanced life support",
    responders: 4,
    availability: "En route",
    assignedTo: "MED-002",
  },
  {
    id: "charlie-01",
    name: "Charlie 01",
    capability: "General medical",
    responders: 3,
    availability: "In progress",
    assignedTo: "MED-007",
  },
];

export const INCIDENTS: Incident[] = [
  {
    id: "MED-001",
    category: "Flood-related injuries",
    location: "Riverside shelter",
    zone: "North bank · Zone 4",
    peopleAffected: 8,
    reportedAt: "14:27",
    reportedAgo: "4m ago",
    aiUrgency: "Critical",
    humanPriority: "Critical",
    priorityConfirmedBy: "Dr. Maya Chen · 14:28:10",
    team: null,
    acknowledgedBy: null,
    status: "Open",
    citizenReport:
      "Multiple injured people after flooding. We are at Riverside shelter by the north entrance. Eight people need help; two have visible leg injuries. Water is still rising.",
    citizenReportTime: "14:27:48",
    reportedInjuries: "2 leg injuries · unverified",
    attachment: "shelter-report.jpg",
    aiTriageSummary:
      "Multiple affected people, reported injuries and ongoing flood exposure indicate time-sensitive review.",
    escalationLevel: 1,
    acknowledgementOverdueBy: "02:12",
    timeline: [
      { time: "14:27:48", label: "Report received", actor: "Citizen portal" },
      { time: "14:27:52", label: "Incident synchronized", actor: "Sync service" },
      { time: "14:28:10", label: "Priority confirmed", actor: "Dr. M. Chen" },
      { time: "14:29:48", label: "Coordination alert · L1", actor: "Rules engine" },
    ],
  },
  {
    id: "MED-002",
    category: "Urgent medical assistance",
    location: "Oak Street, 42",
    zone: "Central · Zone 2",
    peopleAffected: 1,
    reportedAt: "14:25",
    reportedAgo: "7m ago",
    aiUrgency: "High",
    humanPriority: "Critical",
    priorityConfirmedBy: "Dr. J. Patel",
    team: "Alpha 03",
    acknowledgedBy: "Dr. J. Patel",
    status: "En route",
    citizenReport: "Elderly resident collapsed, conscious but unable to stand.",
    citizenReportTime: "14:25:03",
    reportedInjuries: "Suspected fall · unverified",
    aiTriageSummary:
      "Single-person report with mobility loss; prioritized for rapid response.",
    escalationLevel: 0,
    timeline: [
      { time: "14:25:03", label: "Report received", actor: "Citizen portal" },
      { time: "14:30:00", label: "Acknowledged", actor: "Dr. J. Patel" },
      { time: "14:31:00", label: "Alpha 03 assigned", actor: "Dr. J. Patel" },
    ],
  },
  {
    id: "MED-003",
    category: "Limited-mobility evacuation",
    location: "Willow residence",
    zone: "East ward · Zone 3",
    peopleAffected: 1,
    reportedAt: "14:21",
    reportedAgo: "11m ago",
    aiUrgency: "Medium",
    humanPriority: "High",
    priorityConfirmedBy: "Dr. M. Chen",
    team: "Bravo 01",
    acknowledgedBy: "Dr. M. Chen",
    status: "Assigned",
    citizenReport: "Wheelchair user needs assistance evacuating before water rises further.",
    citizenReportTime: "14:21:40",
    reportedInjuries: "None reported",
    aiTriageSummary: "Mobility constraint raises priority despite moderate urgency signal.",
    escalationLevel: 0,
    timeline: [
      { time: "14:21:40", label: "Report received", actor: "Citizen portal" },
      { time: "14:24:00", label: "Acknowledged", actor: "Dr. M. Chen" },
    ],
  },
  {
    id: "MED-004",
    category: "Injury at relief center",
    location: "West relief hub",
    zone: "West ward · Zone 1",
    peopleAffected: 3,
    reportedAt: "14:20",
    reportedAgo: "12m ago",
    aiUrgency: "Critical",
    humanPriority: "Critical",
    priorityConfirmedBy: null,
    team: null,
    acknowledgedBy: null,
    status: "Open",
    citizenReport: "Three people injured during relief distribution, one with a head injury.",
    citizenReportTime: "14:20:12",
    reportedInjuries: "1 head injury · unverified",
    aiTriageSummary: "Head injury flagged for immediate human review.",
    escalationLevel: 0,
    timeline: [{ time: "14:20:12", label: "Report received", actor: "Citizen portal" }],
  },
  {
    id: "MED-005",
    category: "Medical supply support",
    location: "Cedar community",
    zone: "Central · Zone 2",
    peopleAffected: 4,
    reportedAt: "14:16",
    reportedAgo: "16m ago",
    aiUrgency: "Normal",
    humanPriority: "Normal",
    priorityConfirmedBy: "A. Rivera",
    team: "Delta 02",
    acknowledgedBy: "A. Rivera",
    status: "In progress",
    citizenReport: "Community shelter requesting first-aid supply resupply.",
    citizenReportTime: "14:16:00",
    reportedInjuries: "None reported",
    aiTriageSummary: "Routine resupply request, no acute injuries indicated.",
    escalationLevel: 0,
    timeline: [
      { time: "14:16:00", label: "Report received", actor: "Citizen portal" },
      { time: "14:28:00", label: "Escalated to L2", actor: "Dr. M. Chen" },
      { time: "14:29:00", label: "In progress", actor: "A. Rivera" },
    ],
  },
  {
    id: "MED-006",
    category: "Fall-related injury",
    location: "Station Road, 8",
    zone: "South ward · Zone 5",
    peopleAffected: 1,
    reportedAt: "14:12",
    reportedAgo: "20m ago",
    aiUrgency: "Medium",
    humanPriority: "Medium",
    priorityConfirmedBy: null,
    team: null,
    acknowledgedBy: null,
    status: "Open",
    citizenReport: "Resident fell on stairs, able to speak but in pain.",
    citizenReportTime: "14:12:30",
    reportedInjuries: "Suspected fracture · unverified",
    aiTriageSummary: "Isolated fall injury, standard review timeframe applies.",
    escalationLevel: 0,
    timeline: [{ time: "14:12:30", label: "Report received", actor: "Citizen portal" }],
  },
];
