import { Card, CardContent } from "@/components/ui/Card";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: {
    chip: "border-primary/25 bg-primary/10 text-primary",
    bar: "from-[#80d5cb] to-[#7bd0ff]",
    badge: "text-primary",
  },
  success: {
    chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    bar: "from-emerald-400 to-[#80d5cb]",
    badge: "text-success",
  },
  info: {
    chip: "border-secondary/25 bg-secondary/10 text-secondary",
    bar: "from-[#d2bbff] to-[#7bd0ff]",
    badge: "text-secondary",
  },
  secondary: {
    chip: "border-[#7bd0ff]/25 bg-[#7bd0ff]/10 text-[#7bd0ff]",
    bar: "from-[#7bd0ff] to-[#d2bbff]",
    badge: "text-primary",
  },
  error: {
    chip: "border-error/25 bg-error/10 text-error",
    bar: "from-[#ffb4ab] to-rose-500",
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
          <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight leading-none">
              {value}
            </span>
            {unit && <span className="text-sm font-mono text-muted-foreground">{unit}</span>}
          </div>
          {badge && <span className={cn("text-[10px] font-mono font-medium mt-0.5", v.badge)}>{badge}</span>}
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
