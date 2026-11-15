const CAPABILITIES = ["Offline-first", "Human-led response", "AI-assisted triage"];

export function CapabilityStrip() {
  return (
    <div className="border-y border-white/10 bg-ink-raised">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-sm text-text-inverse-muted">
          Built to bridge the critical gap.
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {CAPABILITIES.map((item) => (
            <span key={item} className="text-sm text-white/80">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
