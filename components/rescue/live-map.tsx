import type { RescueIncident, RoleViewConfig } from "@/lib/types/rescue";

const POSITIONS = [
  { x: "40%", y: "40%" },
  { x: "62%", y: "32%" },
  { x: "72%", y: "55%" },
  { x: "28%", y: "62%" },
];

const PIN_TONE: Record<string, string> = {
  rescue: "bg-critical",
  fire: "bg-high",
  evac: "bg-brand-teal",
};

export function LiveMap({
  view,
  selected,
}: {
  view: RoleViewConfig;
  selected: RescueIncident;
}) {
  const selectedIndex = view.incidents.findIndex((i) => i.id === selected.id);

  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">{view.mapTitle}</h2>
        <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-normal" /> Live
        </span>
      </div>
      <p className="mt-0.5 text-[12px] text-text-inverse-muted">
        North district · Fictional operational area
      </p>

      <div className="relative mt-3 h-64 overflow-hidden rounded-md bg-[#0d1b2a] sm:h-72">
        <span className="absolute left-3 top-2.5 text-[10px] tracking-wide text-white/30">
          EASTWOOD
        </span>
        <span className="absolute right-3 top-2.5 text-[10px] text-white/40">N ↑</span>
        <span className="absolute left-3 bottom-2.5 text-[10px] tracking-wide text-white/30">
          WESTBANK
        </span>

        <svg className="absolute inset-0 h-full w-full opacity-25" aria-hidden>
          <path d="M0 90 L200 60 L400 110 L600 80" stroke="#3a4a5f" strokeWidth="1.5" fill="none" />
          <path d="M80 0 L140 280" stroke="#3a4a5f" strokeWidth="1.5" fill="none" />
          <path d="M40 200 L380 160" stroke="#3a4a5f" strokeWidth="1.5" fill="none" />
        </svg>

        {/* Assigned unit marker */}
        <span className="absolute left-[18%] top-[70%] flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm bg-sky-500 text-[10px] font-bold text-white">
          U
        </span>

        {view.incidents.map((incident, i) => {
          const pos = POSITIONS[i % POSITIONS.length];
          const isSelected = i === selectedIndex;
          return (
            <span
              key={incident.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: pos.x, top: pos.y }}
            >
              <span
                className={`flex items-center justify-center rounded-full text-[10px] font-semibold text-white ${
                  PIN_TONE[view.key]
                } ${isSelected ? "h-6 w-6 ring-4 ring-white/15" : "h-3.5 w-3.5"}`}
              >
                {isSelected ? String(i + 1).padStart(2, "0") : ""}
              </span>
              {isSelected && (
                <span className="absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded bg-ink/90 px-2 py-1 text-[10px] font-medium text-white">
                  {incident.id} · {incident.confirmedPriority}
                </span>
              )}
            </span>
          );
        })}

        <div className="absolute bottom-2 right-2 flex flex-col gap-1">
          <button className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-ink/80 text-white">
            +
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-ink/80 text-white">
            −
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-text-inverse-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-critical" /> Rescue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-high" /> Fire
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-teal" /> Evacuation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-sky-500" /> Assigned unit
        </span>
      </div>
    </div>
  );
}