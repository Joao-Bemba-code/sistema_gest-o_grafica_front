import { cn } from "@/lib/utils";

// Grelha de intensidade (estilo "Queue Lag Zone" da referência)
// columns: rótulos do eixo X; rows: rótulos do eixo Y; cells: [{ x, y, value, title }]
export default function HeatmapGrid({ columns = [], rows = [], cells = [], maxValue = 1, className }) {
  const intensidade = (v) => {
    if (!v) return "transparent";
    const t = Math.max(0.15, Math.min(1, v / Math.max(1, maxValue)));
    return `color-mix(in oklab, var(--primary) ${Math.round(t * 100)}%, transparent)`;
  };
  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `auto repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {/* Canto + cabeçalho de colunas */}
        <div />
        {columns.map((c) => (
          <div key={c} className="truncate text-center text-[10px] font-medium text-muted-foreground">
            {c}
          </div>
        ))}
        {/* Linhas */}
        {rows.map((r, y) => (
          <div key={r} className="contents">
            <div className="flex items-center pr-1.5 text-[10px] font-medium text-muted-foreground">
              <span className="w-full truncate text-right">{r}</span>
            </div>
            {columns.map((c, x) => {
              const cel = cells.find((cl) => cl.x === x && cl.y === y);
              const v = cel?.value || 0;
              return (
                <div
                  key={`${x}-${y}`}
                  title={cel?.title || ""}
                  className={cn("h-5 rounded-[4px]", v > 0 && "border border-border/40")}
                  style={{ backgroundColor: intensidade(v) }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
