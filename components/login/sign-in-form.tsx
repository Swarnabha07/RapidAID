"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { AuthBanner } from "@/components/login/auth-banner";

export type SignInOutcome =
  | { status: "success"; name: string; email: string; role: string }
  | { status: "restricted"; email: string }
  | { status: "error" };

interface SignInFormProps {
  sessionExpired?: boolean;
  onForgotPassword: () => void;
  onOutcome: (outcome: SignInOutcome) => void;
}

export function SignInForm({
  sessionExpired,
  onForgotPassword,
  onOutcome,
}: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const checkboxId = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !password.trim()) {
      setError(true);
      return;
    }

    setError(false);
    setLoading(true);

    // Simulated authentication round-trip — replace with Firebase Auth.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setLoading(false);

    if (email.toLowerCase().includes("restricted")) {
      onOutcome({ status: "restricted", email });
      return;
    }
    if (password.toLowerCase() === "wrong") {
      setError(true);
      onOutcome({ status: "error" });
      return;
    }

    onOutcome({
      status: "success",
      name: "Alex Morgan",
      email,
      role: "Medical Response",
    });
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
        <Lock size={12} /> Secure sign-in
      </div>
      <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-text-primary">
        Welcome back
      </h1>
      <p className="mt-1.5 text-[15px] text-text-secondary">
        Sign in to continue to RapidAID.
      </p>

      <div className="mt-6">
        {error && (
          <AuthBanner
            tone="error"
            title="We couldn't sign you in"
            message="Check your email and password, then try again."
          />
        )}
        {!error && sessionExpired && (
          <AuthBanner
            tone="info"
            title="Your session has expired"
            message="Sign in again to securely continue your work."
          />
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <TextField
          label="Email address"
          type="email"
          placeholder="you@organization.org"
          autoComplete="username"
          value={email}
          error={error}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          isPassword
          value={password}
          error={error}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <label htmlFor={checkboxId} className="flex items-center gap-2.5 text-[13.5px] text-text-primary">
            <input
              id={checkboxId}
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-[18px] w-[18px] rounded border-black/25 text-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-[13.5px] font-medium text-brand-blue hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-text-secondary">
        <span className="h-px flex-1 bg-black/10" />
        or
        <span className="h-px flex-1 bg-black/10" />
      </div>

      <div className="rounded-md bg-subtle p-4">
        <p className="text-[13.5px] font-medium text-text-primary">
          Need emergency assistance?
        </p>
        <Link
          href="/"
          className="mt-1 inline-flex items-center gap-1 text-[13.5px] font-medium text-brand-blue hover:underline"
        >
          Submit a report — no sign-in required →
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-text-secondary">
        Access is based on your approved account permissions.
      </p>
      <p className="mt-2 text-center text-xs text-text-secondary/70">
        RapidAID · Resilient by design
      </p>
    </div>
  );
}
