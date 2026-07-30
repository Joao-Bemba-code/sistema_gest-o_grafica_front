import { Card, CardContent } from "@/components/ui/Card";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

export default function KpiCard({ icon, label, value, unit, badge, iconClass, valueClass, className, children }) {
  return (
    <Card className={cn("hover-lift", className)}>
      <CardContent className="flex items-start gap-4 p-5">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
          iconClass
        )}>
          <Icon name={icon} className="text-2xl" />
        </div>
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={cn("text-2xl font-extrabold text-foreground tracking-tight", valueClass)}>
              {value}
            </span>
            {unit && <span className="text-xs font-medium text-muted-foreground">{unit}</span>}
          </div>
          {badge && <span className="text-[10px] font-semibold text-primary">{badge}</span>}
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
