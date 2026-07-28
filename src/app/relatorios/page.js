"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Icon from "@/components/Icon";

const vendasPorMes = [
  { mes: "Jan", valor: 82000, custos: 54000, jobs: 12 },
  { mes: "Fev", valor: 95000, custos: 61000, jobs: 15 },
  { mes: "Mar", valor: 78000, custos: 50000, jobs: 10 },
  { mes: "Abr", valor: 112000, custos: 72000, jobs: 18 },
  { mes: "Mai", valor: 98500, custos: 63000, jobs: 14 },
  { mes: "Jun", valor: 0, custos: 0, jobs: 0 },
];

const topClientes = [
  { nome: "Pedro Neto", total: 42000, pedidos: 3, ultimo: "2024-05-23" },
  { nome: "Carlos Fernandes", total: 22000, pedidos: 2, ultimo: "2024-05-22" },
  { nome: "João Matos", total: 15200, pedidos: 5, ultimo: "2024-05-20" },
  { nome: "Maria Santos", total: 7500, pedidos: 4, ultimo: "2024-05-21" },
  { nome: "Ana Ferreira", total: 5200, pedidos: 6, ultimo: "2024-05-18" },
];

const topProdutos = [
  { nome: "Revistas", vendas: 42000, un: "3000 un", margem: "38%" },
  { nome: "Embalagens Personalizadas", vendas: 22000, un: "1000 un", margem: "32%" },
  { nome: "Catálogos Institucionais", vendas: 15200, un: "500 un", margem: "35%" },
  { nome: "Banners Publicitários", vendas: 7500, un: "10 un", margem: "42%" },
  { nome: "Flyers Promocionais", vendas: 5200, un: "2000 un", margem: "28%" },
];

const consumoMateriais = [
  { nome: "Papel Couché 150g", consumo: "45 resmas", custo: "Kz 18.000", estoque: "Baixo" },
  { nome: "Tinta Cyan", consumo: "12 kg", custo: "Kz 3.600", estoque: "OK" },
  { nome: "Lona Front Light", consumo: "3 rolos", custo: "Kz 4.500", estoque: "OK" },
  { nome: "Vinil Adesivo", consumo: "7 rolos", custo: "Kz 5.250", estoque: "Baixo" },
  { nome: "Cola Encadernação", consumo: "6 litros", custo: "Kz 1.200", estoque: "Baixo" },
  { nome: "Papel Offset 90g", consumo: "18 resmas", custo: "Kz 3.240", estoque: "OK" },
];

const lucroTrabalhos = [
  { op: "OP-2024-001", produto: "Catálogos Institucionais", receita: 15200, custo: 10200, lucro: 5000, margem: "32.9%" },
  { op: "OP-2024-002", produto: "Revistas", receita: 42000, custo: 28100, lucro: 13900, margem: "33.1%" },
  { op: "OP-2024-003", produto: "Flyers Promocionais", receita: 5200, custo: 3950, lucro: 1250, margem: "24.0%" },
  { op: "OP-2024-004", produto: "Banners Publicitários", receita: 7500, custo: 5500, lucro: 2000, margem: "26.7%" },
  { op: "OP-2024-005", produto: "Embalagens Personalizadas", receita: 22000, custo: 16600, lucro: 5400, margem: "24.5%" },
];

const desperdicio = [
  { mes: "Jan", taxa: "2.8%", material: "Papel", causa: "Ajuste de máquina" },
  { mes: "Fev", taxa: "3.1%", material: "Tinta", causa: "Troca de cor" },
  { mes: "Mar", taxa: "2.2%", material: "Papel", causa: "Configuração inicial" },
  { mes: "Abr", taxa: "3.5%", material: "Lona", causa: "Falha de impressão" },
  { mes: "Mai", taxa: "2.5%", material: "Papel", causa: "Testes de qualidade" },
];

