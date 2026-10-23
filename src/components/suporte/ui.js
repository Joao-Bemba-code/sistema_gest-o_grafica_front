"use client";

import { cn } from "@/lib/utils";

const VARIANTES = {
  success: "border-success/15 bg-success/10 text-success dark:border-success/25 dark:bg-success/15",
  warning: "border-warning/15 bg-warning/10 text-warning dark:border-warning/25 dark:bg-warning/15",
  destructive: "border-destructive/15 bg-destructive/10 text-destructive dark:border-destructive/25 dark:bg-destructive/15",
  info: "border-info/15 bg-info/10 text-info dark:border-info/25 dark:bg-info/15",
  invert: "border-border bg-muted text-foreground dark:border-border dark:bg-muted",
};

export function Badge({ children, variant = "success", className }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-5 min-w-5 w-fit shrink-0 items-center justify-center gap-1 rounded-sm border px-1.25 py-0.5 text-xs font-medium whitespace-nowrap transition-shadow outline-none",
        VARIANTES[variant] || VARIANTES.success,
        className
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ nome, className }) {
  const iniciais = (nome || "??")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "relative flex size-6 shrink-0 select-none items-center justify-center rounded-full bg-muted text-xs text-muted-foreground after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten",
        className
      )}
    >
      {iniciais}
    </span>
  );
}

export function Frame({ titulo, descricao, acao, label, children, className }) {
  return (
    <section
      aria-label={label || titulo}
      className={cn("relative flex w-full flex-col gap-2 rounded-xl border border-border bg-muted/40 p-2", className)}
    >
      <div className="relative overflow-hidden rounded-lg border border-border bg-card">
        {/* Barra de acento superior */}
        <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-primary/60 to-tertiary" aria-hidden="true" />
        <div className="gradient-hero flex flex-row items-center justify-between gap-3 px-3.5 py-2.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="truncate text-sm font-semibold text-balance text-foreground">{titulo}</div>
            {descricao && <div className="truncate text-xs text-pretty text-muted-foreground">{descricao}</div>}
          </div>
          {acao}
        </div>
      </div>
      {children}
    </section>
  );
}

export function FramePanel({ children, className }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-xs", className)}>
      {children}
    </div>
  );
}

export function BarraProgresso({ valor, total, cor = "var(--primary)", className, rotulo }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((valor / total) * 100))) : 0;
  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span
          className="block h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: cor }}
        />
      </div>
      {rotulo && <span className="text-[11px] text-muted-foreground">{rotulo}</span>}
    </div>
  );
}

export function CartaoKpi({ icone: Icone, titulo, descricao, valor, nota, notaCor = "text-success", children }) {
  return (
    <div className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-primary/50 to-tertiary" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base leading-tight font-semibold text-foreground">{titulo}</h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{descricao}</p>
        </div>
        <span className="chip-icon-grad flex size-10 shrink-0 items-center justify-center">
          <Icone className="size-5" />
        </span>
      </div>
      <div className="mt-4">
        <div className="text-[26px] leading-none font-medium tabular-nums text-foreground">{valor}</div>
        {nota && <div className={`mt-1.5 text-xs ${notaCor}`}>{nota}</div>}
        {children}
      </div>
    </div>
  );
}

export function BotaoPrimario({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium whitespace-nowrap text-primary-foreground transition-all outline-none hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function BotaoVariante({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconeBotao({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Paginacao({ total, pagina, limite, onLimite }) {
  if (!total) return null;
  const inicio = (pagina - 1) * limite + 1;
  const fim = Math.min(pagina * limite, total);
  return (
    <div className="flex flex-col gap-2.5 border-t border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm text-muted-foreground">Linhas por página</span>
        <select
          value={limite}
          onChange={(e) => onLimite?.(Number(e.target.value))}
          aria-label="Linhas por página"
          className="h-8 w-16 rounded-lg border border-input bg-background py-2 pr-2 pl-2.5 text-sm text-foreground transition-colors focus:outline-none focus:ring-3 focus:ring-ring/50"
        >
          {[10, 25, 50].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="text-sm whitespace-nowrap text-muted-foreground">
        <strong className="font-medium text-foreground">{inicio}</strong>
        {" - "}
        <strong className="font-medium text-foreground">{fim}</strong>
        {" de "}
        <strong className="font-medium text-foreground">{total}</strong>
      </div>
    </div>
  );
}
