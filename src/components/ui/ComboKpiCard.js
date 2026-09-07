import { Card, CardContent } from "@/components/ui/Card";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: { chip: "border-primary/20 bg-primary/10 text-primary", bar: "bg-primary", accent: "text-primary" },
  success: { chip: "border-success/25 bg-success/10 text-success", bar: "bg-success", accent: "text-success" },
  info: { chip: "border-info/25 bg-info/10 text-info", bar: "bg-info", accent: "text-info" },
  secondary: { chip: "border-secondary/25 bg-secondary/10 text-secondary", bar: "bg-secondary", accent: "text-secondary" },
  error: { chip: "border-error/25 bg-error/10 text-error", bar: "bg-error", accent: "text-error" },
  warning: { chip: "border-warning/25 bg-warning/10 text-warning", bar: "bg-warning", accent: "text-warning" },
};

/**
 * Cartão KPI combinado: um único cartão que agrupa duas métricas lado a lado.
 *
 * stats = [{ label, value, sublabel }] (até 2)
 */
export default function ComboKpiCard({ icon, title, subtitle, stats, iconVariant = "primary", className }) {
  const v = VARIANTS[iconVariant] || VARIANTS.primary;
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className={cn("absolute inset-x-0 top-0 h-0.5", v.bar)} aria-hidden="true" />
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", v.chip)}>
            <Icon name={icon} className="text-lg" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground/70 truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col border border-border/60 rounded-lg bg-muted/40 p-3 min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title={s.label}>{s.label}</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight mt-1.5 break-words" title={String(s.value)}>
                {s.value}
              </p>
              {s.sublabel && <p className={cn("text-[10px] font-medium mt-1 truncate", v.accent)}>{s.sublabel}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
