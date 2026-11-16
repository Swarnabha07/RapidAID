"use client";

import { useState } from "react";
import {
  LayoutGrid,
  ListChecks,
  ClipboardList,
  Users,
  MapPin,
  ArrowRightLeft,
  Bell,
  History,
  Settings,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
const NAV_ITEMS = [
  { label: "Operations Overview", icon: LayoutGrid, active: true },
  { label: "Incident Queue", icon: ListChecks },
  { label: "Rescue Assignments", icon: ClipboardList },
  { label: "Team Availability", icon: Users },
  { label: "Live Map", icon: MapPin },
  { label: "Evacuation Operations", icon: ArrowRightLeft },
  { label: "Escalations", icon: Bell, badge: 3 },
  { label: "Activity Log", icon: History },
];

export function RescueSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="fixed left-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-ink-raised text-white lg:hidden"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-none flex-col border-r border-white/10 bg-ink transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="RapidAID Logo" className="h-9 w-9 object-contain" />
            <span className="text-[15px] font-semibold text-white">RapidAID</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center text-text-inverse-muted lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pt-2 scrollbar-thin">
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-text-inverse-muted/70">
            Response command
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-[13.5px] transition-colors",
                    item.active
                      ? "bg-brand-blue/15 text-white"
                      : "text-text-inverse-muted hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={17} strokeWidth={1.75} />
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span className="rounded-full bg-critical px-1.5 py-0.5 text-[11px] font-medium text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] text-text-inverse-muted hover:bg-white/5 hover:text-white"
          >
            <Settings size={17} strokeWidth={1.75} />
            Settings
          </button>
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-xs text-text-inverse-muted">
            <ShieldCheck size={15} className="text-normal" />
            <div>
              <p className="font-medium text-white/80">Authorized workspace</p>
              <p>Roles managed by your admin</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-text-inverse-muted/60">Demo environment</p>
        </div>
      </aside>
    </>
  );
}