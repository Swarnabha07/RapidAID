import { AlertTriangle, Inbox, Loader2, RefreshCw, WifiOff } from "lucide-react";
import {
  LIVE_STATE_TEXT,
  RESPONDER_QUEUE_LIMIT,
  describeQueueError,
  type LiveState,
  type QueueErrorInfo,
} from "@/lib/utils/responder-view";

const CARD = "rounded-[var(--radius-lg)] border border-white/8 bg-ink-raised p-6 text-center";

export function QueueLoading({ label }: { label: string }) {
  return (
    <div className={CARD} role="status">
      <Loader2 size={20} className="mx-auto animate-spin text-text-inverse-muted" />
      <p className="mt-3 text-sm text-text-inverse-muted">Loading {label}…</p>
    </div>
  );
}

export function QueueEmpty({ label }: { label: string }) {
  return (
    <div className={CARD}>
      <Inbox size={20} className="mx-auto text-text-inverse-muted" />
      <p className="mt-3 text-sm font-medium text-white">No reports in this queue</p>
      <p className="mt-1 text-[13px] text-text-inverse-muted">
        No {label} reports have been submitted yet. New reports appear here automatically.
      </p>
    </div>
  );
}

export function QueueError({
  error,
  onRetry,
}: {
  error: QueueErrorInfo | null;
  onRetry: () => void;
}) {
  const info = error ?? describeQueueError(null);
  return (
    <div className={`${CARD} border-critical/30`} role="alert">
      <AlertTriangle size={20} className="mx-auto text-[#ff8a8d]" />
      <p className="mt-3 text-sm font-medium text-white">{info.title}</p>
      <p className="mx-auto mt-1 max-w-xl text-[13px] leading-relaxed text-text-inverse-muted">
        {info.message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3.5 py-2 text-[13px] text-white hover:bg-white/5"
      >
        <RefreshCw size={13} /> Try again
      </button>
    </div>
  );
}

/** Honest notices shown above the queue: cached data, the 100-report limit, unreadable documents. */
export function QueueNotices({
  fromCache,
  truncated,
  skipped,
}: {
  fromCache: boolean;
  truncated: boolean;
  skipped: number;
}) {
  if (!fromCache && !truncated && skipped === 0) return null;
  return (
    <div className="space-y-2">
      {fromCache && (
        <p className="flex items-start gap-2 rounded-md bg-high-soft px-3.5 py-2.5 text-[13px] text-[#ffb36b]" role="status">
          <WifiOff size={15} className="mt-0.5 shrink-0" />
          Showing saved data that the server has not confirmed. It may be out of date, and actions need a connection.
        </p>
      )}
      {truncated && (
        <p className="flex items-start gap-2 rounded-md bg-high-soft px-3.5 py-2.5 text-[13px] text-[#ffb36b]" role="status">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Showing the {RESPONDER_QUEUE_LIMIT} highest-urgency reports (newest first within each level). More reports exist
          that are not loaded, and the counts below cover loaded reports only.
        </p>
      )}
      {skipped > 0 && (
        <p className="flex items-start gap-2 rounded-md bg-high-soft px-3.5 py-2.5 text-[13px] text-[#ffb36b]" role="status">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {skipped} report{skipped === 1 ? "" : "s"} could not be displayed because of an unexpected format.
        </p>
      )}
    </div>
  );
}

/** Inline failure message for dialogs and panels. */
export function ActionAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-md bg-critical-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-[#ff8a8d]"
    >
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

const DOT: Record<LiveState, string> = {
  connecting: "bg-text-inverse-muted",
  live: "bg-normal",
  cached: "bg-high",
  error: "bg-critical",
};

/** The header's connection indicator. Green only when the server confirmed the latest snapshot. */
export function LiveIndicator({ state }: { state: LiveState }) {
  return (
    <span className="hidden items-center gap-1.5 text-xs text-text-inverse-muted sm:flex" role="status">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[state]}`} /> {LIVE_STATE_TEXT[state]}
    </span>
  );
}
