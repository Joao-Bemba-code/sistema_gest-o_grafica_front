"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";

const samplePagamentos = [
  { id: "FAT-001", data: "2024-05-20", cliente: "João Matos", op: "OP-2024-001", valor: 15200, metodo: "transferencia", referencia: "REF-78945", estado: "pago" },
  { id: "FAT-002", data: "2024-05-18", cliente: "Ana Ferreira", op: "OP-2024-003", valor: 5200, metodo: "dinheiro", referencia: "", estado: "pago" },
  { id: "FAT-003", data: "2024-05-21", cliente: "Pedro Neto", op: "OP-2024-002", valor: 42000, metodo: "multicaixa", referencia: "MC-456123", estado: "parcial" },
  { id: "FAT-004", data: "2024-05-22", cliente: "Maria Santos", op: "OP-2024-004", valor: 7500, metodo: "transferencia", referencia: "REF-321654", estado: "em_divida" },
  { id: "FAT-005", data: "2024-05-23", cliente: "Carlos Fernandes", op: "OP-2024-005", valor: 22000, metodo: "dinheiro", referencia: "", estado: "pago" },
];

const metodos = { dinheiro: { label: "Dinheiro", icon: "payments", color: "text-primary" }, transferencia: { label: "Transferência", icon: "account_balance", color: "text-primary" }, multicaixa: { label: "Multicaixa", icon: "credit_card", color: "text-secondary" }, referencia: { label: "Referência", icon: "receipt", color: "text-tertiary" } };
const estadoConfig = { pago: { label: "Pago", color: "bg-primary/10 text-primary", dot: "bg-green-500" }, parcial: { label: "Parcial", color: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" }, em_divida: { label: "Em Dívida", color: "bg-error-container/10 text-error", dot: "bg-red-500" } };

const topClientes = [
  { nome: "Pedro Neto", total: 42000, pedidos: 3 },
  { nome: "João Matos", total: 15200, pedidos: 5 },
  { nome: "Carlos Fernandes", total: 22000, pedidos: 2 },
  { nome: "Maria Santos", total: 7500, pedidos: 4 },
  { nome: "Ana Ferreira", total: 5200, pedidos: 6 },
];

const topProdutos = [
  { nome: "Revistas", vendas: 42000, un: "3000 un" },
  { nome: "Embalagens Personalizadas", vendas: 22000, un: "1000 un" },
  { nome: "Catálogos Institucionais", vendas: 15200, un: "500 un" },
  { nome: "Banners Publicitários", vendas: 7500, un: "10 un" },
  { nome: "Flyers Promocionais", vendas: 5200, un: "2000 un" },
];

const initialPagamento = { cliente: "", op: "", valor: "", metodo: "transferencia", referencia: "", data: new Date().toISOString().split("T")[0] };

export default function FaturacaoPage() {
  const [pagamentos, setPagamentos] = useState(samplePagamentos);
  const [tab, setTab] = useState("pagamentos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [pagModalOpen, setPagModalOpen] = useState(false);
  const [pagForm, setPagForm] = useState(initialPagamento);

  const filtered = filtroEstado === "todos" ? pagamentos : pagamentos.filter((p) => p.estado === filtroEstado);
  const totalReceber = pagamentos.reduce((s, p) => s + p.valor, 0);
  const totalPago = pagamentos.filter((p) => p.estado === "pago").reduce((s, p) => s + p.valor, 0);
  const totalDivida = pagamentos.filter((p) => p.estado === "em_divida").reduce((s, p) => s + p.valor, 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />
        <div className="p-6 md:p-8 space-y-6 flex-1">
          <Breadcrumbs />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-on-surface">Faturação</h1>
              <p className="text-xs text-on-surface-variant mt-1">Controlo financeiro e pagamentos</p>
            </div>
            <button onClick={() => setPagModalOpen(true)} className="bg-primary text-on-primary font-semibold rounded-lg px-5 py-2.5 flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm text-xs">
              <Icon name="add" className="text-lg" />
              Registar Pagamento
            </button>
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total a Receber", value: `Kz ${(totalReceber / 1000).toFixed(1)}k`, icon: "paid", color: "text-primary", bg: "bg-primary/10" },
              { label: "Total Pago", value: `Kz ${(totalPago / 1000).toFixed(1)}k`, icon: "check_circle", color: "text-primary", bg: "bg-primary/10" },
              { label: "Em Dívida", value: `Kz ${(totalDivida / 1000).toFixed(1)}k`, icon: "warning", color: "text-error", bg: "bg-error-container/10" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface-container dark:bg-surface-container p-5 rounded-xl border border-outline-variant flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}><Icon name={kpi.icon} /></div>
                <div><p className="text-xs text-on-surface-variant">{kpi.label}</p><p className="text-xl font-bold text-on-surface">{kpi.value}</p></div>
              </div>
            ))}
          </section>

          <div className="flex gap-2">
            {["pagamentos", "relatorios"].map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${tab === t ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant"}`}>{t === "pagamentos" ? "Pagamentos" : "Relatórios"}</button>
            ))}
          </div>

          {tab === "pagamentos" ? (
            <>
              <div className="flex gap-2 flex-wrap">
                {["todos", "pago", "parcial", "em_divida"].map((f) => (
                  <button key={f} onClick={() => setFiltroEstado(f)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${filtroEstado === f ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant"}`}>{f === "todos" ? "Todos" : estadoConfig[f]?.label}</button>
                ))}
              </div>

              <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-highest">
                        {["Factura", "Data", "Cliente", "OP", "Valor", "Método", "Referência", "Estado"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => {
                        const ec = estadoConfig[p.estado];
                        const mc = metodos[p.metodo];
                        return (
                          <tr key={p.id} className="border-b border-outline-variant hover:bg-surface-container-highest transition-colors">
                            <td className="px-4 py-3"><span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded text-xs">{p.id}</span></td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap text-on-surface-variant">{new Date(p.data).toLocaleDateString("pt-AO")}</td>
                            <td className="px-4 py-3 font-medium text-on-surface">{p.cliente}</td>
                            <td className="px-4 py-3 text-primary text-xs font-medium">{p.op}</td>
                            <td className="px-4 py-3 font-bold text-on-surface">Kz {p.valor.toLocaleString("pt-AO")}</td>
                            <td className="px-4 py-3"><span className={`flex items-center gap-1 text-xs ${mc.color}`}><Icon name={mc.icon} className="text-[14px]" />{mc.label}</span></td>
                            <td className="px-4 py-3 text-xs text-on-surface-variant font-mono">{p.referencia || "—"}</td>
                            <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ec.color}`}><span className={`w-1.5 h-1.5 rounded-full ${ec.dot}`} />{ec.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="md:hidden space-y-3 p-3">
                    {filtered.map((p) => {
                      const ec = estadoConfig[p.estado];
                      const mc = metodos[p.metodo];
                      return (
                        <div key={p.id} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/50 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-on-surface">{p.id}</p>
                              <p className="text-[10px] text-on-surface-variant">{p.cliente} · {p.op}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ec.color}`}><span className={`w-1.5 h-1.5 rounded-full ${ec.dot}`} />{ec.label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div><span className="text-on-surface-variant">Data:</span> <span className="font-medium text-on-surface">{new Date(p.data).toLocaleDateString("pt-AO")}</span></div>
                            <div><span className="text-on-surface-variant">Valor:</span> <span className="font-bold text-on-surface">Kz {p.valor.toLocaleString("pt-AO")}</span></div>
                            <div className="flex items-center gap-1"><span className="text-on-surface-variant">Método:</span> <span className={`flex items-center gap-1 ${mc.color}`}><Icon name={mc.icon} className="text-[12px]" />{mc.label}</span></div>
                            <div><span className="text-on-surface-variant">Ref:</span> <span className="font-mono text-on-surface-variant">{p.referencia || "—"}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6">
                <h3 className="text-sm font-semibold mb-4 text-on-surface flex items-center gap-2"><Icon name="groups" className="text-primary text-[18px]" /> Clientes Mais Activos</h3>
                <div className="space-y-3">
                  {topClientes.map((c, i) => (
                    <div key={c.nome} className="flex items-center gap-3 p-3 bg-surface-container-highest rounded-lg">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <div className="flex-1"><p className="text-sm font-medium text-on-surface">{c.nome}</p><p className="text-[10px] text-on-surface-variant">{c.pedidos} pedidos</p></div>
                      <span className="text-sm font-bold text-primary">Kz {c.total.toLocaleString("pt-AO")}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6">
                <h3 className="text-sm font-semibold mb-4 text-on-surface flex items-center gap-2"><Icon name="trending_up" className="text-secondary text-[18px]" /> Produtos Mais Vendidos</h3>
                <div className="space-y-3">
                  {topProdutos.map((p, i) => (
                    <div key={p.nome} className="flex items-center gap-3 p-3 bg-surface-container-highest rounded-lg">
                      <span className="w-7 h-7 rounded-full bg-secondary-container/30 text-secondary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <div className="flex-1"><p className="text-sm font-medium text-on-surface">{p.nome}</p><p className="text-[10px] text-on-surface-variant">{p.un}</p></div>
                      <span className="text-sm font-bold text-secondary">Kz {p.vendas.toLocaleString("pt-AO")}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6">
                <h3 className="text-sm font-semibold mb-4 text-on-surface flex items-center gap-2"><Icon name="inventory" className="text-tertiary text-[18px]" /> Consumo de Matérias-Primas</h3>
                <div className="space-y-3">
                  {[
                    { nome: "Papel Couché 150g", consumo: "45 resmas", custo: "Kz 18.000" },
                    { nome: "Tinta Cyan", consumo: "12 kg", custo: "Kz 3.600" },
                    { nome: "Lona Front Light", consumo: "3 rolos", custo: "Kz 4.500" },
                    { nome: "Vinil Adesivo", consumo: "7 rolos", custo: "Kz 5.250" },
                    { nome: "Cola Encadernação", consumo: "6 litros", custo: "Kz 1.200" },
                  ].map((m) => (
                    <div key={m.nome} className="flex items-center justify-between p-3 bg-surface-container-highest rounded-lg">
                      <div><p className="text-sm font-medium text-on-surface">{m.nome}</p><p className="text-[10px] text-on-surface-variant">{m.consumo}</p></div>
                      <span className="text-sm font-bold text-on-surface">{m.custo}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6">
                <h3 className="text-sm font-semibold mb-4 text-on-surface flex items-center gap-2"><Icon name="analytics" className="text-primary text-[18px]" /> Indicadores de Performance</h3>
                <div className="space-y-3">
                  {[
                    { label: "Lucro por Trabalho", value: "Kz 5.480", icon: "paid", color: "text-primary" },
                    { label: "Desperdício de Produção", value: "3.2%", icon: "delete_sweep", color: "text-error" },
                    { label: "Produtividade Operadores", value: "91.8%", icon: "speed", color: "text-primary" },
                    { label: "Margem Média", value: "32.5%", icon: "percent", color: "text-secondary" },
                  ].map((ind) => (
                    <div key={ind.label} className="flex items-center justify-between p-3 bg-surface-container-highest rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon name={ind.icon} className={`text-[18px] ${ind.color}`} />
                        <span className="text-sm text-on-surface">{ind.label}</span>
                      </div>
                      <span className="text-sm font-bold text-on-surface">{ind.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <Modal open={pagModalOpen} onClose={() => setPagModalOpen(false)} title="Registar Pagamento" icon="payments" size="md">
          <form onSubmit={(e) => {
            e.preventDefault();
            const n = String(pagamentos.length + 1).padStart(3, "0");
            const novo = { id: `FAT-${n}`, ...pagForm, valor: Number(pagForm.valor), estado: "pago" };
            setPagamentos([novo, ...pagamentos]);
            setPagForm(initialPagamento);
            setPagModalOpen(false);
          }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Cliente *</label>
                <select required name="cliente" value={pagForm.cliente} onChange={(e) => setPagForm({ ...pagForm, cliente: e.target.value })} className="px-3 py-2 bg-surface-container-highest border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="">Seleccionar...</option>
                  <option>João Matos</option><option>Maria Santos</option><option>Carlos Fernandes</option><option>Ana Ferreira</option><option>Pedro Neto</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">OP Referência *</label>
                <select required name="op" value={pagForm.op} onChange={(e) => setPagForm({ ...pagForm, op: e.target.value })} className="px-3 py-2 bg-surface-container-highest border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="">Seleccionar...</option>
                  <option>OP-2024-001</option><option>OP-2024-002</option><option>OP-2024-003</option><option>OP-2024-004</option><option>OP-2024-005</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Valor (Kz) *</label>
                <input required type="number" name="valor" value={pagForm.valor} onChange={(e) => setPagForm({ ...pagForm, valor: e.target.value })} className="px-3 py-2 bg-surface-container-highest border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="0,00" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Método *</label>
                <select name="metodo" value={pagForm.metodo} onChange={(e) => setPagForm({ ...pagForm, metodo: e.target.value })} className="px-3 py-2 bg-surface-container-highest border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência</option>
                  <option value="multicaixa">Multicaixa</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Data</label>
                <input type="date" name="data" value={pagForm.data} onChange={(e) => setPagForm({ ...pagForm, data: e.target.value })} className="px-3 py-2 bg-surface-container-highest border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Referência</label>
                <input name="referencia" value={pagForm.referencia} onChange={(e) => setPagForm({ ...pagForm, referencia: e.target.value })} className="px-3 py-2 bg-surface-container-highest border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="Ex: REF-12345" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setPagModalOpen(false)} className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">Registar Pagamento</button>
            </div>
          </form>
        </Modal>

        <footer className="p-6 text-center border-t border-outline-variant bg-surface-container">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>
      </main>
    </div>
  );
}