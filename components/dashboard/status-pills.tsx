import { Badge } from "@/components/ui/badge";
import type { IncidentStatus, Urgency } from "@/lib/types/incident";

const URGENCY_TONE: Record<Urgency, "critical" | "high" | "normal"> = {
  Critical: "critical",
  High: "high",
  Normal: "normal",
};

export function UrgencyPill({ value }: { value: Urgency }) {
  return <Badge tone={URGENCY_TONE[value]}>{value}</Badge>;
}

const STATUS_CLASS: Record<IncidentStatus, string> = {
  Open: "text-text-inverse-muted",
  Assigned: "text-[#6fb6ff]",
  "In progress": "text-[#5fd996]",
  Resolved: "text-text-inverse-muted",
};

export function StatusLabel({ value }: { value: IncidentStatus }) {
  return <span className={`text-[13px] font-medium ${STATUS_CLASS[value]}`}>{value}</span>;
}
