"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/login/auth-shell";
import { SignInForm, type SignInOutcome } from "@/components/login/sign-in-form";
import { ForgotPasswordForm } from "@/components/login/forgot-password-form";
import { SignedInPanel } from "@/components/login/signed-in-panel";
import { AccessRestrictedPanel } from "@/components/login/access-restricted-panel";

type View =
  | { name: "signin" }
  | { name: "forgot" }
  | { name: "signed-in"; name_: string; email: string; role: string }
  | { name: "restricted"; email: string };

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("session") === "expired";
  const [view, setView] = useState<View>({ name: "signin" });

  function handleOutcome(outcome: SignInOutcome) {
    if (outcome.status === "success") {
      setView({
        name: "signed-in",
        name_: outcome.name,
        email: outcome.email,
        role: outcome.role,
      });
    } else if (outcome.status === "restricted") {
      setView({ name: "restricted", email: outcome.email });
    }
    // "error" is handled inside SignInForm itself via its own banner.
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
          onContinue={() => router.push("/dashboard")}
          onSwitchAccount={() => setView({ name: "signin" })}
        />
      )}

      {view.name === "restricted" && (
        <AccessRestrictedPanel
          email={view.email}
          onSwitchAccount={() => setView({ name: "signin" })}
        />
      )}
    </AuthShell>
  );
}
