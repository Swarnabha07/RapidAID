"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth, signOutUser } from "@/lib/firebase/auth";
import { AccessRestrictedPanel } from "@/components/login/access-restricted-panel";
import type { UserRole } from "@/lib/types/user";

interface RoleGateProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3 text-text-secondary">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
          <p className="text-sm font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userRole = role || "victim";
  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-subtle p-6">
        <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-black/8 bg-white p-6 shadow-sm sm:p-8">
          <AccessRestrictedPanel
            email={user.email || "Unknown user"}
            onSwitchAccount={() => {
              signOutUser().then(() => router.push("/login"));
            }}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
