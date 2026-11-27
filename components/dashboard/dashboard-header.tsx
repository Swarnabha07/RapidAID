"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { LiveIndicator } from "@/components/responder/queue-state";
import { responderLabel } from "@/lib/utils/action-errors";
import type { LiveState } from "@/lib/utils/responder-view";

export function DashboardHeader({ liveState }: { liveState: LiveState }) {
  const { user, role, signOutUser } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // Same name the server will record (verified token name, else e-mail prefix, else role).
  const responderName = responderLabel(user, role);

  const roleLabel = role === "admin" ? "Administrator" : "Medical coordinator";

  const initials = (() => {
    const source = user?.displayName;
    if (source) {
      const parts = source.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return "RS";
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
          disabled
          title="Search is not available yet"
          placeholder="Search (not available yet)"
          className="h-9 w-full cursor-not-allowed rounded-md border border-white/10 bg-ink-raised pl-9 pr-12 text-[13px] text-white opacity-50 placeholder:text-text-inverse-muted/70"
        />
      </div>

      <div className="ml-auto flex items-center gap-4 md:ml-0">
        <LiveIndicator state={liveState} />

        <button
          type="button"
          disabled
          aria-label="Notifications (not available yet)"
          title="Notifications are not available yet"
          className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md text-text-inverse-muted opacity-50"
        >
          <Bell size={17} />
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
