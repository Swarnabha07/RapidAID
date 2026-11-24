"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Cloud,
  ShieldCheck,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ensureEmergencyUser } from "@/lib/firebase/auth";
import { createReport, type CreateReportInput } from "@/lib/firebase/firestore";
import { getCurrentLocation } from "@/lib/utils/get-current-location";

export interface EmergencyCtaCardProps {
  /**
   * Optional custom submission handler so P1 can drop in on-device AI classification
   * and SOS voice capture directly.
   */
  onSubmitEmergency?: (
    customPayload?: Partial<CreateReportInput>,
  ) => Promise<string | void>;
  onViewRequests?: () => void;
  pendingCount?: number;
  lastSyncedTime?: string;
}

export function EmergencyCtaCard({
  onSubmitEmergency,
  onViewRequests,
  pendingCount = 0,
  lastSyncedTime = "10:42 AM",
}: EmergencyCtaCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleReportEmergency = async () => {
    setSubmitting(true);
    setFeedback(null);

    try {
      const emergencyUser = await ensureEmergencyUser();
      if (onSubmitEmergency) {
        await onSubmitEmergency({
          userId: emergencyUser.uid,
        });
        setFeedback({
          type: "success",
          message: "Emergency assistance request submitted.",
        });
      } else {
        const location = await getCurrentLocation();

        const reportId = await createReport({
          userId: emergencyUser.uid,
          category: "medical",
          urgency: "critical",
          isSOS: true,
          description:
            "⚡ Emergency Assistance Request: Citizen pressed one-tap SOS beacon. Immediate responder dispatch requested.",
          location,
        });

        setFeedback({
          type: "success",
          message: `Emergency report submitted. Report #${reportId.slice(0, 8)}.`,
        });
      }
    } catch (err: any) {
      console.error("Emergency report submission error:", err);
      setFeedback({
        type: "error",
        message:
          err.message ||
          "Failed to submit emergency report. Please call emergency services or try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewRequests = () => {
    if (onViewRequests) {
      onViewRequests();
    } else {
      const historyElement = document.getElementById("request-history");
      if (historyElement) {
        historyElement.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-black/8 bg-white p-6 sm:p-8">
      <span
        className="absolute inset-y-0 left-0 w-1 rounded-l-[var(--radius-lg)] bg-critical"
        aria-hidden
      />

      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-critical">
        <span className="h-1.5 w-1.5 rounded-full bg-critical" /> Emergency
        assistance
      </p>

      <h1 className="mt-3 text-[2rem] font-semibold leading-[1.1] sm:text-[2.3rem]">
        <span className="text-text-primary">Need Help</span>
        <br />
        <span className="text-brand-blue">Right Now?</span>
      </h1>

      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-text-secondary">
        Tell us what is happening. Your report can be saved even when the
        internet is unavailable.
      </p>

      {feedback && (
        <div
          className={`mt-4 rounded-md p-3 text-[13px] font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          onClick={handleReportEmergency}
          disabled={submitting}
          className="bg-critical hover:brightness-110 focus-visible:ring-critical disabled:opacity-75"
        >
          {submitting ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <AlertTriangle size={17} />
          )}
          {submitting ? "Sending SOS Beacon..." : "Report an Emergency"}
        </Button>
        <Button size="lg" variant="secondary" onClick={handleViewRequests}>
          View My Requests <ChevronRight size={16} />
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-normal" /> Works offline
        </span>
        <span className="hidden text-black/20 sm:inline">·</span>
        <span>Saved securely</span>
        <span className="hidden text-black/20 sm:inline">·</span>
        <span>Simple 5-step form</span>
      </div>

      <SyncStatusCard
        pendingCount={pendingCount}
        lastSyncedTime={lastSyncedTime}
      />
    </div>
  );
}

function SyncStatusCard({
  pendingCount = 0,
  lastSyncedTime = "10:42 AM",
}: {
  pendingCount?: number;
  lastSyncedTime?: string;
}) {
  return (
    <div className="mt-6 rounded-[var(--radius-md)] border border-normal/20 bg-emerald-50/60 p-5">
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-normal">
          <Cloud size={19} />
        </span>
        <span className="rounded-full bg-normal-soft px-2.5 py-1 text-[11px] font-medium text-[#1f9254]">
          {pendingCount === 0 ? "All synchronized" : `${pendingCount} pending`}
        </span>
      </div>

      <p className="mt-4 text-[15px] font-medium text-text-primary">
        Your reports are up to date
      </p>
      <p className="mt-0.5 text-[13px] text-text-secondary">
        Your device is connected and ready to send an emergency report.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-black/8 pt-4">
        <div>
          <p className="text-[11px] text-text-secondary">Pending</p>
          <p className="text-[15px] font-semibold text-text-primary">
            {pendingCount}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-secondary">Last synchronized</p>
          <p className="text-[15px] font-semibold text-text-primary">
            {lastSyncedTime}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/8">
        <div className="h-full w-full rounded-full bg-normal" />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-text-secondary">
        <Check size={13} className="text-normal" /> Secure connection
      </p>
    </div>
  );
}
