"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { AuthBanner } from "@/components/login/auth-banner";
import { signInWithEmail, signInWithGoogle } from "@/lib/firebase/auth";

export type SignInOutcome =
  | { status: "success"; name: string; email: string; role: string }
  | { status: "restricted"; email: string }
  | { status: "error" };

interface SignInFormProps {
  sessionExpired?: boolean;
  onForgotPassword: () => void;
  onOutcome: (outcome: SignInOutcome) => void;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    "Check your email and password, then try again."
  );
  const checkboxId = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || googleLoading) return;

    if (!email.trim() || !password.trim()) {
      setError(true);
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setError(false);
    setLoading(true);

    try {
      const cred = await signInWithEmail(email.trim(), password);
      const tokenResult = await cred.user.getIdTokenResult(true);
      const userRole = (tokenResult.claims.role as string) || "victim";

      onOutcome({
        status: "success",
        name: cred.user.displayName || cred.user.email?.split("@")[0] || "User",
        email: cred.user.email || email,
        role: userRole,
      });
    } catch (err: any) {
      console.error("Email sign-in error:", err);
      setError(true);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setErrorMessage("Invalid email or password. Please verify your credentials.");
      } else if (err.code === "auth/too-many-requests") {
        setErrorMessage("Too many failed attempts. Please reset your password or try again later.");
      } else {
        setErrorMessage(err.message || "Could not sign in with this account.");
      }
      onOutcome({ status: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (loading || googleLoading) return;
    setGoogleLoading(true);
    setError(false);

    try {
      const cred = await signInWithGoogle();
      const tokenResult = await cred.user.getIdTokenResult(true);
      const userRole = (tokenResult.claims.role as string) || "victim";

      onOutcome({
        status: "success",
        name: cred.user.displayName || cred.user.email?.split("@")[0] || "User",
        email: cred.user.email || "",
        role: userRole,
      });
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        setGoogleLoading(false);
        return;
      }
      setError(true);
      if (err.code === "auth/popup-blocked") {
        setErrorMessage("Pop-up was blocked by your browser. Please allow popups for localhost.");
      } else if (err.code === "auth/unauthorized-domain") {
        setErrorMessage("Domain not authorized in Firebase Auth. localhost has been authorized; please try again in a few moments.");
      } else {
        setErrorMessage(err.message || "Failed to sign in with Google. Please try again.");
      }
      onOutcome({ status: "error" });
    } finally {
      setGoogleLoading(false);
    }
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
            message={errorMessage}
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

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || googleLoading}
          aria-busy={loading}
        >
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

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full border-black/10 hover:bg-subtle"
        disabled={loading || googleLoading}
        aria-busy={googleLoading}
        onClick={handleGoogleSignIn}
      >
        {googleLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Connecting with Google...
          </>
        ) : (
          <>
            <GoogleIcon />
            <span>Continue with Google</span>
          </>
        )}
      </Button>

      <div className="mt-6 rounded-md bg-subtle p-4">
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
