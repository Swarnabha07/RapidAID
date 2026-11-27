import type { Incident } from "@/lib/types/incident";
import { buildActivityFeed } from "@/lib/utils/responder-view";

export function ActivityTrail({ incidents }: { incidents: readonly Incident[] }) {
  const events = buildActivityFeed(incidents, 8);

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">Recent activity</h2>
        <span className="text-[12px] text-text-inverse-muted">From the activity trail of loaded reports</span>
      </div>

      {events.length === 0 ? (
        <p className="mt-3 text-[13px] text-text-inverse-muted">No activity recorded yet.</p>
      ) : (
        <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {events.map((event, i) => (
            <li
              key={`${event.ref}-${event.atMs}-${i}`}
              className="flex items-center justify-between gap-3 border-b border-white/5 py-1.5 text-[12.5px]"
            >
              <span className="flex min-w-0 items-center gap-2 text-text-inverse-muted">
                <span className="flex-none text-white/40">{event.time}</span>
                <span className="truncate text-white/80">
                  {event.ref} · {event.label}
                </span>
              </span>
              <span className="flex-none text-text-inverse-muted/70">{event.actor}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
