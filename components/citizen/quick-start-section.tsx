"use client";

import { useState } from "react";
import {
  Cross,
  LifeBuoy,
  UtensilsCrossed,
  Home,
  UserSearch,
  CircleEllipsis,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { label: "Medical Assistance", icon: Cross },
  { label: "Rescue & Evacuation", icon: LifeBuoy },
  { label: "Food & Water", icon: UtensilsCrossed },
  { label: "Shelter", icon: Home },
  { label: "Missing Person", icon: UserSearch },
  { label: "Other Emergency", icon: CircleEllipsis },
];

export function QuickStartSection() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-blue">
        Quick start
      </p>
      <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-2xl font-semibold text-text-primary">
          What kind of help do you need?
        </h2>
        <p className="max-w-xs text-[13px] text-text-secondary">
          Select the closest match. You can add more details next.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            type="button"
            onClick={() => setSelected(cat.label)}
            className={cn(
              "flex min-h-24 flex-col items-start justify-between rounded-[var(--radius-md)] border bg-white p-4 text-left transition-colors",
              selected === cat.label
                ? "border-brand-blue ring-1 ring-brand-blue"
                : "border-black/8 hover:border-black/20"
            )}
          >
            <cat.icon
              size={20}
              strokeWidth={1.75}
              className={selected === cat.label ? "text-brand-blue" : "text-text-secondary"}
            />
            <span className="mt-3 text-[13.5px] font-medium text-text-primary">
              {cat.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
