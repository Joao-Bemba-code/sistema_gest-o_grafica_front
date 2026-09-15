"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/Icon";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { listarOrdens } from "@/services/producao";
import { listar } from "@/services/clientes";
import { listar as listarFaturas } from "@/services/faturacao";
import { listar as listarMateriais } from "@/services/materiais";
import { listar as listarCategorias } from "@/services/categorias";
import { gerarRelatorioStockPDF, gerarRelatorioCadastrosPDF, gerarRelatorioCategoriasPDF } from "@/lib/estoquePdf";
import { toNum, familias, normalizarFamilia, tiposItem, normalizarTipoItem } from "@/lib/estoque";
import { buscarOrganizacao } from "@/services/configuracoes";

const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getUltimos6Meses() {
  const hoje = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    result.push({
      mes: d.getMonth(),
      label: nomesMeses[d.getMonth()],
      labelCurto: nomesMeses[d.getMonth()].slice(0, 3).toLowerCase(),
    });
  }
  return result;
}

function fmtKz(v) {
  return "Kz " + Math.round(Number(v) || 0).toLocaleString("pt-PT");
}

function compactKz(v) {
  const n = Number(v) || 0;
  if (n >= 1000000) return (n / 1000000).toLocaleString("pt-PT", { maximumFractionDigits: 1 }) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "k";
  return String(Math.round(n));
}

const CORES_DONUT = ["#4338ca", "#0ea5e9", "#14b8a6", "#f59e0b", "#a855f7", "#64748b"];

