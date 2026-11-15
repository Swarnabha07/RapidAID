import { ArrowRight, Check } from "lucide-react";

const SYNC_STEPS = [
  "Create a report",
  "Store securely on device",
  "Connectivity returns",
  "Synchronize with cloud",
  "Responder access",
];

export function OfflineSection() {
  return (
    <section id="offline" className="bg-ink py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-xs font-medium text-brand-teal">
          04 · Offline is not off limits
        </p>
        <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-white sm:text-[2.2rem]">
          Connectivity should never be a prerequisite for asking for help.
        </h2>
        <p className="mt-4 max-w-xl text-[15px] text-text-inverse-muted">
          Designed to preserve a report through interrupted connections, from
          the first tap to a shared response.
        </p>

        <div className="mt-12 flex flex-col items-center gap-4 lg:flex-row">
          <ReportCard
            label="On the device"
            status="Saved locally"
            statusTone="bg-white/10 text-text-inverse-muted"
            note="Waiting for connectivity. Not yet visible to responders."
          />
          <ArrowRight
            className="hidden flex-none text-text-inverse-muted lg:block"
            size={22}
          />
          <span className="h-6 w-px bg-white/15 lg:hidden" aria-hidden />
          <ReportCard
            label="Shared with authorized teams"
            status="Synchronized"
            statusTone="bg-normal-soft text-[#5fd996]"
            note="Available for authorized responder review."
            synced
          />
        </div>

        <ol className="mt-12 grid grid-cols-2 gap-y-6 sm:grid-cols-5">
          {SYNC_STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-white/20 text-[11px] text-text-inverse-muted">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm text-white/80">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ReportCard({
  label,
  status,
  statusTone,
  note,
  synced,
}: {
  label: string;
  status: string;
  statusTone: string;
  note: string;
  synced?: boolean;
}) {
  return (
    <div className="w-full flex-1 rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted">
        {label}
      </p>
      <span
        className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone}`}
      >
        {synced && <Check size={12} />}
        {status}
      </span>
      <p className="mt-4 text-[15px] font-medium text-white">
        Medical assistance needed
      </p>
      <p className="text-sm text-text-inverse-muted">RPT-0248 · Riverside District</p>
      <p className="mt-3 text-sm text-text-inverse-muted/80">{note}</p>
    </div>
  );
}
