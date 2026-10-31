"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { ListSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import {
  Ledger,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import RowMenu from "@/components/ui/RowMenu";
import { listarOrdens } from "@/services/producao";
import { atualizar as atualizarOrcamento } from "@/services/orcamentos";
import gerarGuiaEntregaPdf from "@/lib/entregasPdf";
import EncomendaDetalhesModal from "@/components/vendas/EncomendaDetalhesModal";

const FILTRO_VAZIO = { cliente: "", estado: "", prazo: "" };

// A encomenda é o acompanhamento do orçamento aprovado: a ordem de produção
// nasce no módulo de Produção (ligada ao orçamento), por isso aqui só se
// reflecte o que a produção e a facturação já fizeram àquele orçamento.
const META_ESTADO = {
  nova: { rotulo: "Por produzir", tom: "neutral" },
  producao: { rotulo: "Em produção", tom: "warning" },
  pronta: { rotulo: "Pronta para entrega", tom: "info" },
  entregue: { rotulo: "Entregue", tom: "success" },
  facturada: { rotulo: "Facturada", tom: "success" },
};

const OPCOES_ESTADO = [
  { value: "nova", label: "Por produzir" },
  { value: "producao", label: "Em produção" },
  { value: "pronta", label: "Pronta para entrega" },
  { value: "entregue", label: "Entregue" },
  { value: "facturada", label: "Facturada" },
];

const OPCOES_PRAZO = [
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "atrasadas", label: "Atrasadas" },
  { value: "sem_prazo", label: "Sem prazo" },
];

const META_FATURA = {
  paga: { label: "Paga", tom: "success" },
  emitida: { label: "Emitida", tom: "info" },
  parcial: { label: "Parcial", tom: "warning" },
  vencida: { label: "Vencida", tom: "error" },
  cancelada: { label: "Anulada", tom: "neutral" },
};

const PESO_ESTADO = { nova: 0, producao: 1, pronta: 2, entregue: 3, facturada: 4 };

// Etapas do processo de produção — a mesma lógica do módulo de Produção.
const PROCESSO_LABEL = {
  pre_impressao: "Pré-Impressão",
  impressao: "Impressão",
  acabamento: "Acabamento",
  qualidade: "Qualidade",
  entrega: "Entrega",
};

