"use client";

import Icon from "@/components/Icon";

const PERIODOS = [
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "12 meses" },
  { value: "ano", label: "Este ano" },
  { value: "personalizado", label: "Datas" },
];

export default function BarraContexto({
  subAbas = [],
  subAba,
  onSubAba,
  intervalo,
  onPeriodo,
  onDatas,
  filtrosAbertos,
  onToggleFiltros,
  nFiltrosAtivos = 0,
  temFiltros = true,
  chips = [],
  onLimpar,
  resumo,
  nOcultos = 0,
  vistaAberta,
  onToggleVista,
  painelVista,
  relatorios = [],
  relatorioId,
  onRelatorio,
  acoes,
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background px-4 py-2.5 sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
      <div className="flex flex-wrap items-center gap-2">
        {subAbas.length > 0 && (
          <div className="seg-track" role="group" aria-label="Secção do relatório">
            {subAbas.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => onSubAba(s.value)}
                className={`seg-tab ${subAba === s.value ? "is-active" : ""}`}
                aria-pressed={subAba === s.value}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="seg-track" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onPeriodo(p.value)}
              className={`seg-tab ${intervalo.modo === p.value ? "is-active" : ""}`}
              aria-pressed={intervalo.modo === p.value}
            >
              {p.label}
            </button>
          ))}
        </div>

        {intervalo.modo === "personalizado" && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={intervalo.inicio || ""}
              onChange={(e) => onDatas({ inicio: e.target.value })}
              className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
              aria-label="Data inicial"
            />
            <span className="text-xs text-muted-foreground">a</span>
            <input
              type="date"
              value={intervalo.fim || ""}
              onChange={(e) => onDatas({ fim: e.target.value })}
              className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
              aria-label="Data final"
            />
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {relatorios.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Relatório</span>
              <select
                value={relatorioId || relatorios[0]?.id || ""}
                onChange={(e) => onRelatorio(e.target.value)}
                className="h-8 max-w-[13rem] rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                aria-label="Relatório do módulo"
              >
                {relatorios.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.titulo}
                  </option>
                ))}
              </select>
            </label>
          )}
          {acoes}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {temFiltros && (
          <button
            type="button"
            onClick={onToggleFiltros}
            aria-expanded={filtrosAbertos}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
              filtrosAbertos
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name="filter_list" className="text-sm" /> Filtros
            {nFiltrosAtivos > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {nFiltrosAtivos}
              </span>
            )}
          </button>
        )}

        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={c.onRemove}
            className="inline-flex h-7 max-w-[14rem] items-center gap-1 rounded-full border border-border bg-card px-2.5 text-[11px] text-foreground transition-colors hover:border-primary/40"
            title={`Remover ${c.label}`}
          >
            <span className="truncate">{c.label}</span>
            <Icon name="close" className="shrink-0 text-xs text-muted-foreground" />
          </button>
        ))}

        {chips.length > 0 && (
          <button
            type="button"
            onClick={onLimpar}
            className="inline-flex h-7 items-center px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Limpar
          </button>
        )}

        <div className="relative ml-auto">
          <button
            type="button"
            data-vista-toggle
            onClick={onToggleVista}
            aria-expanded={vistaAberta}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon name="visibility" className="text-sm" /> Vista
            {nOcultos > 0 && <span className="font-mono text-[10px]">{nOcultos}</span>}
          </button>
          {painelVista}
        </div>
      </div>

      {resumo && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          A mostrar <span className="font-medium text-foreground">{resumo.mostrados}</span> de {resumo.total}{" "}
          {resumo.rotulo}
          {resumo.descricao && (
            <>
              {" "}
              · {resumo.descricao}
            </>
          )}
          {nOcultos > 0 && (
            <>
              {" "}
              · {nOcultos} {nOcultos === 1 ? "bloco oculto" : "blocos ocultos"}
            </>
          )}
        </p>
      )}
    </div>
  );
}
