import { Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignedInPanel({
  name,
  email,
  role,
  onContinue,
  onSwitchAccount,
}: {
  name: string;
  email: string;
  role: string;
  onContinue: () => void;
  onSwitchAccount: () => void;
}) {
  return (
    <div>
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-normal-soft text-[#5fd996]">
        <CheckCircle2 size={20} />
      </span>
      <h1 className="mt-5 text-[1.75rem] font-semibold text-text-primary">
        You&apos;re signed in
      </h1>
      <p className="mt-1.5 text-[15px] text-text-secondary">
        Your account has been securely authenticated.
      </p>

      <div className="mt-6 rounded-md border border-black/10 bg-subtle p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
          Signed in as
        </p>
        <p className="mt-1 text-[15px] font-semibold text-text-primary">{name}</p>
        <p className="text-sm text-text-secondary">{email}</p>

        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-[12px] font-medium text-brand-blue">
            {role}
          </span>
          <span className="flex items-center gap-1 text-[12px] text-[#1f9254]">
            <Check size={13} /> Approved access
          </span>
        </div>
      </div>

      <Button size="lg" className="mt-6 w-full" onClick={onContinue}>
        Continue to workspace
      </Button>

      <p className="mt-4 text-[13px] leading-relaxed text-text-secondary">
        Your role is managed by your organization. Need different access?
        Contact your administrator.
      </p>

      <Button
        variant="secondary"
        size="lg"
        className="mt-4 w-full"
        onClick={onSwitchAccount}
      >
        Use a different account
      </Button>

      <p className="mt-10 text-center text-xs text-text-secondary">
        Access is based on your approved account permissions.
      </p>
      <p className="mt-2 text-center text-xs text-text-secondary/70">
        RapidAID · Resilient by design
      </p>
    </div>
  );
}
