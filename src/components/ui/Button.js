import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-on-primary shadow-sm hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5",
        gradient:
          "bg-gradient-to-br from-primary to-teal-700 text-on-primary shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:brightness-105",
        destructive:
          "bg-error/15 text-error border border-error/30 hover:bg-error hover:text-on-error",
        outline:
          "border border-outline-variant bg-surface-variant/40 text-on-surface hover:border-primary hover:text-primary",
        secondary:
          "bg-secondary text-on-secondary shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        success:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md hover:-translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline p-0 shadow-none hover:translate-y-0",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = forwardRef(function Button(
  { className, variant, size, loading, disabled, children, ...props },
  ref
) {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size, className }),
        loading && "cursor-wait"
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      ref={ref}
      {...props}
    >
      {loading ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        children
      )}
    </button>
  );
});

export { Button, buttonVariants };
