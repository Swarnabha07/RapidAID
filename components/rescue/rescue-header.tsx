"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";

export function RescueHeader() {
  const { user, profile, role, signOutUser } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const responderName =
    profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "M. Chen";

  const roleLabel =
    role === "admin" ? "District administrator" : "Duty coordinator";

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOutUser();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
      setSigningOut(false);
    }
  };

  return (
    <header className="flex h-16 flex-none items-center gap-4 border-b border-white/10 bg-ink px-4 pl-16 sm:px-6 lg:pl-6">
      <div className="min-w-0">
        <h1 className="truncate text-[14.5px] font-semibold text-white">
          North District Response
        </h1>
        <p className="flex items-center gap-1 text-[11.5px] text-text-inverse-muted">
          <span className="text-normal">✓</span> Verified · Specialized rescue
        </p>
      </div>

      <div className="relative ml-auto hidden max-w-xs flex-1 md:block">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-inverse-muted"
        />
        <input
          type="text"
          placeholder="Search incidents, locations, units"
          className="h-9 w-full rounded-md border border-white/10 bg-ink-raised pl-9 pr-12 text-[13px] text-white placeholder:text-text-inverse-muted/70 focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-text-inverse-muted/70">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-4 md:ml-0">
        <span className="hidden items-center gap-1.5 text-xs text-text-inverse-muted sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-normal" /> Live · synchronized
        </span>

        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-inverse-muted hover:bg-white/5"
        >
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-critical" />
        </button>

        <div className="hidden items-center gap-2.5 sm:flex">
          <div className="text-right leading-tight">
            <p className="text-[13px] font-medium text-white">{responderName}</p>
            <p className="text-[11px] text-text-inverse-muted">{roleLabel}</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue/20 text-brand-teal">
            <ShieldCheck size={15} />
          </span>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          title="Sign out"
          aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-text-inverse-muted transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
