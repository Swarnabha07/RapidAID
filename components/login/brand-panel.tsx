import { Check } from "lucide-react";

export function BrandPanel() {
  return (
    <div className="flex h-full flex-col justify-between bg-ink px-8 py-10 text-white sm:px-10 sm:py-12 lg:px-12 lg:py-14">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">RapidAID</span>
        </div>
        <span className="mt-2 block h-0.5 w-8 bg-brand-teal" />

        <p className="mt-10 text-xs font-medium tracking-wide text-brand-teal">
          Emergency coordination platform
        </p>
        <h1 className="mt-4 max-w-sm text-[2rem] font-semibold leading-[1.15] lg:text-[2.3rem]">
          When every second matters, stay connected.
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-text-inverse-muted">
          Offline-first emergency reporting. One shared picture for the teams
          who bring help where it&apos;s needed.
        </p>
      </div>

      <IncidentOverviewPreview />

      <div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/80">
          <span className="flex items-center gap-2">
            <Check size={14} className="text-brand-teal" /> Offline-ready reporting
          </span>
          <span className="flex items-center gap-2">
            <Check size={14} className="text-brand-teal" /> Coordinated response
          </span>
        </div>
        <p className="mt-5 border-t border-white/10 pt-5 text-[13px] text-text-inverse-muted">
          Designed for resilient emergency coordination.
        </p>
      </div>
    </div>
  );
}

function IncidentOverviewPreview() {
  return (
    <div className="mt-10 rounded-[var(--radius-lg)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-white">Incident overview</p>
        <span className="flex items-center gap-1.5 text-[11px] text-text-inverse-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-teal" /> System preview
        </span>
      </div>

      <div className="relative mt-3 h-40 overflow-hidden rounded-md bg-[#0d1b2a]">
        <span className="absolute left-3 top-2.5 text-[10px] tracking-wide text-white/40">
          CENTRAL DISTRICT
        </span>
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          <path
            d="M30 70 L110 50 L170 65 L220 95"
            stroke="#3a4a5f"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M30 70 L110 50 L170 65 L220 95"
            stroke="#38e1c7"
            strokeWidth="1.5"
            strokeDasharray="3 4"
            fill="none"
            opacity="0.7"
          />
          <circle cx="30" cy="70" r="5" fill="#38e1c7" opacity="0.9" />
          <circle cx="170" cy="65" r="6" fill="#f0973a" />
          <circle cx="220" cy="95" r="5" fill="#38e1c7" opacity="0.9" />
        </svg>

        <div className="absolute bottom-10 left-1/2 w-40 -translate-x-1/2 rounded-md border border-white/10 bg-ink/95 p-2">
          <p className="text-[11px] font-medium text-white">Medical assistance</p>
          <p className="text-[10px] text-text-inverse-muted">Response team assigned</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-text-inverse-muted">
        <span className="flex items-center gap-1.5">
          <Check size={11} className="text-normal" /> All reports synced
        </span>
        <span>Last sync just now</span>
      </div>
    </div>
  );
}
