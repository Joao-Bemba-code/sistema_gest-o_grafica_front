"use client";

import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";

/**
 * Modelo "ledger" da referência (Delivery Console): um único frame com
 * border e fundo subtil que envolve o cabeçalho da secção (título +
 * subtítulo + botão primário + Filtros), a linha de filtros
 * (campo ▾ contém ▾ pesquisa limpar) e a tabela com cabeçalhos
 * ordenáveis e badges de estado.
 *
 * Usado por todas as páginas de listagem do KAMGEST.
 */

/* ── Frame ─────────────────────────────────────────────────────────── */

export function Ledger({ rotulo, children, className }) {
  return (
    <section
      aria-label={rotulo}
      className={cn("rounded-xl border border-border bg-muted/50 overflow-hidden", className)}
    >
      {children}
    </section>
  );
}

/* ── Cabeçalho da secção ───────────────────────────────────────────── */

export function LedgerHeader({ titulo, subtitulo, novo, aoNovo, onToggleFiltros, filtrosAbertos, className }) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-b border-border bg-card", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground truncate">{titulo}</h2>
        {subtitulo && <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{subtitulo}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {novo && (
          <button
            type="button"
            onClick={aoNovo}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            <Icon name="add" className="text-base" />
            <span className="whitespace-nowrap">{novo}</span>
          </button>
        )}
        {onToggleFiltros && (
          <button
            type="button"
            onClick={onToggleFiltros}
            aria-expanded={Boolean(filtrosAbertos)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium whitespace-nowrap transition-colors",
              filtrosAbertos
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-muted/60"
            )}
          >
            <Icon name="filter_list" className="text-base" />
            Filtros
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Linha de filtros (campo ▾ contém ▾ pesquisa limpar) ──────────── */

export function FilterRow({
  termo,
  setTermo,
  aoLimpar,
  placeholder = "Pesquisar...",
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 border-b border-border px-4 py-2.5">
      <input
        value={termo}
        onChange={(e) => setTermo?.(e.target.value)}
        placeholder={placeholder}
        aria-label="Pesquisar"
        className="h-9 w-full min-w-0 basis-40 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/25 transition-colors sm:w-64 sm:basis-auto sm:flex-none"
      />
      {termo && (
        <button
          type="button"
          onClick={aoLimpar}
          className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-foreground whitespace-nowrap transition-colors hover:bg-muted/60"
        >
          Limpar
        </button>
      )}
    </div>
  );
}

/* ── Badge de estado (6px, 12px, tom por estado) ──────────────────── */

const TONS = {
  success: "bg-success/15 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/25",
  error: "bg-error/15 text-error border-error/25",
  info: "bg-info/15 text-info border-info/25",
  neutral: "bg-muted/60 text-muted-foreground border-border",
};

export function StatusBadge({ tom = "neutral", children, className }) {
  return (
    <span
      className={cn(
        "relative inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        TONS[tom] || TONS.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

/* ── Tabela (cabeçalhos ordenáveis + linhas com divisor) ──────────── */

export function LedgerTable({ children, className }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full min-w-[560px] border-collapse text-sm text-foreground", className)}>
        {children}
      </table>
    </div>
  );
}

export function LedgerTh({ children, className, onSort, ativo = false }) {
  if (onSort) {
    return (
      <th className={cn("h-10 border-b border-border bg-muted/40 px-2 first:pl-4 last:pr-4 text-left align-middle text-xs font-semibold text-muted-foreground whitespace-nowrap", className)}>
        <button
          type="button"
          onClick={onSort}
          className="inline-flex h-7 -ml-2 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          {children}
          {ativo && <Icon name="unfold_more" className="text-xs" />}
        </button>
      </th>
    );
  }
  return <th className={cn("h-10 border-b border-border bg-muted/40 px-2 first:pl-4 last:pr-4 text-left align-middle text-xs font-semibold text-muted-foreground whitespace-nowrap", className)}>{children}</th>;
}

export function LedgerTr({ children, className, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={cn("border-b border-border last:border-b-0 odd:bg-card/50 even:bg-transparent transition-colors hover:bg-muted/50", onClick && "cursor-pointer", className)}
    >
      {children}
    </tr>
  );
}

export function LedgerTd({ children, className }) {
  return <td className={cn("px-2 py-2.5 first:pl-4 last:pr-4 align-middle", className)}>{children}</td>;
}

/* ── Célula de identificador (id + meta por baixo) ────────────────── */

export function IdCell({ id, meta, aoAbrir, className }) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      className={cn("group/ref block max-w-full text-left", aoAbrir && "cursor-pointer", className)}
    >
      <span className="block truncate border-b border-transparent py-0.5 text-xs font-medium text-foreground transition-colors group-hover/ref:border-primary">
        {id}
      </span>
      {meta && <span className="block truncate text-xs text-muted-foreground">{meta}</span>}
    </button>
  );
}

/* ── Estado vazio ─────────────────────────────────────────────────── */

export function LedgerEmpty({ icone = "inbox", children }) {
  return (
    <div className="px-4 py-14 text-center text-muted-foreground">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60">
        <Icon name={icone} className="text-2xl opacity-50" />
      </span>
      <p className="mx-auto max-w-sm text-sm font-medium text-foreground">{children}</p>
    </div>
  );
}