function processoDe(op) {
  if (op.estado === "entregue" || op.entrega_ok) return "entrega";
  if (op.qualidade_ok) return "qualidade";
  if (op.acabamento_ok) return "acabamento";
  if (op.impressao_ok) return "impressao";
  return "pre_impressao";
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

function formatData(v) {
  if (!v) return "—";
  const texto = String(v).slice(0, 10);
  const [ano, mes, dia] = texto.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT");
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dataEntregaDe(op) {
  const v = op?.data_entrega || op?.dataEntrega;
  if (!v) return null;
  const texto = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

function entregue(op) {
  return Boolean(op && (op.estado === "entregue" || op.entrega_ok));
}

function dentroDoPrazo(entrega, atrasada, filtro, hoje) {
  if (filtro === "sem_prazo") return !entrega;
  if (filtro === "atrasadas") return atrasada;
  if (!entrega) return false;
  const limite = new Date(`${entrega}T00:00:00`);
  const agora = new Date(`${hoje}T00:00:00`);
  if (filtro === "mes") {
    return limite.getFullYear() === agora.getFullYear() && limite.getMonth() === agora.getMonth() && limite >= agora;
  }
  if (filtro === "semana") {
    const fim = new Date(agora);
    fim.setDate(fim.getDate() + (7 - fim.getDay()));
    return limite >= agora && limite <= fim;
  }
  return true;
}

export default function EncomendasTab({ orcamentos = [], faturas = [], empresa = {}, onAbrirOrcamento, onVerFatura, onAtualizar }) {
  const { addToast } = useToast();
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [gerandoId, setGerandoId] = useState(null);
  const [marcandoId, setMarcandoId] = useState(null);
  const [detalheId, setDetalheId] = useState(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await listarOrdens();
        if (ativo) setOrdens(Array.isArray(dados) ? dados : dados?.data ?? []);
      } catch (err) {
        if (ativo) addToast(err.response?.data?.erro || "Erro ao carregar a produção", "error");
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [addToast]);

  const opPorOrcamento = useMemo(() => {
    const mapa = new Map();
    for (const op of ordens || []) {
      if (op.orcamento_id) mapa.set(String(op.orcamento_id), op);
    }
    return mapa;
  }, [ordens]);

  // Melhor fatura por orçamento: ligação directa (orcamento_id ou a lista de
  // orçamentos da fatura) ou através da ordem de produção.
  const faturaPorOrcamento = useMemo(() => {
    const mapa = new Map();
    const melhor = (chave, f) => {
      const atual = mapa.get(chave);
      if (!atual) {
        mapa.set(chave, f);
        return;
      }
      const atualAnulada = atual.estado === "cancelada";
      const novaAnulada = f.estado === "cancelada";
      if (atualAnulada && !novaAnulada) mapa.set(chave, f);
      else if (!atualAnulada && !novaAnulada && Number(f.id) > Number(atual.id)) mapa.set(chave, f);
    };
    for (const f of faturas || []) {
      if (f.orcamento_id) melhor(`orc:${f.orcamento_id}`, f);
      if (Array.isArray(f.orcamentos_ids)) {
        for (const oid of f.orcamentos_ids) if (oid) melhor(`orc:${oid}`, f);
      }
      const opId = f.ordem_producao_id || f.ordem_producao?.id;
      if (opId) melhor(`op:${opId}`, f);
    }
    return mapa;
  }, [faturas]);

  const base = useMemo(() => {
    const hoje = hojeISO();
    const rows = (orcamentos || [])
      .filter((o) => o.estado === "aprovado")
      .map((o) => {
        const op = opPorOrcamento.get(String(o.id)) || o.ordem_producao || null;
        const fatura = faturaPorOrcamento.get(`orc:${o.id}`) || (op ? faturaPorOrcamento.get(`op:${op.id}`) : null) || null;
        const entrega = dataEntregaDe(op) || dataEntregaDe(o);
        const estado = fatura
          ? "facturada"
          : o.entrega_ok || entregue(op)
            ? "entregue"
            : !op
              ? "nova"
              : op.estado === "finalizado"
                ? "pronta"
                : "producao";
        return {
          orcamento: o,
          _op: op,
          _fatura: fatura,
          _estado: estado,
          _entrega: entrega,
          _atrasada: Boolean(entrega && entrega < hoje && !fatura && !o.entrega_ok && !entregue(op)),
          _emissao: o.data || o.createdAt,
          _valor: Number(o.total || 0),
          _cliente: o.cliente || null,
        };
      });

    rows.sort((a, b) => {
      if (a._atrasada !== b._atrasada) return a._atrasada ? -1 : 1;
      const pa = PESO_ESTADO[a._estado] ?? 9;
      const pb = PESO_ESTADO[b._estado] ?? 9;
      if (pa !== pb) return pa - pb;
      const da = String(a._entrega || "9999-12-31");
      const db = String(b._entrega || "9999-12-31");
      if (da !== db) return da.localeCompare(db);
      return String(a._cliente?.empresa || a._cliente?.nome || "").localeCompare(
        String(b._cliente?.empresa || b._cliente?.nome || ""),
        "pt"
      );
    });
    return rows;
  }, [orcamentos, opPorOrcamento, faturaPorOrcamento]);

  const clientes = useMemo(() => {
    const mapa = new Map();
    for (const o of base) {
      const id = String(o.orcamento?.cliente_id ?? o._cliente?.id ?? "");
      const nome = o._cliente?.empresa || o._cliente?.nome || "";
      if (id && nome && !mapa.has(id)) mapa.set(id, nome);
    }
    return Array.from(mapa, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, "pt")
    );
  }, [base]);

  const filtradas = useMemo(() => {
    const hoje = hojeISO();
    return base.filter((o) => {
      const clienteId = String(o.orcamento?.cliente_id ?? o._cliente?.id ?? "");
      if (filtro.cliente && clienteId !== filtro.cliente) return false;
      if (filtro.estado && o._estado !== filtro.estado) return false;
      if (filtro.prazo && !dentroDoPrazo(o._entrega, o._atrasada, filtro.prazo, hoje)) return false;
      return true;
    });
  }, [base, filtro]);

  const contagem = useMemo(() => {
    const total = { producao: 0, entregue: 0, facturada: 0, atrasadas: 0 };
    for (const o of filtradas) {
      if (o._estado === "producao") total.producao += 1;
      if (o._estado === "entregue") total.entregue += 1;
      if (o._estado === "facturada") total.facturada += 1;
      if (o._atrasada) total.atrasadas += 1;
    }
    return total;
  }, [filtradas]);

  const pag = usePaginacao({ items: filtradas, tamanhoInicial: 10 });

  const temFiltro = Boolean(filtro.cliente || filtro.estado || filtro.prazo);
  const limpar = () => setFiltro(FILTRO_VAZIO);

  const campoCls =
    "h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/25";

  const baixarGuia = async (o) => {
    if (gerandoId || (!o._op && !o.orcamento.entrega_ok)) return;
    const pseudoOp = o._op
      ? o._op
      : {
          id: null,
          numero: o.orcamento.numero || `KORC-${o.orcamento.id}`,
          estado: "entregue",
          entrega_ok: true,
          data_entrega: o._entrega || o.orcamento.data_entrega,
          cliente: o._cliente || {},
          produto: o.orcamento.especificacao?.produto || o.orcamento.produto || "",
        };
    setGerandoId(o._op ? o._op.id : o.orcamento.id);
    try {
      await gerarGuiaEntregaPdf(
        {
          ...pseudoOp,
          cliente: pseudoOp.cliente || o._cliente || {},
          orcamentoDados: { numero: o.orcamento.numero, data: o.orcamento.data || o.orcamento.createdAt },
        },
        empresa || {},
        o._fatura || null
      );
    } catch (err) {
      addToast(err?.message || "Erro ao gerar a guia de entrega", "error");
    } finally {
      setGerandoId(null);
    }
  };

  const marcarEntregue = async (row) => {
    if (marcandoId || !row) return;
    const o = row.orcamento;
    setMarcandoId(o.id);
    try {
      await atualizarOrcamento(o.id, { entrega_ok: true, data_entrega: hojeISO() });
      addToast(`Encomenda ${o.numero || o.id} marcada como entregue`, "success");
      await onAtualizar?.();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao marcar como entregue", "error");
    } finally {
      setMarcandoId(null);
    }
  };

  // A ficha aberta deriva sempre da linha actual: depois de marcar como
  // entregue, o orçamento é recarregado e a ficha mostra logo "Entregue".
  const detalhe = useMemo(
    () => (detalheId != null ? base.find((r) => r.orcamento.id === detalheId) || null : null),
    [base, detalheId]
  );

  const kpis = [
    { label: "Em produção", valor: contagem.producao, icone: "precision_manufacturing", tom: "bg-warning/10 text-warning" },
    { label: "Atrasadas", valor: contagem.atrasadas, icone: "warning", tom: "bg-error/10 text-error" },
    { label: "Entregues", valor: contagem.entregue, icone: "task_alt", tom: "bg-success/10 text-success" },
    { label: "Facturadas", valor: contagem.facturada, icone: "receipt_long", tom: "bg-info/10 text-info" },
  ];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo das encomendas">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${k.tom}`}>
              <Icon name={k.icone} className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-black leading-tight tracking-tight text-foreground tabular-nums">{k.valor}</p>
            </div>
          </div>
        ))}
      </section>

      <Ledger rotulo="Encomendas">
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Filtros</p>
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex min-w-40 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Cliente</span>
              <select
                value={filtro.cliente}
                onChange={(e) => setFiltro((f) => ({ ...f, cliente: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {clientes.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-40 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Estado</span>
              <select
                value={filtro.estado}
                onChange={(e) => setFiltro((f) => ({ ...f, estado: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {OPCOES_ESTADO.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-36 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Prazo</span>
              <select
                value={filtro.prazo}
                onChange={(e) => setFiltro((f) => ({ ...f, prazo: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {OPCOES_PRAZO.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>

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

        {loading ? (
          <div className="p-4"><ListSkeleton count={6} /></div>
        ) : (
          <>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh>Código</LedgerTh>
                  <LedgerTh>Cliente</LedgerTh>
                  <LedgerTh>Emissão</LedgerTh>
                  <LedgerTh>Estado</LedgerTh>
                  <LedgerTh>Entrega</LedgerTh>
                  <LedgerTh>Fatura</LedgerTh>
                  <LedgerTh>Valor</LedgerTh>
                  <LedgerTh className="w-10" />
                </tr>
              </thead>
              <tbody>
                {pag.visiveis.map((o) => {
                  const meta = META_ESTADO[o._estado];
                  const fat = o._fatura;
                  const fatMeta = fat ? META_FATURA[fat.estado] || { label: fat.estado, tom: "neutral" } : null;
                  const etapa =
                    o._estado === "producao" && o._op
                      ? o._op.estado === "aguardando"
                        ? "Em preparação"
                        : PROCESSO_LABEL[processoDe(o._op)]
                      : null;
                  return (
                    <LedgerTr key={o.orcamento.id} onClick={() => setDetalheId(o.orcamento.id)}>
                      <LedgerTd className="max-w-44">
                        <IdCell
                          id={o.orcamento.numero || `#${o.orcamento.id}`}
                          meta={o._op ? `OP ${o._op.numero}` : "Sem OP"}
                          aoAbrir={() => setDetalheId(o.orcamento.id)}
                        />
                      </LedgerTd>
                      <LedgerTd className="max-w-56">
                        <span className="block truncate text-sm">{o._cliente?.empresa || o._cliente?.nome || "—"}</span>
                        {(o.orcamento.responsavel || (o._cliente?.empresa && o._cliente?.nome)) && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {o.orcamento.responsavel || o._cliente?.nome}
                          </span>
                        )}
                      </LedgerTd>
                      <LedgerTd className="whitespace-nowrap text-muted-foreground">{formatData(o._emissao)}</LedgerTd>
                      <LedgerTd>
                        <StatusBadge tom={meta.tom}>{meta.rotulo}</StatusBadge>
                        {etapa && (
                          <span className="mt-1 block text-[11px] text-muted-foreground">{etapa}</span>
                        )}
                      </LedgerTd>
                      <LedgerTd>
                        <span className={`block whitespace-nowrap tabular-nums ${o._atrasada ? "font-semibold text-error" : "text-muted-foreground"}`}>
                          {formatData(o._entrega)}
                        </span>
                        {o._atrasada && (
                          <span className="block text-[11px] font-semibold text-error">Atrasada</span>
                        )}
                      </LedgerTd>
                      <LedgerTd className="max-w-40">
                        {fat ? (
                          <IdCell
                            id={fat.numero || `#${fat.id}`}
                            meta={fatMeta.label}
                            aoAbrir={() => onVerFatura?.(fat)}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem fatura</span>
                        )}
                      </LedgerTd>
                      <LedgerTd className="whitespace-nowrap font-bold tabular-nums text-foreground">{formatKz(o._valor)}</LedgerTd>
                      <LedgerTd>
                        <RowMenu
                          ariaLabel="Ações da encomenda"
                          itens={[
                            { icone: "visibility", rotulo: "Ver detalhes", onClick: () => setDetalheId(o.orcamento.id) },
                            ...(o._op || o.orcamento.entrega_ok
                              ? [{ icone: "picture_as_pdf", rotulo: "Ficha de entrega (PDF)", onClick: () => baixarGuia(o) }]
                              : []),
                            ...(!o._op && !o._fatura && !o.orcamento.entrega_ok
                              ? [{ icone: "task_alt", rotulo: "Marcar como entregue", onClick: () => marcarEntregue(o) }]
                              : []),
                          ]}
                        />
                      </LedgerTd>
                    </LedgerTr>
                  );
                })}
              </tbody>
            </LedgerTable>

            {filtradas.length === 0 && (
              <LedgerEmpty icone="pending_actions">
                {base.length === 0
                  ? "Ainda não há encomendas — aprove um orçamento para criar uma"
                  : "Nenhuma encomenda corresponde aos filtros escolhidos"}
              </LedgerEmpty>
            )}

            <Paginacao {...pag} label="encomendas" />
          </>
        )}
      </Ledger>

      <EncomendaDetalhesModal
        key={detalheId ?? "fechada"}
        encomenda={detalhe}
        marcando={detalhe ? marcandoId === detalhe.orcamento.id : false}
        onClose={() => setDetalheId(null)}
        onMarcarEntregue={marcarEntregue}
        onAbrirOrcamento={onAbrirOrcamento}
        onAbrirFatura={onVerFatura}
      />
    </div>
  );
}
