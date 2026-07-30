"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { listar, criar } from "@/services/faturacao";
import { listarOrdens } from "@/services/producao";

const metodos = {
  dinheiro: { label: "Dinheiro", icon: "payments" },
  transferencia: { label: "Transferência", icon: "account_balance" },
  multicaixa: { label: "Multicaixa", icon: "credit_card" },
  referencia: { label: "Referência", icon: "receipt" },
};

const estadoVariants = { pago: "success", parcial: "warning", em_divida: "destructive" };
const initialPagamento = { cliente: "", op: "", valor: "", metodo: "transferencia", referencia: "", data: new Date().toISOString().split("T")[0] };

export default function FaturacaoPage() {
  const [pagamentos, setPagamentos] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("pagamentos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [pagModalOpen, setPagModalOpen] = useState(false);
  const [pagForm, setPagForm] = useState(initialPagamento);
  const { addToast } = useToast();

  const filtered = filtroEstado === "todos" ? pagamentos : pagamentos.filter((p) => p.estado === filtroEstado);
  const totalReceber = pagamentos.reduce((s, p) => s + p.valor, 0);
  const totalPago = pagamentos.filter((p) => p.estado === "pago").reduce((s, p) => s + p.valor, 0);
  const totalDivida = pagamentos.filter((p) => p.estado === "em_divida").reduce((s, p) => s + p.valor, 0);

  const clientesMap = {};
  pagamentos.forEach((p) => {
    if (!clientesMap[p.cliente]) clientesMap[p.cliente] = { nome: p.cliente, total: 0, pedidos: 0 };
    clientesMap[p.cliente].total += p.valor;
    clientesMap[p.cliente].pedidos += 1;
  });
  const topClientes = Object.values(clientesMap).sort((a, b) => b.total - a.total).slice(0, 5);

  useEffect(() => {
    Promise.all([listar(), listarOrdens()]).then(([p, o]) => {
      setPagamentos(Array.isArray(p) ? p : p?.data || []);
      setOrdens(Array.isArray(o) ? o : o?.ordens || []);
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const handleSubmitPag = async (e) => {
    e.preventDefault();
    try {
      await criar({ ...pagForm, valor: Number(pagForm.valor), data_pagamento: pagForm.data, metodo: pagForm.metodo });
      setPagamentos(prev => [{ ...pagForm, id: Date.now(), estado: "pago", valor: Number(pagForm.valor), metodo: pagForm.metodo }, ...prev]);
      setPagForm(initialPagamento); setPagModalOpen(false);
      addToast("Pagamento registado com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Faturação</h1>
          <p className="text-xs text-muted-foreground mt-1">{pagamentos.length} registos financeiros</p>
        </div>
        <Button onClick={() => setPagModalOpen(true)}><Icon name="add" className="text-lg" /> Novo Pagamento</Button>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[
          { label: "Total a Receber", value: `Kz ${(totalReceber ?? 0).toLocaleString()}`, icon: "payments" },
          { label: "Total Pago", value: `Kz ${(totalPago ?? 0).toLocaleString()}`, icon: "check_circle" },
          { label: "Em Dívida", value: `Kz ${(totalDivida ?? 0).toLocaleString()}`, icon: "warning", danger: true },
          { label: "Ordens em Aberto", value: ordens.filter(o => o.status !== "entregue" && o.status !== "finalizado").length, icon: "pending" },
        ].map((kpi) => (
          <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} {...(kpi.danger ? { iconClass: "!bg-destructive/10 !text-destructive", valueClass: "!text-destructive" } : {})} />
        ))}
      </section>

      <div className="flex gap-2">
        {["pagamentos", "clientes"].map((t) => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
            <Icon name={t === "pagamentos" ? "receipt_long" : "groups"} className="text-sm" />
            {t === "pagamentos" ? "Pagamentos" : "Clientes"}
          </Button>
        ))}
      </div>

      {tab === "pagamentos" && (
        <>
          <div className="flex gap-2 flex-wrap">
            {["todos", "pago", "parcial", "em_divida"].map((f) => (
              <Button key={f} variant={filtroEstado === f ? "default" : "outline"} size="sm" onClick={() => setFiltroEstado(f)}>
                {f === "todos" ? "Todos" : f === "em_divida" ? "Em Dívida" : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((p, i) => (
              <Card key={p.id || i} className="hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon name={metodos[p.metodo]?.icon || "payments"} className="text-primary text-[20px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{p.cliente}</span>
                          <Badge variant={estadoVariants[p.estado] || "outline"} className="text-[10px]">
                            {p.estado === "em_divida" ? "Em Dívida" : p.estado?.charAt(0).toUpperCase() + p.estado?.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{metodos[p.metodo]?.label || p.metodo} • {p.data ? new Date(p.data).toLocaleDateString("pt-BR") : "—"}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-foreground">Kz {Number(p.valor).toLocaleString()}</p>
                      {p.referencia && <p className="text-[10px] text-muted-foreground">Ref: {p.referencia}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="text-center p-12 text-muted-foreground">
                <Icon name="receipt_long" className="text-4xl block mx-auto mb-2 opacity-30" />
                <p className="font-medium">Nenhum pagamento encontrado</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "clientes" && (
        <Card>
          <CardHeader>
            <CardTitle>Top Clientes por Faturação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClientes.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{c.nome}</span>
                      <span className="font-bold text-foreground">Kz {c.total.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(c.total / totalReceber) * 100 || 0}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{c.pedidos} pedidos</span>
                    </div>
                  </div>
                </div>
              ))}
              {topClientes.length === 0 && (
                <p className="text-center p-6 text-muted-foreground">Nenhum cliente com pagamentos registados</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Modal open={pagModalOpen} onClose={() => setPagModalOpen(false)} title="Novo Pagamento" icon="payments" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => setPagModalOpen(false)}>Cancelar</Button><Button type="submit" form="form-pagamento">Registar Pagamento</Button></>}>
        <form id="form-pagamento" onSubmit={handleSubmitPag} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente *</label>
              <input required value={pagForm.cliente} onChange={(e) => setPagForm({ ...pagForm, cliente: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Nome do cliente" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor (Kz) *</label>
              <input required type="number" min="1" value={pagForm.valor} onChange={(e) => setPagForm({ ...pagForm, valor: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: 50000" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Método de Pagamento *</label>
              <select required value={pagForm.metodo} onChange={(e) => setPagForm({ ...pagForm, metodo: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                {Object.entries(metodos).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Referência</label>
              <input value={pagForm.referencia} onChange={(e) => setPagForm({ ...pagForm, referencia: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Nº de referência" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data</label>
              <input type="date" value={pagForm.data} onChange={(e) => setPagForm({ ...pagForm, data: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
          </div>
        </form>
      </Modal>

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
