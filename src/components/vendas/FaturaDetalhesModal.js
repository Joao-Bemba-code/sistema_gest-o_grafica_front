"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { marcarPaga } from "@/services/faturacao";
import gerarPDF from "@/lib/faturacaoPdf";

const metodos = {
  dinheiro: { label: "Dinheiro", icon: "payments" },
  transferencia: { label: "Transferência", icon: "account_balance" },
  multicaixa: { label: "Multicaixa", icon: "credit_card" },
  referencia: { label: "Referência", icon: "receipt" },
};

const faturaEstados = {
  emitida: { label: "Emitida", variant: "warning" },
  paga: { label: "Paga", variant: "success" },
  parcial: { label: "Parcial", variant: "info" },
  vencida: { label: "Vencida", variant: "destructive" },
  cancelada: { label: "Cancelada", variant: "outline" },
};

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

export default function FaturaDetalhesModal({ fatura, empresa, onClose, onChanged, onEliminar }) {
  const { addToast } = useToast();
  const [pagamentoExtra, setPagamentoExtra] = useState("");
  const [registrando, setRegistrando] = useState(false);

  if (!fatura) return null;
  const f = fatura;

  const handleMarcarPaga = async (valorPago) => {
    try {
      const atual = await marcarPaga(f.id, { valor_pago: Number(valorPago) || undefined, metodo: f.metodo_pagamento || "transferencia" });
      onChanged?.(atual);
      addToast(valorPago && Number(valorPago) < Number(f.total || f.valor) ? "Pagamento parcial registado" : "Fatura marcada como paga", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao marcar fatura como paga", "error");
    }
  };

  const handleRegistarPagamento = async () => {
    const extra = Number(pagamentoExtra) || 0;
    if (extra <= 0) {
      addToast("Informe um valor maior que zero", "error");
      return;
    }
    const total = Number(f.total || f.valor) || 0;
    const atual = Number(f.valor_pago) || 0;
    const novoTotal = atual + extra;
    setRegistrando(true);
    try {
      const atualizada = await marcarPaga(f.id, { valor_pago: novoTotal, metodo: f.metodo_pagamento || "transferencia" });
      onChanged?.(atualizada);
      setPagamentoExtra("");
      addToast(novoTotal >= total ? "Fatura paga integralmente" : "Pagamento parcial registado", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao registar pagamento", "error");
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <Modal open={Boolean(f)} onClose={onClose} title={`Fatura ${f.numero}`} icon="receipt_long" size="lg"
      footer={<>
        {!["paga", "cancelada"].includes(f.estado) && f.tipo !== "recibo" && (
          <div className="w-full flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-[180px] max-w-[240px]">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor a pagar agora</label>
              <div className="flex items-center rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
                <span className="pl-3 pr-1 text-sm font-semibold text-muted-foreground">Kz</span>
                <NumeroInput
                  value={pagamentoExtra}
                  onChange={(e) => setPagamentoExtra(e.target.value)}
                  className="w-full h-11 px-2 text-sm outline-none bg-transparent"
                  placeholder={String(Math.max(0, Number(f.total || f.valor) - Number(f.valor_pago || 0)))}
                />
              </div>
            </div>
            <Button onClick={handleRegistarPagamento} disabled={registrando || !pagamentoExtra || Number(pagamentoExtra) <= 0}>
              <Icon name="payments" className="text-sm" /> {registrando ? "A registar..." : "Registar Pagamento"}
            </Button>
            <Button variant="outline" onClick={() => handleMarcarPaga(Number(f.total || f.valor))}>
              Paga Integralmente
            </Button>
          </div>
        )}
        <div className="w-full flex flex-wrap items-center justify-end gap-3 mt-3">
          {f.tipo !== "recibo" && (
            <Button type="button" variant="outline" onClick={() => onEliminar(f)} className="text-error hover:text-error"><Icon name="delete" className="text-sm" /> Remover</Button>
          )}
          <Button type="button" variant="outline" onClick={() => gerarPDF(f, empresa || {})}><Icon name="download" className="text-sm" /> Baixar PDF</Button>
          <Button type="button" onClick={onClose}>Fechar</Button>
        </div>
      </>}>
      <div className="space-y-5">
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cliente</p>
              <p className="text-sm font-semibold text-foreground truncate">{f.cliente?.nome || "—"}</p>
              {f.cliente?.nif && <p className="text-xs text-muted-foreground">NIF: {f.cliente.nif}</p>}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge variant={faturaEstados[f.estado]?.variant || "outline"} className="text-[10px]">
                {faturaEstados[f.estado]?.label || f.estado}
              </Badge>
              {f.orcamento && (
                <span className="text-[10px] text-muted-foreground">
                  Origem: <span className="font-semibold text-foreground">{f.orcamento.numero || f.orcamento.id}</span>
                  {f.orcamento.total_com_iva != null && (
                    <span> (Total orçamento: {formatKz(f.orcamento.total_com_iva)})</span>
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Emissão</p>
              <p className="text-sm font-medium text-foreground">{f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-BR") : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vencimento</p>
              <p className="text-sm font-medium text-foreground">{f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString("pt-BR") : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Método</p>
              <p className="text-sm font-medium text-foreground">{metodos[f.metodo_pagamento]?.label || f.metodo_pagamento || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">OP</p>
              <p className="text-sm font-medium text-foreground">{f.ordem_producao?.id || "—"}</p>
            </div>
          </div>
        </div>

        {f.itens?.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-wider">Itens</h3>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-bold text-muted-foreground uppercase">Descrição</th>
                    <th className="text-center px-3 py-2 font-bold text-muted-foreground uppercase">Qtd</th>
                    <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Valor Unit.</th>
                    <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {f.itens.map((it, i) => (
                    <tr key={i} className="border-b border-border/20">
                      <td className="px-3 py-2 text-foreground">{it.descricao}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{it.quantidade}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{formatKz(it.preco_unit)}</td>
                      <td className="px-3 py-2 text-right font-bold text-foreground">{formatKz(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-4 space-y-1.5 text-xs">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-wider">Resumo</p>
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium text-foreground">{formatKz(f.subtotal)}</span></div>
            {Number(f.iva) > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">IVA ({Number(f.iva)}%):</span><span className="font-medium text-foreground">{formatKz(f.valor_iva)}</span></div>
            )}
            <div className="flex justify-between border-t pt-1.5 font-bold text-sm"><span>Total:</span><span className="text-primary">{formatKz(f.total || f.valor)}</span></div>
          </div>

          <div className="rounded-xl border bg-emerald-50/50 p-4 space-y-1.5 text-xs">
            <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2 tracking-wider">Pagamento</p>
            <div className="flex justify-between"><span className="text-muted-foreground">Valor pago:</span><span className="font-semibold text-emerald-700">{formatKz(f.valor_pago)}</span></div>
            {Number(f.total || f.valor) > Number(f.valor_pago || 0) && (
              <div className="flex justify-between"><span className="text-muted-foreground">Em dívida a liquidar:</span><span className="font-semibold text-amber-600">{formatKz(Number(f.total || f.valor) - Number(f.valor_pago || 0))}</span></div>
            )}
            {Number(f.total || f.valor) <= Number(f.valor_pago || 0) && (
              <p className="pt-1 text-[11px] text-emerald-700">Fatura integralmente paga.</p>
            )}
          </div>
        </div>

        {f.observacoes && (
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-wider">Observações</p>
            <p className="text-foreground text-sm">{f.observacoes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}