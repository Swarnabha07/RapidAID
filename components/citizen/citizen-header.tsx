import { Bell } from "lucide-react";

export function CitizenHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/8 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-blue text-base font-bold text-white">
            +
          </span>
          <span className="text-[15px] font-semibold text-text-primary">
            RapidAID
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-black/8 bg-subtle px-3 py-1.5 text-xs font-medium text-text-primary sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-normal" />
            Online
            <span className="mx-1 h-3 w-px bg-black/10" />
            <span className="text-text-secondary">Synchronized</span>
          </span>

          <button
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-md border border-black/8 text-text-secondary hover:bg-subtle"
          >
            <Bell size={17} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-critical" />
          </button>

          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue/10 text-[13px] font-semibold text-brand-blue">
            AM
          </span>
        </div>
      </div>
    </header>
  );
}
