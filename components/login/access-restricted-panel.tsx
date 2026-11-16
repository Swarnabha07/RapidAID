import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccessRestrictedPanel({
  email,
  onSwitchAccount,
}: {
  email: string;
  onSwitchAccount: () => void;
}) {
  return (
    <div>
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-high-soft text-[#ffb36b]">
        <ShieldAlert size={20} />
      </span>
      <h1 className="mt-5 text-[1.75rem] font-semibold text-text-primary">
        Access restricted
      </h1>
      <p className="mt-1.5 text-[15px] text-text-secondary">
        Your account is signed in, but doesn&apos;t have permission to access
        this workspace.
      </p>

      <div className="mt-6 rounded-md border border-high/30 bg-orange-50 p-4">
        <p className="text-[13.5px] font-medium text-orange-900">
          Your reports and account remain secure.
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-orange-900/80">
          Ask your organization&apos;s administrator to review your access.
          Responder and administrator permissions can only be granted by an
          authorized organization.
        </p>
      </div>

      <p className="mt-4 text-[13px] text-text-secondary">
        Signed in as <span className="text-text-primary">{email}</span>
      </p>

      <Button size="lg" className="mt-5 w-full">
        Contact your administrator
      </Button>
      <Button
        variant="secondary"
        size="lg"
        className="mt-3 w-full"
        onClick={onSwitchAccount}
      >
        Use a different account
      </Button>

      <Link
        href="/"
        className="mt-5 block text-center text-[13.5px] font-medium text-brand-blue hover:underline"
      >
        Need help now? Submit an emergency report
      </Link>

      <p className="mt-10 text-center text-xs text-text-secondary">
        Access is based on your approved account permissions.
      </p>
      <p className="mt-2 text-center text-xs text-text-secondary/70">
        RapidAID · Resilient by design
      </p>
    </div>
  );
}
