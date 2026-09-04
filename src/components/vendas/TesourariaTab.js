"use client";

import { useState, useEffect, useMemo } from "react";
import { listarMovimentos, criarMovimento, removerMovimento, resumoTesouraria, exportarTesouraria } from "@/services/tesouraria";
import { listarContas } from "@/services/contasBancarias";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import FilterBar, { useFilter } from "@/components/ui/FilterBar";
import Modal from "@/components/Modal";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls } from "@/lib/estoque";
import gerarRelatorioTesourariaPdf from "@/lib/tesourariaPdf";
import { ListSkeleton } from "@/components/Skeleton";

const tipoCfg = {
  entrada: { label: "Entrada", variant: "success", icon: "south_west" },
  saida: { label: "Saída", variant: "destructive", icon: "north_east" },
  transferencia: { label: "Transferência", variant: "info", icon: "swap_horiz" },
};

const estadoCfg = {
  confirmado: { label: "Confirmado", variant: "success" },
  pendente: { label: "Pendente", variant: "warning" },
  cancelado: { label: "Cancelado", variant: "secondary" },
};

const metodos = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
  { value: "ordem_saida", label: "Ordem de Saque" },
  { value: "deposito", label: "Depósito" },
  { value: "multicaixa", label: "Multicaixa" },
  { value: "referencia", label: "Referência" },
  { value: "cheque", label: "Cheque" },
];

const categoriasSaida = [
  { value: "compra", label: "Compra" },
  { value: "despesa", label: "Despesa" },
  { value: "salario", label: "Salário" },
  { value: "imposto", label: "Imposto" },
  { value: "aluguel", label: "Aluguel" },
  { value: "utilidades", label: "Utilidades" },
  { value: "levantamento", label: "Levantamento" },
];

const categoriasTransferencia = [
  { value: "transferencia_interna", label: "Transferência Interna" },
];

