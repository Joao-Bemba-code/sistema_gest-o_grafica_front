"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Ledger";

const META_ESTADO = {
  nova: { rotulo: "Por produzir", tom: "neutral" },
  producao: { rotulo: "Em produção", tom: "warning" },
  pronta: { rotulo: "Pronta para entrega", tom: "info" },
  entregue: { rotulo: "Entregue", tom: "success" },
  facturada: { rotulo: "Facturada", tom: "success" },
};

const OP_ESTADO = {
  aguardando: { label: "Em preparação", tom: "warning" },
  em_producao: { label: "Em produção", tom: "info" },
  finalizado: { label: "Concluída", tom: "success" },
  entregue: { label: "Entregue", tom: "neutral" },
};

const FATURA_ESTADO = {
  paga: { label: "Paga", tom: "success" },
  emitida: { label: "Emitida", tom: "info" },
  parcial: { label: "Parcial", tom: "warning" },
  vencida: { label: "Vencida", tom: "error" },
  cancelada: { label: "Anulada", tom: "neutral" },
};

const PROCESSO_LABEL = {
  pre_impressao: "Pré-Impressão",
  impressao: "Impressão",
  acabamento: "Acabamento",
  qualidade: "Qualidade",
  entrega: "Entrega",
};

const TABS = [
  { key: "orcamento", label: "Orçamento", icon: "request_quote" },
  { key: "producao", label: "Produção", icon: "precision_manufacturing" },
  { key: "entrega", label: "Entrega", icon: "local_shipping" },
  { key: "fatura", label: "Factura", icon: "receipt_long" },
];

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

function Info({ label, value, badge }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2.5">
      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-foreground">
        {badge || (value ? value : <span className="text-muted-foreground">—</span>)}
      </span>
    </div>
  );
}

