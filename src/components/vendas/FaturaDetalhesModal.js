"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { marcarPaga, buscarFatura, anexarFicheirosFatura, abrirAnexoFatura, removerAnexoFatura } from "@/services/faturacao";
import { listarContas } from "@/services/contasBancarias";
import gerarPDF from "@/lib/faturacaoPdf";

const metodos = {
  dinheiro: { label: "Dinheiro", icon: "payments" },
  transferencia: { label: "Transferência", icon: "account_balance" },
  ordem_saida: { label: "Ordem de Saque", icon: "receipt_long" },
  deposito: { label: "Depósito", icon: "savings" },
  multicaixa: { label: "Multicaixa", icon: "credit_card" },
  referencia: { label: "Referência", icon: "receipt" },
  cheque: { label: "Cheque", icon: "description" },
};

const faturaEstados = {
  em_analise: { label: "Em análise", variant: "info" },
  emitida: { label: "Emitida", variant: "warning" },
  paga: { label: "Paga", variant: "success" },
  parcial: { label: "Parcial", variant: "info" },
  vencida: { label: "Vencida", variant: "destructive" },
  cancelada: { label: "Cancelada", variant: "outline" },
};

const TABS = [
  { key: "documento", label: "01 Documento", icon: "description" },
  { key: "itens", label: "02 Itens", icon: "list" },
  { key: "pagamento", label: "03 Pagamento", icon: "payments" },
  { key: "anexos", label: "04 Anexos", icon: "attach_file" },
];

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

