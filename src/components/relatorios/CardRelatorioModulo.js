"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/Icon";

function TooltipRelatorio({ active, payload, label, formato }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="font-mono text-foreground">{formato ? formato(payload[0].value) : payload[0].value}</p>
    </div>
  );
}

export default function CardRelatorioModulo({ relatorio, onVer }) {
  if (!relatorio) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
            <Icon name={relatorio.icon || "description"} className="text-lg text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{relatorio.titulo}</h3>
            <p className="truncate text-[11px] text-muted-foreground">{relatorio.sub}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <p className="text-lg font-semibold tabular-nums text-foreground">{relatorio.totalTexto}</p>
          {relatorio.variacao !== null && relatorio.variacao !== undefined && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                relatorio.variacao >= 0
                  ? "bg-success/10 text-success ring-success/20"
                  : "bg-error/10 text-error ring-error/20"
              }`}
            >
              <Icon name={relatorio.variacao >= 0 ? "trending_up" : "trending_down"} className="text-sm" />
              {relatorio.variacao >= 0 ? "+" : ""}
              {relatorio.variacao}%
            </span>
          )}
        </div>
      </div>

      <div className="h-40 px-2">
        {relatorio.serie.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={relatorio.serie} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                dy={4}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                width={48}
                tickFormatter={relatorio.formatoAxis}
                allowDecimals={false}
              />
              <Tooltip content={<TooltipRelatorio formato={relatorio.formato} />} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="valor" name={relatorio.titulo} radius={[6, 6, 0, 0]} maxBarSize={48} fill={relatorio.cor} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground">Sem dados suficientes para este relatório.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
        <button
          type="button"
          onClick={() => onVer(relatorio)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
        >
          <Icon name="visibility" className="text-sm text-muted-foreground" /> Visualizar
        </button>
        <button
          type="button"
          onClick={relatorio.onExportPdf}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Icon name="picture_as_pdf" className="text-sm text-error" /> PDF
        </button>
        <button
          type="button"
          onClick={relatorio.onExportExcel}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Icon name="grid_on" className="text-sm text-success" /> Excel
        </button>
      </div>
    </section>
  );
}
