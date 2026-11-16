import type { RoleViewConfig } from "@/lib/types/rescue";

export function OperationalActivity({ view }: { view: RoleViewConfig }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-white/10 bg-ink-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">Operational activity</h2>
        <span className="text-[11px] text-text-inverse-muted">All incidents · UTC</span>
      </div>

      <ul className="mt-3 space-y-2">
        {view.activity.map((entry, i) => (
          <li
            key={i}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-white/5 py-1.5 text-[12.5px]"
          >
            <span className="flex min-w-0 items-center gap-2 text-text-inverse-muted">
              <span className="flex-none text-white/40">{entry.time}</span>
              <span className="truncate text-white/80">{entry.label}</span>
              <span className="truncate text-text-inverse-muted/70">· {entry.ref}</span>
            </span>
            <span className="flex-none text-text-inverse-muted/70">{entry.actor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}