const produtividade = [
  { operador: "Ricardo Silva", funcao: "Impressor Offset", jobs: 18, horas: 152, produtividade: "94%", eficiencia: "96%" },
  { operador: "Ana Costa", funcao: "Pré-Impressão", jobs: 22, horas: 140, produtividade: "97%", eficiencia: "98%" },
  { operador: "Carlos Silva", funcao: "Acabamento", jobs: 15, horas: 130, produtividade: "89%", eficiencia: "92%" },
  { operador: "João Mendes", funcao: "Impressor Digital", jobs: 20, horas: 145, produtividade: "92%", eficiencia: "94%" },
  { operador: "Paula Santos", funcao: "Expedição", jobs: 12, horas: 110, produtividade: "95%", eficiencia: "97%" },
];

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState("mai");
  const [aba, setAba] = useState("vendas");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />
        <div className="p-6 md:p-8 space-y-6 flex-1">
          <Breadcrumbs />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-on-surface">Relatórios</h1>
              <p className="text-xs text-on-surface-variant mt-1">Análise de desempenho e indicadores</p>
            </div>
            <div className="flex gap-1 bg-surface-container-highest rounded-lg p-1">
              {[{id: "jan", label: "Jan"}, {id: "fev", label: "Fev"}, {id: "mar", label: "Mar"}, {id: "abr", label: "Abr"}, {id: "mai", label: "Mai"}].map((p) => (
                <button key={p.id} onClick={() => setPeriodo(p.id)} className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${periodo === p.id ? "bg-surface-container dark:bg-surface-container text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>{p.label}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: "vendas", label: "Vendas", icon: "trending_up" },
              { id: "clientes", label: "Clientes", icon: "groups" },
              { id: "produtos", label: "Produtos", icon: "inventory_2" },
              { id: "consumo", label: "Consumo", icon: "inventory" },
              { id: "lucro", label: "Lucro", icon: "paid" },
              { id: "desperdicio", label: "Desperdício", icon: "delete_sweep" },
              { id: "operadores", label: "Operadores", icon: "badge" },
            ].map((t) => (
              <button key={t.id} onClick={() => setAba(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${aba === t.id ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-highest"}`}>
                <Icon name={t.icon} className="text-[16px]" />
                {t.label}
              </button>
            ))}
          </div>

          {aba === "vendas" && (
            <div className="space-y-4">
              <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6">
                <h2 className="text-base font-semibold text-on-surface mb-4">Vendas por Período</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-high/50">
                        {["Mês", "Valor", "Custos", "Lucro", "Margem", "Trabalhos"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vendasPorMes.filter(m => m.valor > 0).map((m) => {
                        const lucro = m.valor - m.custos;
                        const margem = ((lucro / m.valor) * 100).toFixed(1);
                        return (
                          <tr key={m.mes} className="border-b border-outline-variant hover:bg-surface-container-high/30 transition-colors">
                            <td className="px-4 py-3 font-semibold text-on-surface">{m.mes}</td>
                            <td className="px-4 py-3 font-bold text-on-surface">Kz {m.valor.toLocaleString("pt-AO")}</td>
                            <td className="px-4 py-3 text-on-surface-variant">Kz {m.custos.toLocaleString("pt-AO")}</td>
                            <td className="px-4 py-3 text-primary font-semibold">Kz {lucro.toLocaleString("pt-AO")}</td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{margem}%</span></td>
                            <td className="px-4 py-3 text-on-surface-variant">{m.jobs}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="md:hidden space-y-3 p-3">
                    {vendasPorMes.filter(m => m.valor > 0).map((m) => {
                      const lucro = m.valor - m.custos;
                      const margem = ((lucro / m.valor) * 100).toFixed(1);
                      return (
                        <div key={m.mes} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/50 space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-bold text-on-surface">{m.mes}</p>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{margem}%</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div><span className="text-on-surface-variant">Vendas:</span> <span className="font-bold text-on-surface">Kz {m.valor.toLocaleString("pt-AO")}</span></div>
                            <div><span className="text-on-surface-variant">Custos:</span> <span className="text-on-surface-variant">Kz {m.custos.toLocaleString("pt-AO")}</span></div>
                            <div><span className="text-on-surface-variant">Lucro:</span> <span className="font-bold text-primary">Kz {lucro.toLocaleString("pt-AO")}</span></div>
                            <div><span className="text-on-surface-variant">Trabalhos:</span> <span className="text-on-surface">{m.jobs}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-5 text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Período</p>
                  <p className="text-2xl font-bold text-on-surface mt-2">Kz 465.500</p>
                </div>
                <div className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-5 text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Média Mensal</p>
                  <p className="text-2xl font-bold text-primary mt-2">Kz 93.100</p>
                </div>
                <div className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-5 text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Margem Média</p>
                  <p className="text-2xl font-bold text-primary mt-2">35.2%</p>
                </div>
              </div>
            </div>
          )}

          {aba === "clientes" && (
            <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6">
              <h2 className="text-base font-semibold text-on-surface mb-4">Clientes Mais Ativos</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm hidden md:table">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-high/50">
                      {["#", "Cliente", "Total Gasto", "Pedidos", "Ticket Médio", "Último Pedido"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topClientes.map((c, i) => (
                      <tr key={c.nome} className="border-b border-outline-variant hover:bg-surface-container-high/30 transition-colors">
                        <td className="px-4 py-3"><span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span></td>
                        <td className="px-4 py-3 font-medium text-on-surface">{c.nome}</td>
                        <td className="px-4 py-3 font-bold text-on-surface">Kz {c.total.toLocaleString("pt-AO")}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{c.pedidos}</td>
                        <td className="px-4 py-3 font-semibold text-on-surface">Kz {(c.total / c.pedidos).toLocaleString("pt-AO")}</td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant">{new Date(c.ultimo).toLocaleDateString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="md:hidden space-y-3 p-3">
                  {topClientes.map((c, i) => (
                    <div key={c.nome} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/50 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">{c.nome}</p>
                        <p className="text-[10px] text-on-surface-variant">{c.pedidos} pedidos · Ticket: Kz {(c.total / c.pedidos).toLocaleString("pt-AO")}</p>
                      </div>
                      <p className="text-xs font-bold text-primary flex-shrink-0">Kz {c.total.toLocaleString("pt-AO")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {aba === "produtos" && (
            <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6">
              <h2 className="text-base font-semibold text-on-surface mb-4">Produtos Mais Vendidos</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm hidden md:table">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-high/50">
                      {["#", "Produto", "Vendas", "Quantidade", "Margem"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topProdutos.map((p, i) => (
                      <tr key={p.nome} className="border-b border-outline-variant hover:bg-surface-container-high/30 transition-colors">
                        <td className="px-4 py-3"><span className="w-6 h-6 rounded-full bg-secondary-container/30 text-secondary text-[10px] font-bold flex items-center justify-center">{i + 1}</span></td>
                        <td className="px-4 py-3 font-medium text-on-surface">{p.nome}</td>
                        <td className="px-4 py-3 font-bold text-primary">Kz {p.vendas.toLocaleString("pt-AO")}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{p.un}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{p.margem}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="md:hidden space-y-3 p-3">
                  {topProdutos.map((p, i) => (
                    <div key={p.nome} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/50 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-secondary-container/30 text-secondary text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">{p.nome}</p>
                        <p className="text-[10px] text-on-surface-variant">{p.un} · Margem: {p.margem}</p>
                      </div>
                      <p className="text-xs font-bold text-primary flex-shrink-0">Kz {p.vendas.toLocaleString("pt-AO")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {aba === "consumo" && (
            <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6">
              <h2 className="text-base font-semibold text-on-surface mb-4">Consumo de Matérias-Primas</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm hidden md:table">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-high/50">
                      {["Material", "Consumo", "Custo", "Estado no Stock"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {consumoMateriais.map((m) => (
                      <tr key={m.nome} className="border-b border-outline-variant hover:bg-surface-container-high/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-on-surface">{m.nome}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{m.consumo}</td>
                        <td className="px-4 py-3 font-bold text-tertiary">Kz {m.custo.replace("Kz ", "")}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.estoque === "Baixo" ? "bg-error-container/10 text-error dark:text-error" : "bg-primary/10 text-primary"}`}>{m.estoque}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="md:hidden space-y-3 p-3">
                  {consumoMateriais.map((m) => (
                    <div key={m.nome} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/50 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">{m.nome}</p>
                        <p className="text-[10px] text-on-surface-variant">{m.consumo}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-tertiary">{m.custo}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.estoque === "Baixo" ? "bg-error-container/10 text-error" : "bg-primary/10 text-primary"}`}>{m.estoque}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {aba === "lucro" && (
            <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6">
              <h2 className="text-base font-semibold text-on-surface mb-4">Lucro por Trabalho</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm hidden md:table">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-high/50">
                      {["OP", "Produto", "Receita", "Custo", "Lucro", "Margem"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lucroTrabalhos.map((t) => (
                      <tr key={t.op} className="border-b border-outline-variant hover:bg-surface-container-high/30 transition-colors">
                        <td className="px-4 py-3"><span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded text-xs">{t.op}</span></td>
                        <td className="px-4 py-3 font-medium text-on-surface">{t.produto}</td>
                        <td className="px-4 py-3 text-on-surface">Kz {t.receita.toLocaleString("pt-AO")}</td>
                        <td className="px-4 py-3 text-on-surface-variant">Kz {t.custo.toLocaleString("pt-AO")}</td>
                        <td className="px-4 py-3 font-bold text-primary">Kz {t.lucro.toLocaleString("pt-AO")}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{t.margem}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="md:hidden space-y-3 p-3">
                  {lucroTrabalhos.map((t) => (
                    <div key={t.op} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/50 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded text-[10px]">{t.op}</span>
                          <p className="text-xs font-bold text-on-surface mt-1">{t.produto}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{t.margem}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div><span className="text-on-surface-variant">Receita:</span><br /><span className="font-bold text-on-surface">Kz {t.receita.toLocaleString("pt-AO")}</span></div>
                        <div><span className="text-on-surface-variant">Custo:</span><br /><span className="text-on-surface-variant">Kz {t.custo.toLocaleString("pt-AO")}</span></div>
                        <div><span className="text-on-surface-variant">Lucro:</span><br /><span className="font-bold text-primary">Kz {t.lucro.toLocaleString("pt-AO")}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {[
                  { label: "Receita Total", value: "Kz 91.900", color: "text-primary" },
                  { label: "Lucro Total", value: "Kz 27.550", color: "text-primary" },
                  { label: "Margem Média", value: "28.2%", color: "text-secondary" },
                ].map((s) => (
                  <div key={s.label} className="p-4 bg-surface-container-high rounded-lg text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">{s.label}</p>
                    <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {aba === "desperdicio" && (
            <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6">
              <h2 className="text-base font-semibold text-on-surface mb-4">Desperdício de Produção</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm hidden md:table">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-high/50">
                      {["Mês", "Taxa", "Material", "Causa"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {desperdicio.map((d) => (
                      <tr key={d.mes} className="border-b border-outline-variant hover:bg-surface-container-high/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-on-surface">{d.mes}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container/10 text-error dark:text-error">{d.taxa}</span></td>
                        <td className="px-4 py-3 text-on-surface-variant">{d.material}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{d.causa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="md:hidden space-y-3 p-3">
                  {desperdicio.map((d) => (
                    <div key={d.mes} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/50 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-on-surface">{d.mes}</p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container/10 text-error">{d.taxa}</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant">{d.material} · {d.causa}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {[
                  { label: "Taxa Média", value: "2.8%", color: "text-error" },
                  { label: "Total Perdido (Est.)", value: "Kz 4.580", color: "text-tertiary" },
                  { label: "Meta", value: "< 2.0%", color: "text-primary" },
                ].map((s) => (
                  <div key={s.label} className="p-4 bg-surface-container-high rounded-lg text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">{s.label}</p>
                    <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {aba === "operadores" && (
            <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6">
              <h2 className="text-base font-semibold text-on-surface mb-4">Produtividade dos Operadores</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm hidden md:table">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-high/50">
                      {["Operador", "Função", "Trabalhos", "Horas", "Produtividade", "Eficiência"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {produtividade.map((p) => (
                      <tr key={p.operador} className="border-b border-outline-variant hover:bg-surface-container-high/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-on-surface">{p.operador}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{p.funcao}</td>
                        <td className="px-4 py-3 text-on-surface">{p.jobs}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{p.horas}h</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${Number(p.produtividade.replace("%", "")) >= 95 ? "bg-primary/10 text-primary" : Number(p.produtividade.replace("%", "")) >= 90 ? "bg-primary/10 text-primary dark:text-primary" : "bg-tertiary-container/10 text-tertiary"}`}>{p.produtividade}</span></td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{p.eficiencia}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="md:hidden space-y-3 p-3">
                  {produtividade.map((p) => (
                    <div key={p.operador} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/50 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-on-surface">{p.operador}</p>
                          <p className="text-[10px] text-on-surface-variant">{p.funcao}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${Number(p.produtividade.replace("%", "")) >= 95 ? "bg-primary/10 text-primary" : "bg-tertiary-container/10 text-tertiary"}`}>{p.produtividade}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{p.eficiencia}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div><span className="text-on-surface-variant">Trabalhos:</span> <span className="font-medium text-on-surface">{p.jobs}</span></div>
                        <div><span className="text-on-surface-variant">Horas:</span> <span className="font-medium text-on-surface">{p.horas}h</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {[
                  { label: "Produtividade Média", value: "93.4%", color: "text-primary" },
                  { label: "Eficiência Média", value: "95.4%", color: "text-primary" },
                  { label: "Total Horas", value: "677h", color: "text-on-surface" },
                ].map((s) => (
                  <div key={s.label} className="p-4 bg-surface-container-high rounded-lg text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">{s.label}</p>
                    <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="p-6 text-center border-t border-outline-variant bg-surface-container-highest/50">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>
      </main>
    </div>
  );
}
