"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";

export function DashboardHeader() {
  const { user, profile, role, signOutUser } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const responderName =
    profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Dr. Maya Chen";

  const roleLabel =
    role === "admin"
      ? "Verified administrator"
      : "Verified medical coordinator";

  const initials = (() => {
    const source = profile?.displayName || user?.displayName;
    if (source) {
      const parts = source.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return "MC";
  })();

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
        <h1 className="truncate text-[15px] font-semibold text-white">
          Medical response{" "}
          <span className="font-normal text-text-inverse-muted">/ Operations</span>
        </h1>
      </div>

      <div className="relative ml-auto hidden max-w-xs flex-1 md:block">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-inverse-muted"
        />
        <input
          type="text"
          placeholder="Search incidents, locations..."
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
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue/20 text-xs font-semibold text-white">
            {initials}
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-medium text-white">{responderName}</p>
            <p className="text-[11px] text-brand-teal">{roleLabel}</p>
          </div>
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
