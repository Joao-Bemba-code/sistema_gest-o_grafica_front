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

const FILTRO_VAZIO = { cliente: "", documento: "", estado: "" };

const TIPOS_DOC = {
  fatura: "Fatura",
  factura_recibo: "Factura Recibo",
  recibo: "Recibo",
  proforma: "Proforma",
  nota_credito: "Nota de crédito",
};

const META_ESTADO = {
  paga: { rotulo: "Paga", tom: "success" },
  emitida: { rotulo: "Emitida", tom: "info" },
  parcial: { rotulo: "Parcial", tom: "warning" },
  vencida: { rotulo: "Vencida", tom: "error" },
  cancelada: { rotulo: "Anulada", tom: "neutral" },
};

const OPCOES_ESTADO = [
  { value: "emitida", label: "Emitida" },
  { value: "paga", label: "Paga" },
  { value: "parcial", label: "Parcial" },
  { value: "vencida", label: "Vencida" },
  { value: "cancelada", label: "Anulada" },
];

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

function valorDe(f) {
  return Number(f.total ?? f.valor ?? 0);
}

function pagoDe(f) {
  return Number(f.valor_pago ?? 0);
}

// Encomenda de origem: a ordem de produção quando existe; senão o orçamento
// que lhe deu origem.
function encomendaDe(f) {
  const op = f.ordem_producao;
  if (op) return op.numero || `OP #${op.id}`;
  const orc = f.orcamento;
  if (orc) return orc.numero || `ORC #${orc.id}`;
  return "—";
}

export default function FaturacaoTab({ faturas = [], todasFaturas = [], orcamentos = [], onAbrir }) {
  const [rascunho, setRascunho] = useState(FILTRO_VAZIO);
  const [aplicado, setAplicado] = useState(FILTRO_VAZIO);

  const clientes = useMemo(() => {
    const mapa = new Map();
    for (const f of faturas) {
      const id = String(f.cliente_id ?? f.cliente?.id ?? "");
      const nome = f.cliente?.empresa || f.cliente?.nome || "";
      if (id && nome && !mapa.has(id)) mapa.set(id, nome);
    }
    return Array.from(mapa, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, "pt")
    );
  }, [faturas]);

  const documentos = useMemo(() => {
    const tipos = new Set(faturas.map((f) => f.tipo).filter(Boolean));
    return Array.from(tipos)
      .map((value) => ({ value, label: TIPOS_DOC[value] || value }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt"));
  }, [faturas]);

  const filtradas = useMemo(
    () =>
      faturas.filter((f) => {
        const clienteId = String(f.cliente_id ?? f.cliente?.id ?? "");
        if (aplicado.cliente && clienteId !== aplicado.cliente) return false;
        if (aplicado.documento && f.tipo !== aplicado.documento) return false;
        if (aplicado.estado && f.estado !== aplicado.estado) return false;
        return true;
      }),
    [faturas, aplicado]
  );

  // Orçamentos aprovados que ainda não têm fatura ativa (anuladas não contam).
  // Usa-se a lista completa de faturas, para não contar como "por facturar"
  // uma encomenda já facturada noutro mês.
  const porFacturar = useMemo(() => {
    const faturados = new Set();
    for (const f of todasFaturas.length ? todasFaturas : faturas) {
      if (f.estado === "cancelada") continue;
      if (f.orcamento_id) faturados.add(Number(f.orcamento_id));
      for (const id of Array.isArray(f.orcamentos_ids) ? f.orcamentos_ids : []) faturados.add(Number(id));
    }
    return orcamentos
      .filter((o) => o.estado === "aprovado" && !faturados.has(Number(o.id)))
      .filter((o) => !aplicado.cliente || String(o.cliente_id ?? o.cliente?.id ?? "") === aplicado.cliente)
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
  }, [faturas, todasFaturas, orcamentos, aplicado.cliente]);

  const facturado = filtradas
    .filter((f) => f.estado !== "cancelada")
    .reduce((s, f) => s + valorDe(f), 0);

  const pendencias = filtradas
    .filter((f) => !["paga", "cancelada"].includes(f.estado))
    .reduce((s, f) => s + Math.max(valorDe(f) - pagoDe(f), 0), 0);

  const pag = usePaginacao({ items: filtradas });
  const temFiltro = Boolean(aplicado.cliente || aplicado.documento || aplicado.estado);

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
          { chave: "porFacturar", label: "Por facturar", valor: formatKz(porFacturar), icone: "pending_actions", tom: "bg-warning/10 text-warning" },
          { chave: "facturado", label: "Facturado", valor: formatKz(facturado), icone: "receipt_long", tom: "bg-primary/10 text-primary" },
          { chave: "pendencias", label: "Pendências", valor: formatKz(pendencias), icone: "schedule", tom: "bg-error/10 text-error" },
        ].map((k) => (
          <div key={k.chave} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${k.tom}`}>
              <Icon name={k.icone} className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">{k.label}</p>
              <p className="text-xl font-black leading-tight tracking-tight text-foreground tabular-nums">{k.valor}</p>
            </div>
          </div>
        ))}
      </div>

      <Ledger rotulo="Facturação ledger">
        <LedgerHeader
          titulo="Facturação"
          subtitulo={`${filtradas.length} documentos · ${formatKz(facturado)}`}
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
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Documento</span>
              <select
                value={rascunho.documento}
                onChange={(e) => setRascunho((f) => ({ ...f, documento: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {documentos.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
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
              <LedgerTh>Encomenda</LedgerTh>
              <LedgerTh>Cliente</LedgerTh>
              <LedgerTh>Valor</LedgerTh>
              <LedgerTh>Estado</LedgerTh>
            </tr>
          </thead>
          <tbody>
            {pag.visiveis.map((f) => {
              const meta = META_ESTADO[f.estado] || { rotulo: f.estado || "—", tom: "neutral" };
              return (
                <LedgerTr key={f.id} onClick={() => onAbrir?.(f)}>
                  <LedgerTd className="max-w-44">
                    <IdCell
                      id={f.numero || `#${f.id}`}
                      meta={TIPOS_DOC[f.tipo] || f.tipo || "Documento"}
                      aoAbrir={() => onAbrir?.(f)}
                    />
                  </LedgerTd>
                  <LedgerTd className="text-muted-foreground">{encomendaDe(f)}</LedgerTd>
                  <LedgerTd className="max-w-56">
                    <span className="block truncate text-sm">{f.cliente?.empresa || f.cliente?.nome || "—"}</span>
                    {f.cliente?.empresa && f.cliente?.nome && (
                      <span className="block truncate text-xs text-muted-foreground">{f.cliente.nome}</span>
                    )}
                  </LedgerTd>
                  <LedgerTd className="font-bold tabular-nums text-foreground">{formatKz(valorDe(f))}</LedgerTd>
                  <LedgerTd>
                    <StatusBadge tom={meta.tom}>{meta.rotulo}</StatusBadge>
                  </LedgerTd>
                </LedgerTr>
              );
            })}
          </tbody>
        </LedgerTable>
        {pag.total === 0 && <LedgerEmpty icone="receipt_long">Nenhuma fatura encontrada</LedgerEmpty>}
        <Paginacao {...pag} label="facturas" />
      </Ledger>
    </div>
  );
}
