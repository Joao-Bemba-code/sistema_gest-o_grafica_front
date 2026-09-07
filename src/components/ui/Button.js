import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        gradient:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-error/15 text-error border border-error/30 hover:bg-error hover:text-on-error",
        outline:
          "border border-input bg-transparent text-foreground hover:bg-muted hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        success:
          "bg-success text-white hover:bg-success/90",
        link: "text-primary underline-offset-4 hover:underline p-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-base",
        icon: "h-10 w-10 rounded-lg",
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