const initialForm = {
  tipo: "saida",
  categoria: "",
  descricao: "",
  valor: "",
  data_movimento: new Date().toISOString().split("T")[0],
  conta_bancaria_id: "",
  conta_destino_id: "",
  metodo_pagamento: "dinheiro",
  referencia: "",
  observacoes: "",
  cliente_id: "",
};

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export default function TesourariaTab() {
  const [movimentos, setMovimentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [resumo, setResumo] = useState({ saldoTotal: 0, entradasMes: 0, saidasMes: 0, movimentosHoje: 0 });
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [salvando, setSalvando] = useState(false);
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const { addToast } = useToast();

  const carregarResumo = async () => {
    try {
      const data = await resumoTesouraria();
      const r = data?.resumo ?? data ?? {};
      setResumo({
        saldoTotal: r.saldo_total ?? r.saldoTotal ?? 0,
        entradasMes: r.total_entradas ?? r.entradasMes ?? 0,
        saidasMes: r.total_saidas ?? r.saidasMes ?? 0,
        movimentosHoje: r.movimentos_hoje ?? r.movimentosHoje ?? 0,
      });
    } catch {
      setResumo({ saldoTotal: 0, entradasMes: 0, saidasMes: 0, movimentosHoje: 0 });
    }
  };

  const carregarMovimentos = async () => {
    try {
      const data = await listarMovimentos();
      setMovimentos(Array.isArray(data) ? data : data?.data ?? data?.movimentos ?? []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar movimentos", "error");
      setMovimentos([]);
    }
  };

  const carregarContas = async () => {
    try {
      const data = await listarContas();
      setContas(Array.isArray(data) ? data : data?.data ?? data?.contas ?? []);
    } catch {
      setContas([]);
    }
  };

  const carregarTudo = async () => {
    setLoading(true);
    await Promise.all([carregarResumo(), carregarMovimentos(), carregarContas()]);
    setLoading(false);
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    carregarTudo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const filterConfig = useMemo(() => [
    { value: "todos", label: "Todos", icon: "filter_list", count: movimentos.length },
    { value: "saida", label: "Saída", icon: tipoCfg.saida.icon, field: "tipo", count: movimentos.filter((m) => m.tipo === "saida").length },
    { value: "transferencia", label: "Transferência", icon: tipoCfg.transferencia.icon, field: "tipo", count: movimentos.filter((m) => m.tipo === "transferencia").length },
    ...Object.entries(estadoCfg).map(([k, v]) => ({
      value: k, label: v.label, icon: k === "confirmado" ? "check_circle" : k === "pendente" ? "pending" : "cancel", field: "estado",
      count: movimentos.filter((m) => m.estado === k).length,
    })),
  ], [movimentos]);

  const { search, setSearch, activeFilter, setActiveFilter, filtered, total } = useFilter({
    items: movimentos,
    searchFields: ["descricao", "referencia", "categoria"],
    filterConfig,
  });

  const contasPorId = Object.fromEntries(contas.map((c) => [c.id, c]));

  const resumoPorConta = contas.map((c) => {
    const ms = movimentos.filter((m) => m.conta_bancaria_id === c.id);
    const entradas = ms.filter((m) => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor || 0), 0);
    const saidas = ms.filter((m) => m.tipo === "saida" || (m.tipo === "transferencia" && String(m.conta_destino_id) !== String(c.id))).reduce((s, m) => s + Number(m.valor || 0), 0);
    const ultimo = movimentos
      .filter((m) => m.conta_bancaria_id === c.id)
      .sort((a, b) => new Date(b.data_movimento || 0) - new Date(a.data_movimento || 0))[0];
    return { ...c, entradas, saidas, ultimo };
  });

  const abrirNovo = () => {
    setForm(initialForm);
    setModalNovo(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Number(form.valor) || Number(form.valor) <= 0) {
      addToast("Indique um valor válido", "error");
      return;
    }
    if (form.tipo === "transferencia" && !form.conta_destino_id) {
      addToast("Selecione a conta de destino", "error");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        tipo: form.tipo,
        categoria: form.categoria,
        descricao: form.descricao,
        valor: Number(form.valor),
        data_movimento: form.data_movimento,
        conta_bancaria_id: form.conta_bancaria_id || undefined,
        conta_destino_id: form.tipo === "transferencia" ? form.conta_destino_id || undefined : undefined,
        metodo_pagamento: form.metodo_pagamento,
        referencia: form.referencia,
        observacoes: form.observacoes,
        cliente_id: form.cliente_id || undefined,
      };
      await criarMovimento(payload);
      addToast("Movimento registado com sucesso", "success");
      setModalNovo(false);
      setForm(initialForm);
      await Promise.all([carregarResumo(), carregarMovimentos()]);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao registar movimento", "error");
    } finally {
      setSalvando(false);
    }
  };

  const confirmarEliminacao = async () => {
    if (!eliminarItem) return;
    setDeletando(true);
    try {
      await removerMovimento(eliminarItem.id);
      addToast("Movimento removido com sucesso", "success");
      setEliminarItem(null);
      await Promise.all([carregarResumo(), carregarMovimentos()]);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao eliminar movimento", "error");
    } finally {
      setDeletando(false);
    }
  };

  const handleExportar = async () => {
    try {
      const blob = await exportarTesouraria();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `tesouraria_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast("Movimentos exportados com sucesso", "success");
    } catch {
      addToast("Erro ao exportar movimentos", "error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-sans text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Icon name="savings" className="text-primary text-[22px]" /> Tesouraria
          </h2>
          <p className="text-primary mt-0.5 font-mono text-[10px] uppercase tracking-widest">
            {movimentos.length} movimentos · {formatKz(resumo.saldoTotal)} — TESOURARIA
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportar} disabled={movimentos.length === 0} className="bg-surface-variant text-on-surface border border-outline-variant px-4 py-2 rounded font-mono flex items-center gap-2 hover:border-primary hover:text-primary transition-all text-[11px] uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none">
            <Icon name="download" className="text-[16px]" /> Exportar CSV
          </button>
          <button onClick={abrirNovo} className="bg-primary/20 text-primary border border-primary/50 px-5 py-2 rounded font-mono flex items-center gap-2 hover:bg-primary/30 transition-all text-[11px] uppercase tracking-wider font-bold ">
            <Icon name="add" className="text-[16px]" /> Novo Movimento
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard icon="account_balance" label="Saldo Total" value={formatKz(resumo.saldoTotal)} iconVariant="primary" />
        <KpiCard icon="trending_up" label="Entradas do Mês" value={formatKz(resumo.entradasMes)} iconVariant="success" />
        <KpiCard icon="trending_down" label="Saídas do Mês" value={formatKz(resumo.saidasMes)} iconVariant="error" />
        <KpiCard icon="today" label="Movimentos Hoje" value={resumo.movimentosHoje} iconVariant="info" />
      </section>

      {resumoPorConta.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {resumoPorConta.map((c) => (
            <Card key={c.id} className="hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon name="account_balance" className="text-primary text-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{c.banco_nome || "Conta"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.numero_conta ? `Conta ${c.numero_conta}` : "—"}{c.iban ? ` · ${c.iban}` : ""}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-foreground">{formatKz(c.saldo_atual)}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Saldo</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-emerald-500/10 p-2.5">
                    <p className="text-[9px] font-bold text-emerald-700 uppercase">Entradas</p>
                    <p className="text-sm font-bold text-emerald-700">{formatKz(c.entradas)}</p>
                  </div>
                  <div className="rounded-lg bg-error/10 p-2.5">
                    <p className="text-[9px] font-bold text-error uppercase">Saídas</p>
                    <p className="text-sm font-bold text-error">{formatKz(c.saidas)}</p>
                  </div>
                </div>
                {c.ultimo && (
                  <p className="text-[10px] text-muted-foreground mt-3 truncate">
                    Último: <span className="font-semibold text-foreground">{c.ultimo.descricao}</span> · {formatKz(c.ultimo.valor)} · {formatData(c.ultimo.data_movimento)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Pesquisar por descrição, referência ou categoria..."
        filters={filterConfig}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        count={total}
        countLabel="movimentos"
      />

      {loading ? <ListSkeleton count={6} /> : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const tc = tipoCfg[m.tipo] || { label: m.tipo, variant: "outline", icon: "swap_horiz" };
            const ec = estadoCfg[m.estado] || { label: m.estado, variant: "outline" };
            const isEntrada = m.tipo === "entrada";
            const isSaida = m.tipo === "saida";
            const conta = contasPorId[m.conta_bancaria_id];
            return (
              <Card key={m.id} className="hover-lift">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isEntrada ? "bg-emerald-500/10" : isSaida ? "bg-error/10" : "bg-primary/10"}`}>
                        <Icon name={tc.icon} className={`text-[20px] ${isEntrada ? "text-emerald-600" : isSaida ? "text-error" : "text-primary"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={tc.variant} className="text-[10px]">
                            <Icon name={tc.icon} className="text-[10px] mr-1" /> {tc.label}
                          </Badge>
                          <Badge variant={ec.variant} className="text-[10px]">{ec.label}</Badge>
                          <span className="font-bold text-sm text-foreground truncate">{m.descricao || m.categoria || "—"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {m.categoria || "—"}
                          {conta ? ` • ${conta.banco_nome || ""}${conta.numero_conta ? ` (${conta.numero_conta})` : ""}` : ""}
                          {m.metodo_pagamento ? ` • ${m.metodo_pagamento}` : ""}
                          {m.referencia ? ` • Ref: ${m.referencia}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <p className={`text-lg font-bold ${isEntrada ? "text-emerald-600" : isSaida ? "text-error" : "text-foreground"}`}>
                          {isEntrada ? "+" : isSaida ? "−" : ""}{formatKz(m.valor)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{formatData(m.data_movimento || m.data)}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setEliminarItem(m)} title="Remover"><Icon name="delete" className="text-[16px] text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center p-12 text-muted-foreground">
              <Icon name="savings" className="text-4xl block mx-auto mb-2 opacity-30" />
              <p className="font-medium">Nenhum movimento encontrado</p>
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalNovo}
        onClose={() => { setModalNovo(false); setForm(initialForm); }}
        title="Novo Movimento"
        icon="add_card"
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => { setModalNovo(false); setForm(initialForm); }}>Cancelar</Button>
            <Button type="submit" form="form-tesouraria" loading={salvando}>Registar Movimento</Button>
          </>
        }
      >
        <form id="form-tesouraria" onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo de Movimento *</label>
            <div className="grid grid-cols-3 gap-2">
              {[tipoCfg.saida, tipoCfg.transferencia].map((v) => (
                <button key={v.label} type="button" onClick={() => {
                  const novoTipo = v.label === "Saída" ? "saida" : "transferencia";
                  setForm((prev) => ({ ...prev, tipo: novoTipo, categoria: "", conta_destino_id: "" }));
                }}
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-xs font-bold ${
                    form.tipo === (v.label === "Saída" ? "saida" : "transferencia")
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-muted/50 text-muted-foreground"
                  }`}>
                  <Icon name={v.icon} className="text-lg" />
                  {v.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">As entradas são registadas automaticamente quando uma fatura é paga.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data do Movimento *</label>
              <input required name="data_movimento" type="date" value={form.data_movimento} onChange={handleChange} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor (Kz) *</label>
              <NumeroInput required name="valor" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} className={inputCls} placeholder="Ex: 250000" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Categoria</label>
              <select name="categoria" value={form.categoria} onChange={handleChange} className={inputCls}>
                <option value="">Selecione uma categoria</option>
                {(form.tipo === "saida" ? categoriasSaida : categoriasTransferencia).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Método de Pagamento *</label>
              <select name="metodo_pagamento" value={form.metodo_pagamento} onChange={handleChange} className={inputCls}>
                {metodos.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição *</label>
              <input required name="descricao" value={form.descricao} onChange={handleChange} className={inputCls} placeholder="Ex: Pagamento da fatura nº 1005" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Conta Bancária</label>
              <select name="conta_bancaria_id" value={form.conta_bancaria_id} onChange={handleChange} className={inputCls}>
                <option value="">Selecione a conta</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome || c.banco || c.numero || c.id}</option>
                ))}
              </select>
            </div>
            {form.tipo === "transferencia" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Conta de Destino *</label>
                <select name="conta_destino_id" value={form.conta_destino_id} onChange={handleChange} className={inputCls}>
                  <option value="">Selecione a conta destino</option>
                  {contas.filter((c) => String(c.id) !== String(form.conta_bancaria_id)).map((c) => (
                    <option key={c.id} value={c.id}>{c.nome || c.banco || c.numero || c.id}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Referência</label>
              <input name="referencia" value={form.referencia} onChange={handleChange} className={inputCls} placeholder="Ex: Nº do documento" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">ID do Cliente (opcional)</label>
              <input name="cliente_id" value={form.cliente_id} onChange={handleChange} className={inputCls} placeholder="Ex: 123" />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</label>
              <textarea name="observacoes" rows={3} value={form.observacoes} onChange={handleChange} className={inputCls} placeholder="Notas adicionais..." />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(eliminarItem)}
        onClose={() => setEliminarItem(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title="Eliminar movimento"
        description={eliminarItem ? `Tem a certeza que deseja eliminar o movimento "${eliminarItem.descricao || eliminarItem.categoria || eliminarItem.id}"? Esta ação não pode ser desfeita.` : ""}
      />
    </div>
  );
}
