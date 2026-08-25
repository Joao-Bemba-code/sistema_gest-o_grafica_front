"use client";

import { useState, useEffect, useMemo } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { inputCls } from "@/lib/estoque";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import FilterBar, { useFilter } from "@/components/ui/FilterBar";
import { criarFatura, listarFaturas, exportarFaturas, marcarPaga, buscarFatura, removerFatura } from "@/services/faturacao";
import { listar as listarOrcamentos } from "@/services/orcamentos";
import { listarOrdens } from "@/services/producao";
import { listar as listarClientes } from "@/services/clientes";
import { buscarOrganizacao } from "@/services/configuracoes";
import gerarPDF from "@/lib/faturacaoPdf";

const metodos = {
  dinheiro: { label: "Dinheiro", icon: "payments" },
  transferencia: { label: "Transferência", icon: "account_balance" },
  multicaixa: { label: "Multicaixa", icon: "credit_card" },
  referencia: { label: "Referência", icon: "receipt" },
};

const tiposDoc = {
  fatura: { label: "Fatura", variant: "info" },
  factura_recibo: { label: "Factura Recibo", variant: "success" },
  recibo: { label: "Recibo", variant: "secondary" },
};

const faturaEstados = {
  emitida: { label: "Emitida", variant: "warning" },
  paga: { label: "Paga", variant: "success" },
  parcial: { label: "Parcial", variant: "info" },
  vencida: { label: "Vencida", variant: "destructive" },
  cancelada: { label: "Cancelada", variant: "outline" },
};

const hoje = new Date().toISOString().split("T")[0];
const blankItem = { descricao: "", quantidade: "", preco_unit: "" };
const blankFaturaForm = {
  tipo: "fatura", cliente_id: "", orcamento_id: "", op: "", data_emissao: hoje, data_vencimento: "", iva: 14,
  metodo: "transferencia", itens: [{ ...blankItem }], observacoes: "", valor_pago: "",
};

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

