import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmergencyHelpButton } from "@/components/landing/emergency-help-button";

export function HeroSection() {
  return (
    <section className="bg-ink pb-20 pt-14 sm:pb-28 sm:pt-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-10">
        <div>
          <p className="text-xs font-medium tracking-wide text-brand-teal">
            Resilient by design. Ready for response.
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-[3.1rem]">
            Help should never stop because networks do.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-text-inverse-muted">
            RapidAID connects people affected by disasters with emergency
            response teams through intelligent triage, offline-first reporting,
            and coordinated emergency response.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <EmergencyHelpButton size="lg" />
            <Button size="lg" variant="outlineInverse">
              Explore the Platform ↗
            </Button>
          </div>

          <p className="mt-8 text-xs text-text-inverse-muted/80">
            Built for emergencies. Designed for unreliable connectivity.
          </p>
        </div>

        <ResponseOverviewPreview />
      </div>
    </section>
  );
}

function ResponseOverviewPreview() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-white/10 bg-ink-raised p-4 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between px-1 pb-3">
        <span className="text-[13px] font-medium text-white">
          RapidAID / Response overview
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-text-inverse-muted">
          Demo workspace
        </span>
      </div>

      <div className="relative h-56 overflow-hidden rounded-[var(--radius-md)] bg-[#0d1b2a] sm:h-64">
        <span className="absolute left-3 top-3 text-[10px] font-medium tracking-wide text-white/40">
          RIVERSIDE DISTRICT
        </span>
        <span className="absolute right-3 top-3 text-[10px] font-medium tracking-wide text-white/40">
          EAST RIVER
        </span>

        {/* fictional "streets" */}
        <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden>
          <path
            d="M0 60 L300 90 L600 40"
            stroke="#3a4a5f"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M40 0 L80 260"
            stroke="#3a4a5f"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M20 180 L320 150"
            stroke="#3a4a5f"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>

        <IncidentPin className="left-[18%] top-[32%]" tone="bg-critical" />
        <IncidentPin className="left-[48%] top-[52%]" tone="bg-sky-400" />
        <IncidentPin className="left-[70%] top-[38%]" tone="bg-high" />

        <div className="absolute left-4 top-16 w-44 rounded-md border border-white/10 bg-ink/95 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ff8a8d]">
            High priority
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-white">
            Medical assistance
          </p>
          <p className="text-[11px] text-text-inverse-muted">
            RPT-0248 · 2 min ago
          </p>
        </div>

        <div className="absolute bottom-2 right-2 flex flex-col gap-1">
          <button
            aria-label="Zoom in"
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-ink/80 text-white"
          >
            <Plus size={13} />
          </button>
          <button
            aria-label="Zoom out"
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-ink/80 text-white"
          >
            <Minus size={13} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1 pt-3 text-[11px] text-text-inverse-muted">
        <LegendDot className="bg-critical" label="High priority" />
        <LegendDot className="bg-sky-400" label="Active" />
        <LegendDot className="bg-normal" label="Resolved" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 px-1 pt-3">
        <Stat value="24" label="Active incidents" />
        <Stat value="04" label="High priority" tone="text-[#ff8a8d]" />
        <Stat value="08" label="Teams responding" />
      </div>

      <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-text-inverse-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-normal" /> All reports
          synchronized
        </span>
        <span>Last sync just now</span>
      </div>

      <p className="mt-4 text-center text-[10px] tracking-wide text-text-inverse-muted/60">
        Illustrative response environment · Fictional incident data
      </p>
    </div>
  );
}

function IncidentPin({ className, tone }: { className: string; tone: string }) {
  return (
    <span className={`absolute ${className}`}>
      <span
        className={`block h-2.5 w-2.5 rounded-full ${tone} ring-4 ring-white/10`}
      />
    </span>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function Stat({
  value,
  label,
  tone = "text-white",
}: {
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <div>
      <p className={`text-lg font-semibold ${tone}`}>{value}</p>
      <p className="text-[11px] text-text-inverse-muted">{label}</p>
    </div>
  );
}
