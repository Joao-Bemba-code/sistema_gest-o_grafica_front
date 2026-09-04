"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { inputCls } from "@/lib/estoque";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { criarFatura } from "@/services/faturacao";
import { listar as listarOrcamentos } from "@/services/orcamentos";
import { listarOrdens } from "@/services/producao";
import { listar as listarClientes } from "@/services/clientes";
import { listarContas } from "@/services/contasBancarias";

const metodos = {
  dinheiro: { label: "Dinheiro", icon: "payments" },
  transferencia: { label: "Transferência", icon: "account_balance" },
  ordem_saida: { label: "Ordem de Saque", icon: "receipt_long" },
  deposito: { label: "Depósito", icon: "savings" },
  multicaixa: { label: "Multicaixa", icon: "credit_card" },
  referencia: { label: "Referência", icon: "receipt" },
  cheque: { label: "Cheque", icon: "description" },
};

const hoje = new Date().toISOString().split("T")[0];
const blankItem = { descricao: "", quantidade: "", preco_unit: "" };
const blankFaturaForm = {
  tipo: "fatura", cliente_id: "", orcamento_id: "", op: "", data_emissao: hoje, data_vencimento: "", iva: 14,
  metodo: "transferencia", conta_bancaria_id: "", itens: [{ ...blankItem }], observacoes: "", valor_pago: "",
};

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

