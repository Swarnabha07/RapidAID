"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ensureEmergencyUser } from "@/lib/firebase/auth";

interface EmergencyHelpButtonProps {
  size?: ButtonProps["size"];
  className?: string;
}

export function EmergencyHelpButton({
  size = "default",
  className,
}: EmergencyHelpButtonProps) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);

  const handleClick = async () => {
    if (connecting) return;

    setConnecting(true);

    try {
      const user = await ensureEmergencyUser();
      const tokenResult = await user.getIdTokenResult();
      const role = tokenResult.claims.role;

      // Responder accounts should not enter the citizen reporting dashboard.
      if (role === "medical" || role === "rescue") {
        window.alert(
          "You are signed in with a responder account. Please sign out before requesting emergency assistance as a citizen.",
        );
        return;
      }

      router.push("/home");
    } catch (error) {
      console.error("Emergency access initialization failed:", error);

      window.alert(
        error instanceof Error
          ? `Unable to start emergency access: ${error.message}`
          : "Unable to start emergency access. Please try again.",
      );
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Button
      size={size}
      className={className}
      onClick={handleClick}
      disabled={connecting}
    >
      {connecting ? "Connecting..." : "Request Emergency Help"}
    </Button>
  );
}
