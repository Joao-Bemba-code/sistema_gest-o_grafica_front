// Barra horizontal empilhada com legenda (estilo "Traffic Mix" da referência)
export default function StackedShareBar({ items = [], formatValue = (v) => String(v), className }) {
  const soma = items.reduce((s, i) => s + (Number(i.value) || 0), 0);
  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {items.map((i) => (
          <div
            key={i.label}
            title={`${i.label}: ${formatValue(i.value)}`}
            style={{ width: soma > 0 ? `${((Number(i.value) || 0) / soma) * 100}%` : 0, backgroundColor: i.color }}
            className="h-full min-w-0 first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((i) => {
          const pct = soma > 0 ? Math.round(((Number(i.value) || 0) / soma) * 100) : 0;
          return (
            <li key={i.label} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: i.color }} />
                <span className="truncate">{i.label}</span>
              </span>
              <span className="shrink-0 tabular-nums font-semibold text-foreground">
                {formatValue(i.value)}
                <span className="ml-1.5 inline-block w-9 text-right font-normal text-muted-foreground">{pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
