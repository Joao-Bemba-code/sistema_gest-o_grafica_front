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
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import RowMenu from "@/components/ui/RowMenu";
import { UNIDADES, ESTADOS_PROPOSTA, META_ESTADO } from "@/services/propostas";

const FILTRO_VAZIO = { cliente: "", unidade: "", estado: "" };

const CARTOES = [
  { chave: "rascunho", icone: "edit", tom: "bg-warning/10 text-warning" },
  { chave: "recebida", icone: "email", tom: "bg-muted text-muted-foreground" },
  { chave: "enviada", icone: "send", tom: "bg-info/10 text-info" },
  { chave: "aprovada", icone: "verified", tom: "bg-success/10 text-success" },
  { chave: "rejeitada", icone: "block", tom: "bg-error/10 text-error" },
  { chave: "expirada", icone: "event_busy", tom: "bg-muted text-muted-foreground" },
];

function formatarData(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT");
}

export default function PropostasTab({ propostas = [], onAbrir, onEditar, onAnular }) {
  const [rascunho, setRascunho] = useState(FILTRO_VAZIO);
  const [aplicado, setAplicado] = useState(FILTRO_VAZIO);

  const clientes = useMemo(() => {
    const mapa = new Map();
    for (const p of propostas) {
      const id = String(p.cliente_id ?? p.cliente?.id ?? "");
      const nome = p.cliente?.empresa || p.cliente?.nome || "";
      if (id && nome && !mapa.has(id)) mapa.set(id, nome);
    }
    return Array.from(mapa, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, "pt")
    );
  }, [propostas]);

  const filtradas = useMemo(
    () =>
      propostas.filter((p) => {
        const clienteId = String(p.cliente_id ?? p.cliente?.id ?? "");
        if (aplicado.cliente && clienteId !== aplicado.cliente) return false;
        if (aplicado.unidade && p.unidade !== aplicado.unidade) return false;
        if (aplicado.estado && p.estado !== aplicado.estado) return false;
        return true;
      }),
    [propostas, aplicado]
  );

  const contagem = useMemo(() => {
    const base = { rascunho: 0, enviada: 0, recebida: 0, avaliada: 0, aprovada: 0, rejeitada: 0, expirada: 0 };
    for (const p of filtradas) base[p.estado] = (base[p.estado] || 0) + 1;
    return base;
  }, [filtradas]);

  const pag = usePaginacao({ items: filtradas });
  const temFiltro = Boolean(aplicado.cliente || aplicado.unidade || aplicado.estado);

  const aplicar = () => setAplicado({ ...rascunho });
  const limpar = () => {
    setRascunho(FILTRO_VAZIO);
    setAplicado(FILTRO_VAZIO);
  };

  const campoCls =
    "h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/25";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {CARTOES.map((k) => (
          <div
            key={k.chave}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.tom}`}>
              <Icon name={k.icone} className="text-lg" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">{META_ESTADO[k.chave].rotulo}</p>
              <p className="text-xl font-black leading-tight tracking-tight text-foreground tabular-nums">
                {contagem[k.chave] || 0}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Ledger rotulo="Propostas ledger">
        <LedgerHeader
          titulo="Propostas"
          subtitulo={`Carteira de propostas · ${filtradas.length} ${filtradas.length === 1 ? "proposta" : "propostas"}`}
        />

        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Filtros</p>
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex min-w-40 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Cliente</span>
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

            <label className="flex min-w-44 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Unidade de negócio</span>
              <select
                value={rascunho.unidade}
                onChange={(e) => setRascunho((f) => ({ ...f, unidade: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todas</option>
                {UNIDADES.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-36 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Estado</span>
              <select
                value={rascunho.estado}
                onChange={(e) => setRascunho((f) => ({ ...f, estado: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {ESTADOS_PROPOSTA.map((e) => (
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
              <LedgerTh>Cliente</LedgerTh>
              <LedgerTh>Unidade</LedgerTh>
              <LedgerTh>Objecto</LedgerTh>
              <LedgerTh>Validade</LedgerTh>
              <LedgerTh>Estado</LedgerTh>
              <LedgerTh className="w-10" />
            </tr>
          </thead>
          <tbody>
            {pag.visiveis.map((p) => {
              const estado = META_ESTADO[p.estado] || META_ESTADO.rascunho;
              return (
                <LedgerTr key={p.id} onClick={() => onAbrir?.(p)}>
                  <LedgerTd className="max-w-40">
                    <IdCell id={p.numero} aoAbrir={() => onAbrir?.(p)} />
                  </LedgerTd>
                  <LedgerTd className="max-w-56">
                    <span className="block truncate text-sm">{p.cliente?.empresa || p.cliente?.nome || "—"}</span>
                    {p.cliente?.empresa && p.cliente?.nome && (
                      <span className="block truncate text-xs text-muted-foreground">{p.cliente.nome}</span>
                    )}
                  </LedgerTd>
                  <LedgerTd className="text-muted-foreground">{p.unidade_rotulo || p.unidade}</LedgerTd>
                  <LedgerTd className="max-w-64">
                    <span className="block truncate text-sm">{p.objecto || "—"}</span>
                  </LedgerTd>
                  <LedgerTd className="text-muted-foreground">{formatarData(p.validade_data)}</LedgerTd>
                  <LedgerTd>
                    <StatusBadge tom={estado.tom}>{estado.rotulo}</StatusBadge>
                  </LedgerTd>
                  <LedgerTd>
                    <RowMenu
                      ariaLabel="Ações da proposta"
                      itens={[
                        { icone: "visibility", rotulo: "Ver detalhes", onClick: () => onAbrir?.(p) },
                        ...(p.estado === "rascunho"
                          ? [{ icone: "edit", rotulo: "Editar", onClick: () => onEditar?.(p) }]
                          : []),
                        ...(p.estado !== "anulada"
                          ? [{ icone: "block", rotulo: "Anular", danger: true, onClick: () => onAnular?.(p) }]
                          : []),
                      ]}
                    />
                  </LedgerTd>
                </LedgerTr>
              );
            })}
          </tbody>
        </LedgerTable>
        {pag.total === 0 && <LedgerEmpty icone="description">Nenhuma proposta encontrada</LedgerEmpty>}
        <Paginacao {...pag} label="propostas" />
      </Ledger>
    </div>
  );
}
