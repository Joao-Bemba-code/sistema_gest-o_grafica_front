"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

const TAMANHOS = [10, 25, 50, 100];

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
export function usePaginacao({ items = [], tamanhoInicial = 10 }) {
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

/**
 * Rodapé de tabela no modelo da referência: à esquerda o selector de
 * "Linhas por página", à direita o intervalo "X - Y de Z" e setas de
 * navegação quando há mais do que uma página.
 */

export default function Paginacao({ pagina, setPagina, totalPaginas, total, de, ate, tamanho, setTamanho, label = "registos" }) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-2.5 px-4 py-2.5 sm:flex-row">
      <div className="flex grow flex-col flex-wrap items-center gap-2.5 sm:flex-row">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Linhas por página</span>
          <select
            value={tamanho}
            onChange={(e) => setTamanho(Number(e.target.value))}
            className="h-8 px-2 rounded-lg border border-border bg-card text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 cursor-pointer"
            aria-label={`Linhas por página (${label})`}
          >
            {TAMANHOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="order-1 flex flex-col items-center justify-center gap-2.5 sm:order-2 sm:flex-row sm:justify-end">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          <strong className="text-foreground">{de}</strong> - <strong className="text-foreground">{ate}</strong> de{" "}
          <strong className="text-foreground">{total}</strong>
        </span>
        {totalPaginas > 1 && (
          <span className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              aria-label="Página anterior"
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-outline-variant disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
            >
              <Icon name="chevron_left" className="text-sm" />
            </button>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              aria-label="Página seguinte"
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-outline-variant disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
            >
              <Icon name="chevron_right" className="text-sm" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
