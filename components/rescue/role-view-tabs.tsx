import { cn } from "@/lib/utils";
import { ROLE_VIEWS, type RoleViewConfig } from "@/lib/types/rescue";

export function RoleViewTabs({
  activeKey,
  onChange,
}: {
  activeKey: RoleViewConfig["key"];
  onChange: (key: RoleViewConfig["key"]) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-right text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
        Authorized role views
      </p>
      <div className="inline-flex rounded-md border border-white/10 bg-ink-raised p-1">
        {ROLE_VIEWS.map((view) => (
          <button
            key={view.key}
            type="button"
            onClick={() => onChange(view.key)}
            className={cn(
              "rounded px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              activeKey === view.key
                ? "bg-white text-ink"
                : "text-text-inverse-muted hover:text-white"
            )}
          >
            {view.tabLabel}
          </button>
        ))}
      </div>
    </div>
  );
}