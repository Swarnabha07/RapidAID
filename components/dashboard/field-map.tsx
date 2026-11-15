import type { Incident } from "@/lib/types/incident";

const PINS = [
  { id: "MED-001", x: "46%", y: "48%", kind: "incident", main: true },
  { id: "MED-002", x: "22%", y: "70%", kind: "incident" },
  { id: "MED-003", x: "68%", y: "70%", kind: "incident" },
  { id: "MED-004", x: "16%", y: "32%", kind: "incident" },
  { id: "MED-005", x: "60%", y: "30%", kind: "incident" },
  { id: "MED-006", x: "78%", y: "52%", kind: "incident" },
  { id: "A03", x: "30%", y: "60%", kind: "team" },
  { id: "B01", x: "58%", y: "38%", kind: "team" },
] as const;

export function FieldMap({ selected }: { selected: Incident }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">Field map</h2>
        <span className="text-[11px] text-text-inverse-muted">
          Riverton · fictional locations
        </span>
      </div>

      <div className="relative mt-3 h-56 overflow-hidden rounded-md bg-[#0d1b2a]">
        <span className="absolute left-2 top-2 text-[10px] text-white/30">N ↑</span>
        <svg className="absolute inset-0 h-full w-full opacity-25" aria-hidden>
          <path d="M0 80 L400 60 L800 100" stroke="#3a4a5f" strokeWidth="1.5" fill="none" />
          <path d="M60 0 L100 300" stroke="#3a4a5f" strokeWidth="1.5" fill="none" />
          <path d="M20 200 L380 160" stroke="#3a4a5f" strokeWidth="1.5" fill="none" />
        </svg>

        {PINS.map((pin) => (
          <span
            key={pin.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: pin.x, top: pin.y }}
          >
            {pin.kind === "incident" ? (
              <span
                className={`flex items-center justify-center rounded-full text-[10px] font-semibold text-white ${
                  pin.id === selected.id
                    ? "h-5 w-5 bg-critical ring-4 ring-critical/30"
                    : "h-3 w-3 bg-critical/70"
                }`}
              >
                {pin.id === selected.id ? pin.id.split("-")[1] : ""}
              </span>
            ) : (
              <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-sky-400 text-[9px] font-bold text-ink">
                +
              </span>
            )}
          </span>
        ))}

        {PINS.find((p) => p.id === selected.id) && (
          <span
            className="absolute -translate-x-1/2 rounded bg-ink/90 px-2 py-1 text-[10px] font-medium text-white"
            style={{
              left: PINS.find((p) => p.id === selected.id)!.x,
              top: `calc(${PINS.find((p) => p.id === selected.id)!.y} + 18px)`,
            }}
          >
            {selected.id}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-text-inverse-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-critical" /> Incident priority
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-sky-400" /> Medical team
        </span>
        <span className="ml-auto text-text-inverse-muted/70">Selected: {selected.id}</span>
      </div>
    </div>
  );
}
