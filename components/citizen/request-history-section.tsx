"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { CITIZEN_REQUESTS, type CitizenRequest } from "@/lib/types/citizen-request";
import { useAuth } from "@/lib/firebase/auth";
import { subscribeToUserRequests } from "@/lib/firebase/firestore";
import {
  RequestUrgencyPill,
  SyncPill,
  OperationalStatusPill,
} from "@/components/citizen/request-status-pills";

export interface RequestHistorySectionProps {
  requests?: CitizenRequest[];
}

export function RequestHistorySection({ requests: propRequests }: RequestHistorySectionProps) {
  const { user } = useAuth();
  const [internalRequests, setInternalRequests] = useState<CitizenRequest[]>([]);

  useEffect(() => {
    if (propRequests !== undefined) return;
    if (!user?.uid) return;

    const unsubscribe = subscribeToUserRequests(
      user.uid,
      (data) => {
        setInternalRequests(data);
      },
      (err) => {
        console.warn("subscribeToUserRequests error in RequestHistorySection:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, propRequests]);

  const sourceRequests = propRequests !== undefined ? propRequests : internalRequests;
  // Seamless fallback to static demo requests if user has no submitted reports yet
  const displayRequests = sourceRequests.length > 0 ? sourceRequests : CITIZEN_REQUESTS;
  const isDemoFallback = sourceRequests.length === 0;

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
        <div className="flex items-center gap-2">
          {isDemoFallback && (
            <span className="rounded bg-black/5 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
              Demo sample
            </span>
          )}
          <a href="#" className="text-[13.5px] font-medium text-brand-blue hover:underline">
            View all
          </a>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {displayRequests.map((req) => (
          <div
            key={req.id}
            className="rounded-[var(--radius-md)] border border-black/8 bg-white p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-[15px] font-semibold text-text-primary">{req.id}</p>
              <p className="text-[12.5px] text-text-secondary">{req.reportedLabel}</p>
            </div>
            <p className="mt-1 text-[14px] font-medium text-text-primary">
              {req.category}
            </p>
            <p className="text-[13px] text-text-secondary">{req.location}</p>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-black/8 pt-4">
              <div>
                <p className="text-[11px] text-text-secondary">AI-estimated urgency</p>
                <div className="mt-1.5">
                  <RequestUrgencyPill value={req.urgency} />
                </div>
              </div>
              <div>
                <p className="text-[11px] text-text-secondary">Synchronization</p>
                <div className="mt-1.5">
                  <SyncPill value={req.sync} />
                </div>
              </div>
              <div>
                <p className="text-[11px] text-text-secondary">Operational status</p>
                <div className="mt-1.5">
                  <OperationalStatusPill value={req.status} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2.5 rounded-md bg-subtle p-4 text-[12.5px] leading-relaxed text-text-secondary">
        <Info size={15} className="mt-0.5 flex-none text-text-secondary/70" />
        <p>
          <span className="font-medium text-text-primary">About report delivery:</span>{" "}
          A report is only shown as submitted after it has synchronized with
          the server. Reports saved offline remain on this device until
          connection returns.
        </p>
      </div>
    </section>
  );
}
