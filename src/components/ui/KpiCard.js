import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: {
    chip: "border-primary/20 bg-primary/10 text-primary",
    bar: "bg-primary",
    badge: "text-primary",
  },
  success: {
    chip: "border-success/25 bg-success/10 text-success",
    bar: "bg-success",
    badge: "text-success",
  },
  info: {
    chip: "border-info/25 bg-info/10 text-info",
    bar: "bg-info",
    badge: "text-info",
  },
  secondary: {
    chip: "border-secondary/25 bg-secondary/10 text-secondary",
    bar: "bg-secondary",
    badge: "text-secondary",
  },
  error: {
    chip: "border-error/25 bg-error/10 text-error",
    bar: "bg-error",
    badge: "text-error",
  },
  warning: {
    chip: "border-warning/25 bg-warning/10 text-warning",
    bar: "bg-warning",
    badge: "text-warning",
  },
};

export default function KpiCard({ icon, label, value, unit, badge, barPct, iconVariant = "primary", className, onClick, active, children }) {
  const v = VARIANTS[iconVariant] || VARIANTS.primary;
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        "relative w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm",
        onClick && "cursor-pointer transition-colors hover:border-outline-variant hover:bg-muted/30 focus-ring-soft",
        active && "ring-2 ring-primary/50",
        className
      )}
    >
      <div className="flex items-start gap-3.5">
        {icon && (
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", v.chip)}>
            <Icon name={icon} className="text-lg" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <div className="mt-0.5 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[28px] font-bold leading-none tracking-tight text-foreground tabular-nums">{value}</span>
            {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          </div>
          {badge && <span className={cn("mt-1 text-[11px] font-medium", v.badge)}>{badge}</span>}
        </div>
      </div>
      {barPct !== undefined && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", v.bar)} style={{ width: `${Math.max(0, Math.min(100, barPct))}%` }} />
        </div>
      )}
      {children}
    </Wrapper>
  );
}
