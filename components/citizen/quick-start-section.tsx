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
  Clock,
  AlertCircle,
  RotateCcw,
  FilePenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ensureEmergencyUser } from "@/lib/firebase/auth";
import {
  retrySubmission,
  submitReport,
  type CreateReportInput,
} from "@/lib/firebase/firestore";
import { useSubmission } from "@/lib/hooks/use-submissions";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { describeSubmission } from "@/lib/utils/report-sync";
import type { ReportCategory } from "@/lib/types/report";
import { Button } from "@/components/ui/button";
import { getCurrentLocation } from "@/lib/utils/get-current-location";

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
    customPayload?: Partial<CreateReportInput>,
  ) => Promise<string | void>;
  onCategorySelected?: (
    categoryLabel: string,
    category: ReportCategory,
  ) => void;
  /** Opens the full report form with this category pre-selected (T4). */
  onAddDetails?: (category: ReportCategory) => void;
}

export function QuickStartSection({
  onSubmitCategoryReport,
  onCategorySelected,
  onAddDetails,
}: QuickStartSectionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [quickReportId, setQuickReportId] = useState<string | null>(null);
  const online = useOnlineStatus();
  const quickSubmission = useSubmission(quickReportId);

  const selectedCategoryObj = CATEGORIES.find((cat) => cat.label === selected);

  const handleSelect = (cat: (typeof CATEGORIES)[number]) => {
    setSelected(cat.label);
    setFeedback(null);
    setQuickReportId(null);
    if (onCategorySelected) {
      onCategorySelected(cat.label, cat.category);
    }
  };

  const handleQuickSubmit = async () => {
    if (!selectedCategoryObj) return;

    setSubmitting(true);
    setFeedback(null);
    setQuickReportId(null);

    try {
      const emergencyUser = await ensureEmergencyUser();
      if (onSubmitCategoryReport) {
        await onSubmitCategoryReport(
          selectedCategoryObj.category,
          selectedCategoryObj.label,
          {
            userId: emergencyUser.uid,
          },
        );
        setFeedback({
          type: "success",
          message: `Report for ${selectedCategoryObj.label} submitted.`,
        });
      } else {
        const location = await getCurrentLocation();

        const isMedical = selectedCategoryObj.category === "medical";
        const urgency = isMedical ? "critical" : "high";

        // Non-blocking: saved on this device at once (even offline), sent in the background.
        // The payload is unchanged from before T4.
        const { reportId } = submitReport(
          {
            userId: emergencyUser.uid,
            category: selectedCategoryObj.category,
            urgency,
            isSOS: false,
            description: `Citizen emergency request for ${selectedCategoryObj.label}. Logged via Quick Start portal.`,
            location,
          },
          { kind: "quick-start" },
        );
        setQuickReportId(reportId);
      }
    } catch (err: unknown) {
      console.error("Quick start report submission error:", err);
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to submit request. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const outcome = quickSubmission
    ? describeSubmission("quick-start", quickSubmission.state, online)
    : null;

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
          Select the closest match to send right away, or add details and a map location.
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
                : "border-black/8 hover:border-black/20",
            )}
          >
            <cat.icon
              size={20}
              strokeWidth={1.75}
              className={
                selected === cat.label
                  ? "text-brand-blue"
                  : "text-text-secondary"
              }
            />
            <span className="mt-3 text-[13.5px] font-medium text-text-primary">
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-brand-blue/20 bg-brand-blue/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px]">
              <span className="font-semibold text-text-primary">Selected:</span>{" "}
              <span className="text-brand-blue font-medium">{selected}</span>
              {feedback && (
                <span
                  role={feedback.type === "error" ? "alert" : "status"}
                  className={`ml-3 inline-flex items-center gap-1 font-medium ${
                    feedback.type === "error" ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {feedback.type === "error" ? (
                    <AlertCircle size={14} />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}{" "}
                  {feedback.message}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {onAddDetails && selectedCategoryObj && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onAddDetails(selectedCategoryObj.category)}
                  disabled={submitting}
                >
                  <FilePenLine size={14} /> Add details &amp; location
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleQuickSubmit}
                disabled={submitting}
                className="bg-brand-blue hover:brightness-110"
              >
                {submitting && (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                )}
                {submitting ? "Submitting..." : `Submit ${selected} Request`}
              </Button>
            </div>
          </div>

          {outcome && quickSubmission && (
            <div
              role={outcome.tone === "error" ? "alert" : "status"}
              className={`mt-3 flex flex-wrap items-start gap-2 text-[13px] ${
                outcome.tone === "success"
                  ? "text-emerald-800"
                  : outcome.tone === "pending"
                    ? "text-amber-900"
                    : "text-red-800"
              }`}
            >
              {outcome.tone === "success" ? (
                <CheckCircle2 size={14} className="mt-0.5" />
              ) : outcome.tone === "pending" ? (
                <Clock size={14} className="mt-0.5" />
              ) : (
                <AlertCircle size={14} className="mt-0.5" />
              )}
              <span>
                <span className="font-semibold">
                  {outcome.title} · Report #{quickSubmission.reportId.slice(0, 8)}.
                </span>{" "}
                {outcome.body}
              </span>
              {quickSubmission.state === "failed" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => retrySubmission(quickSubmission.reportId)}
                >
                  <RotateCcw size={14} /> Try again
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
