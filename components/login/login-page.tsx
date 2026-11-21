"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/login/auth-shell";
import { SignInForm, type SignInOutcome } from "@/components/login/sign-in-form";
import { ForgotPasswordForm } from "@/components/login/forgot-password-form";
import { SignedInPanel } from "@/components/login/signed-in-panel";
import { AccessRestrictedPanel } from "@/components/login/access-restricted-panel";
import { useAuth, getRoleRedirectPath, signOutUser } from "@/lib/firebase/auth";

type View =
  | { name: "signin" }
  | { name: "forgot" }
  | { name: "signed-in"; name_: string; email: string; role: string }
  | { name: "restricted"; email: string };

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("session") === "expired";
  const { user, profile, role, loading } = useAuth();
  const [view, setView] = useState<View>({ name: "signin" });

  // If user is already authenticated and not expired, display signed-in panel
  useEffect(() => {
    if (!loading && user && !sessionExpired) {
      const activeRole = role || "victim";
      setView({
        name: "signed-in",
        name_: user.displayName || profile?.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        role: activeRole,
      });
    }
  }, [loading, user, role, profile, sessionExpired]);

  function handleOutcome(outcome: SignInOutcome) {
    if (outcome.status === "success") {
      // Automatic role-based redirect
      const targetRoute = getRoleRedirectPath(outcome.role);
      router.push(targetRoute);
    } else if (outcome.status === "restricted") {
      setView({ name: "restricted", email: outcome.email });
    }
  }

  return (
    <AuthShell>
      {view.name === "signin" && (
        <SignInForm
          sessionExpired={sessionExpired}
          onForgotPassword={() => setView({ name: "forgot" })}
          onOutcome={handleOutcome}
        />
      )}

      {view.name === "forgot" && (
        <ForgotPasswordForm onBack={() => setView({ name: "signin" })} />
      )}

      {view.name === "signed-in" && (
        <SignedInPanel
          name={view.name_}
          email={view.email}
          role={view.role}
          onContinue={() => router.push(getRoleRedirectPath(view.role))}
          onSwitchAccount={() => {
            signOutUser().then(() => setView({ name: "signin" }));
          }}
        />
      )}

      {view.name === "restricted" && (
        <AccessRestrictedPanel
          email={view.email}
          onSwitchAccount={() => {
            signOutUser().then(() => setView({ name: "signin" }));
          }}
        />
      )}
    </AuthShell>
  );
}
