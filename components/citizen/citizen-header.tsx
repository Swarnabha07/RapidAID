"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";

export function CitizenHeader() {
  const { user, profile, signOutUser } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const displayName =
    profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Citizen";
  const email = user?.email || "";

  // Compute 2-letter initials (e.g., Alex Morgan -> AM, alex@domain.com -> AL, fallback -> CZ)
  const initials = (() => {
    const nameSource = profile?.displayName || user?.displayName;
    if (nameSource) {
      const parts = nameSource.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "AM";
  })();

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOutUser();
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
      setSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-black/8 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-6">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="RapidAID Logo" className="h-9 w-9 object-contain" />
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

          <div className="hidden flex-col items-end text-right sm:flex">
            <span className="max-w-[140px] truncate text-[13px] font-semibold text-text-primary">
              {displayName}
            </span>
            {email && (
              <span className="max-w-[140px] truncate text-[11px] text-text-secondary">
                {email}
              </span>
            )}
          </div>

          <span
            title={email ? `${displayName} (${email})` : displayName}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue/10 text-[13px] font-semibold text-brand-blue"
          >
            {initials}
          </span>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-black/8 text-text-secondary transition-colors hover:bg-subtle hover:text-critical disabled:opacity-50"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