function ChartTooltip({ active, payload, label, formato }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-card px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color || p.payload?.fill }} />
          <span>{p.name}:</span>
          <span className="font-bold text-foreground font-mono">{formato ? formato(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function CabecalhoGrafico({ icon, titulo, sub }) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-border">
      <span className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
        <Icon name={icon} className="text-lg text-foreground" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground tracking-tight truncate">{titulo}</h3>
        {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}

function CartaoGrafico({ icon, titulo, sub, children, className = "" }) {
  return (
    <section className={`rounded-2xl bg-card border border-border shadow-card overflow-hidden ${className}`}>
      <CabecalhoGrafico icon={icon} titulo={titulo} sub={sub} />
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function AreaGrafico({ dados, serie, nome, cor, formato, xKey = "label" }) {
  const gradId = `grad-${serie}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={dados} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={cor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} dy={4} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={52} tickFormatter={formato} allowDecimals={false} />
        <Tooltip content={<ChartTooltip formato={formato} />} />
        <Area type="monotone" dataKey="valor" name={nome} stroke={cor} strokeWidth={2.5} fill={`url(#${gradId})`} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DonutGrafico({ dados, centro, tooltipFormat }) {
  return (
    <div className="relative h-52">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip formato={tooltipFormat} />} />
          <Pie data={dados} dataKey="value" nameKey="name" innerRadius={60} outerRadius={84} paddingAngle={2.5} strokeWidth={0} cornerRadius={6}>
            {dados.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-extrabold text-foreground font-mono">{centro}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest">total</span>
      </div>
    </div>
  );
}

function LinhaDonut({ cor, nome, valor }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cor }} />
      <span className="flex-1 min-w-0 text-sm text-foreground truncate">{nome}</span>
      <span className="font-mono font-bold text-sm text-foreground shrink-0">{valor}</span>
    </div>
  );
}

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [org, setOrg] = useState({});
  const [periodo, setPeriodo] = useState(getUltimos6Meses()[5].labelCurto);
  const [aba, setAba] = useState("comercial");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroFamilia, setFiltroFamilia] = useState("todas");
  const [filtroGrupo, setFiltroGrupo] = useState("todas");
  const [busca, setBusca] = useState("");
  const { addToast } = useToast();

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [ords, clis, fats, mats, cats, o] = await Promise.all([
        listarOrdens(),
        listar(),
        listarFaturas(),
        listarMateriais(),
        listarCategorias(),
        buscarOrganizacao()
      ]);
      setOrdens(Array.isArray(ords) ? ords : ords?.ordens || []);
      setClientes(Array.isArray(clis) ? clis : clis?.data || []);
      setFaturas(Array.isArray(fats) ? fats : fats?.data || []);
      setMateriais(Array.isArray(mats) ? mats : []);
      setCategorias(Array.isArray(cats) ? cats : []);
      setOrg(o || {});
    } catch (err) {
      setError(err.message);
      addToast(err.response?.data?.erro || "Erro ao carregar relatórios", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const ultimosMeses = useMemo(() => getUltimos6Meses(), []);

  const vendasPorMes = useMemo(() => {
    const hoje = new Date();
    const mesesIndices = ultimosMeses.map((m) => m.mes);
    const counts = ultimosMeses.map((m) => ({ mes: m.mes, label: m.label, valor: 0, quantidade: 0 }));
    faturas.forEach((f) => {
      const d = f.data_emissao ? new Date(f.data_emissao) : null;
      if (d && !isNaN(d.getTime()) && d.getFullYear() === hoje.getFullYear() && mesesIndices.includes(d.getMonth())) {
        const idx = ultimosMeses.findIndex((m) => m.mes === d.getMonth());
        counts[idx].valor += Number(f.total || f.valor) || 0;
        counts[idx].quantidade += 1;
      }
    });
    return counts;
  }, [faturas, ultimosMeses]);

  const recebidoPorMes = useMemo(() => {
    const hoje = new Date();
    const mesesIndices = ultimosMeses.map((m) => m.mes);
    const counts = ultimosMeses.map((m) => ({ mes: m.mes, label: m.label, valor: 0, quantidade: 0 }));
    faturas.forEach((f) => {
      if (f.estado !== "paga") return;
      const d = f.data_pagamento || f.data_emissao;
      const dt = d ? new Date(d) : null;
      if (dt && !isNaN(dt.getTime()) && dt.getFullYear() === hoje.getFullYear() && mesesIndices.includes(dt.getMonth())) {
        const idx = ultimosMeses.findIndex((m) => m.mes === dt.getMonth());
        counts[idx].valor += Number(f.valor_pago || f.total || f.valor) || 0;
        counts[idx].quantidade += 1;
      }
    });
    return counts;
  }, [faturas, ultimosMeses]);

  const recebidoHoje = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    return faturas
      .filter((f) => f.estado === "paga" && (f.data_pagamento || f.data_emissao) === hoje)
      .reduce((s, f) => s + (Number(f.valor_pago || f.total || f.valor) || 0), 0);
  }, [faturas]);

  const recebidoMes = useMemo(() => {
    const hoje = new Date();
    return faturas
      .filter((f) => {
        if (f.estado !== "paga") return false;
        const d = new Date(f.data_pagamento || f.data_emissao);
        return !isNaN(d.getTime()) && d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
      })
      .reduce((s, f) => s + (Number(f.valor_pago || f.total || f.valor) || 0), 0);
  }, [faturas]);

  const clientesTop = useMemo(() => {
    const map = {};
    faturas.forEach((f) => {
      const nome = f.cliente?.nome || f.cliente || "Cliente";
      map[nome] = (map[nome] || 0) + (Number(f.total || f.valor) || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, total], i) => ({
        nome,
        total,
        cor: ["bg-primary", "bg-primary/70", "bg-primary/50", "bg-primary/30", "bg-primary/15"][i],
      }));
  }, [faturas]);

  const clientesTotal = useMemo(() => clientesTop.reduce((s, c) => s + c.total, 0), [clientesTop]);

  const producaoPorMes = useMemo(() => {
    const hoje = new Date();
    const mesesIndices = ultimosMeses.map((m) => m.mes);
    const result = {};
    mesesIndices.forEach((mesIdx) => {
      const ordensMes = ordens.filter((o) => {
        const d = o.data_entrada ? new Date(o.data_entrada) : null;
        return d && !isNaN(d.getTime()) && d.getFullYear() === hoje.getFullYear() && d.getMonth() === mesIdx;
      });
      const produzidas = ordensMes.length;
      const entregues = ordensMes.filter((o) => (o.estado || o.status) === "entregue").length;
      result[mesIdx] = { produzidas, entregues, pct: produzidas > 0 ? Math.round((entregues / produzidas) * 100) : 0 };
    });
    return result;
  }, [ordens, ultimosMeses]);

  const opsPorStatus = useMemo(() => ["aguardando", "em_producao", "finalizado", "entregue"].map((s) => ({
    status: s,
    label: s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    quantidade: ordens.filter(o => (o.estado || o.status) === s).length,
  })), [ordens]);

  const cadastrosFiltrados = useMemo(() => {
    let lista = clientes;
    if (filtroTipo !== "todos") lista = lista.filter((c) => c.tipo === filtroTipo);
    if (busca.trim()) {
      const b = busca.trim().toLowerCase();
      lista = lista.filter((c) =>
        [c.nome, c.empresa, c.nif, c.codigo, c.telefone, c.email].some((v) =>
          String(v || "").toLowerCase().includes(b)
        )
      );
    }
    return lista;
  }, [clientes, filtroTipo, busca]);

  const totalClientes = useMemo(() => clientes.filter((c) => c.tipo === "cliente").length, [clientes]);
  const totalFornecedores = useMemo(() => clientes.filter((c) => c.tipo === "fornecedor").length, [clientes]);

  const abas = [
    { key: "comercial", label: "Área Comercial", icon: "trending_up" },
    { key: "producao", label: "Produção", icon: "precision_manufacturing" },
    { key: "provisionamento", label: "Provisionamento", icon: "inventory_2" },
    { key: "recursos", label: "Recursos", icon: "category" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-card border border-border shadow-card flex items-center justify-center hidden sm:flex shrink-0">
          <Icon name="query_stats" className="text-2xl text-primary" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Visão geral do desempenho da produção</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {abas.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setAba(a.key)}
            className={`pill transition-colors ${aba === a.key ? "nav-pill" : "pill-muted hover:border-primary hover:text-primary"}`}
          >
            <Icon name={a.icon} className="text-base" />
            {a.label}
          </button>
        ))}
      </div>

      {aba === "comercial" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Recebido Hoje", value: `Kz ${recebidoHoje.toLocaleString("pt-AO")}`, icon: "today" },
              { label: "Recebido este Mês", value: `Kz ${recebidoMes.toLocaleString("pt-AO")}`, icon: "payments" },
              { label: "A Receber", value: `Kz ${faturas.filter((f) => !["paga", "cancelada"].includes(f.estado)).reduce((s, f) => s + (Number(f.total || f.valor) || 0), 0).toLocaleString("pt-AO")}`, icon: "paid" },
              { label: "Documentos", value: faturas.length, icon: "receipt_long" },
            ].map((kpi) => (
              <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} />
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {ultimosMeses.map((m) => (
              <button
                key={m.labelCurto}
                type="button"
                onClick={() => setPeriodo(m.labelCurto)}
                className={`pill transition-colors ${periodo === m.labelCurto ? "nav-pill" : "pill-muted hover:border-primary hover:text-primary"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CartaoGrafico icon="receipt_long" titulo="Faturação Emitida" sub={`Total: ${fmtKz(vendasPorMes.reduce((s, v) => s + v.valor, 0))}`}>
              <div className="h-52">
                <AreaGrafico dados={vendasPorMes} serie="faturacao" nome="Faturação" cor="#4338ca" formato={compactKz} />
              </div>
            </CartaoGrafico>

            <CartaoGrafico icon="payments" titulo="Recebido (Faturas Pagas)" sub={`Total: ${fmtKz(recebidoPorMes.reduce((s, v) => s + v.valor, 0))}`}>
              <div className="h-52">
                <AreaGrafico dados={recebidoPorMes} serie="recebido" nome="Recebido" cor="#047857" formato={compactKz} />
              </div>
            </CartaoGrafico>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <CartaoGrafico icon="pie_chart" titulo="Faturação por Cliente" sub="Repartição dos Top 5 clientes">
              <DonutGrafico
                dados={clientesTop.map((c, i) => ({ ...c, color: CORES_DONUT[i % CORES_DONUT.length] }))}
                centro={compactKz(clientesTotal)}
                tooltipFormat={(v) => fmtKz(v)}
              />
            </CartaoGrafico>

            <CartaoGrafico icon="workspace_premium" titulo="Top 5 Clientes" sub="Clientes com maior faturação">
              <div className="h-full flex flex-col justify-center space-y-4">
                {clientesTop.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1 gap-2">
                        <span className="font-medium truncate">{c.nome}</span>
                        <span className="font-mono font-bold shrink-0">Kz {c.total.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(c.total / clientesTotal) * 100}%`, background: CORES_DONUT[i % CORES_DONUT.length] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CartaoGrafico>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Cadastros</CardTitle>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => gerarRelatorioCadastrosPDF(clientes, org, "todos")}>
                  <Icon name="picture_as_pdf" className="text-sm" />
                  Todos
                </Button>
                <Button size="sm" variant="outline" onClick={() => gerarRelatorioCadastrosPDF(clientes, org, "cliente")}>
                  <Icon name="picture_as_pdf" className="text-sm" />
                  Clientes
                </Button>
                <Button size="sm" variant="outline" onClick={() => gerarRelatorioCadastrosPDF(clientes, org, "fornecedor")}>
                  <Icon name="picture_as_pdf" className="text-sm" />
                  Fornecedores
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex gap-1.5">
                  {[
                    { v: "todos", label: `Todos (${clientes.length})`, icon: "badge" },
                    { v: "cliente", label: `Clientes (${totalClientes})`, icon: "person" },
                    { v: "fornecedor", label: `Fornecedores (${totalFornecedores})`, icon: "local_shipping" },
                  ].map((f) => (
                    <Button
                      key={f.v}
                      variant={filtroTipo === f.v ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltroTipo(f.v)}
                    >
                      <Icon name={f.icon} className="text-sm" />
                      {f.label}
                    </Button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base" />
                  <input
                    className="pl-9 pr-4 py-1.5 bg-background border rounded text-sm w-full outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Buscar..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Nome</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Empresa</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">NIF</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Email</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Telefone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cadastrosFiltrados.map((c, i) => (
                      <tr key={c.id || c.codigo || i} className="border-b">
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-xs">
                            <Icon name={c.tipo === "cliente" ? "person" : "local_shipping"} className="text-xs mr-1" />
                            {c.tipo === "cliente" ? "Cliente" : "Fornecedor"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 font-medium">{c.nome}</td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{c.empresa || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{c.nif || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">{c.email || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{c.telefone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cadastrosFiltrados.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    {clientes.length === 0 ? "Nenhum cadastro encontrado" : "Nenhum resultado para os filtros escolhidos"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {aba === "producao" && (() => {
        const statusCores = { aguardando: "#f59e0b", em_producao: "#4338ca", finalizado: "#047857", entregue: "#a855f7" };
        const totalOrdens = opsPorStatus.reduce((t, x) => t + x.quantidade, 0) || 1;
        const donutsStatus = opsPorStatus.map((s) => ({ name: s.label, value: s.quantidade, color: statusCores[s.status] }));
        const desempenhoMeses = ultimosMeses.map((m) => ({
          label: m.label,
          valor: (producaoPorMes[m.mes] || { produzidas: 0 }).produzidas,
          entregues: (producaoPorMes[m.mes] || { entregues: 0 }).entregues,
        }));
        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {opsPorStatus.map((s) => (
                <Card key={s.status}>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-semibold">{s.quantidade}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
              {opsPorStatus.map((s) => {
                const pct = (s.quantidade / totalOrdens) * 100;
                return pct > 0 ? <div key={s.status} className="h-full" style={{ width: `${pct}%`, background: statusCores[s.status] }} /> : null;
              })}
            </div>

            <div className="flex gap-4 flex-wrap text-xs">
              {opsPorStatus.map((s) => (
                <div key={s.status} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: statusCores[s.status] }} />
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium">{Math.round((s.quantidade / totalOrdens) * 100)}%</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <CartaoGrafico icon="pie_chart" titulo="Ordens por Estado" sub="Distribuição das ordens de produção">
                <DonutGrafico dados={donutsStatus} centro={String(ordens.length)} tooltipFormat={(v) => `${v} ordens`} />
                <div className="mt-3 space-y-2">
                  {donutsStatus.map((d) => (
                    <LinhaDonut key={d.name} cor={d.color} nome={d.name} valor={`${d.value} (${Math.round((d.value / totalOrdens) * 100)}%)`} />
                  ))}
                </div>
              </CartaoGrafico>

              <CartaoGrafico icon="show_chart" titulo="Desempenho por Período" sub="Ordens produzidas e entregues por mês">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={desempenhoMeses} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad-produzidas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4338ca" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#4338ca" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="grad-entregues" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#047857" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#047857" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} dy={4} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={40} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="valor" name="Produzidas" stroke="#4338ca" strokeWidth={2.5} fill="url(#grad-produzidas)" activeDot={{ r: 4 }} />
                      <Area type="monotone" dataKey="entregues" name="Entregues" stroke="#047857" strokeWidth={2.5} fill="url(#grad-entregues)" activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CartaoGrafico>
            </div>
          </>
        );
      })()}

      {aba === "provisionamento" && (() => {
        const catMap = {};
        materiais.forEach((m) => {
          const cat = m.categoria?.nome || "Sem categoria";
          const fam = normalizarFamilia(m.categoria?.familia);
          if (!catMap[cat]) catMap[cat] = { qtd: 0, valorTotal: 0, disponivel: 0, itens: 0, familia: fam };
          catMap[cat].itens += 1;
          catMap[cat].qtd += toNum(m.quantidade);
          catMap[cat].disponivel += toNum(m.estoque_disponivel);
          catMap[cat].valorTotal += toNum(m.quantidade) * toNum(m.custo_unit);
        });
        const catSorted = Object.entries(catMap).sort((a, b) => b[1].valorTotal - a[1].valorTotal);
        const totalItens = materiais.length;
        const totalQtd = materiais.reduce((s, m) => s + toNum(m.quantidade), 0);
        const totalValor = materiais.reduce((s, m) => s + toNum(m.quantidade) * toNum(m.custo_unit), 0);
        const esgotados = materiais.filter((m) => m.status === "esgotado").length;
        const abaixoMin = materiais.filter((m) => m.status === "repor").length;
        const criticos = esgotados + abaixoMin;
        const donutsCategorias = catSorted.slice(0, 6).map(([nome, d], i) => ({
          name: nome,
          value: d.valorTotal,
          color: CORES_DONUT[i % CORES_DONUT.length],
        }));
        const donutCategoriasTotal = donutsCategorias.reduce((s, d) => s + d.value, 0);

        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon="inventory_2" label="Total Materiais" value={totalItens} />
              <KpiCard icon="scale" label="Qtd. em Stock" value={totalQtd.toLocaleString("pt-AO")} />
              <KpiCard icon="payments" label="Valor Estoque" value={`Kz ${totalValor.toLocaleString("pt-AO")}`} />
              <KpiCard icon="warning" label="Críticos" value={`${criticos}`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">Resumo por Categoria</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => gerarRelatorioStockPDF(materiais, categorias, org)}>
                    <Icon name="picture_as_pdf" className="text-sm" />
                    PDF
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Categoria</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Itens</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Qtd.</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Disponível</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catSorted.map(([nome, d]) => {
                          const famCfg = familias[d.familia];
                          return (
                            <tr key={nome} className="border-b">
                              <td className="px-3 py-2.5 flex items-center gap-2">
                                {famCfg && <Icon name={famCfg.icon} className="text-sm text-muted-foreground" />}
                                <span className="font-medium">{nome}</span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-xs">{d.itens}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-xs">{d.qtd.toLocaleString("pt-AO")}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-xs">{d.disponivel.toLocaleString("pt-AO")}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-xs hidden sm:table-cell">Kz {d.valorTotal.toLocaleString("pt-AO")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-medium">
                          <td className="px-3 py-2.5 text-xs">TOTAL</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs">{totalItens}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs">{totalQtd.toLocaleString("pt-AO")}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs">{totalQtd.toLocaleString("pt-AO")}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs hidden sm:table-cell">Kz {totalValor.toLocaleString("pt-AO")}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <CartaoGrafico icon="pie_chart" titulo="Valor de Stock por Categoria" sub="Top 6 categorias por valor">
                <DonutGrafico
                  dados={donutsCategorias}
                  centro={donutCategoriasTotal > 0 ? compactKz(donutCategoriasTotal) : "0"}
                  tooltipFormat={(v) => fmtKz(v)}
                />
                <div className="mt-3 space-y-2">
                  {donutsCategorias.map((d) => (
                    <div key={d.name} className="flex items-center justify-between gap-2">
                      <LinhaDonut cor={d.color} nome={d.name} valor="" />
                      <span className="font-mono font-bold text-sm shrink-0">{compactKz(d.value)}</span>
                    </div>
                  ))}
                </div>
              </CartaoGrafico>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-semibold text-emerald-500">{materiais.filter((m) => m.status === "ok").length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Saudáveis</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-semibold text-amber-500">{abaixoMin}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Abaixo do Mínimo</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-semibold text-red-500">{esgotados}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Esgotados</p>
                </CardContent>
              </Card>
            </div>

            {criticos > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Itens Críticos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {materiais.filter((m) => m.status === "esgotado" || m.status === "repor").map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded border">
                        <div className="flex items-center gap-2">
                          <Icon name={m.status === "esgotado" ? "error" : "warning"} className={`text-sm ${m.status === "esgotado" ? "text-red-500" : "text-amber-500"}`} />
                          <span className="text-sm font-medium">{m.nome}</span>
                          <span className="text-xs text-muted-foreground">{m.categoria?.nome || ""}</span>
                        </div>
                        <span className={`text-xs font-mono font-medium ${m.status === "esgotado" ? "text-red-500" : "text-amber-500"}`}>
                          {toNum(m.estoque_disponivel).toLocaleString("pt-AO")} / {toNum(m.ponto_ressuprimento || m.estoque_min).toLocaleString("pt-AO")} {m.unidade}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}

      {aba === "recursos" && (() => {
        const fams = new Map();
        const grupos = new Map();
        const resolverGrupo = (c) => tiposItem[normalizarTipoItem(c.tipo)]?.label || String(c.tipo || "").trim() || "Sem grupo";
        categorias.forEach((c) => {
          const fam = normalizarFamilia(c.familia);
          const famCfg = familias[fam];
          if (!fams.has(fam)) fams.set(fam, { value: fam, label: famCfg?.label || c.familia || fam });
          const gLabel = resolverGrupo(c);
          if (!grupos.has(gLabel)) grupos.set(gLabel, { value: gLabel, label: gLabel });
        });
        const opcoesFamilias = [...fams.values()].sort((a, b) => a.label.localeCompare(b.label, "pt"));
        const opcoesGrupos = [...grupos.values()].sort((a, b) => a.label.localeCompare(b.label, "pt"));

        const categoriasFiltradas = categorias.filter((c) => {
          const fam = normalizarFamilia(c.familia);
          return (filtroFamilia === "todas" || fam === filtroFamilia) && (filtroGrupo === "todas" || resolverGrupo(c) === filtroGrupo);
        });

        const catMap = {};
        categoriasFiltradas.forEach((c) => {
          const fam = normalizarFamilia(c.familia);
          if (!catMap[fam]) catMap[fam] = [];
          catMap[fam].push(c);
        });

        // ── Distribuições (Grupo / Família / Subfamília) ──
        const porGrupo = {};
        const porFamilia = {};
        const porSubfamilia = {};

        categoriasFiltradas.forEach((c) => {
          const grupoLabel = resolverGrupo(c);
          porGrupo[grupoLabel] = (porGrupo[grupoLabel] || 0) + 1;

          const famCfg = familias[normalizarFamilia(c.familia)];
          const famLabel = famCfg?.label || c.familia || "Sem família";
          porFamilia[famLabel] = (porFamilia[famLabel] || 0) + 1;

          const sub = String(c.subfamilia || "").trim() || "Sem subfamília";
          porSubfamilia[sub] = (porSubfamilia[sub] || 0) + 1;
        });

        const ordenar = (obj) =>
          Object.entries(obj)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value], i) => ({
              name,
              value,
              color: CORES_DONUT[i % CORES_DONUT.length],
            }));

        const listaGrupos = ordenar(porGrupo);
        const listaFamilias = ordenar(porFamilia);
        const listaSubfamilias = ordenar(porSubfamilia);

        const totalGrupos = listaGrupos.reduce((s, d) => s + d.value, 0);
        const totalFamilias = listaFamilias.reduce((s, d) => s + d.value, 0);
        const totalSubfamilias = listaSubfamilias.reduce((s, d) => s + d.value, 0);

        const cortarNome = (v) => (String(v).length > 11 ? `${String(v).slice(0, 10)}…` : String(v));

        const temFiltro = filtroFamilia !== "todas" || filtroGrupo !== "todas";
        const nomesCatsFiltradas = new Set(categoriasFiltradas.map((c) => c.nome));
        const materiaisFiltrados = temFiltro
          ? materiais.filter((m) => nomesCatsFiltradas.has(m.categoria?.nome))
          : materiais;

        const pillCls = (ativo) => `pill transition-colors ${ativo ? "nav-pill" : "pill-muted hover:border-primary hover:text-primary"}`;

        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon="category" label="Categorias" value={categoriasFiltradas.length} />
              <KpiCard icon="folder_open" label="Famílias" value={Object.keys(catMap).length} />
              <KpiCard icon="inventory_2" label="Materiais" value={materiaisFiltrados.length} />
              <KpiCard icon="people" label="Cadastros" value={clientes.length} />
            </div>

            {/* ─────────── FILTROS (Família / Grupo) ─────────── */}
            <div className="bg-card border border-border rounded-2xl shadow-card p-3 sm:p-4 space-y-2">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 leading-7">Família:</span>
                <button type="button" onClick={() => setFiltroFamilia("todas")} className={pillCls(filtroFamilia === "todas")}>Todas</button>
                {opcoesFamilias.map((f) => (
                  <button key={f.value} type="button" onClick={() => setFiltroFamilia(filtroFamilia === f.value ? "todas" : f.value)} className={pillCls(filtroFamilia === f.value)}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 leading-7">Grupo:</span>
                <button type="button" onClick={() => setFiltroGrupo("todas")} className={pillCls(filtroGrupo === "todas")}>Todos</button>
                {opcoesGrupos.map((g) => (
                  <button key={g.value} type="button" onClick={() => setFiltroGrupo(filtroGrupo === g.value ? "todas" : g.value)} className={pillCls(filtroGrupo === g.value)}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ─────────── 3 GRÁFICOS DISTINTOS (Grupo / Família / Subfamília) ─────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              <CartaoGrafico icon="bar_chart" titulo="Grupo" sub="Categorias por grupo">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={listaGrupos} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 10 }} dy={4} interval={0} tickFormatter={cortarNome} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={40} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip formato={(v) => `${v} categoria${v === 1 ? "" : "s"}`} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                      <Bar dataKey="value" name="Categorias" radius={[6, 6, 0, 0]} maxBarSize={34}>
                        {listaGrupos.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {listaGrupos.map((d) => (
                    <LinhaDonut key={d.name} cor={d.color} nome={d.name} valor={`${d.value} (${Math.round((d.value / (totalGrupos || 1)) * 100)}%)`} />
                  ))}
                </div>
              </CartaoGrafico>

              <CartaoGrafico icon="folder" titulo="Família" sub="Categorias por família">
                <DonutGrafico dados={listaFamilias} centro={String(totalFamilias)} tooltipFormat={(v) => `${v} categoria${v === 1 ? "" : "s"}`} />
                <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {listaFamilias.map((d) => (
                    <LinhaDonut key={d.name} cor={d.color} nome={d.name} valor={`${d.value} (${Math.round((d.value / (totalFamilias || 1)) * 100)}%)`} />
                  ))}
                </div>
              </CartaoGrafico>

              <CartaoGrafico icon="sell" titulo="Subfamília" sub="Categorias por subfamília">
                <div className="mt-3 space-y-3 pr-1 max-h-56 overflow-y-auto">
                  {listaSubfamilias.map((d) => {
                    const pct = Math.round((d.value / (totalSubfamilias || 1)) * 100);
                    return (
                      <div key={d.name}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="flex-1 min-w-0 text-sm text-foreground truncate">{d.name}</span>
                          <span className="font-mono font-bold text-sm text-foreground shrink-0">{d.value} · {pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: d.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CartaoGrafico>
            </div>

            {/* Botão de exportação PDF do relatório de categorias */}
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => gerarRelatorioCategoriasPDF(categorias, materiais, org)}>
                <Icon name="picture_as_pdf" className="text-sm" /> Exportar Categorias PDF
              </Button>
            </div>
          </>
        );
      })()}

      <footer className="pt-4 text-center border-t">
        <p className="text-xs text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}