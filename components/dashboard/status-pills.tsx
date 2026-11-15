import { Badge } from "@/components/ui/badge";
import type { IncidentStatus, Urgency } from "@/lib/types/incident";

const URGENCY_TONE: Record<Urgency, "critical" | "high" | "medium" | "normal"> = {
  Critical: "critical",
  High: "high",
  Medium: "medium",
  Normal: "normal",
};

export function UrgencyPill({ value }: { value: Urgency }) {
  return <Badge tone={URGENCY_TONE[value]}>{value}</Badge>;
}

const STATUS_LABEL: Record<IncidentStatus, string> = {
  Open: "Open",
  "En route": "En route",
  Assigned: "Assigned",
  "In progress": "In progress",
  Resolved: "Resolved",
};

const STATUS_CLASS: Record<IncidentStatus, string> = {
  Open: "text-text-inverse-muted",
  "En route": "text-[#6fb6ff]",
  Assigned: "text-[#5fd996]",
  "In progress": "text-[#5fd996]",
  Resolved: "text-text-inverse-muted",
};

export function StatusLabel({ value }: { value: IncidentStatus }) {
  return <span className={`text-[13px] font-medium ${STATUS_CLASS[value]}`}>{STATUS_LABEL[value]}</span>;
}
