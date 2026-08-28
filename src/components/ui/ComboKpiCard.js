import { Card, CardContent } from "@/components/ui/Card";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: { chip: "border-primary/25 bg-primary/10 text-primary", bar: "from-primary to-teal-500", accent: "text-primary" },
  success: { chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600", bar: "from-emerald-500 to-teal-400", accent: "text-success" },
  info: { chip: "border-secondary/25 bg-secondary/10 text-secondary", bar: "from-sky-500 to-teal-400", accent: "text-secondary" },
  secondary: { chip: "border-slate-500/25 bg-slate-500/10 text-slate-600", bar: "from-teal-400 to-sky-400", accent: "text-primary" },
  error: { chip: "border-error/25 bg-error/10 text-error", bar: "from-rose-400 to-red-500", accent: "text-error" },
  warning: { chip: "border-warning/25 bg-warning/10 text-warning", bar: "from-amber-400 to-orange-500", accent: "text-warning" },
};

/**
 * Cartão KPI combinado: um único cartão que agrupa duas métricas lado a lado,
 * mantendo a identidade visual do KpiCard (chip de ícone, faixa superior em gradiente).
 *
 * stats = [{ label, value, sublabel }] (até 2)
 */
export default function ComboKpiCard({ icon, title, subtitle, stats, iconVariant = "primary", className }) {
  const v = VARIANTS[iconVariant] || VARIANTS.primary;
  return (
    <Card className={cn("hover-lift relative overflow-hidden", className)}>
      <div className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r", v.bar)} aria-hidden="true" />
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
