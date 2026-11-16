import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-11",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-blue text-white hover:bg-brand-blue-hover focus-visible:ring-brand-blue",
        secondary:
          "bg-white text-text-primary border border-black/10 hover:bg-subtle focus-visible:ring-brand-blue",
        outlineInverse:
          "bg-transparent text-white border border-white/25 hover:bg-white/10 focus-visible:ring-white",
        ghost: "bg-transparent text-text-secondary hover:bg-subtle",
        danger: "bg-critical text-white hover:brightness-110 focus-visible:ring-critical",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
