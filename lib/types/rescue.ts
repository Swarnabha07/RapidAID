export type RescueUrgency = "Critical" | "High" | "Medium";

export type RescueStatus =
  | "Unassigned"
  | "Awaiting ack."
  | "Assigned"
  | "In progress"
  | "Acknowledged"
  | "Boarding"
  | "Resolved";

export interface TimelineEntry {
  time: string;
  label: string;
  ref: string;
  actor: string;
}

export interface RescueIncident {
  id: string;
  title: string;
  location: string;
  zone: string;
  people: number;
  extra: string;
  aiUrgency: RescueUrgency;
  confirmedPriority: RescueUrgency;
  reportedAgo: string;
  unit: string | null;
  status: RescueStatus;
  acknowledgedBy: string | null;
  acknowledgedAt?: string;
  description: string;
  accessConditions: string;
  aiTriageLabel: string;
  aiTriageSummary: string;
  contextLinks: string[];
  lastVerified: string;
  reviewedBy: string;
}

export interface RescueTeam {
  id: string;
  capacityLabel: string;
  availability: "Available" | "Assigned" | "Boarding";
  assignedTo: string | null;
}

export interface RoleViewConfig {
  key: "rescue" | "fire" | "evac";
  tabLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  queueTitle: string;
  queueColumnLabel: string;
  mapTitle: string;
  unitNoun: string;
  assignLabel: string;
  teamsPanelTitle: string;
  teamsAvailableLabel: string;
  stats: {
    active: string;
    critical: string;
    awaitingAck: string;
    deployed: string;
    deployedTotal: string;
    availableUnits: string;
    evacuations: string;
  };
  incidents: RescueIncident[];
  teams: RescueTeam[];
  ackWatch: {
    incidentId: string;
    priorityLabel: string;
    remaining: string;
    elapsed: string;
    deadline: string;
  };
  activity: TimelineEntry[];
}

