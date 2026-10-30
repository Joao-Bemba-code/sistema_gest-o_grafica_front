"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { inputCls } from "@/lib/estoque";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { criarFatura, listarFaturas } from "@/services/faturacao";
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
  tipo: "fatura", cliente_id: "", orcamentos_ids: [], op: "", data_emissao: hoje, data_vencimento: "", iva: 14,
  metodo: "transferencia", conta_bancaria_id: "", itens: [{ ...blankItem }], observacoes: "", valor_pago: "",
};

const TABS = [
  { key: "documento", label: "01 Documento", icon: "description" },
  { key: "itens", label: "02 Itens", icon: "list" },
  { key: "pagamento", label: "03 Pagamento", icon: "payments" },
];

const campoCls =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/25";

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function Campo({ label, children, obrigatorio, full }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-medium text-muted-foreground">
        {label} {obrigatorio && <span className="text-destructive" aria-hidden="true">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function FaturaModal({ open, onClose, onSaved }) {
  const { addToast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [contas, setContas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [tab, setTab] = useState("documento");
  const [faturaForm, setFaturaForm] = useState(blankFaturaForm);

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    (async () => {
      setCarregando(true);
      setFaturaForm(blankFaturaForm);
      Promise.all([listarClientes({ tipo: "cliente" }), listarOrdens(), listarOrcamentos(), listarContas().catch(() => []), listarFaturas().catch(() => [])])
        .then(([c, o, orcData, cb, fd]) => {
          if (!ativo) return;
          setClientes(Array.isArray(c) ? c : c?.data || []);
          setOrdens(Array.isArray(o) ? o : o?.ordens || []);
          setOrcamentos((Array.isArray(orcData) ? orcData : orcData?.data || []).map((orc) => ({ ...orc, cliente_id: Number(orc.cliente_id) || Number(orc.cliente?.id) || null })));
          setFaturas(Array.isArray(fd) ? fd : fd?.data || []);
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

  // Orçamentos já ligados a faturas não canceladas (não podem ser facturados de novo).
  const billedIds = useMemo(() => {
    const ids = new Set();
    for (const f of faturas) {
      if (f.estado === "cancelada") continue;
      if (f.orcamento_id) ids.add(Number(f.orcamento_id));
      for (const vid of Array.isArray(f.orcamentos_ids) ? f.orcamentos_ids : []) ids.add(Number(vid));
    }
    return ids;
  }, [faturas]);

  const setFaturaItem = (idx, key, val) => {
    setFaturaForm((p) => {
      const itens = [...p.itens];
      itens[idx] = { ...itens[idx], [key]: val };
      return { ...p, itens };
    });
  };

  const addFaturaItem = () => setFaturaForm((p) => ({ ...p, itens: [...p.itens, { ...blankItem }] }));
  const removeFaturaItem = (idx) => setFaturaForm((p) => (p.itens.length <= 1 ? p : { ...p, itens: p.itens.filter((_, i) => i !== idx) }));

  // Orçamentos do cliente elegíveis: aprovados/pendentes e ainda não facturados.
  const orcamentosDisponiveis = faturaForm.cliente_id
    ? orcamentos.filter((o) => String(o.cliente_id) === String(faturaForm.cliente_id) && (o.estado === "aprovado" || o.estado === "pendente") && !billedIds.has(Number(o.id)))
    : [];

  // Selecciona/desmarca um orçamento e reconstrói os itens a partir da selecção.
  const toggleOrcamento = (o) => {
    setFaturaForm((p) => {
      const idStr = String(o.id);
      const selecionados = p.orcamentos_ids.includes(idStr)
        ? p.orcamentos_ids.filter((x) => x !== idStr)
        : [...p.orcamentos_ids, idStr];
      const itens = orcamentos
        .filter((x) => selecionados.includes(String(x.id)))
        .flatMap((x) => (x.itens || []).map((it) => ({
          descricao: it.descricao || "",
          quantidade: Number(it.quantidade) || 0,
          preco_unit: Number(it.preco_unit != null ? it.preco_unit : it.valorUnitario) || 0,
        })));
      return { ...p, orcamentos_ids: selecionados, itens: itens.length ? itens : [{ ...blankItem }] };
    });
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
        orcamentos_ids: faturaForm.orcamentos_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0),
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

  const id = (sufixo) => `form-fatura-${sufixo}`;

  return (
    <Modal open={open} onClose={onClose} title={titulo} icon="receipt_long" size="2xl"
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
          <div role="tabpanel" id={`${id("painel")}-${tab}`} aria-labelledby={id(`tab-${tab}`)} className="animate-fade-up h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {tab === "documento" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Tipo de Documento" obrigatorio full>
                  <select required value={faturaForm.tipo} onChange={(e) => setFaturaForm({ ...faturaForm, tipo: e.target.value, valor_pago: e.target.value === "factura_recibo" ? "" : faturaForm.valor_pago })} className={campoCls}>
                    <option value="fatura">Fatura (a receber)</option>
                    <option value="recibo">Recibo (pagamento)</option>
                    <option value="factura_recibo">Factura Recibo (já paga)</option>
                  </select>
                  {faturaForm.tipo === "factura_recibo" && (
                    <p className="text-[10px] text-amber-600">A Factura Recibo fica automaticamente marcada como paga pelo valor total.</p>
                  )}
                </Campo>
                <Campo label="Cliente" obrigatorio>
                  <select required value={faturaForm.cliente_id} onChange={(e) => setFaturaForm({ ...faturaForm, cliente_id: e.target.value, orcamentos_ids: [], itens: [{ ...blankItem }] })} className={campoCls}>
                    <option value="">Selecionar...</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome || c.razao_social}</option>)}
                  </select>
                </Campo>
                <Campo label="Ordem de Produção">
                  <select value={faturaForm.op} onChange={(e) => setFaturaForm({ ...faturaForm, op: e.target.value })} className={campoCls}>
                    <option value="">Selecionar OP...</option>
                    {ordens.map((o) => <option key={o.id} value={o.id}>{o.id} — {o.cliente?.nome || o.cliente}</option>)}
                  </select>
                </Campo>
                {faturaForm.cliente_id && (
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Orçamentos do Cliente</span>
                    {orcamentosDisponiveis.length === 0 ? (
                      <p className="px-3 py-2.5 rounded-xl border border-dashed border-input text-[11px] text-muted-foreground bg-muted/30">
                        Sem orçamentos disponíveis (aprovados/pendentes e ainda não facturados).
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-xl border bg-muted/30 p-2">
                        {orcamentosDisponiveis.map((o) => {
                          const marcado = faturaForm.orcamentos_ids.includes(String(o.id));
                          return (
                            <label key={o.id} className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 cursor-pointer transition-colors ${marcado ? "border-primary/60 bg-primary/5" : "bg-background border-input hover:border-primary/40"}`}>
                              <input
                                type="checkbox"
                                className="h-4 w-4 shrink-0 accent-primary cursor-pointer"
                                checked={marcado}
                                onChange={() => toggleOrcamento(o)}
                              />
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs font-semibold text-foreground truncate">{o.numero || o.id} · {formatKz(o.total || o.subtotal + o.valorIva)}</span>
                                <span className="block text-[10px] text-muted-foreground truncate">{(o.itens || []).map((it) => it.descricao).filter(Boolean).join(", ") || "Sem descrição"}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {faturaForm.orcamentos_ids.length > 0 && (
                      <p className="text-[10px] font-medium text-primary">{faturaForm.orcamentos_ids.length} orçamento(s) selecionado(s) — os itens foram somados abaixo.</p>
                    )}
                  </div>
                )}
                <Campo label="Data de Emissão" obrigatorio>
                  <input required type="date" value={faturaForm.data_emissao} onChange={(e) => setFaturaForm({ ...faturaForm, data_emissao: e.target.value })} className={campoCls} />
                </Campo>
                <Campo label="Data de Vencimento">
                  <input type="date" value={faturaForm.data_vencimento} onChange={(e) => setFaturaForm({ ...faturaForm, data_vencimento: e.target.value })} className={campoCls} />
                </Campo>
              </div>
            )}

            {tab === "itens" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-2"><Icon name="list" className="text-sm text-primary" /> Itens da Fatura</span>
                  <Button type="button" variant="ghost" size="sm" onClick={addFaturaItem}><Icon name="add_circle" className="text-sm" /> Adicionar Item</Button>
                </div>
                {faturaForm.itens.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-muted/50 rounded-xl p-3">
                    <div className="col-span-12 sm:col-span-5 flex flex-col gap-1.5">
                      {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Descrição *</span>}
                      <input required value={it.descricao} onChange={(e) => setFaturaItem(idx, "descricao", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Descrição do serviço" />
                    </div>
                    <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                      {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Qtd *</span>}
                      <NumeroInput required value={it.quantidade} onChange={(e) => setFaturaItem(idx, "quantidade", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                    </div>
                    <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                      {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Valor Unit. *</span>}
                      <NumeroInput required value={it.preco_unit} onChange={(e) => setFaturaItem(idx, "preco_unit", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                    </div>
                    <div className="col-span-3 sm:col-span-2 flex flex-col gap-1.5">
                      {idx === 0 && <span className="text-[11px] font-medium text-muted-foreground">Total</span>}
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
            )}

            {tab === "pagamento" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="IVA (%)">
                  <NumeroInput value={faturaForm.iva} onChange={(e) => setFaturaForm({ ...faturaForm, iva: e.target.value })} className={campoCls} />
                </Campo>
                <Campo label="Método de Pagamento">
                  <select value={faturaForm.metodo} onChange={(e) => setFaturaForm({ ...faturaForm, metodo: e.target.value })} className={campoCls}>
                    {Object.entries(metodos).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}
                  </select>
                </Campo>
                <Campo label="Conta Bancária Destino">
                  <select value={faturaForm.conta_bancaria_id || ""} onChange={(e) => setFaturaForm({ ...faturaForm, conta_bancaria_id: e.target.value })} className={campoCls}>
                    <option value="">Selecionar conta...</option>
                    {contas.map((c) => <option key={c.id} value={c.id}>{c.banco_nome}{c.numero_conta ? ` - ${c.numero_conta}` : ""}</option>)}
                  </select>
                </Campo>
                {faturaForm.tipo !== "factura_recibo" && (
                  <Campo label="Valor Pago Agora">
                    <NumeroInput value={faturaForm.valor_pago} onChange={(e) => setFaturaForm({ ...faturaForm, valor_pago: e.target.value })} className={campoCls} placeholder="0,00" />
                  </Campo>
                )}
                <Campo label="Observações" full>
                  <textarea value={faturaForm.observacoes} onChange={(e) => setFaturaForm({ ...faturaForm, observacoes: e.target.value })} rows={2} className={`${campoCls} h-auto resize-none py-2.5`} placeholder="Notas adicionais..." />
                </Campo>
                <div className="sm:col-span-2 bg-muted/50 rounded-xl p-4 flex items-center justify-between">
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
                    <p className="text-[10px] text-muted-foreground font-bold">Total</p>
                    <p className="text-lg font-bold text-primary">{formatKz(faturaTotal)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-destructive">* Campos de preenchimento obrigatório</p>
        </form>
      )}
    </Modal>
  );
}
