import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
  {
    variants: {
      tone: {
        critical: "bg-critical-soft text-[#ff8a8d]",
        high: "bg-high-soft text-[#ffb36b]",
        medium: "bg-medium-soft text-[#e8cb57]",
        normal: "bg-normal-soft text-[#5fd996]",
        neutral: "bg-white/8 text-text-inverse-muted",
        info: "bg-brand-teal-soft text-teal-800",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
