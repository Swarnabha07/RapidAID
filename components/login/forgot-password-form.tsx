"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !email.trim()) return;
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setLoading(false);
    setSent(true);
  }

  return (
    <div>
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue">
        <Mail size={18} />
      </span>
      <h1 className="mt-5 text-[1.75rem] font-semibold text-text-primary">
        Reset your password
      </h1>
      <p className="mt-1.5 text-[15px] text-text-secondary">
        Enter your account email and we&apos;ll send you a link to reset your
        password.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <TextField
          label="Email address"
          type="email"
          placeholder="you@organization.org"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button type="submit" size="lg" className="w-full" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Sending...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>

        <p aria-live="polite" className="text-[13px] leading-relaxed text-text-secondary">
          {sent
            ? "If an account exists for this email, you'll receive a reset link shortly."
            : "If an account exists for this email, you'll receive a reset link. For your security, the link expires after a short time."}
        </p>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={onBack}
        >
          Back to sign in
        </Button>
      </form>

      <p className="mt-10 text-center text-xs text-text-secondary">
        Access is based on your approved account permissions.
      </p>
      <p className="mt-2 text-center text-xs text-text-secondary/70">
        RapidAID · Resilient by design
      </p>
    </div>
  );
}
