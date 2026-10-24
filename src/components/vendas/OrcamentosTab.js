"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import {
  Ledger,
  LedgerHeader,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import RowMenu from "@/components/ui/RowMenu";

const FILTRO_VAZIO = { cliente: "", artigo: "", estado: "" };

const META_ESTADO = {
  calculo: { rotulo: "Em cálculo", tom: "bg-primary/10 text-primary" },
  aprovado: { rotulo: "Aprovado", tom: "bg-success/10 text-success" },
  expirado: { rotulo: "Expirado", tom: "bg-warning/10 text-warning" },
  cancelado: { rotulo: "Cancelado", tom: "bg-muted text-muted-foreground" },
  rejeitado: { rotulo: "Rejeitado", tom: "bg-error/10 text-error" },
};

const OPCOES_ESTADO = [
  { value: "calculo", label: "Em cálculo" },
  { value: "aprovado", label: "Aprovado" },
  { value: "expirado", label: "Expirado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "rejeitado", label: "Rejeitado" },
];

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

function artigoDe(o) {
  return o.especificacao?.produto || o.itens?.[0]?.descricao || "";
}

// A validade é guardada em dias (30 por defeito).
function dataLimite(o) {
  const inicio = o.data || o.data_emissao || o.createdAt;
  if (!inicio) return null;
  const data = new Date(inicio);
  if (isNaN(data.getTime())) return null;
  const dias = Number(o.validade);
  if (Number.isFinite(dias) && dias > 0) data.setDate(data.getDate() + dias);
  return data;
}

function expirado(o) {
  const limite = dataLimite(o);
  if (!limite) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return limite < hoje;
}

// Em cálculo / aprovado / expirado (pendente fora do prazo) / cancelado / rejeitado.
function estadoOrcamento(o) {
  if (o.estado === "aprovado") return "aprovado";
  if (o.estado === "cancelado") return "cancelado";
  if (o.estado === "rejeitado") return "rejeitado";
  return expirado(o) ? "expirado" : "calculo";
}

function quantidadeDe(o) {
  const total = (o.itens || []).reduce((s, i) => s + (Number(i.quantidade) || 0), 0);
  return total > 0 ? total : null;
}

function margemDe(o) {
  const itens = (o.itens || []).filter((i) => Number.isFinite(Number(i.margem)));
  if (!itens.length) return null;
  const total = itens.reduce((s, i) => s + (Number(i.total) || 0), 0);
  if (total > 0) {
    return itens.reduce((s, i) => s + (Number(i.margem) || 0) * (Number(i.total) || 0), 0) / total;
  }
  return itens.reduce((s, i) => s + (Number(i.margem) || 0), 0) / itens.length;
}

export default function OrcamentosTab({ orcamentos = [], onAbrir, onEditar, onEliminar }) {
  const [rascunho, setRascunho] = useState(FILTRO_VAZIO);
  const [aplicado, setAplicado] = useState(FILTRO_VAZIO);

  const clientes = useMemo(() => {
    const mapa = new Map();
    for (const o of orcamentos) {
      const id = String(o.cliente_id ?? o.cliente?.id ?? "");
      const nome = o.cliente?.empresa || o.cliente?.nome || "";
      if (id && nome && !mapa.has(id)) mapa.set(id, nome);
    }
    return Array.from(mapa, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, "pt")
    );
  }, [orcamentos]);

  const artigos = useMemo(() => {
    const nomes = new Set();
    for (const o of orcamentos) {
      const artigo = artigoDe(o);
      if (artigo) nomes.add(artigo);
    }
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt"));
  }, [orcamentos]);

  const filtrados = useMemo(
    () =>
      orcamentos.filter((o) => {
        const clienteId = String(o.cliente_id ?? o.cliente?.id ?? "");
        if (aplicado.cliente && clienteId !== aplicado.cliente) return false;
        if (aplicado.artigo && artigoDe(o) !== aplicado.artigo) return false;
        if (aplicado.estado && estadoOrcamento(o) !== aplicado.estado) return false;
        return true;
      }),
    [orcamentos, aplicado]
  );

  const contagem = useMemo(() => {
    const base = { calculo: 0, aprovado: 0, expirado: 0 };
    for (const o of filtrados) {
      const estado = estadoOrcamento(o);
      if (estado in base) base[estado] += 1;
    }
    return base;
  }, [filtrados]);

  const total = filtrados.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const pag = usePaginacao({ items: filtrados });
  const temFiltro = Boolean(aplicado.cliente || aplicado.artigo || aplicado.estado);

  const aplicar = () => setAplicado({ ...rascunho });
  const limpar = () => {
    setRascunho(FILTRO_VAZIO);
    setAplicado(FILTRO_VAZIO);
  };

  const campoCls =
    "h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/25";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {[
          { chave: "calculo", icone: "calculate", tom: "bg-primary/10 text-primary" },
          { chave: "aprovado", icone: "task_alt", tom: "bg-success/10 text-success" },
          { chave: "expirado", icone: "hourglass_top", tom: "bg-warning/10 text-warning" },
        ].map((k) => (
          <div key={k.chave} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${k.tom}`}>
              <Icon name={k.icone} className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">{META_ESTADO[k.chave].rotulo}</p>
              <p className="text-2xl font-black leading-tight tracking-tight text-foreground tabular-nums">{contagem[k.chave]}</p>
            </div>
          </div>
        ))}
      </div>

      <Ledger rotulo="Orçamentos ledger">
        <LedgerHeader
          titulo="Orçamentos"
          subtitulo={`${filtrados.length} orçamentos · ${formatKz(total)}`}
        />

        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Filtros</p>
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex min-w-40 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</span>
              <select
                value={rascunho.cliente}
                onChange={(e) => setRascunho((f) => ({ ...f, cliente: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {clientes.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-40 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Artigo</span>
              <select
                value={rascunho.artigo}
                onChange={(e) => setRascunho((f) => ({ ...f, artigo: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {artigos.map((artigo) => (
                  <option key={artigo} value={artigo}>{artigo}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-36 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</span>
              <select
                value={rascunho.estado}
                onChange={(e) => setRascunho((f) => ({ ...f, estado: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {OPCOES_ESTADO.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={aplicar}
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.98]"
            >
              Aplicar
            </button>
            {temFiltro && (
              <button
                type="button"
                onClick={limpar}
                className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <LedgerTable>
          <thead>
            <tr className="border-b border-border">
              <LedgerTh>Referência</LedgerTh>
              <LedgerTh>Artigo</LedgerTh>
              <LedgerTh>Quantidade</LedgerTh>
              <LedgerTh>Preço</LedgerTh>
              <LedgerTh>Margem</LedgerTh>
              <LedgerTh className="w-10" />
            </tr>
          </thead>
          <tbody>
            {pag.visiveis.map((o) => {
              const estado = estadoOrcamento(o);
              const quantidade = quantidadeDe(o);
              const margem = margemDe(o);
              return (
                <LedgerTr key={o.id} onClick={() => onAbrir?.(o)}>
                  <LedgerTd className="max-w-40">
                    <IdCell
                      id={o.numero || `#${o.id}`}
                      meta={META_ESTADO[estado].rotulo}
                      aoAbrir={() => onAbrir?.(o)}
                    />
                  </LedgerTd>
                  <LedgerTd className="max-w-56">
                    <span className="block truncate text-sm">{artigoDe(o) || "—"}</span>
                  </LedgerTd>
                  <LedgerTd className="tabular-nums text-muted-foreground">
                    {quantidade != null ? quantidade.toLocaleString("pt-PT") : "—"}
                  </LedgerTd>
                  <LedgerTd className="font-bold tabular-nums text-foreground">{formatKz(o.total)}</LedgerTd>
                  <LedgerTd className="tabular-nums text-muted-foreground">
                    {margem != null ? `${margem.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%` : "—"}
                  </LedgerTd>
                  <LedgerTd>
                    <RowMenu
                      ariaLabel="Ações do orçamento"
                      itens={[
                        { icone: "visibility", rotulo: "Ver detalhes", onClick: () => onAbrir?.(o) },
                        { icone: "edit", rotulo: "Editar", onClick: () => onEditar?.(o) },
                        { icone: "delete", rotulo: "Remover", danger: true, onClick: () => onEliminar?.(o) },
                      ]}
                    />
                  </LedgerTd>
                </LedgerTr>
              );
            })}
          </tbody>
        </LedgerTable>
        {pag.total === 0 && <LedgerEmpty icone="request_quote">Nenhum orçamento encontrado</LedgerEmpty>}
        <Paginacao {...pag} label="orçamentos" />
      </Ledger>
    </div>
  );
}