export default function FaturaDetalhesModal({ fatura, empresa, onClose, onChanged }) {
  const { addToast } = useToast();
  const [tab, setTab] = useState("documento");
  const [pagamentoExtra, setPagamentoExtra] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [contas, setContas] = useState([]);
  const [contaPagamento, setContaPagamento] = useState("");
  const [aplicarDesconto, setAplicarDesconto] = useState(false);
  const [anexos, setAnexos] = useState([]);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnexos(Array.isArray(fatura?.anexos) ? fatura.anexos : []);
  }, [fatura]);

  useEffect(() => {
    if (!fatura) return;
    setAplicarDesconto(false);
    let ativo = true;
    listarContas()
      .then((c) => {
        if (!ativo) return;
        const lista = Array.isArray(c) ? c : [];
        setContas(lista);
        const fav = lista.find((x) => x.favorita) || lista[0];
        setContaPagamento(fav ? String(fav.id) : "");
      })
      .catch(() => {});
    return () => { ativo = false; };
  }, [fatura]);

  if (!fatura) return null;
  const f = fatura;

  const contaIdSelecionada = (() => {
    if (contaPagamento) return Number(contaPagamento);
    return Number(f.conta_bancaria_id) || null;
  })();

  const handleMarcarPaga = async (valorPago) => {
    try {
      const atual = await marcarPaga(f.id, { valor_pago: Number(valorPago) || undefined, metodo: f.metodo_pagamento || "transferencia", conta_bancaria_id: contaIdSelecionada, aplicar_desconto: aplicarDesconto });
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
      const atualizada = await marcarPaga(f.id, { valor_pago: novoTotal, metodo: f.metodo_pagamento || "transferencia", conta_bancaria_id: contaIdSelecionada, aplicar_desconto: aplicarDesconto });
      onChanged?.(atualizada);
      setPagamentoExtra("");
      addToast(novoTotal >= total ? "Fatura paga integralmente" : "Pagamento parcial registado", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao registar pagamento", "error");
    } finally {
      setRegistrando(false);
    }
  };

  const atualizarAnexos = async () => {
    try {
      const fresca = await buscarFatura(f.id);
      if (fresca?.id) {
        setAnexos(Array.isArray(fresca.anexos) ? fresca.anexos : []);
        onChanged?.(fresca);
      }
    } catch {
      // silencioso: mantém o que já tinha
    }
  };

  const handleAnexar = async (e) => {
    const ficheiros = Array.from(e.target.files || []);
    if (!ficheiros.length) return;
    setEnviandoAnexo(true);
    try {
      await anexarFicheirosFatura(f.id, ficheiros);
      addToast?.("Documento(s) anexado(s) para aprovação", "success");
      await atualizarAnexos();
    } catch (err) {
      addToast?.(err?.response?.data?.erro || "Erro ao anexar documento", "error");
    } finally {
      setEnviandoAnexo(false);
      e.target.value = "";
    }
  };

  const handleRemoverAnexo = async (anexoId) => {
    try {
      await removerAnexoFatura(anexoId);
      setAnexos((prev) => prev.filter((a) => a.id !== anexoId));
      addToast?.("Anexo removido", "success");
    } catch (err) {
      addToast?.(err?.response?.data?.erro || "Erro ao remover anexo", "error");
    }
  };

  const id = (sufixo) => `form-fatura-ficha-${sufixo}`;

  return (
    <Modal open={Boolean(f)} onClose={onClose} title={`Fatura ${f.numero}`} icon="receipt_long" size="xl"
      footer={<>
        {!["paga", "cancelada", "em_analise"].includes(f.estado) && f.tipo !== "recibo" && (
          <div className="w-full flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-[180px] max-w-[240px]">
              <label className="text-[11px] font-medium text-muted-foreground">Valor a pagar agora</label>
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
            <div className="flex flex-col gap-1 flex-1 min-w-[160px] max-w-[220px]">
              <label className="text-[11px] font-medium text-muted-foreground">Conta bancária</label>
              <select
                value={contaPagamento}
                onChange={(e) => setContaPagamento(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Sem conta</option>
                {contas.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.banco_nome}{c.numero_conta ? ` · ${c.numero_conta}` : ""}</option>
                ))}
              </select>
            </div>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-border px-3 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={aplicarDesconto}
                onChange={(e) => setAplicarDesconto(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Aplicar desconto por pagamento antecipado
            </label>
            <Button onClick={handleRegistarPagamento} disabled={registrando || !pagamentoExtra || Number(pagamentoExtra) <= 0}>
              <Icon name="payments" className="text-sm" /> {registrando ? "A registar..." : "Registar Pagamento"}
            </Button>
            <Button variant="outline" onClick={() => handleMarcarPaga(Number(f.total || f.valor))}>
              Paga Integralmente
            </Button>
          </div>
        )}
        <div className="w-full flex flex-wrap items-center justify-end gap-3 mt-3">
          <Button type="button" variant="outline" onClick={() => gerarPDF(f, empresa || {})}><Icon name="download" className="text-sm" /> Baixar PDF</Button>
          <Button type="button" onClick={onClose}>Fechar</Button>
        </div>
      </>}>
      <div className="space-y-5">
        <div role="tablist" aria-label="Secções da fatura" className="flex gap-2 flex-wrap bg-muted/60 border border-border p-1.5 rounded-full">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              aria-controls={`${id("painel")}-${t.key}`}
              id={id(`tab-${t.key}`)}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${tab === t.key ? "nav-pill text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name={t.icon} className="text-lg" />
              <span className="hidden md:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Altura fixa: o modal nunca muda de tamanho ao trocar de secção */}
        <div role="tabpanel" id={`${id("painel")}-${tab}`} aria-labelledby={id(`tab-${tab}`)} className="h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {tab === "documento" && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground">Cliente</p>
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
                    <p className="text-[11px] font-medium text-muted-foreground">Emissão</p>
                    <p className="text-sm font-medium text-foreground">{f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-BR") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Vencimento</p>
                    <p className="text-sm font-medium text-foreground">{f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString("pt-BR") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Método</p>
                    <p className="text-sm font-medium text-foreground">{metodos[f.metodo_pagamento]?.label || f.metodo_pagamento || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">OP</p>
                    <p className="text-sm font-medium text-foreground">{f.ordem_producao?.id || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "itens" && (
            <div>
              {f.itens?.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2 font-bold text-muted-foreground">Descrição</th>
                        <th className="text-center px-3 py-2 font-bold text-muted-foreground">Qtd</th>
                        <th className="text-right px-3 py-2 font-bold text-muted-foreground">Valor Unit.</th>
                        <th className="text-right px-3 py-2 font-bold text-muted-foreground">Total</th>
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
              ) : (
                <p className="px-3 py-2.5 rounded-xl border border-dashed border-input text-[11px] text-muted-foreground bg-muted/30">
                  Sem itens registados.
                </p>
              )}
            </div>
          )}

          {tab === "pagamento" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4 space-y-1.5 text-xs">
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">Resumo</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium text-foreground">{formatKz(f.subtotal)}</span></div>
                  {Number(f.iva) > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">IVA ({Number(f.iva)}%):</span><span className="font-medium text-foreground">{formatKz(f.valor_iva)}</span></div>
                  )}
                  <div className="flex justify-between border-t pt-1.5 font-bold text-sm"><span>Total:</span><span className="text-primary">{formatKz(f.total || f.valor)}</span></div>
                </div>

                <div className="rounded-xl border bg-emerald-50/50 p-4 space-y-1.5 text-xs">
                  <p className="text-[11px] font-medium text-emerald-700 mb-2">Pagamento</p>
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
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">Observações</p>
                  <p className="text-foreground text-sm">{f.observacoes}</p>
                </div>
              )}
            </div>
          )}

          {tab === "anexos" && (
            <div className="space-y-4">
              {f.estado === "em_analise" && (
                <div className="rounded-xl border border-info/30 bg-info/10 p-3 text-xs text-info">
                  <p className="font-semibold">Fatura em análise</p>
                  <p className="mt-0.5 text-muted-foreground">Anexe os documentos de suporte. A fatura só é emitida depois de validada na Tesouraria.</p>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Anexar documento (PDF ou imagem, até 10 MB)</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleAnexar}
                  disabled={enviandoAnexo}
                  className="text-xs"
                />
                {enviandoAnexo && <p className="text-[10px] text-muted-foreground">A enviar...</p>}
              </div>
              {anexos.length === 0 ? (
                <p className="rounded-xl border border-dashed border-input px-3 py-4 text-center text-[11px] text-muted-foreground bg-muted/30">
                  Sem documentos anexados.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {anexos.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card px-3 py-2">
                      <button
                        type="button"
                        onClick={() => abrirAnexoFatura(a.id).catch(() => addToast?.("Erro ao abrir anexo", "error"))}
                        className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground hover:text-primary"
                        title={a.nome_original}
                      >
                        <Icon name="attach_file" className="text-sm text-primary" />
                        <span className="truncate">{a.nome_original}</span>
                      </button>
                      <Button type="button" variant="ghost" size="sm" className="text-error" onClick={() => handleRemoverAnexo(a.id)}>
                        <Icon name="close" className="text-sm" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
