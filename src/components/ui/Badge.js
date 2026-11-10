import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-normal",
  {
    variants: {
      variant: {
        default:
          "border-primary/25 bg-primary/10 text-primary",
        secondary:
          "border-secondary/30 bg-secondary/10 text-secondary",
        destructive:
          "border-error/25 bg-error/15 text-error-ink",
        outline: "text-foreground border-outline-variant bg-surface-variant/40",
        success:
          "border-success/25 bg-success/15 text-success-ink",
        warning:
          "border-warning/25 bg-warning/15 text-warning-ink",
        info: "border-info/25 bg-info/15 text-info-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
