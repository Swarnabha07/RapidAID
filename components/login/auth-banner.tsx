import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthBanner({
  tone,
  title,
  message,
}: {
  tone: "error" | "info";
  title: string;
  message: string;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "mb-5 flex gap-2.5 rounded-md border px-3.5 py-3",
        tone === "error"
          ? "border-critical/30 bg-red-50 text-critical"
          : "border-brand-blue/25 bg-blue-50 text-brand-blue"
      )}
    >
      {tone === "error" ? (
        <AlertCircle size={17} className="mt-0.5 flex-none" />
      ) : (
        <Info size={17} className="mt-0.5 flex-none" />
      )}
      <div>
        <p className="text-[13.5px] font-medium">{title}</p>
        <p className="mt-0.5 text-[13px] opacity-90">{message}</p>
      </div>
    </div>
  );
}