export default function EncomendaDetalhesModal({
  encomenda,
  marcando = false,
  onClose,
  onMarcarEntregue,
  onAbrirOrcamento,
  onAbrirFatura,
}) {
  const [tab, setTab] = useState("orcamento");
  const row = encomenda;

  if (!row || !row.orcamento) return null;

  const o = row.orcamento;
  const meta = META_ESTADO[row._estado] || META_ESTADO.nova;
  const op = row._op || null;
  const fat = row._fatura || null;
  const opMeta = op ? OP_ESTADO[op.estado] || { label: op.estado, tom: "neutral" } : null;
  const fatMeta = fat ? FATURA_ESTADO[fat.estado] || { label: fat.estado, tom: "neutral" } : null;
  const podeMarcar = !op && !fat && !o.entrega_ok;
  const itens = Array.isArray(o.itens) ? o.itens : [];

  return (
    <Modal
      open={Boolean(row)}
      onClose={onClose}
      title={`Encomenda ${o.numero || o.id}`}
      icon="pending_actions"
      size="lg"
      footer={<>
        {podeMarcar && (
          <Button variant="outline" onClick={() => onMarcarEntregue?.(row)} disabled={marcando}>
            <Icon name="task_alt" className="text-[16px]" /> {marcando ? "A marcar…" : "Marcar como entregue"}
          </Button>
        )}
        <Button variant="outline" onClick={() => { onClose?.(); onAbrirOrcamento?.(o); }}>
          <Icon name="request_quote" className="text-[16px]" /> Abrir orçamento
        </Button>
        {fat && (
          <Button variant="outline" onClick={() => { onClose?.(); onAbrirFatura?.(fat); }}>
            <Icon name="receipt_long" className="text-[16px]" /> Abrir factura
          </Button>
        )}
        <Button onClick={onClose}>Fechar</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-1.5 text-[10px] font-bold text-muted-foreground">Estado da encomenda</p>
            <StatusBadge tom={meta.tom}>{meta.rotulo}</StatusBadge>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-1 text-[10px] font-bold text-muted-foreground">Entrega</p>
            <p className="text-sm font-semibold text-foreground">
              {formatData(row._entrega)}
              {row._atrasada && <span className="ml-2 text-[11px] font-semibold text-error">Atrasada</span>}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-1 text-[10px] font-bold text-muted-foreground">Factura</p>
            {fat ? (
              <p className="text-sm font-semibold text-foreground">
                {fat.numero || `#${fat.id}`}
                {fatMeta && <span className="ml-2 text-[11px] font-semibold text-muted-foreground">{fatMeta.label}</span>}
              </p>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">Sem factura</p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="mb-1 text-[10px] font-bold text-muted-foreground">Valor</p>
            <p className="text-sm font-bold tabular-nums text-foreground">{formatKz(row._valor)}</p>
          </div>
        </div>

        <div role="tablist" aria-label="Secções da encomenda" className="flex gap-2 flex-wrap bg-muted/60 border border-border p-1.5 rounded-full">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${tab === t.key ? "nav-pill text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name={t.icon} className="text-lg" />
              <span className="hidden md:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <div role="tabpanel" aria-label={TABS.find((t) => t.key === tab)?.label} className="animate-fade-up h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {tab === "orcamento" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Info label="Número" value={o.numero || `#${o.id}`} />
                <Info label="Data de emissão" value={formatData(o.data || o.createdAt)} />
                <Info label="Estado" badge={<StatusBadge tom={meta.tom}>{o.estado}</StatusBadge>} />
                <Info label="Responsável" value={o.responsavel} />
                <Info label="Produto" value={o.especificacao?.produto || o.produto} />
                <Info label="Valor total" value={formatKz(row._valor)} />
                <Info label="Prazo de execução" value={o.prazoExecucao} />
                <Info label="Condições de pagamento" value={o.condicoesPagamento} />
              </div>

              {itens.length > 0 && (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2 font-bold text-muted-foreground">Descrição</th>
                        <th className="text-center px-3 py-2 font-bold text-muted-foreground">Qtd</th>
                        <th className="text-right px-3 py-2 font-bold text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((it, i) => (
                        <tr key={i} className="border-b border-border/20">
                          <td className="px-3 py-2 text-foreground">{it.descricao}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{it.quantidade}</td>
                          <td className="px-3 py-2 text-right font-semibold text-foreground">{formatKz(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {o.observacoes && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-muted-foreground mb-1">Observações</p>
                  <p className="text-foreground text-sm">{o.observacoes}</p>
                </div>
              )}
            </div>
          )}

          {tab === "producao" && (
            op ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Info label="Ordem de produção" value={op.numero || `#${op.id}`} />
                  <Info label="Estado da OP" badge={opMeta ? <StatusBadge tom={opMeta.tom}>{opMeta.label}</StatusBadge> : null} />
                  <Info label="Etapa actual" value={PROCESSO_LABEL[processoDe(op)] || "—"} />
                  <Info label="Data de entrada" value={formatData(op.data_entrada || op.dataEntrada)} />
                  <Info label="Produto" value={op.produto} />
                  <Info label="Quantidade" value={op.quantidade} />
                </div>
                <p className="text-xs text-muted-foreground">
                  A ordem de produção é gerida no módulo de Produção — aqui só se acompanha o andamento.
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Icon name="precision_manufacturing" className="text-2xl" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Esta encomenda não vai para produção</p>
                  {podeMarcar ? (
                    <p className="text-xs text-muted-foreground">Pode marcá-la como entregue no rodapé, quando a entrega for feita.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem ordem de produção associada.</p>
                  )}
                </div>
              </div>
            )
          )}

          {tab === "entrega" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Info label="Data de entrega" value={formatData(row._entrega)} />
                <Info
                  label="Situação"
                  badge={
                    row._atrasada
                      ? <StatusBadge tom="error">Atrasada</StatusBadge>
                      : <StatusBadge tom={meta.tom}>{meta.rotulo}</StatusBadge>
                  }
                />
                <Info
                  label="Origem da entrega"
                  value={op ? `Ordem de produção ${op.numero || `#${op.id}`}` : o.entrega_ok ? "Marcada manualmente em Comercial" : ""}
                />
              </div>
              {row._atrasada ? (
                <p className="text-xs font-medium text-error">Esta encomenda está fora do prazo de entrega.</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {op
                    ? "A entrega é registada no módulo de Produção, ao concluir a ordem de produção."
                    : o.entrega_ok
                      ? "Entrega registada manualmente em Comercial."
                      : "Ainda não há entrega registada para esta encomenda."}
                </p>
              )}
            </div>
          )}

          {tab === "fatura" && (
            fat ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Info label="Número" value={fat.numero || `#${fat.id}`} />
                  <Info label="Estado" badge={<StatusBadge tom={fatMeta.tom}>{fatMeta.label}</StatusBadge>} />
                  <Info label="Data de emissão" value={formatData(fat.data_emissao || fat.data)} />
                  <Info label="Vencimento" value={formatData(fat.data_vencimento)} />
                  <Info label="Valor" value={formatKz(fat.total)} />
                  <Info label="Valor pago" value={formatKz(fat.valor_pago)} />
                  <Info label="Método de pagamento" value={fat.metodo_pagamento} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use o botão &quot;Abrir factura&quot; para ver os itens e os pagamentos completos.
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Icon name="receipt_long" className="text-2xl" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Sem factura registada</p>
                  <p className="text-xs text-muted-foreground">A factura é emitida no separador Facturação.</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </Modal>
  );
}
