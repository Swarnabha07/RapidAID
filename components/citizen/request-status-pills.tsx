import { cn } from "@/lib/utils";
import type {
  OperationalStatus,
  RequestUrgency,
  SyncState,
} from "@/lib/types/citizen-request";

function Pill({ tone, children }: { tone: "red" | "amber" | "green" | "slate"; children: React.ReactNode }) {
  const toneClass = {
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-600",
  }[tone];

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium", toneClass)}>
      {children}
    </span>
  );
}

export function RequestUrgencyPill({ value }: { value: RequestUrgency }) {
  const tone = value === "High" ? "red" : value === "Medium" ? "amber" : "slate";
  return <Pill tone={tone}>{value}</Pill>;
}

export function SyncPill({ value }: { value: SyncState }) {
  const tone = value === "Synchronized" ? "green" : value === "Pending sync" ? "amber" : "slate";
  return <Pill tone={tone}>{value}</Pill>;
}

export function OperationalStatusPill({ value }: { value: OperationalStatus }) {
  const tone = value === "Resolved" || value === "Acknowledged" || value === "Assigned" ? "green" : "slate";
  return <Pill tone={tone}>{value}</Pill>;
}
