"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Cloud,
  CloudOff,
  ShieldCheck,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ensureEmergencyUser } from "@/lib/firebase/auth";
import {
  retrySubmission,
  submitReport,
  type CreateReportInput,
} from "@/lib/firebase/firestore";
import { useSubmission } from "@/lib/hooks/use-submissions";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { getCurrentLocation } from "@/lib/utils/get-current-location";
import {
  describeSubmission,
  type SyncSummary,
} from "@/lib/utils/report-sync";
import { cn } from "@/lib/utils";

// SAFETY: one-tap SOS must never involve AI. Do not import anything from "@/lib/ai/*" or
// "@/components/ai/*" in this file (enforced by tests/citizen/ai-isolation.test.ts).

export interface EmergencyCtaCardProps {
  /**
   * Optional custom submission handler so P1 can drop in on-device AI classification
   * and SOS voice capture directly.
   */
  onSubmitEmergency?: (
    customPayload?: Partial<CreateReportInput>,
  ) => Promise<string | void>;
  onViewRequests?: () => void;
  /** Real synchronisation state of the citizen's reports (see lib/utils/report-sync.ts). */
  syncSummary?: SyncSummary;
  /** Retries the submissions that failed in this page session. */
  onRetryFailed?: () => void;
}

export function EmergencyCtaCard({
  onSubmitEmergency,
  onViewRequests,
  syncSummary,
  onRetryFailed,
}: EmergencyCtaCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [sosReportId, setSosReportId] = useState<string | null>(null);
  const online = useOnlineStatus();
  const sosSubmission = useSubmission(sosReportId);

  const handleReportEmergency = async () => {
    setSubmitting(true);
    setFeedback(null);
    setSosReportId(null);

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

        // Non-blocking: the SOS is saved on this device at once (even offline) and sent in the
        // background. The payload (category, urgency, description) is unchanged from before.
        const { reportId } = submitReport(
          {
            userId: emergencyUser.uid,
            category: "medical",
            urgency: "critical",
            isSOS: true,
            description:
              "⚡ Emergency Assistance Request: Citizen pressed one-tap SOS beacon. Immediate responder dispatch requested.",
            location,
          },
          { kind: "sos" },
        );
        setSosReportId(reportId);
      }
    } catch (err: unknown) {
      console.error("Emergency report submission error:", err);
      setFeedback({
        type: "error",
        message:
          err instanceof Error && err.message
            ? err.message
            : "Failed to submit emergency report. Please call emergency services or try again.",
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

  const sosOutcome = sosSubmission
    ? describeSubmission("sos", sosSubmission.state, online)
    : null;

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
          role={feedback.type === "error" ? "alert" : "status"}
          className={`mt-4 rounded-md p-3 text-[13px] font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {sosOutcome && sosSubmission && (
        <div
          role={sosOutcome.tone === "error" ? "alert" : "status"}
          className={cn(
            "mt-4 rounded-md border p-3 text-[13px]",
            sosOutcome.tone === "success" &&
              "border-emerald-200 bg-emerald-50 text-emerald-800",
            sosOutcome.tone === "pending" &&
              "border-amber-200 bg-amber-50 text-amber-900",
            sosOutcome.tone === "error" && "border-red-200 bg-red-50 text-red-800",
          )}
        >
          <p className="font-semibold">
            {sosOutcome.title} · Report #{sosSubmission.reportId.slice(0, 8)}
          </p>
          <p className="mt-0.5">{sosOutcome.body}</p>
          {sosSubmission.state === "failed" && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => retrySubmission(sosSubmission.reportId)}
            >
              <RotateCcw size={14} /> Try again
            </Button>
          )}
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
        <span>Saved on your device first</span>
        <span className="hidden text-black/20 sm:inline">·</span>
        <span>Plain-language report form below</span>
      </div>

      <SyncStatusCard summary={syncSummary} onRetryFailed={onRetryFailed} />
    </div>
  );
}

const TONE_STYLES = {
  neutral: {
    card: "border-black/10 bg-subtle",
    badge: "bg-black/5 text-text-secondary",
    icon: "text-text-secondary",
  },
  amber: {
    card: "border-amber-300/60 bg-amber-50/70",
    badge: "bg-amber-100 text-amber-800",
    icon: "text-amber-700",
  },
  green: {
    card: "border-normal/20 bg-emerald-50/60",
    badge: "bg-normal-soft text-[#1f9254]",
    icon: "text-normal",
  },
  red: {
    card: "border-red-300/60 bg-red-50/70",
    badge: "bg-red-100 text-red-800",
    icon: "text-red-700",
  },
} as const;

function formatConfirmedTime(ms: number | null): string {
  if (ms === null) return "None yet";
  const d = new Date(ms);
  const today = new Date();
  const sameDay =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay
    ? `Today, ${time}`
    : `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

/**
 * Real report-synchronisation status (T4). Every line is derived from Firestore snapshot
 * metadata, the browser's online state and this session's failed submissions; nothing is
 * hard-coded. See lib/utils/report-sync.ts for what each state means.
 */
function SyncStatusCard({
  summary,
  onRetryFailed,
}: {
  summary?: SyncSummary;
  onRetryFailed?: () => void;
}) {
  const tone = TONE_STYLES[summary?.tone ?? "neutral"];
  const Icon = summary && !summary.online ? CloudOff : Cloud;

  return (
    <div
      className={cn("mt-6 rounded-[var(--radius-md)] border p-5", tone.card)}
      aria-live="polite"
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-md bg-white",
            tone.icon,
          )}
        >
          <Icon size={19} />
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium",
            tone.badge,
          )}
        >
          {summary?.badge ?? "Checking…"}
        </span>
      </div>

      <p className="mt-4 text-[15px] font-medium text-text-primary">
        {summary?.headline ?? "Checking your reports…"}
      </p>
      <p className="mt-0.5 text-[13px] text-text-secondary">
        {summary?.detail ?? "Loading the reports saved on this device."}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-black/8 pt-4">
        <div>
          <p className="text-[11px] text-text-secondary">Waiting to send</p>
          <p className="text-[15px] font-semibold text-text-primary">
            {summary?.pendingCount ?? 0}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-secondary">Not sent</p>
          <p className="text-[15px] font-semibold text-text-primary">
            {summary?.failedCount ?? 0}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-secondary">Last confirmed by server</p>
          <p className="text-[15px] font-semibold text-text-primary">
            {formatConfirmedTime(summary?.lastConfirmedMs ?? null)}
          </p>
        </div>
      </div>

      {summary && summary.failedCount > 0 && onRetryFailed && (
        <Button
          size="sm"
          variant="secondary"
          className="mt-4"
          onClick={onRetryFailed}
        >
          <RotateCcw size={14} /> Retry failed reports
        </Button>
      )}
    </div>
  );
}