export const ROLE_VIEWS: RoleViewConfig[] = [
  {
    key: "rescue",
    tabLabel: "Specialized rescue",
    pageTitle: "Rescue operations",
    pageSubtitle: "Specialized response / North district",
    queueTitle: "Rescue incident queue",
    queueColumnLabel: "Incident / report",
    mapTitle: "Live operational map",
    unitNoun: "rescue unit",
    assignLabel: "Assign rescue unit",
    teamsPanelTitle: "Team allocation",
    teamsAvailableLabel: "rescue units available",
    stats: {
      active: "18",
      critical: "04",
      awaitingAck: "03",
      deployed: "12",
      deployedTotal: "16",
      availableUnits: "04",
      evacuations: "06",
    },
    incidents: [
      {
        id: "RES-001",
        title: "Families stranded in flood",
        location: "Riverside ward",
        zone: "Sector N-04",
        people: 18,
        extra: "5 households",
        aiUrgency: "Critical",
        confirmedPriority: "Critical",
        reportedAgo: "01:24",
        unit: null,
        status: "Awaiting ack.",
        acknowledgedBy: null,
        description:
          "Families are stranded on upper floors after rising water cut off Riverside ward. Rescue access is required.",
        accessConditions:
          "Road access blocked. Approach via the west service lane; conditions unverified.",
        aiTriageLabel: "ESTIMATED CRITICAL",
        aiTriageSummary:
          "Potential isolation and rising water. Confirm people count and safe access before allocating a unit.",
        contextLinks: ["3 community reports", "2 attachments ↗"],
        lastVerified: "Last verified by field report · 14:30 UTC",
        reviewedBy: "M. Chen · Reviewed 14:31 UTC",
      },
      {
        id: "RES-002",
        title: "Missing after cyclone",
        location: "Eastwood sector",
        zone: "Sector N-02",
        people: 3,
        extra: "Last seen near the storm shelter",
        aiUrgency: "High",
        confirmedPriority: "High",
        reportedAgo: "04:12",
        unit: "RS-04",
        status: "Assigned",
        acknowledgedBy: "J. Patel",
        description: "Three residents unaccounted for after the cyclone passed through Eastwood.",
        accessConditions: "Debris on main road; secondary route open.",
        aiTriageLabel: "ESTIMATED HIGH",
        aiTriageSummary: "Search pattern recommended across last-known area.",
        contextLinks: ["1 community report"],
        lastVerified: "Last verified by field report · 14:12 UTC",
        reviewedBy: "J. Patel · Reviewed 14:13 UTC",
      },
      {
        id: "RES-003",
        title: "Trapped in damaged building",
        location: "Old Mill block",
        zone: "Sector N-06",
        people: 6,
        extra: "Debris restricts south entrance",
        aiUrgency: "Critical",
        confirmedPriority: "High",
        reportedAgo: "06:38",
        unit: "RS-07",
        status: "In progress",
        acknowledgedBy: "A. Rivera",
        acknowledgedAt: "14:31",
        description:
          "6 people reported trapped in a damaged building. Debris restricts the south entrance; access has not been verified.",
        accessConditions: "South entrance blocked by debris; north entry unverified.",
        aiTriageLabel: "ESTIMATED CRITICAL",
        aiTriageSummary:
          "Possible entrapment. Confirm structural access before entry. Operational priority remains High, confirmed by M. Chen.",
        contextLinks: ["Supporting reports (3) ↗"],
        lastVerified: "Last verified by field report · 14:31 UTC",
        reviewedBy: "A. Rivera · RS-07",
      },
      {
        id: "RES-004",
        title: "Evacuation assistance",
        location: "Westbank lane",
        zone: "Sector N-01",
        people: 12,
        extra: "Mobility-impaired residents",
        aiUrgency: "Medium",
        confirmedPriority: "Medium",
        reportedAgo: "08:15",
        unit: "RS-02",
        status: "Assigned",
        acknowledgedBy: "M. Chen",
        description: "Residents require assisted evacuation ahead of rising water.",
        accessConditions: "Westbank lane open with restrictions.",
        aiTriageLabel: "ESTIMATED MEDIUM",
        aiTriageSummary: "Standard evacuation assistance; no entrapment reported.",
        contextLinks: [],
        lastVerified: "Last verified by field report · 14:05 UTC",
        reviewedBy: "M. Chen · Reviewed 14:06 UTC",
      },
    ],
    teams: [
      { id: "RS-05", capacityLabel: "6 responders · No assignment", availability: "Available", assignedTo: null },
      { id: "RS-08", capacityLabel: "8 responders · No assignment", availability: "Available", assignedTo: null },
      { id: "RS-04", capacityLabel: "6 responders · RES-002", availability: "Assigned", assignedTo: "RES-002" },
    ],
    ackWatch: {
      incidentId: "RES-001",
      priorityLabel: "Critical priority",
      remaining: "00:36",
      elapsed: "01:24",
      deadline: "14:32:36 UTC",
    },
    activity: [
      { time: "14:30:36", label: "Report created", ref: "RES-001 · Field report", actor: "Sync service" },
      { time: "14:30:40", label: "Report synchronized", ref: "RES-001", actor: "Sync service" },
      { time: "14:31:00", label: "Incident reviewed", ref: "RES-001", actor: "M. Chen" },
      { time: "14:31:02", label: "Incident acknowledged", ref: "RES-003", actor: "A. Rivera" },
      { time: "14:31:10", label: "Rescue unit assigned", ref: "RS-04", actor: "J. Park" },
      { time: "14:31:20", label: "Response started", ref: "RS-04", actor: "A. Rivera" },
      { time: "14:31:40", label: "Incident escalated", ref: "RES-011", actor: "M. Chen" },
      { time: "14:31:55", label: "Incident resolved", ref: "RES-017", actor: "J. Park" },
    ],
  },
  {
    key: "fire",
    tabLabel: "Fire rescue",
    pageTitle: "Fire & rescue operations",
    pageSubtitle: "Fire response / North district",
    queueTitle: "Fire incident queue",
    queueColumnLabel: "Incident / report",
    mapTitle: "Live operational map",
    unitNoun: "fire team",
    assignLabel: "Assign fire response team",
    teamsPanelTitle: "Team allocation",
    teamsAvailableLabel: "fire teams available",
    stats: {
      active: "12",
      critical: "03",
      awaitingAck: "02",
      deployed: "08",
      deployedTotal: "12",
      availableUnits: "04",
      evacuations: "03",
    },
    incidents: [
      {
        id: "FIRE-001",
        title: "Building fire reported",
        location: "Foundry block",
        zone: "Sector N-02",
        people: 8,
        extra: "Count unconfirmed",
        aiUrgency: "Critical",
        confirmedPriority: "Critical",
        reportedAgo: "01:24",
        unit: "FR-03",
        status: "Acknowledged",
        acknowledgedBy: "FR-03",
        acknowledgedAt: "14:31:02",
        description:
          "Smoke and visible flames reported at a two-storey mixed-use building. Eight people may be affected.",
        accessConditions:
          "East entrance reported obstructed. Keep the service access clear for responding crews.",
        aiTriageLabel: "ESTIMATED CRITICAL",
        aiTriageSummary:
          "Multiple reports indicate an active structure fire. Potential entrapment requires responder review.",
        contextLinks: ["Photographs (2) ↗", "Citizen reports (3) ↗", "Related medical request: MED-018 ↗"],
        lastVerified: "Last verified by field report · 14:30 UTC",
        reviewedBy: "M. Chen · Reviewed 14:31 UTC",
      },
      {
        id: "FIRE-002",
        title: "Residential smoke detected",
        location: "Cedar quarter",
        zone: "Sector N-03",
        people: 14,
        extra: "Building evacuated, unconfirmed",
        aiUrgency: "High",
        confirmedPriority: "High",
        reportedAgo: "03:26",
        unit: null,
        status: "Awaiting ack.",
        acknowledgedBy: null,
        description: "Smoke reported from a ground-floor unit in a residential building.",
        accessConditions: "Full vehicle access from Cedar quarter main road.",
        aiTriageLabel: "ESTIMATED HIGH",
        aiTriageSummary: "Smoke detector activation with resident reports; confirm source before entry.",
        contextLinks: ["Citizen reports (2) ↗"],
        lastVerified: "Last verified by field report · 14:28 UTC",
        reviewedBy: "Unreviewed",
      },
      {
        id: "FIRE-003",
        title: "Potentially trapped people",
        location: "Market structure",
        zone: "Sector N-05",
        people: 4,
        extra: "Market staff unaccounted for",
        aiUrgency: "Critical",
        confirmedPriority: "Critical",
        reportedAgo: "05:08",
        unit: "FR-06",
        status: "In progress",
        acknowledgedBy: "FR-06",
        description: "Fire spread through a market structure; staff unaccounted for.",
        accessConditions: "North access clear; south access smoke-filled.",
        aiTriageLabel: "ESTIMATED CRITICAL",
        aiTriageSummary: "Entrapment risk elevated; confirm headcount with site manager.",
        contextLinks: ["Supporting reports (2) ↗"],
        lastVerified: "Last verified by field report · 14:20 UTC",
        reviewedBy: "A. Rivera · FR-06",
      },
      {
        id: "FIRE-004",
        title: "Fire evacuation assistance",
        location: "North terrace",
        zone: "Sector N-07",
        people: 22,
        extra: "Mixed-use residential block",
        aiUrgency: "High",
        confirmedPriority: "Medium",
        reportedAgo: "07:40",
        unit: "FR-02",
        status: "Assigned",
        acknowledgedBy: "J. Park",
        description: "Residents require assisted evacuation as a precaution near an active fire zone.",
        accessConditions: "North terrace approach open.",
        aiTriageLabel: "ESTIMATED HIGH",
        aiTriageSummary: "Precautionary evacuation; no direct fire exposure reported yet.",
        contextLinks: [],
        lastVerified: "Last verified by field report · 14:10 UTC",
        reviewedBy: "J. Park · Reviewed 14:11 UTC",
      },
    ],
    teams: [
      { id: "FR-05", capacityLabel: "6 responders · No assignment", availability: "Available", assignedTo: null },
      { id: "FR-08", capacityLabel: "5 responders · No assignment", availability: "Available", assignedTo: null },
      { id: "FR-03", capacityLabel: "6 responders · FIRE-001", availability: "Assigned", assignedTo: "FIRE-001" },
    ],
    ackWatch: {
      incidentId: "FIRE-002",
      priorityLabel: "High priority",
      remaining: "01:34",
      elapsed: "03:26",
      deadline: "14:33:34 UTC",
    },
    activity: [
      { time: "14:30:36", label: "Report created", ref: "FIRE-001 · Field report", actor: "Sync service" },
      { time: "14:30:40", label: "Report synchronized", ref: "FIRE-001", actor: "Sync service" },
      { time: "14:31:00", label: "Incident reviewed", ref: "FIRE-001", actor: "M. Chen" },
      { time: "14:31:02", label: "Incident acknowledged", ref: "FIRE-001", actor: "A. Rivera" },
      { time: "14:31:10", label: "Rescue unit assigned", ref: "FR-03", actor: "J. Park" },
      { time: "14:31:20", label: "Response started", ref: "FR-03", actor: "A. Rivera" },
      { time: "14:31:40", label: "Incident escalated", ref: "FIRE-009", actor: "M. Chen" },
      { time: "14:31:55", label: "Incident resolved", ref: "FIRE-010", actor: "J. Park" },
    ],
  },
  {
    key: "evac",
    tabLabel: "Evacuation",
    pageTitle: "Evacuation operations",
    pageSubtitle: "Rescue & evacuation / North district",
    queueTitle: "Rescue & transfer queue",
    queueColumnLabel: "Incident / report",
    mapTitle: "Evacuation coordination map",
    unitNoun: "unit",
    assignLabel: "Manage assignment",
    teamsPanelTitle: "Transfer & team availability",
    teamsAvailableLabel: "units available",
    stats: {
      active: "14",
      critical: "02",
      awaitingAck: "03",
      deployed: "10",
      deployedTotal: "16",
      availableUnits: "06",
      evacuations: "06",
    },
    incidents: [
      {
        id: "EVAC-001",
        title: "Shelter transfer requested",
        location: "Westbank lane",
        zone: "Collection point B",
        people: 24,
        extra: "4 need mobility support",
        aiUrgency: "High",
        confirmedPriority: "High",
        reportedAgo: "02:18",
        unit: "EV-02",
        status: "Boarding",
        acknowledgedBy: "EV-02",
        description:
          "Residents at the Westbank collection point need coordinated transfer to the North civic shelter.",
        accessConditions:
          "Westbank route open with restrictions. Shelter intake confirmed by coordinator at 14:29.",
        aiTriageLabel: "ESTIMATED HIGH",
        aiTriageSummary:
          "Prioritize assisted boarding and verify passenger count. No autonomous routing or deployment.",
        contextLinks: ["Shelter intake note ↗", "Transfer manifest ↗"],
        lastVerified: "Transfer progress: 14 / 24 boarded · 58%",
        reviewedBy: "M. Chen · Reviewed 14:31 UTC",
      },
      {
        id: "EVAC-002",
        title: "Flood rescue · Stranded",
        location: "Riverside ward",
        zone: "Sector N-04",
        people: 9,
        extra: "Awaiting unit assignment",
        aiUrgency: "Critical",
        confirmedPriority: "Critical",
        reportedAgo: "01:12",
        unit: null,
        status: "Awaiting ack.",
        acknowledgedBy: null,
        description: "Residents stranded by flood water, requesting evacuation transfer.",
        accessConditions: "Same access constraints as RES-001; water levels rising.",
        aiTriageLabel: "ESTIMATED CRITICAL",
        aiTriageSummary: "Coordinate with specialized rescue before transfer; confirm safe boarding point.",
        contextLinks: ["3 community reports"],
        lastVerified: "Last verified by field report · 14:28 UTC",
        reviewedBy: "Unreviewed",
      },
      {
        id: "EVAC-003",
        title: "Missing person reported",
        location: "Eastwood sector",
        zone: "Sector N-02",
        people: 2,
        extra: "Family requesting update",
        aiUrgency: "High",
        confirmedPriority: "High",
        reportedAgo: "04:10",
        unit: "RS-04",
        status: "In progress",
        acknowledgedBy: "A. Rivera",
        description: "Family members reported missing after the cyclone; shared with specialized rescue.",
        accessConditions: "Cross-referenced with RES-002.",
        aiTriageLabel: "ESTIMATED HIGH",
        aiTriageSummary: "Coordinated search in progress with specialized rescue unit RS-04.",
        contextLinks: [],
        lastVerified: "Last verified by field report · 14:15 UTC",
        reviewedBy: "A. Rivera · RS-04",
      },
      {
        id: "EVAC-004",
        title: "Unsafe-location evacuation",
        location: "North terrace",
        zone: "Sector N-07",
        people: 16,
        extra: "Near active fire zone",
        aiUrgency: "Medium",
        confirmedPriority: "Medium",
        reportedAgo: "08:24",
        unit: "EV-05",
        status: "Assigned",
        acknowledgedBy: "J. Park",
        description: "Residents near the North terrace fire zone require precautionary transfer.",
        accessConditions: "North terrace approach open; coordinate with fire rescue.",
        aiTriageLabel: "ESTIMATED MEDIUM",
        aiTriageSummary: "Precautionary transfer; no direct exposure reported yet.",
        contextLinks: [],
        lastVerified: "Last verified by field report · 14:08 UTC",
        reviewedBy: "J. Park · Reviewed 14:09 UTC",
      },
    ],
    teams: [
      { id: "EV-04", capacityLabel: "12 seats · No assignment", availability: "Available", assignedTo: null },
      { id: "EV-06", capacityLabel: "18 seats · No assignment", availability: "Available", assignedTo: null },
      { id: "EV-02", capacityLabel: "24 seats · EVAC-001", availability: "Boarding", assignedTo: "EVAC-001" },
    ],
    ackWatch: {
      incidentId: "EVAC-002",
      priorityLabel: "Critical priority",
      remaining: "00:48",
      elapsed: "01:12",
      deadline: "14:32:48 UTC",
    },
    activity: [
      { time: "14:30:36", label: "Report created", ref: "EVAC-001 · Field report", actor: "Sync service" },
      { time: "14:30:40", label: "Report synchronized", ref: "EVAC-001", actor: "Sync service" },
      { time: "14:31:00", label: "Incident reviewed", ref: "EVAC-001", actor: "M. Chen" },
      { time: "14:31:02", label: "Incident acknowledged", ref: "RES-003", actor: "A. Rivera" },
      { time: "14:31:10", label: "Rescue unit assigned", ref: "EV-02", actor: "J. Park" },
      { time: "14:31:20", label: "Response started", ref: "EV-02", actor: "A. Rivera" },
      { time: "14:31:40", label: "Incident escalated", ref: "RES-011", actor: "M. Chen" },
      { time: "14:31:55", label: "Incident resolved", ref: "RES-017", actor: "J. Park" },
    ],
  },
];