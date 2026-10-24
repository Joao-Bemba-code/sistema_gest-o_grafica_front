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

const FILTRO_VAZIO = { cliente: "", prazo: "", estado: "" };

const META_ESTADO = {
  nova: { rotulo: "Nova", tom: "info" },
  producao: { rotulo: "Em produção", tom: "warning" },
  concluida: { rotulo: "Concluída", tom: "success" },
};

const OPCOES_ESTADO = [
  { value: "nova", label: "Nova" },
  { value: "producao", label: "Em produção" },
  { value: "concluida", label: "Concluída" },
];

const OPCOES_PRAZO = [
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "atrasadas", label: "Atrasadas" },
  { value: "sem_prazo", label: "Sem prazo" },
];

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT");
}

// A encomenda aprovada gera uma OP. Sem OP (ou a aguardar) é nova; em
// produção enquanto a OP está a ser trabalhada; concluída no fim da produção.
function estadoEncomenda(o) {
  const op = o.ordem_producao;
  if (!op) return "nova";
  if (op.estado === "finalizado" || op.estado === "entregue") return "concluida";
  if (op.estado === "em_producao") return "producao";
  return "nova";
}

function prazoDe(o) {
  return o.ordem_producao?.data_entrega || null;
}

function dentroDoPrazo(o, filtro) {
  if (filtro === "sem_prazo") return !prazoDe(o);
  const data = prazoDe(o);
  if (!data) return false;
  const limite = new Date(data);
  if (isNaN(limite.getTime())) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  limite.setHours(0, 0, 0, 0);

  if (filtro === "atrasadas") return limite < hoje && estadoEncomenda(o) !== "concluida";
  if (filtro === "mes") {
    return limite.getFullYear() === hoje.getFullYear() && limite.getMonth() === hoje.getMonth() && limite >= hoje;
  }
  if (filtro === "semana") {
    const fim = new Date(hoje);
    fim.setDate(fim.getDate() + (7 - fim.getDay()));
    return limite >= hoje && limite <= fim;
  }
  return true;
}

export default function EncomendasTab({ encomendas = [], onAbrir }) {
  const [rascunho, setRascunho] = useState(FILTRO_VAZIO);
  const [aplicado, setAplicado] = useState(FILTRO_VAZIO);

  const clientes = useMemo(() => {
    const mapa = new Map();
    for (const o of encomendas) {
      const id = String(o.cliente_id ?? o.cliente?.id ?? "");
      const nome = o.cliente?.empresa || o.cliente?.nome || "";
      if (id && nome && !mapa.has(id)) mapa.set(id, nome);
    }
    return Array.from(mapa, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, "pt")
    );
  }, [encomendas]);

  const filtradas = useMemo(
    () =>
      encomendas.filter((o) => {
        const clienteId = String(o.cliente_id ?? o.cliente?.id ?? "");
        if (aplicado.cliente && clienteId !== aplicado.cliente) return false;
        if (aplicado.prazo && !dentroDoPrazo(o, aplicado.prazo)) return false;
        if (aplicado.estado && estadoEncomenda(o) !== aplicado.estado) return false;
        return true;
      }),
    [encomendas, aplicado]
  );

  const contagem = useMemo(() => {
    const base = { nova: 0, producao: 0, concluida: 0 };
    for (const o of filtradas) base[estadoEncomenda(o)] += 1;
    return base;
  }, [filtradas]);

  const total = filtradas.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const pag = usePaginacao({ items: filtradas });
  const temFiltro = Boolean(aplicado.cliente || aplicado.prazo || aplicado.estado);

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
          { chave: "nova", icone: "add_shopping_cart", tom: "bg-info/10 text-info" },
          { chave: "producao", icone: "precision_manufacturing", tom: "bg-warning/10 text-warning" },
          { chave: "concluida", icone: "task_alt", tom: "bg-success/10 text-success" },
        ].map((k) => (
          <div key={k.chave} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${k.tom}`}>
              <Icon name={k.icone} className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">
                {k.chave === "nova" ? "Novas" : META_ESTADO[k.chave].rotulo}
              </p>
              <p className="text-2xl font-black leading-tight tracking-tight text-foreground tabular-nums">{contagem[k.chave]}</p>
            </div>
          </div>
        ))}
      </div>

      <Ledger rotulo="Encomendas ledger">
        <LedgerHeader
          titulo="Encomendas"
          subtitulo={`${filtradas.length} encomendas · ${formatKz(total)}`}
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

            <label className="flex min-w-36 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prazo</span>
              <select
                value={rascunho.prazo}
                onChange={(e) => setRascunho((f) => ({ ...f, prazo: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {OPCOES_PRAZO.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
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
              <LedgerTh>Pedido</LedgerTh>
              <LedgerTh>Cliente</LedgerTh>
              <LedgerTh>Prazo</LedgerTh>
              <LedgerTh>Valor</LedgerTh>
              <LedgerTh>Estado</LedgerTh>
              <LedgerTh className="w-10" />
            </tr>
          </thead>
          <tbody>
            {pag.visiveis.map((o) => {
              const estado = estadoEncomenda(o);
              const meta = META_ESTADO[estado];
              return (
                <LedgerTr key={o.id} onClick={() => onAbrir?.(o)}>
                  <LedgerTd className="max-w-40">
                    <IdCell
                      id={o.numero || `#${o.id}`}
                      meta={o.ordem_producao?.numero || "Sem OP"}
                      aoAbrir={() => onAbrir?.(o)}
                    />
                  </LedgerTd>
                  <LedgerTd className="max-w-56">
                    <span className="block truncate text-sm">{o.cliente?.empresa || o.cliente?.nome || "—"}</span>
                    {o.cliente?.empresa && o.cliente?.nome && (
                      <span className="block truncate text-xs text-muted-foreground">{o.cliente.nome}</span>
                    )}
                  </LedgerTd>
                  <LedgerTd className="text-muted-foreground">
                    {prazoDe(o) ? formatData(prazoDe(o)) : (o.prazoExecucao || "—")}
                  </LedgerTd>
                  <LedgerTd className="font-bold tabular-nums text-foreground">{formatKz(o.total)}</LedgerTd>
                  <LedgerTd>
                    <StatusBadge tom={meta.tom}>{meta.rotulo}</StatusBadge>
                  </LedgerTd>
                  <LedgerTd>
                    <RowMenu
                      ariaLabel="Ações da encomenda"
                      itens={[
                        { icone: "visibility", rotulo: "Ver detalhes", onClick: () => onAbrir?.(o) },
                      ]}
                    />
                  </LedgerTd>
                </LedgerTr>
              );
            })}
          </tbody>
        </LedgerTable>
        {pag.total === 0 && <LedgerEmpty icone="pending_actions">Nenhuma encomenda encontrada</LedgerEmpty>}
        <Paginacao {...pag} label="encomendas" />
      </Ledger>
    </div>
  );
}