export default function FaturacaoPage() {
  const [faturas, setFaturas] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("faturas");
  const [fatModalOpen, setFatModalOpen] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState(null);
  const [faturaForm, setFaturaForm] = useState(blankFaturaForm);
  const [empresa, setEmpresa] = useState({ nome: "", nif: "", endereco: "", telefone: "", email: "" });
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const { addToast } = useToast();

  const carregarDados = () => {
    Promise.all([listarFaturas(), listarOrdens(), listarClientes({ tipo: "cliente" }), listarOrcamentos(), buscarOrganizacao().catch(() => null)])
      .then(([f, o, c, orcData, emp]) => {
        setFaturas(Array.isArray(f) ? f : f?.data || []);
        setOrdens(Array.isArray(o) ? o : o?.ordens || []);
        setClientes(Array.isArray(c) ? c : c?.data || []);
        setOrcamentos((Array.isArray(orcData) ? orcData : orcData?.data || []).map((o) => ({ ...o, cliente_id: Number(o.cliente_id) || Number(o.cliente?.id) || null })));
        if (emp) setEmpresa(emp);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarDados();
  }, []);


  const filterConfig = useMemo(() => [
    { value: "todas", label: "Todas", icon: "filter_list" },
    ...Object.entries(faturaEstados).map(([k, v]) => ({
      value: k, label: v.label, field: "estado",
      icon: k === "paga" ? "check_circle" : k === "emitida" ? "pending" : k === "vencida" ? "warning" : k === "cancelada" ? "cancel" : "info",
    })),
  ], []);

  const { search, setSearch, activeFilter, setActiveFilter, filtered: filteredFaturasFinal, total } = useFilter({
    items: faturas,
    searchFields: ["numero", "cliente.nome", "cliente.empresa"],
    filterConfig,
  });

  const abrirFatura = async (f) => {
    setSelectedFatura(f);
    try {
      const fresca = await buscarFatura(f.id);
      if (fresca && fresca.id) setSelectedFatura(fresca);
    } catch {
      // mantém os dados já carregados da lista
    }
  };


  const valorDoc = (f) => Number(f.total || f.valor || 0);
  const pagoDoc = (f) => Number(f.valor_pago || f.total || f.valor || 0);

  const totalReceber = faturas.filter((f) => !["paga", "cancelada"].includes(f.estado)).reduce((s, f) => s + valorDoc(f), 0);
  const totalRecebido = faturas.filter((f) => f.estado === "paga").reduce((s, f) => s + pagoDoc(f), 0);
  const totalVencidas = faturas.filter((f) => f.estado === "vencida").reduce((s, f) => s + valorDoc(f), 0);
  const recebidoHoje = faturas.filter((f) => f.estado === "paga" && (f.data_pagamento || f.data_emissao) === hoje).reduce((s, f) => s + pagoDoc(f), 0);

  const clientesMap = {};
  faturas.forEach((f) => {
    const nome = f.cliente?.nome || clientes.find((c) => c.id === f.cliente_id)?.nome || "—";
    if (nome === "—") return;
    if (!clientesMap[nome]) clientesMap[nome] = { nome, total: 0, faturas: 0 };
    clientesMap[nome].total += valorDoc(f);
    clientesMap[nome].faturas += 1;
  });
  const topClientes = Object.values(clientesMap).sort((a, b) => b.total - a.total).slice(0, 5);

  const faturaSubtotal = faturaForm.itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.preco_unit) || 0), 0);
  const faturaIva = (faturaSubtotal * (Number(faturaForm.iva) || 0)) / 100;
  const faturaTotal = faturaSubtotal + faturaIva;
  const faturaPago = Number(faturaForm.valor_pago) || 0;
  const faturaDivida = faturaForm.tipo === "factura_recibo" ? 0 : Math.max(0, faturaTotal - faturaPago);

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
        valor_pago: faturaForm.tipo === "factura_recibo" ? undefined : Number(faturaForm.valor_pago) || 0,
        observacoes: faturaForm.observacoes,
      });
      setFaturas((prev) => [criado, ...prev]);
      setFaturaForm(blankFaturaForm);
      setFatModalOpen(false);
      addToast("Fatura registada com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  const handleMarcarPaga = async (f, valorPago) => {
    try {
      const atual = await marcarPaga(f.id, { valor_pago: Number(valorPago) || undefined, metodo: f.metodo_pagamento || "transferencia" });
      setFaturas((prev) => prev.map((x) => (x.id === f.id ? atual : x)));
      setSelectedFatura(atual);
      addToast(valorPago && Number(valorPago) < Number(f.total || f.valor) ? "Pagamento parcial registado" : "Fatura marcada como paga", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao marcar fatura como paga", "error");
    }
  };

  const [pagamentoExtra, setPagamentoExtra] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const handleRegistarPagamento = async () => {
    const extra = Number(pagamentoExtra) || 0;
    if (extra <= 0) {
      addToast("Informe um valor maior que zero", "error");
      return;
    }
    const total = Number(selectedFatura.total || selectedFatura.valor) || 0;
    const atual = Number(selectedFatura.valor_pago) || 0;
    const novoTotal = atual + extra;
    setRegistrando(true);
    try {
      const atualizada = await marcarPaga(selectedFatura.id, { valor_pago: novoTotal, metodo: selectedFatura.metodo_pagamento || "transferencia" });
      setFaturas((prev) => prev.map((x) => (x.id === selectedFatura.id ? atualizada : x)));
      setSelectedFatura(atualizada);
      setPagamentoExtra("");
      addToast(novoTotal >= total ? "Fatura paga integralmente" : "Pagamento parcial registado", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao registar pagamento", "error");
    } finally {
      setRegistrando(false);
    }
  };

  const confirmarEliminacao = async () => {
    if (!eliminarItem) return;
    setDeletando(true);
    try {
      await removerFatura(eliminarItem.id);
      setFaturas((prev) => prev.filter((f) => f.id !== eliminarItem.id));
      if (selectedFatura?.id === eliminarItem.id) setSelectedFatura(null);
      addToast("Fatura removida com sucesso", "success");
      setEliminarItem(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao remover fatura", "error");
    } finally {
      setDeletando(false);
    }
  };

  const handleExportar = async () => {
    try {
      const blob = await exportarFaturas({ estado: activeFilter === "todas" ? undefined : activeFilter });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `faturas_${hoje}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast("Faturas exportadas com sucesso", "success");
    } catch (err) {
      addToast("Erro ao exportar faturas", "error");
    }
  };

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Faturação</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">{faturas.length} documentos // FAT</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setFatModalOpen(true)} className="bg-primary/20 text-primary border border-primary/50 px-5 py-2 rounded font-mono flex items-center gap-2 hover:bg-primary/30 transition-all text-[11px] uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(128,213,203,0.2)] hover:shadow-[0_0_25px_rgba(128,213,203,0.4)]">
            <Icon name="add" className="text-[16px]" /> Nova Fatura
          </button>
          {faturas.length > 0 && (
            <button onClick={handleExportar} className="bg-surface-variant text-on-surface border border-outline-variant px-4 py-2 rounded font-mono flex items-center gap-2 hover:border-primary hover:text-primary transition-all text-[11px] uppercase tracking-wider">
              <Icon name="download" className="text-[16px]" /> Exportar
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {["faturas", "clientes"].map((t) => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
            <Icon name={t === "faturas" ? "receipt_long" : "groups"} className="text-sm" />
            {t === "faturas" ? "Faturas" : "Clientes"}
          </Button>
        ))}
      </div>

      {tab === "faturas" && (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { label: "Total a Receber", value: formatKz(totalReceber), icon: "paid", iconVariant: "warning" },
              { label: "Total Recebido", value: formatKz(totalRecebido), icon: "payments", iconVariant: "success" },
              { label: "Recebido Hoje", value: formatKz(recebidoHoje), icon: "today", iconVariant: "primary" },
              { label: "Vencidas", value: formatKz(totalVencidas), icon: "warning", iconVariant: "error" },
            ].map((kpi) => (
              <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} iconVariant={kpi.iconVariant} />
            ))}
          </section>

          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Pesquisar por nº fatura, cliente..."
            filters={filterConfig}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            count={total}
            countLabel="faturas"
          />

          <div className="space-y-3">
            {filteredFaturasFinal.map((f) => (
              <Card key={f.id} className="hover-lift cursor-pointer" onClick={() => abrirFatura(f)}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon name="receipt_long" className="text-primary text-[20px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{f.numero}</span>
                          <Badge variant={tiposDoc[f.tipo]?.variant || "outline"} className="text-[10px]">
                            {tiposDoc[f.tipo]?.label || f.tipo}
                          </Badge>
                          <Badge variant={faturaEstados[f.estado]?.variant || "outline"} className="text-[10px]">
                            {faturaEstados[f.estado]?.label || f.estado}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {f.cliente?.nome || "—"}
                          {f.estado === "paga" && f.data_pagamento
                            ? ` • Pago em ${new Date(f.data_pagamento).toLocaleDateString("pt-BR")}`
                            : f.data_vencimento ? ` • Venc: ${new Date(f.data_vencimento).toLocaleDateString("pt-BR")}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-foreground">{formatKz(valorDoc(f))}</p>
                      {f.iva > 0 && <p className="text-[10px] text-muted-foreground">IVA {Number(f.iva)}%</p>}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); gerarPDF(f, empresa); }} title="Baixar PDF"><Icon name="download" className="text-[16px]" /></Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEliminarItem(f); }} title="Remover fatura"><Icon name="delete" className="text-[16px] text-destructive" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredFaturasFinal.length === 0 && (
              <div className="text-center p-12 text-muted-foreground">
                <Icon name="receipt_long" className="text-4xl block mx-auto mb-2 opacity-30" />
                <p className="font-medium">Nenhuma fatura encontrada</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "clientes" && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-bold text-foreground mb-4">Top Clientes por Faturação</h2>
            <div className="space-y-3">
              {topClientes.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{c.nome}</span>
                      <span className="font-bold text-foreground">{formatKz(c.total)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.total / (totalReceber + totalRecebido)) * 100 || 0}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{c.faturas} faturas</span>
                    </div>
                  </div>
                </div>
              ))}
              {topClientes.length === 0 && (
                <p className="text-center p-6 text-muted-foreground">Nenhuma fatura registada</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Modal open={fatModalOpen} onClose={() => { setFaturaForm(blankFaturaForm); setFatModalOpen(false); }} title={faturaForm.tipo === "recibo" ? "Novo Recibo" : faturaForm.tipo === "factura_recibo" ? "Nova Factura Recibo" : "Nova Fatura"} icon="receipt_long" size="2xl"
        footer={<><Button type="button" variant="outline" onClick={() => { setFaturaForm(blankFaturaForm); setFatModalOpen(false); }}>Cancelar</Button><Button type="submit" form="form-fatura">{faturaForm.tipo === "recibo" ? "Registar Recibo" : faturaForm.tipo === "factura_recibo" ? "Registar Factura Recibo" : "Registar Fatura"}</Button></>}>
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
      </Modal>

      {selectedFatura && (
        <Modal open={!!selectedFatura} onClose={() => setSelectedFatura(null)} title={`Fatura ${selectedFatura.numero}`} icon="receipt_long" size="lg"
          footer={<>
            <div className="w-full space-y-3">
              {!["paga", "cancelada"].includes(selectedFatura.estado) && selectedFatura.tipo !== "recibo" && (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1 flex-1 min-w-[180px] max-w-[240px]">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor a pagar agora</label>
                    <div className="flex items-center rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
                      <span className="pl-3 pr-1 text-sm font-semibold text-muted-foreground">Kz</span>
                      <NumeroInput
                        value={pagamentoExtra}
                        onChange={(e) => setPagamentoExtra(e.target.value)}
                        className="w-full h-11 px-2 text-sm outline-none bg-transparent"
                        placeholder={String(Math.max(0, Number(selectedFatura.total || selectedFatura.valor) - Number(selectedFatura.valor_pago || 0)))}
                      />
                    </div>
                  </div>
                  <Button onClick={handleRegistarPagamento} disabled={registrando || !pagamentoExtra || Number(pagamentoExtra) <= 0}>
                    <Icon name="payments" className="text-sm" /> {registrando ? "A registar..." : "Registar Pagamento"}
                  </Button>
                  <Button variant="outline" onClick={() => handleMarcarPaga(selectedFatura, Number(selectedFatura.total || selectedFatura.valor))}>
                    Paga Integralmente
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => gerarPDF(selectedFatura, empresa)}><Icon name="download" className="text-sm" /> Baixar PDF</Button>
                <Button type="button" onClick={() => setSelectedFatura(null)}>Fechar</Button>
              </div>
            </div>
          </>}>
          <div className="space-y-5">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-semibold text-foreground truncate">{selectedFatura.cliente?.nome || "—"}</p>
                  {selectedFatura.cliente?.nif && <p className="text-xs text-muted-foreground">NIF: {selectedFatura.cliente.nif}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant={faturaEstados[selectedFatura.estado]?.variant || "outline"} className="text-[10px]">
                    {faturaEstados[selectedFatura.estado]?.label || selectedFatura.estado}
                  </Badge>
                  {selectedFatura.orcamento && (
                    <span className="text-[10px] text-muted-foreground">
                      Origem: <span className="font-semibold text-foreground">{selectedFatura.orcamento.numero || selectedFatura.orcamento.id}</span>
                      {selectedFatura.orcamento.total_com_iva != null && (
                        <span> (Total orçamento: {formatKz(selectedFatura.orcamento.total_com_iva)})</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Emissão</p>
                  <p className="text-sm font-medium text-foreground">{selectedFatura.data_emissao ? new Date(selectedFatura.data_emissao).toLocaleDateString("pt-BR") : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vencimento</p>
                  <p className="text-sm font-medium text-foreground">{selectedFatura.data_vencimento ? new Date(selectedFatura.data_vencimento).toLocaleDateString("pt-BR") : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Método</p>
                  <p className="text-sm font-medium text-foreground">{metodos[selectedFatura.metodo_pagamento]?.label || selectedFatura.metodo_pagamento || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">OP</p>
                  <p className="text-sm font-medium text-foreground">{selectedFatura.ordem_producao?.id || "—"}</p>
                </div>
              </div>
            </div>

            {selectedFatura.itens?.length > 0 && (
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
                      {selectedFatura.itens.map((it, i) => (
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
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium text-foreground">{formatKz(selectedFatura.subtotal)}</span></div>
                {Number(selectedFatura.iva) > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">IVA ({Number(selectedFatura.iva)}%):</span><span className="font-medium text-foreground">{formatKz(selectedFatura.valor_iva)}</span></div>
                )}
                <div className="flex justify-between border-t pt-1.5 font-bold text-sm"><span>Total:</span><span className="text-primary">{formatKz(selectedFatura.total || selectedFatura.valor)}</span></div>
              </div>

              <div className="rounded-xl border bg-emerald-50/50 p-4 space-y-1.5 text-xs">
                <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2 tracking-wider">Pagamento</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor pago:</span><span className="font-semibold text-emerald-700">{formatKz(selectedFatura.valor_pago)}</span></div>
                {Number(selectedFatura.total || selectedFatura.valor) > Number(selectedFatura.valor_pago || 0) && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Em dívida a liquidar:</span><span className="font-semibold text-amber-600">{formatKz(Number(selectedFatura.total || selectedFatura.valor) - Number(selectedFatura.valor_pago || 0))}</span></div>
                )}
                {Number(selectedFatura.total || selectedFatura.valor) <= Number(selectedFatura.valor_pago || 0) && (
                  <p className="pt-1 text-[11px] text-emerald-700">Fatura integralmente paga.</p>
                )}
              </div>
            </div>

            {selectedFatura.observacoes && (
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-wider">Observações</p>
                <p className="text-foreground text-sm">{selectedFatura.observacoes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(eliminarItem)}
        onClose={() => setEliminarItem(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title="Remover fatura"
        description={eliminarItem ? `Tem a certeza que deseja remover a fatura "${eliminarItem.numero}"? Esta ação não pode ser desfeita.` : ""}
      />

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
