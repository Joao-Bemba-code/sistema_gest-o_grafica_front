import { Card, CardContent } from "@/components/ui/Card";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: {
    chip: "border-primary/25 bg-primary/10 text-primary",
    bar: "from-primary to-teal-500",
    badge: "text-primary",
  },
  success: {
    chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600",
    bar: "from-emerald-500 to-teal-400",
    badge: "text-success",
  },
  info: {
    chip: "border-secondary/25 bg-secondary/10 text-secondary",
    bar: "from-sky-500 to-teal-400",
    badge: "text-secondary",
  },
  secondary: {
    chip: "border-slate-500/25 bg-slate-500/10 text-slate-600",
    bar: "from-teal-400 to-sky-400",
    badge: "text-primary",
  },
  error: {
    chip: "border-error/25 bg-error/10 text-error",
    bar: "from-rose-400 to-red-500",
    badge: "text-error",
  },
  warning: {
    chip: "border-warning/25 bg-warning/10 text-warning",
    bar: "from-amber-400 to-orange-500",
    badge: "text-warning",
  },
};

export default function KpiCard({ icon, label, value, unit, badge, barPct, iconVariant = "primary", className, children }) {
  const v = VARIANTS[iconVariant] || VARIANTS.primary;
  return (
    <Card className={cn("hover-lift relative overflow-hidden", className)}>
      <div className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r", v.bar)} aria-hidden="true" />
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
              <div className={cn("h-full bg-gradient-to-r rounded-full transition-all duration-500", v.bar)} style={{ width: `${barPct}%` }} />
            </div>
          )}
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
