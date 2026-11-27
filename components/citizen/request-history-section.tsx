"use client";

import { Info, RotateCcw } from "lucide-react";
import type { CitizenRequest } from "@/lib/types/citizen-request";
import { Button } from "@/components/ui/button";
import {
  Pill,
  RequestUrgencyPill,
  SyncPill,
  OperationalStatusPill,
} from "@/components/citizen/request-status-pills";
import { displaySyncState } from "@/lib/utils/report-sync";

export interface RequestHistorySectionProps {
  /** The citizen's real reports (failed submissions of this session first). undefined = loading. */
  requests?: CitizenRequest[];
  /** Browser connectivity hint, used only to word "Saved offline" vs "Pending sync". */
  online?: boolean;
  /** Retry one failed submission (same report id, so it cannot create a duplicate). */
  onRetry?: (reportId: string) => void;
}

export function RequestHistorySection({
  requests,
  online = true,
  onRetry,
}: RequestHistorySectionProps) {
  const isLoading = requests === undefined;
  const rows = requests ?? [];

  return (
    <section id="request-history">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
            Request history
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-text-primary">
            My emergency requests
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-3" aria-live="polite">
        {isLoading && (
          <p className="rounded-[var(--radius-md)] border border-black/8 bg-white p-5 text-[13.5px] text-text-secondary">
            Loading your reports…
          </p>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="rounded-[var(--radius-md)] border border-dashed border-black/15 bg-white p-6 text-center">
            <p className="text-[15px] font-medium text-text-primary">
              You have not sent any reports yet
            </p>
            <p className="mt-1 text-[13px] text-text-secondary">
              Reports you send from this device appear here, including ones saved
              while you are offline.
            </p>
          </div>
        )}

        {rows.map((req) => {
          const syncState = displaySyncState(req.sync, online);
          const confirmed = req.sync === "Synchronized";
          return (
            <div
              key={req.id}
              className="rounded-[var(--radius-md)] border border-black/8 bg-white p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-[15px] font-semibold text-text-primary">
                  #{req.id.slice(0, 8)}
                </p>
                <p className="text-[12.5px] text-text-secondary">{req.reportedLabel}</p>
              </div>
              <p className="mt-1 text-[14px] font-medium text-text-primary">
                {req.category}
              </p>
              <p className="text-[13px] text-text-secondary">{req.location}</p>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-black/8 pt-4">
                <div>
                  <p className="text-[11px] text-text-secondary">Urgency</p>
                  <div className="mt-1.5">
                    <RequestUrgencyPill value={req.urgency} />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-text-secondary">Synchronization</p>
                  <div className="mt-1.5">
                    <SyncPill value={syncState} />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-text-secondary">Operational status</p>
                  <div className="mt-1.5">
                    {confirmed ? (
                      <OperationalStatusPill value={req.status} />
                    ) : (
                      <Pill tone="slate">Not yet received</Pill>
                    )}
                  </div>
                </div>
              </div>

              {req.sync === "Failed" && (
                <div
                  role="alert"
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-800"
                >
                  <p>{req.failure ?? "This report could not be sent."}</p>
                  {onRetry && (
                    <Button size="sm" variant="secondary" onClick={() => onRetry(req.id)}>
                      <RotateCcw size={14} /> Retry
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2.5 rounded-md bg-subtle p-4 text-[12.5px] leading-relaxed text-text-secondary">
        <Info size={15} className="mt-0.5 flex-none text-text-secondary/70" />
        <p>
          <span className="font-medium text-text-primary">About report delivery:</span>{" "}
          A report is shown as synchronized only after RapidAID&apos;s servers have
          confirmed it. Reports saved offline stay on this device and are sent when the
          connection returns. A report that could not be sent is shown here until you
          reload this page; if the page is closed before it is sent, check this list again
          when you are back online. Synchronized means received, not that a responder
          has acted.
        </p>
      </div>
    </section>
  );
}