export default function FaturaModal({ open, onClose, onSaved }) {
  const { addToast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [faturaForm, setFaturaForm] = useState(blankFaturaForm);

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    (async () => {
      setCarregando(true);
      setFaturaForm(blankFaturaForm);
      Promise.all([listarClientes({ tipo: "cliente" }), listarOrdens(), listarOrcamentos(), listarContas().catch(() => [])])
        .then(([c, o, orcData, cb]) => {
          if (!ativo) return;
          setClientes(Array.isArray(c) ? c : c?.data || []);
          setOrdens(Array.isArray(o) ? o : o?.ordens || []);
          setOrcamentos((Array.isArray(orcData) ? orcData : orcData?.data || []).map((orc) => ({ ...orc, cliente_id: Number(orc.cliente_id) || Number(orc.cliente?.id) || null })));
          setContas(Array.isArray(cb) ? cb : []);
        })
        .catch((err) => {
          if (ativo) addToast(err.response?.data?.erro || "Erro ao carregar dados", "error");
        })
        .finally(() => {
          if (ativo) setCarregando(false);
        });
    })();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setFaturaItem = (idx, key, val) => {
    setFaturaForm((p) => {
      const itens = [...p.itens];
      itens[idx] = { ...itens[idx], [key]: val };
      return { ...p, itens };
    });
  };

  const addFaturaItem = () => setFaturaForm((p) => ({ ...p, itens: [...p.itens, { ...blankItem }] }));
  const removeFaturaItem = (idx) => setFaturaForm((p) => (p.itens.length <= 1 ? p : { ...p, itens: p.itens.filter((_, i) => i !== idx) }));

  const orcamentosDoCliente = faturaForm.cliente_id
    ? orcamentos.filter((o) => String(o.cliente_id) === String(faturaForm.cliente_id) && (o.estado === "aprovado" || o.estado === "pendente"))
    : orcamentos.filter((o) => o.estado === "aprovado" || o.estado === "pendente");

  const handleOrcamentoSelect = (e) => {
    const id = e.target.value;
    const o = orcamentos.find((x) => String(x.id) === id);
    if (!o) {
      setFaturaForm((p) => ({ ...p, orcamento_id: "" }));
      return;
    }
    setFaturaForm((p) => ({
      ...p,
      orcamento_id: o.id,
      cliente_id: p.cliente_id || o.cliente_id,
      itens: (o.itens || []).length
        ? o.itens.map((it) => ({ descricao: it.descricao || "", quantidade: Number(it.quantidade) || 0, preco_unit: Number(it.preco_unit != null ? it.preco_unit : it.valorUnitario) || 0 }))
        : [{ ...blankItem }],
    }));
  };

  const faturaSubtotal = faturaForm.itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.preco_unit) || 0), 0);
  const faturaIva = (faturaSubtotal * (Number(faturaForm.iva) || 0)) / 100;
  const faturaTotal = faturaSubtotal + faturaIva;
  const faturaPago = Number(faturaForm.valor_pago) || 0;
  const faturaDivida = faturaForm.tipo === "factura_recibo" ? 0 : Math.max(0, faturaTotal - faturaPago);

  const handleSubmitFatura = async (e) => {
    e.preventDefault();
    const itens = faturaForm.itens
      .map((i) => ({ descricao: i.descricao, quantidade: Number(i.quantidade) || 0, preco_unit: Number(i.preco_unit) || 0 }))
      .filter((i) => i.descricao);
    if (!itens.length) {
      addToast("Adicione pelo menos um item à fatura", "error");
      return;
    }
    try {
      const criado = await criarFatura({
        tipo: faturaForm.tipo || "fatura",
        cliente_id: Number(faturaForm.cliente_id) || null,
        orcamento_id: Number(faturaForm.orcamento_id) || null,
        op: Number(faturaForm.op) || null,
        data_emissao: faturaForm.data_emissao,
        data_vencimento: faturaForm.data_vencimento || undefined,
        iva: Number(faturaForm.iva) || 0,
        itens,
        metodo: faturaForm.metodo,
        conta_bancaria_id: Number(faturaForm.conta_bancaria_id) || null,
        valor_pago: faturaForm.tipo === "factura_recibo" ? undefined : Number(faturaForm.valor_pago) || 0,
        observacoes: faturaForm.observacoes,
      });
      onSaved?.(criado);
      onClose();
      addToast("Fatura registada com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  const titulo = faturaForm.tipo === "recibo" ? "Novo Recibo" : faturaForm.tipo === "factura_recibo" ? "Nova Factura Recibo" : "Nova Fatura";
  const botaoRegisto = faturaForm.tipo === "recibo" ? "Registar Recibo" : faturaForm.tipo === "factura_recibo" ? "Registar Factura Recibo" : "Registar Fatura";

  return (
    <Modal open={open} onClose={onClose} title={titulo} icon="receipt_long" size="xl"
      footer={<>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="form-fatura" disabled={carregando}>{carregando ? "A carregar..." : botaoRegisto}</Button>
      </>}>
      {carregando ? (
        <div className="space-y-3" aria-label="A carregar formulário">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <form id="form-fatura" onSubmit={handleSubmitFatura} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo de Documento *</label>
              <select required value={faturaForm.tipo} onChange={(e) => setFaturaForm({ ...faturaForm, tipo: e.target.value, valor_pago: e.target.value === "factura_recibo" ? "" : faturaForm.valor_pago })} className={inputCls}>
                <option value="fatura">Fatura (a receber)</option>
                <option value="recibo">Recibo (pagamento)</option>
                <option value="factura_recibo">Factura Recibo (já paga)</option>
              </select>
              {faturaForm.tipo === "factura_recibo" && (
                <p className="text-[10px] text-amber-600">A Factura Recibo fica automaticamente marcada como paga pelo valor total.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente *</label>
              <select required value={faturaForm.cliente_id} onChange={(e) => setFaturaForm({ ...faturaForm, cliente_id: e.target.value, orcamento_id: "" })} className={inputCls}>
                <option value="">Seleccionar...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome || c.razao_social}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Orçamento</label>
              <select value={faturaForm.orcamento_id || ""} onChange={handleOrcamentoSelect} className={inputCls} disabled={!faturaForm.cliente_id}>
                <option value="">Seleccionar orçamento...</option>
                {orcamentosDoCliente.map((o) => (
                  <option key={o.id} value={o.id}>{o.numero || o.id} — {formatKz(o.total || o.subtotal + o.valorIva)}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ordem de Produção</label>
              <select value={faturaForm.op} onChange={(e) => setFaturaForm({ ...faturaForm, op: e.target.value })} className={inputCls}>
                <option value="">Seleccionar OP...</option>
                {ordens.map((o) => <option key={o.id} value={o.id}>{o.id} — {o.cliente?.nome || o.cliente}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data de Emissão *</label>
              <input required type="date" value={faturaForm.data_emissao} onChange={(e) => setFaturaForm({ ...faturaForm, data_emissao: e.target.value })} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data de Vencimento</label>
              <input type="date" value={faturaForm.data_vencimento} onChange={(e) => setFaturaForm({ ...faturaForm, data_vencimento: e.target.value })} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">IVA (%)</label>
              <NumeroInput value={faturaForm.iva} onChange={(e) => setFaturaForm({ ...faturaForm, iva: e.target.value })} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Método de Pagamento</label>
              <select value={faturaForm.metodo} onChange={(e) => setFaturaForm({ ...faturaForm, metodo: e.target.value })} className={inputCls}>
                {Object.entries(metodos).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Conta Bancária Destino</label>
              <select value={faturaForm.conta_bancaria_id || ""} onChange={(e) => setFaturaForm({ ...faturaForm, conta_bancaria_id: e.target.value })} className={inputCls}>
                <option value="">Seleccionar conta...</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.banco_nome}{c.numero_conta ? ` - ${c.numero_conta}` : ""}</option>)}
              </select>
            </div>
            {faturaForm.tipo !== "factura_recibo" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor Pago Agora</label>
                <NumeroInput value={faturaForm.valor_pago} onChange={(e) => setFaturaForm({ ...faturaForm, valor_pago: e.target.value })} className={inputCls} placeholder="0,00" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Icon name="list" className="text-sm text-primary" /> Itens da Fatura</h3>
              <Button type="button" variant="ghost" size="sm" onClick={addFaturaItem}><Icon name="add_circle" className="text-sm" /> Adicionar Item</Button>
            </div>
            {faturaForm.itens.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-muted/50 rounded-xl p-3">
                <div className="col-span-12 sm:col-span-5 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Descrição *</label>}
                  <input required value={it.descricao} onChange={(e) => setFaturaItem(idx, "descricao", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Descrição do serviço" />
                </div>
                <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Qtd *</label>}
                  <NumeroInput required value={it.quantidade} onChange={(e) => setFaturaItem(idx, "quantidade", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                </div>
                <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Valor Unit. *</label>}
                  <NumeroInput required value={it.preco_unit} onChange={(e) => setFaturaItem(idx, "preco_unit", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                </div>
                <div className="col-span-3 sm:col-span-2 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Total</label>}
                  <div className="px-2.5 py-2 bg-muted border border-input rounded-lg text-xs font-bold text-foreground">{formatKz((Number(it.quantidade) || 0) * (Number(it.preco_unit) || 0))}</div>
                </div>
                <div className="col-span-1 flex justify-center">
                  {faturaForm.itens.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFaturaItem(idx)} title="Remover" className="text-error">
                      <Icon name="close" className="text-sm" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <p>Subtotal: <strong className="text-foreground">{formatKz(faturaSubtotal)}</strong></p>
              {faturaIva > 0 && <p>IVA ({Number(faturaForm.iva) || 0}%): <strong className="text-foreground">{formatKz(faturaIva)}</strong></p>}
              {faturaForm.tipo !== "factura_recibo" && Number(faturaForm.valor_pago) > 0 && (
                <p>Valor pago: <strong className="text-success">{formatKz(faturaForm.valor_pago)}</strong></p>
              )}
              {faturaForm.tipo !== "factura_recibo" && faturaDivida > 0 && (
                <p>Em dívida a liquidar: <strong className="text-warning">{formatKz(faturaDivida)}</strong></p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Total</p>
              <p className="text-lg font-bold text-primary">{formatKz(faturaTotal)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</label>
            <textarea value={faturaForm.observacoes} onChange={(e) => setFaturaForm({ ...faturaForm, observacoes: e.target.value })} rows={2} className={`${inputCls} resize-none`} placeholder="Notas adicionais..." />
          </div>
        </form>
      )}
    </Modal>
  );
}