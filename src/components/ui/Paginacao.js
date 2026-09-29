"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

const TAMANHOS = [25, 50, 100, 250];

/**
 * Paginação para listas longas.
 *
 * Sem isto, uma lista de 1000 OPs renderiza 1000 cartões de uma vez: o
 * scrolling fica pesado e o browser passa segundos preso. Paginando, só se
 * desenha o que está visível.
 *
 * A posição é derivada, não sincronizada num effect. Quando a lista muda
 * (filtro, pesquisa) ou muda o tamanho de página, o `token` muda e a
 * posição volta sozinha à primeira página — assim nunca se fica numa página
 * vazia depois de um filtro reduzir os resultados.
 */
export function usePaginacao({ items = [], tamanhoInicial = 25 }) {
  const [tamanho, setTamanho] = useState(tamanhoInicial);
  const [nav, setNav] = useState(null);

  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const token = `${total}:${tamanho}`;

  const pagina = Math.min(nav && nav.token === token ? nav.pagina : 1, totalPaginas);

  const setPagina = (p) => {
    const alvo = typeof p === "function" ? p(pagina) : p;
    setNav({ token, pagina: Math.min(Math.max(1, alvo), totalPaginas) });
  };

  const visiveis = useMemo(
    () => items.slice((pagina - 1) * tamanho, pagina * tamanho),
    [items, pagina, tamanho]
  );

  return {
    visiveis,
    pagina,
    setPagina,
    tamanho,
    setTamanho,
    totalPaginas,
    total,
    de: total === 0 ? 0 : (pagina - 1) * tamanho + 1,
    ate: Math.min(pagina * tamanho, total),
  };
}

export default function Paginacao({ pagina, setPagina, totalPaginas, total, de, ate, tamanho, setTamanho, label = "registos" }) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-1">
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>
          A mostrar <strong className="text-foreground">{de}</strong>–<strong className="text-foreground">{ate}</strong> de{" "}
          <strong className="text-foreground">{total}</strong> {label}
        </span>
        <label className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Por página</span>
          <select
            value={tamanho}
            onChange={(e) => setTamanho(Number(e.target.value))}
            className="h-7 px-2 rounded-lg border border-outline-variant/40 bg-background/60 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 cursor-pointer"
            aria-label={`${label} por página`}
          >
            {TAMANHOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      {totalPaginas > 1 && (
        <nav className="flex items-center gap-1" aria-label="Paginação">
          <button
            type="button"
            onClick={() => setPagina(1)}
            disabled={pagina === 1}
            aria-label="Primeira página"
            className="min-w-touch h-8 px-2 rounded-lg border border-outline-variant/30 text-muted-foreground hover:text-foreground hover:border-outline-variant disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Icon name="first_page" className="text-base" />
          </button>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            aria-label="Página anterior"
            className="min-w-touch h-8 px-2 rounded-lg border border-outline-variant/30 text-muted-foreground hover:text-foreground hover:border-outline-variant disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Icon name="chevron_left" className="text-base" />
          </button>

          <span className="px-2 text-[11px] font-medium text-foreground tabular-nums" aria-live="polite">
            {pagina} / {totalPaginas}
          </span>

          <button
            type="button"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            aria-label="Página seguinte"
            className="min-w-touch h-8 px-2 rounded-lg border border-outline-variant/30 text-muted-foreground hover:text-foreground hover:border-outline-variant disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Icon name="chevron_right" className="text-base" />
          </button>
          <button
            type="button"
            onClick={() => setPagina(totalPaginas)}
            disabled={pagina === totalPaginas}
            aria-label="Última página"
            className="min-w-touch h-8 px-2 rounded-lg border border-outline-variant/30 text-muted-foreground hover:text-foreground hover:border-outline-variant disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Icon name="last_page" className="text-base" />
          </button>
        </nav>
      )}
    </div>
  );
}
