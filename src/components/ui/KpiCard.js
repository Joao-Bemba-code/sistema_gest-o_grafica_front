import { Card, CardContent } from "@/components/ui/Card";
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

export default function KpiCard({ icon, label, value, unit, badge, barPct, iconVariant = "primary", className, children }) {
  const v = VARIANTS[iconVariant] || VARIANTS.primary;
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className={cn("absolute inset-x-0 top-0 h-0.5", v.bar)} aria-hidden="true" />
      <CardContent className="flex items-start gap-4 sm:gap-5 p-5 sm:p-6">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border",
            v.chip
          )}
        >
          <Icon name={icon} className="text-xl" />
        </div>
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-none">
              {value}
            </span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {badge && <span className={cn("text-[11px] font-medium mt-0.5", v.badge)}>{badge}</span>}
          {barPct !== undefined && (
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-2">
              <div className={cn("h-full rounded-full transition-all duration-500", v.bar)} style={{ width: `${barPct}%` }} />
            </div>
          )}
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
