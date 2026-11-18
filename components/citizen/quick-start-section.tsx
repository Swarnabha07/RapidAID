"use client";

import { useState } from "react";
import {
  Cross,
  LifeBuoy,
  UtensilsCrossed,
  Home,
  UserSearch,
  CircleEllipsis,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/firebase/auth";
import { createReport, type CreateReportInput } from "@/lib/firebase/firestore";
import type { ReportCategory } from "@/lib/types/report";
import { Button } from "@/components/ui/button";

const CATEGORIES: {
  label: string;
  icon: any;
  category: ReportCategory;
}[] = [
  { label: "Medical Assistance", icon: Cross, category: "medical" },
  { label: "Rescue & Evacuation", icon: LifeBuoy, category: "other" },
  { label: "Food & Water", icon: UtensilsCrossed, category: "water" },
  { label: "Shelter", icon: Home, category: "shelter" },
  { label: "Missing Person", icon: UserSearch, category: "missing_person" },
  { label: "Other Emergency", icon: CircleEllipsis, category: "other" },
];

export interface QuickStartSectionProps {
  /**
   * Optional custom submission handler so P1 can drop in on-device AI classification
   * and voice capture directly.
   */
  onSubmitCategoryReport?: (
    category: ReportCategory,
    categoryLabel: string,
    customPayload?: Partial<CreateReportInput>
  ) => Promise<string | void>;
  onCategorySelected?: (categoryLabel: string, category: ReportCategory) => void;
}

export function QuickStartSection({
  onSubmitCategoryReport,
  onCategorySelected,
}: QuickStartSectionProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedCategoryObj = CATEGORIES.find((cat) => cat.label === selected);

  const handleSelect = (cat: typeof CATEGORIES[number]) => {
    setSelected(cat.label);
    setFeedback(null);
    if (onCategorySelected) {
      onCategorySelected(cat.label, cat.category);
    }
  };

  const handleQuickSubmit = async () => {
    if (!selectedCategoryObj) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      if (onSubmitCategoryReport) {
        await onSubmitCategoryReport(selectedCategoryObj.category, selectedCategoryObj.label);
        setFeedback(`Report for ${selectedCategoryObj.label} submitted.`);
      } else {
        const fallbackLocation = {
          lat: 40.7128,
          lng: -74.006,
          address: "Citizen Device Location (Quick Start)",
          zone: "Sector Alpha",
        };

        const location = await new Promise<{ lat: number; lng: number; address: string; zone: string }>((resolve) => {
          if (typeof window !== "undefined" && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                resolve({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  address: `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
                  zone: "North District",
                });
              },
              () => resolve(fallbackLocation),
              { timeout: 3000 }
            );
          } else {
            resolve(fallbackLocation);
          }
        });

        const isMedical = selectedCategoryObj.category === "medical";
        const urgency = isMedical ? "critical" : "high";

        const reportId = await createReport({
          userId: user?.uid || "anonymous_citizen",
          category: selectedCategoryObj.category,
          urgency,
          isSOS: false,
          description: `Citizen emergency request for ${selectedCategoryObj.label}. Logged via Quick Start portal.`,
          location,
          processedBy: "cloud",
          confidenceScore: 0.95,
        });

        setFeedback(`Request logged! Report #${reportId.slice(0, 8)} created.`);
      }
    } catch (err: any) {
      console.error("Quick start report submission error:", err);
      setFeedback("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
            onClick={() => handleSelect(cat)}
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

      {selected && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-brand-blue/20 bg-brand-blue/5 p-4">
          <div className="text-[13px]">
            <span className="font-semibold text-text-primary">Selected:</span>{" "}
            <span className="text-brand-blue font-medium">{selected}</span>
            {feedback && (
              <span className="ml-3 inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 size={14} /> {feedback}
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleQuickSubmit}
            disabled={submitting}
            className="bg-brand-blue hover:brightness-110"
          >
            {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            {submitting ? "Submitting..." : `Submit ${selected} Request`}
          </Button>
        </div>
      )}
    </section>
  );
}
