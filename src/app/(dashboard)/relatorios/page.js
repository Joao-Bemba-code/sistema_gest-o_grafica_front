"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/Icon";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Modal from "@/components/Modal";
import KpiCard from "@/components/ui/KpiCard";
import MultiSelect from "@/components/ui/MultiSelect";
import FiltroChips from "@/components/ui/FiltroChips";
import { Ledger, LedgerHeader, LedgerTable, LedgerTh, LedgerTr, LedgerTd, StatusBadge, LedgerEmpty } from "@/components/ui/Ledger";
import { useToast } from "@/components/Toast";
import { listarOrdens } from "@/services/producao";
import { listar } from "@/services/clientes";
import { listar as listarFaturas } from "@/services/faturacao";
import { listar as listarMateriais } from "@/services/materiais";
import { listar as listarCategorias } from "@/services/categorias";
import { resumoTesouraria } from "@/services/tesouraria";
import { gerarRelatorioStockPDF, gerarRelatorioCadastrosPDF, gerarRelatorioCategoriasPDF, gerarRelatorioFaturacoesPDF, gerarRelatorioProducaoPDF } from "@/lib/estoquePdf";
import { exportarRelatorioExcel, exportarRelatorioPDF } from "@/lib/relatoriosExport";
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

const ESTADOS_FATURA = [
  { value: "emitida", label: "Emitida", cor: "#0369a1", icon: "receipt_long" },
  { value: "parcial", label: "Pagamento parcial", cor: "#b45309", icon: "payments" },
  { value: "paga", label: "Paga", cor: "#047857", icon: "check_circle" },
  { value: "cancelada", label: "Cancelada", cor: "#b91c1c", icon: "block" },
];

const TIPOS_FATURA = [
  { value: "factura", label: "Fatura", cor: "#4338ca", icon: "receipt_long" },
  { value: "factura_recibo", label: "Factura-recibo", cor: "#0ea5e9", icon: "receipt" },
  { value: "recibo", label: "Recibo", cor: "#14b8a6", icon: "request_quote" },
];

const ESTADOS_ORDEM = [
  { value: "aguardando", label: "Aguardando", cor: "#f59e0b", icon: "schedule" },
  { value: "em_producao", label: "Em produção", cor: "#4338ca", icon: "precision_manufacturing" },
  { value: "finalizado", label: "Finalizado", cor: "#047857", icon: "check_circle" },
  { value: "entregue", label: "Entregue", cor: "#a855f7", icon: "local_shipping" },
];

const STATUS_MATERIAL = [
  { value: "ok", label: "Saudável", cor: "#047857", icon: "check_circle" },
  { value: "repor", label: "Abaixo do mínimo", cor: "#b45309", icon: "warning" },
  { value: "esgotado", label: "Esgotado", cor: "#b91c1c", icon: "error" },
];

const COR_RELATORIO = "#0066CC";

const MODULOS_REL = [
  { value: "comercial", label: "Comercial", icon: "trending_up" },
  { value: "producao", label: "Produção", icon: "precision_manufacturing" },
  { value: "stocks", label: "Stocks", icon: "inventory_2" },
  { value: "financeiro", label: "Financeiro", icon: "account_balance" },
  { value: "tesouraria", label: "Tesouraria", icon: "savings" },
];

const tabClsBase =
  "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-2 text-sm font-medium transition-colors";
const tabClsAtiva = "border-blue-600 font-bold text-blue-600";
const tabClsInativa = "border-transparent text-muted-foreground hover:text-foreground";

const botaoPdfCls =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100";
const botaoExcelCls =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100";

function variacaoDe(serie) {
  if (!Array.isArray(serie) || serie.length < 2) return null;
  const anterior = Number(serie[serie.length - 2]?.valor) || 0;
  const atual = Number(serie[serie.length - 1]?.valor) || 0;
  if (!anterior) return atual ? 100 : null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

function PainelFiltros({ icon, titulo, acoes, children }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
            <Icon name={icon} className="text-base text-muted-foreground" />
          </span>
          <p className="truncate text-sm font-semibold text-foreground">{titulo}</p>
        </div>
        {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, formato }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs space-y-1">
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
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
        <Icon name={icon} className="text-lg text-muted-foreground" />
      </span>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground">{titulo}</h3>
        {sub && <p className="truncate text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function CartaoGrafico({ icon, titulo, sub, children, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-card ${className}`}>
      <CabecalhoGrafico icon={icon} titulo={titulo} sub={sub} />
      <div className="p-4">{children}</div>
    </section>
  );
}

function TabsPills({ opcoes, valor, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
      {opcoes.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            valor === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.icon && <Icon name={o.icon} className="text-sm" />}
          {o.label}
        </button>
      ))}
    </div>
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
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} dy={4} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={52} tickFormatter={formato} allowDecimals={false} />
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
  const [filtroFamilias, setFiltroFamilias] = useState([]);
  const [filtroGrupos, setFiltroGrupos] = useState([]);
  const [filtroEstadosFatura, setFiltroEstadosFatura] = useState([]);
  const [filtroTiposFatura, setFiltroTiposFatura] = useState([]);
  const [filtroEstadosOrdem, setFiltroEstadosOrdem] = useState([]);
  const [filtroStatusMaterial, setFiltroStatusMaterial] = useState([]);
  const [filtroFamiliasMateriais, setFiltroFamiliasMateriais] = useState([]);
  const [busca, setBusca] = useState("");
  const [tesouraria, setTesouraria] = useState(null);
  const [relatorioId, setRelatorioId] = useState(null);
  const [relatorioVer, setRelatorioVer] = useState(null);
  const { addToast } = useToast();

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [ords, clis, fats, mats, cats, o, tes] = await Promise.all([
        listarOrdens(),
        listar(),
        listarFaturas(),
        listarMateriais(),
        listarCategorias(),
        buscarOrganizacao(),
        resumoTesouraria().catch(() => null)
      ]);
      setOrdens(Array.isArray(ords) ? ords : ords?.ordens || []);
      setClientes(Array.isArray(clis) ? clis : clis?.data || []);
      setFaturas(Array.isArray(fats) ? fats : fats?.data || []);
      setMateriais(Array.isArray(mats) ? mats : []);
      setCategorias(Array.isArray(cats) ? cats : []);
      setOrg(o || {});
      setTesouraria(tes || null);
    } catch (err) {
      setError(err.message);
      addToast(err.response?.data?.erro || "Erro ao carregar relatórios", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const t = setTimeout(() => carregarDados(), 0);
    return () => clearTimeout(t);
  }, [carregarDados]);

  const ultimosMeses = useMemo(() => getUltimos6Meses(), []);

  const contagemEstadosFatura = useMemo(() => {
    const m = {};
    faturas.forEach((f) => { m[f.estado] = (m[f.estado] || 0) + 1; });
    return m;
  }, [faturas]);

  const contagemTiposFatura = useMemo(() => {
    const m = {};
    faturas.forEach((f) => { m[f.tipo] = (m[f.tipo] || 0) + 1; });
    return m;
  }, [faturas]);

  const faturasFiltradas = useMemo(() => {
    return faturas.filter((f) => {
      const eOk = filtroEstadosFatura.length === 0 || filtroEstadosFatura.includes(f.estado);
      const tOk = filtroTiposFatura.length === 0 || filtroTiposFatura.includes(f.tipo);
      return eOk && tOk;
    });
  }, [faturas, filtroEstadosFatura, filtroTiposFatura]);

  const contagemEstadosOrdem = useMemo(() => {
    const m = {};
    ordens.forEach((o) => { const e = o.estado || o.status; m[e] = (m[e] || 0) + 1; });
    return m;
  }, [ordens]);

  const ordensFiltradas = useMemo(() => {
    return ordens.filter((o) => filtroEstadosOrdem.length === 0 || filtroEstadosOrdem.includes(o.estado || o.status));
  }, [ordens, filtroEstadosOrdem]);

  const contagemStatusMaterial = useMemo(() => {
    const m = {};
    materiais.forEach((mat) => { m[mat.status] = (m[mat.status] || 0) + 1; });
    return m;
  }, [materiais]);

  const opcoesFamiliasMateriais = useMemo(() => {
    const map = new Map();
    materiais.forEach((mat) => {
      const fam = normalizarFamilia(mat.categoria?.familia);
      const famCfg = familias[fam];
      if (!map.has(fam)) map.set(fam, { value: fam, label: famCfg?.label || mat.categoria?.familia || fam });
    });
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "pt"));
  }, [materiais]);

  const materiaisFiltrados = useMemo(() => {
    return materiais.filter((mat) => {
      const sOk = filtroStatusMaterial.length === 0 || filtroStatusMaterial.includes(mat.status);
      const fOk = filtroFamiliasMateriais.length === 0 || filtroFamiliasMateriais.includes(normalizarFamilia(mat.categoria?.familia));
      return sOk && fOk;
    });
  }, [materiais, filtroStatusMaterial, filtroFamiliasMateriais]);

  const vendasPorMes = useMemo(() => {
    const hoje = new Date();
    const mesesIndices = ultimosMeses.map((m) => m.mes);
    const counts = ultimosMeses.map((m) => ({ mes: m.mes, label: m.label, valor: 0, quantidade: 0 }));
    faturasFiltradas.forEach((f) => {
      const d = f.data_emissao ? new Date(f.data_emissao) : null;
      if (d && !isNaN(d.getTime()) && d.getFullYear() === hoje.getFullYear() && mesesIndices.includes(d.getMonth())) {
        const idx = ultimosMeses.findIndex((m) => m.mes === d.getMonth());
        counts[idx].valor += Number(f.total || f.valor) || 0;
        counts[idx].quantidade += 1;
      }
    });
    return counts;
  }, [faturasFiltradas, ultimosMeses]);

  const recebidoPorMes = useMemo(() => {
    const hoje = new Date();
    const mesesIndices = ultimosMeses.map((m) => m.mes);
    const counts = ultimosMeses.map((m) => ({ mes: m.mes, label: m.label, valor: 0, quantidade: 0 }));
    faturasFiltradas.forEach((f) => {
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
  }, [faturasFiltradas, ultimosMeses]);

  const recebidoHoje = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    return faturasFiltradas
      .filter((f) => f.estado === "paga" && (f.data_pagamento || f.data_emissao) === hoje)
      .reduce((s, f) => s + (Number(f.valor_pago || f.total || f.valor) || 0), 0);
  }, [faturasFiltradas]);

  const recebidoMes = useMemo(() => {
    const hoje = new Date();
    return faturasFiltradas
      .filter((f) => {
        if (f.estado !== "paga") return false;
        const d = new Date(f.data_pagamento || f.data_emissao);
        return !isNaN(d.getTime()) && d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
      })
      .reduce((s, f) => s + (Number(f.valor_pago || f.total || f.valor) || 0), 0);
  }, [faturasFiltradas]);

  const clientesTop = useMemo(() => {
    const map = {};
    faturasFiltradas.forEach((f) => {
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
  }, [faturasFiltradas]);

  const clientesTotal = useMemo(() => clientesTop.reduce((s, c) => s + c.total, 0), [clientesTop]);

  const producaoPorMes = useMemo(() => {
    const hoje = new Date();
    const mesesIndices = ultimosMeses.map((m) => m.mes);
    const result = {};
    mesesIndices.forEach((mesIdx) => {
      const ordensMes = ordensFiltradas.filter((o) => {
        const d = o.data_entrada ? new Date(o.data_entrada) : null;
        return d && !isNaN(d.getTime()) && d.getFullYear() === hoje.getFullYear() && d.getMonth() === mesIdx;
      });
      const produzidas = ordensMes.length;
      const entregues = ordensMes.filter((o) => (o.estado || o.status) === "entregue").length;
      result[mesIdx] = { produzidas, entregues, pct: produzidas > 0 ? Math.round((entregues / produzidas) * 100) : 0 };
    });
    return result;
  }, [ordensFiltradas, ultimosMeses]);

  const opsPorStatus = useMemo(() => ["aguardando", "em_producao", "finalizado", "entregue"].map((s) => ({
    status: s,
    label: s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    quantidade: ordensFiltradas.filter(o => (o.estado || o.status) === s).length,
  })), [ordensFiltradas]);

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

  const categoriasStock = useMemo(() => {
    const map = {};
    materiais.forEach((m) => {
      const cat = m.categoria?.nome || "Sem categoria";
      if (!map[cat]) map[cat] = { itens: 0, qtd: 0, valor: 0 };
      map[cat].itens += 1;
      map[cat].qtd += toNum(m.quantidade);
      map[cat].valor += toNum(m.quantidade) * toNum(m.custo_unit);
    });
    return Object.entries(map)
      .map(([nome, d]) => ({ nome, ...d }))
      .sort((a, b) => b.valor - a.valor);
  }, [materiais]);

  const tesourariaPorMes = useMemo(() => {
    const hoje = new Date();
    const counts = ultimosMeses.map((m) => ({ label: m.label, mes: m.mes, entradas: 0, saidas: 0 }));
    const movs = Array.isArray(tesouraria?.movimentos) ? tesouraria.movimentos : [];
    movs.forEach((mov) => {
      const raw = mov.data_movimento || mov.data;
      const d = raw ? new Date(raw) : null;
      if (!d || isNaN(d.getTime()) || d.getFullYear() !== hoje.getFullYear()) return;
      const idx = ultimosMeses.findIndex((m) => m.mes === d.getMonth());
      if (idx < 0) return;
      const v = Number(mov.valor) || 0;
      if (mov.tipo === "entrada") counts[idx].entradas += v;
      else if (mov.tipo === "saida") counts[idx].saidas += v;
    });
    return counts;
  }, [tesouraria, ultimosMeses]);

  const contasTesouraria = useMemo(
    () => (Array.isArray(tesouraria?.contas) ? tesouraria.contas : []),
    [tesouraria]
  );

  const relatorios = useMemo(() => {
    const texto = (r, v) => (r.formato || ((x) => String(Math.round(Number(x) || 0))))(v);
    const mk = (r) => ({
      id: r.id,
      titulo: r.titulo,
      icon: r.icon,
      sub: r.sub || "Total calculado com base nos dados actuais.",
      serie: r.serie || [],
      total: r.total,
      totalTexto: texto(r, r.total),
      variacao: r.variacao ?? null,
      formato: r.formato,
      formatoAxis: r.formatoAxis,
      cor: r.cor || COR_RELATORIO,
      colunas: r.colunas || ["Item", "Valor"],
      linhas: r.linhas || [],
      onExportPdf: () =>
        exportarRelatorioPDF({
          titulo: r.titulo,
          org,
          cabecalhos: r.colunas || ["Item", "Valor"],
          linhas: r.linhas || [],
          resumo: [`Total: ${texto(r, r.total)}`],
        }),
      onExportExcel: () => exportarRelatorioExcel(r.titulo, r.colunas || ["Item", "Valor"], r.linhas || []),
    });

    const soma = (arr, campo) => arr.reduce((s, x) => s + (Number(x[campo]) || 0), 0);

    const vendasSerie = vendasPorMes.map((v) => ({ label: v.label, valor: v.valor }));
    const totalVendas = soma(vendasSerie, "valor");
    const recebidoSerie = recebidoPorMes.map((v) => ({ label: v.label, valor: v.valor }));
    const totalRecebido = soma(recebidoSerie, "valor");
    const docsSerie = vendasPorMes.map((v) => ({ label: v.label, valor: v.quantidade }));
    const clientesSerie = clientesTop.map((c) => ({ label: c.nome, valor: c.total }));
    const totalClientesTop = soma(clientesSerie, "valor");

    const prodSerie = ultimosMeses.map((m) => ({ label: m.label, valor: (producaoPorMes[m.mes] || { produzidas: 0 }).produzidas }));
    const entrSerie = ultimosMeses.map((m) => ({ label: m.label, valor: (producaoPorMes[m.mes] || { entregues: 0 }).entregues }));
    const pctSerie = ultimosMeses.map((m) => ({ label: m.label, valor: (producaoPorMes[m.mes] || { pct: 0 }).pct }));
    const statusSerie = opsPorStatus.map((s) => ({ label: s.label, valor: s.quantidade }));

    const catsValorSerie = categoriasStock.map((c) => ({ label: c.nome, valor: c.valor }));
    const catsItensSerie = categoriasStock.map((c) => ({ label: c.nome, valor: c.itens }));
    const catsQtdSerie = categoriasStock.map((c) => ({ label: c.nome, valor: c.qtd }));
    const matStatusSerie = STATUS_MATERIAL.map((s) => ({ label: s.label, valor: contagemStatusMaterial[s.value] || 0 }));

    const finEstadoSerie = ESTADOS_FATURA.map((s) => ({ label: s.label, valor: contagemEstadosFatura[s.value] || 0 }));
    const despesasSerie = tesourariaPorMes.map((m) => ({ label: m.label, valor: m.saidas }));
    const entradasSerie = tesourariaPorMes.map((m) => ({ label: m.label, valor: m.entradas }));
    const saidasSerie = tesourariaPorMes.map((m) => ({ label: m.label, valor: m.saidas }));
    const contasSerie = contasTesouraria.map((c) => ({ label: c.nome || `Conta #${c.id}`, valor: Number(c.saldo_atual) || 0 }));

    const porModulo = {
      comercial: [
        mk({
          id: "vendas-periodo", titulo: "Vendas por período", icon: "trending_up",
          sub: "Total acumulado nos últimos 6 meses",
          serie: vendasSerie, total: totalVendas, variacao: variacaoDe(vendasSerie), formato: fmtKz, formatoAxis: compactKz,
          colunas: ["Período", "Valor", "Documentos"],
          linhas: vendasPorMes.map((v) => [v.label, fmtKz(v.valor), v.quantidade]),
        }),
        mk({
          id: "clientes-activos", titulo: "Clientes mais activos", icon: "workspace_premium",
          sub: "Clientes com maior faturação.",
          serie: clientesSerie, total: totalClientesTop, formato: fmtKz, formatoAxis: compactKz,
          colunas: ["Cliente", "Faturação"],
          linhas: clientesTop.map((c) => [c.nome, fmtKz(c.total)]),
        }),
        mk({
          id: "documentos", titulo: "Documentos emitidos", icon: "receipt_long",
          sub: "Documentos emitidos nos últimos 6 meses.",
          serie: docsSerie, total: soma(docsSerie, "valor"), variacao: variacaoDe(docsSerie),
          colunas: ["Período", "Documentos"], linhas: vendasPorMes.map((v) => [v.label, v.quantidade]),
        }),
        mk({
          id: "recebimentos", titulo: "Recebimentos", icon: "payments",
          sub: "Faturas pagas nos últimos 6 meses.",
          serie: recebidoSerie, total: totalRecebido, variacao: variacaoDe(recebidoSerie), formato: fmtKz, formatoAxis: compactKz,
          colunas: ["Período", "Recebido", "Documentos"],
          linhas: recebidoPorMes.map((v) => [v.label, fmtKz(v.valor), v.quantidade]),
        }),
      ],
      producao: [
        mk({
          id: "ordens-periodo", titulo: "Ordens por período", icon: "precision_manufacturing",
          sub: "Ordens de produção registadas nos últimos 6 meses.",
          serie: prodSerie, total: soma(prodSerie, "valor"), variacao: variacaoDe(prodSerie),
          colunas: ["Período", "Ordens"], linhas: prodSerie.map((x) => [x.label, x.valor]),
        }),
        mk({
          id: "entregas-periodo", titulo: "Entregas por período", icon: "local_shipping",
          sub: "Ordens entregues nos últimos 6 meses.",
          serie: entrSerie, total: soma(entrSerie, "valor"), variacao: variacaoDe(entrSerie),
          colunas: ["Período", "Entregues"], linhas: entrSerie.map((x) => [x.label, x.valor]),
        }),
        mk({
          id: "taxa-entrega", titulo: "Taxa de entrega", icon: "show_chart",
          sub: "Percentagem de ordens entregues nos últimos 6 meses.",
          serie: pctSerie, total: pctSerie.length ? pctSerie[pctSerie.length - 1].valor : 0,
          formato: (v) => `${Math.round(Number(v) || 0)}%`,
          colunas: ["Período", "Taxa (%)"], linhas: pctSerie.map((x) => [x.label, `${x.valor}%`]),
        }),
        mk({
          id: "ordens-estado", titulo: "Ordens por estado", icon: "pie_chart",
          sub: "Distribuição das ordens por estado.",
          serie: statusSerie, total: soma(statusSerie, "valor"),
          colunas: ["Estado", "Ordens"], linhas: statusSerie.map((x) => [x.label, x.valor]),
        }),
      ],
      stocks: [
        mk({
          id: "valor-stock-categoria", titulo: "Valor de stock por categoria", icon: "savings",
          sub: "Valor de inventário por categoria de material.",
          serie: catsValorSerie, total: soma(catsValorSerie, "valor"), formato: fmtKz, formatoAxis: compactKz,
          colunas: ["Categoria", "Valor"], linhas: categoriasStock.map((c) => [c.nome, fmtKz(c.valor)]),
        }),
        mk({
          id: "itens-categoria", titulo: "Itens por categoria", icon: "category",
          sub: "Número de materiais por categoria.",
          serie: catsItensSerie, total: soma(catsItensSerie, "valor"),
          colunas: ["Categoria", "Itens"], linhas: categoriasStock.map((c) => [c.nome, c.itens]),
        }),
        mk({
          id: "qtd-categoria", titulo: "Quantidade em stock por categoria", icon: "inventory_2",
          sub: "Quantidade total de material em stock por categoria.",
          serie: catsQtdSerie, total: soma(catsQtdSerie, "valor"),
          formato: (v) => Number(v || 0).toLocaleString("pt-AO"),
          colunas: ["Categoria", "Quantidade"], linhas: categoriasStock.map((c) => [c.nome, c.qtd.toLocaleString("pt-AO")]),
        }),
        mk({
          id: "materiais-estado", titulo: "Materiais por estado", icon: "warning",
          sub: "Estado do inventário de materiais.",
          serie: matStatusSerie, total: soma(matStatusSerie, "valor"),
          colunas: ["Estado", "Materiais"], linhas: matStatusSerie.map((x) => [x.label, x.valor]),
        }),
      ],
      financeiro: [
        mk({
          id: "faturacao", titulo: "Faturação emitida", icon: "receipt_long",
          sub: "Total faturado nos últimos 6 meses.",
          serie: vendasSerie, total: totalVendas, variacao: variacaoDe(vendasSerie), formato: fmtKz, formatoAxis: compactKz,
          colunas: ["Período", "Faturação"], linhas: vendasPorMes.map((v) => [v.label, fmtKz(v.valor)]),
        }),
        mk({
          id: "recebido", titulo: "Recebido", icon: "payments",
          sub: "Valor efetivamente recebido nos últimos 6 meses.",
          serie: recebidoSerie, total: totalRecebido, variacao: variacaoDe(recebidoSerie), formato: fmtKz, formatoAxis: compactKz,
          colunas: ["Período", "Recebido"], linhas: recebidoPorMes.map((v) => [v.label, fmtKz(v.valor)]),
        }),
        mk({
          id: "docs-estado", titulo: "Documentos por estado", icon: "description",
          sub: "Distribuição dos documentos por estado.",
          serie: finEstadoSerie, total: soma(finEstadoSerie, "valor"),
          colunas: ["Estado", "Documentos"], linhas: finEstadoSerie.map((x) => [x.label, x.valor]),
        }),
        mk({
          id: "despesas", titulo: "Despesas (Tesouraria)", icon: "trending_down",
          sub: "Saídas registadas na tesouraria nos últimos 6 meses.",
          serie: despesasSerie, total: soma(despesasSerie, "valor"), variacao: variacaoDe(despesasSerie), formato: fmtKz, formatoAxis: compactKz,
          colunas: ["Período", "Saídas"], linhas: despesasSerie.map((x) => [x.label, fmtKz(x.valor)]),
        }),
      ],
      tesouraria: [
        mk({
          id: "entradas-mes", titulo: "Entradas por mês", icon: "arrow_downward",
          sub: "Entradas na tesouraria nos últimos 6 meses.",
          serie: entradasSerie, total: soma(entradasSerie, "valor"), variacao: variacaoDe(entradasSerie), formato: fmtKz, formatoAxis: compactKz,
          colunas: ["Período", "Entradas"], linhas: entradasSerie.map((x) => [x.label, fmtKz(x.valor)]),
        }),
        mk({
          id: "saidas-mes", titulo: "Saídas por mês", icon: "arrow_upward",
          sub: "Saídas na tesouraria nos últimos 6 meses.",
          serie: saidasSerie, total: soma(saidasSerie, "valor"), variacao: variacaoDe(saidasSerie), formato: fmtKz, formatoAxis: compactKz,
          colunas: ["Período", "Saídas"], linhas: saidasSerie.map((x) => [x.label, fmtKz(x.valor)]),
        }),
        mk({
          id: "saldo-contas", titulo: "Saldo por conta", icon: "account_balance_wallet",
          sub: "Saldo atual por conta bancária e caixa.",
          serie: contasSerie, total: soma(contasSerie, "valor"), formato: fmtKz, formatoAxis: compactKz,
          colunas: ["Conta", "Saldo"], linhas: contasSerie.map((x) => [x.label, fmtKz(x.valor)]),
        }),
      ],
    };

    return porModulo[aba] || [];
  }, [
    aba, org, vendasPorMes, recebidoPorMes, clientesTop, producaoPorMes, opsPorStatus,
    ultimosMeses, categoriasStock, contagemStatusMaterial, contagemEstadosFatura, tesourariaPorMes,
    contasTesouraria,
  ]);

  const relatorioAtivo = relatorios.find((r) => r.id === relatorioId) || relatorios[0] || null;

  return (
    <div className="space-y-5">
      {/* Faixa do módulo - identificação Relatórios (azul) */}
      <div className="flex items-center justify-between rounded-xl bg-[#0066CC] px-5 py-2.5 text-white shadow-sm">
        <span className="text-lg font-extrabold uppercase tracking-wide">10. RELATÓRIOS</span>
        <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-blue-100 sm:block">
          Sistema Integrado de Gestão Empresarial
        </span>
      </div>

      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Relatórios e Análises</h1>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">Informação para melhores decisões.</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border">
        {MODULOS_REL.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => { setAba(m.value); setRelatorioId(null); }}
            aria-pressed={aba === m.value}
            className={`${tabClsBase} ${aba === m.value ? tabClsAtiva : tabClsInativa}`}
          >
            <Icon name={m.icon} className="text-base" /> {m.label}
          </button>
        ))}
      </div>

      {relatorios.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="overflow-hidden rounded-xl border border-border bg-card lg:col-span-5">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Icon name="description" className="text-base text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Relatórios Disponíveis</h2>
            </div>
            <ul className="space-y-1 p-3">
              {relatorios.map((r) => {
                const ativo = relatorioAtivo?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setRelatorioId(r.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-all ${
                        ativo ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100/80" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        ativo ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        <Icon name={r.icon} className="text-sm" />
                      </span>
                      <span className={`min-w-0 flex-1 truncate ${ativo ? "font-semibold text-blue-900" : "font-medium"}`}>{r.titulo}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card lg:col-span-7">
            {relatorioAtivo && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-slate-900">{relatorioAtivo.titulo}</h3>
                    <p className="truncate text-xs text-slate-400">{relatorioAtivo.sub}</p>
                  </div>
                  <div className="flex shrink-0 flex-col sm:items-end">
                    <p className="text-xl font-black tracking-tight text-slate-900 tabular-nums">{relatorioAtivo.totalTexto}</p>
                    {relatorioAtivo.variacao !== null && (
                      <span className={`mt-0.5 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${
                        relatorioAtivo.variacao >= 0 ? "bg-emerald-50 text-emerald-600 ring-emerald-200" : "bg-red-50 text-red-600 ring-red-200"
                      }`}>
                        <Icon name={relatorioAtivo.variacao >= 0 ? "trending_up" : "trending_down"} className="text-sm" />
                        {relatorioAtivo.variacao >= 0 ? "+" : ""}{relatorioAtivo.variacao}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-4 pt-3">
                  <div className="h-64">
                    {relatorioAtivo.serie.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={relatorioAtivo.serie} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} dy={4} interval={0} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={52} tickFormatter={relatorioAtivo.formatoAxis} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip formato={relatorioAtivo.formato} />} cursor={{ fill: "var(--muted)" }} />
                          <Bar dataKey="valor" name={relatorioAtivo.titulo} radius={[6, 6, 0, 0]} maxBarSize={54} fill={relatorioAtivo.cor} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border">
                        <p className="text-sm text-muted-foreground">Sem dados suficientes para este relatório.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setRelatorioVer(relatorioAtivo)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
                  >
                    <Icon name="visibility" className="text-sm text-slate-500" /> Visualizar
                  </button>
                  <button type="button" onClick={relatorioAtivo.onExportPdf} className={botaoPdfCls}>
                    <Icon name="picture_as_pdf" className="text-sm text-red-600" /> Exportar PDF
                  </button>
                  <button type="button" onClick={relatorioAtivo.onExportExcel} className={botaoExcelCls}>
                    <Icon name="grid_on" className="text-sm text-emerald-600" /> Exportar Excel
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {aba === "comercial" && (
        <>
          <PainelFiltros
              icon="filter_list"
              titulo="Filtros da Área Comercial"
              acoes={
                <button
                  type="button"
                  onClick={() => gerarRelatorioFaturacoesPDF(faturasFiltradas, org, { estados: filtroEstadosFatura, tipos: filtroTiposFatura })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <Icon name="picture_as_pdf" className="text-sm" /> Exportar PDF
                </button>
              }
            >
            <FiltroChips
              icon="info"
              titulo="Estado da Fatura"
              opcoes={ESTADOS_FATURA.map((o) => ({ ...o, count: contagemEstadosFatura[o.value] || 0 }))}
              valor={filtroEstadosFatura}
              onChange={setFiltroEstadosFatura}
              limparLabel="Todos"
            />
            <FiltroChips
              icon="description"
              titulo="Tipo de Documento"
              opcoes={TIPOS_FATURA.map((o) => ({ ...o, count: contagemTiposFatura[o.value] || 0 }))}
              valor={filtroTiposFatura}
              onChange={setFiltroTiposFatura}
              limparLabel="Todos"
            />
          </PainelFiltros>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Recebido Hoje", value: `Kz ${recebidoHoje.toLocaleString("pt-AO")}`, icon: "today" },
              { label: "Recebido este Mês", value: `Kz ${recebidoMes.toLocaleString("pt-AO")}`, icon: "payments" },
              { label: "A Receber", value: `Kz ${faturasFiltradas.filter((f) => !["paga", "cancelada"].includes(f.estado)).reduce((s, f) => s + (Number(f.total || f.valor) || 0), 0).toLocaleString("pt-AO")}`, icon: "paid" },
              { label: "Documentos", value: faturasFiltradas.length, icon: "receipt_long" },
            ].map((kpi) => (
              <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} />
            ))}
          </div>

          <TabsPills
            valor={periodo}
            onChange={setPeriodo}
            opcoes={ultimosMeses.map((m) => ({ value: m.labelCurto, label: m.label }))}
          />

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

          <Ledger rotulo="Cadastros ledger">
            <LedgerHeader
              titulo="Cadastros"
              subtitulo={`${cadastrosFiltrados.length} de ${clientes.length} registos`}
            />
            <div className="flex flex-col gap-2.5 border-b border-border px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <TabsPills
                valor={filtroTipo}
                onChange={setFiltroTipo}
                opcoes={[
                  { value: "todos", label: `Todos (${clientes.length})`, icon: "badge" },
                  { value: "cliente", label: `Clientes (${totalClientes})`, icon: "person" },
                  { value: "fornecedor", label: `Fornecedores (${totalFornecedores})`, icon: "local_shipping" },
                ]}
              />
              <div className="flex items-center gap-1.5">
                <div className="relative w-full sm:w-64">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base" />
                  <input
                    className="w-full rounded-lg border border-border bg-card py-1.5 pl-9 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/25"
                    placeholder="Buscar..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
                {[
                  { v: "todos", label: "Todos" },
                  { v: "cliente", label: "Clientes" },
                  { v: "fornecedor", label: "Fornecedores" },
                ].map((r) => (
                  <button
                    key={r.v}
                    type="button"
                    onClick={() => gerarRelatorioCadastrosPDF(clientes, org, r.v)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <Icon name="picture_as_pdf" className="text-sm" /> {r.label}
                  </button>
                ))}
              </div>
            </div>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh>Tipo</LedgerTh>
                  <LedgerTh>Nome</LedgerTh>
                  <LedgerTh className="hidden sm:table-cell">Empresa</LedgerTh>
                  <LedgerTh>NIF</LedgerTh>
                  <LedgerTh className="hidden lg:table-cell">Email</LedgerTh>
                  <LedgerTh>Telefone</LedgerTh>
                </tr>
              </thead>
              <tbody>
                {cadastrosFiltrados.map((c, i) => (
                  <LedgerTr key={c.id || c.codigo || i}>
                    <LedgerTd>
                      <StatusBadge tom="neutral">
                        <Icon name={c.tipo === "cliente" ? "person" : "local_shipping"} className="text-xs" />
                        {c.tipo === "cliente" ? "Cliente" : "Fornecedor"}
                      </StatusBadge>
                    </LedgerTd>
                    <LedgerTd className="font-medium">{c.nome}</LedgerTd>
                    <LedgerTd className="hidden text-muted-foreground sm:table-cell">{c.empresa || "—"}</LedgerTd>
                    <LedgerTd className="font-mono text-xs text-muted-foreground">{c.nif || "—"}</LedgerTd>
                    <LedgerTd className="hidden text-xs text-muted-foreground lg:table-cell">{c.email || "—"}</LedgerTd>
                    <LedgerTd className="text-muted-foreground">{c.telefone || "—"}</LedgerTd>
                  </LedgerTr>
                ))}
              </tbody>
            </LedgerTable>
            {cadastrosFiltrados.length === 0 && (
              <LedgerEmpty icone="search_off">
                {clientes.length === 0 ? "Nenhum cadastro encontrado" : "Nenhum resultado para os filtros escolhidos"}
              </LedgerEmpty>
            )}
          </Ledger>
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
            <PainelFiltros
              icon="filter_list"
              titulo="Filtros de Produção"
              acoes={
                <button
                  type="button"
                  onClick={() => gerarRelatorioProducaoPDF(ordensFiltradas, org, { estados: filtroEstadosOrdem })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <Icon name="picture_as_pdf" className="text-sm" /> Exportar PDF
                </button>
              }
            >
              <FiltroChips
                icon="info"
                titulo="Estado da Ordem"
                opcoes={ESTADOS_ORDEM.map((o) => ({ ...o, count: contagemEstadosOrdem[o.value] || 0 }))}
                valor={filtroEstadosOrdem}
                onChange={setFiltroEstadosOrdem}
                limparLabel="Todos"
              />
            </PainelFiltros>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {opsPorStatus.map((s) => (
                <div key={s.status} className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-2xl font-semibold tabular-nums text-foreground">{s.quantidade}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
                </div>
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} dy={4} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={40} allowDecimals={false} />
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

      {aba === "stocks" && (() => {
        const catMap = {};
        materiaisFiltrados.forEach((m) => {
          const cat = m.categoria?.nome || "Sem categoria";
          const fam = normalizarFamilia(m.categoria?.familia);
          if (!catMap[cat]) catMap[cat] = { qtd: 0, valorTotal: 0, disponivel: 0, itens: 0, familia: fam };
          catMap[cat].itens += 1;
          catMap[cat].qtd += toNum(m.quantidade);
          catMap[cat].disponivel += toNum(m.estoque_disponivel);
          catMap[cat].valorTotal += toNum(m.quantidade) * toNum(m.custo_unit);
        });
        const catSorted = Object.entries(catMap).sort((a, b) => b[1].valorTotal - a[1].valorTotal);
        const totalItens = materiaisFiltrados.length;
        const totalQtd = materiaisFiltrados.reduce((s, m) => s + toNum(m.quantidade), 0);
        const totalValor = materiaisFiltrados.reduce((s, m) => s + toNum(m.quantidade) * toNum(m.custo_unit), 0);
        const esgotados = materiaisFiltrados.filter((m) => m.status === "esgotado").length;
        const abaixoMin = materiaisFiltrados.filter((m) => m.status === "repor").length;
        const criticos = esgotados + abaixoMin;
        const donutsCategorias = catSorted.slice(0, 6).map(([nome, d], i) => ({
          name: nome,
          value: d.valorTotal,
          color: CORES_DONUT[i % CORES_DONUT.length],
        }));
        const donutCategoriasTotal = donutsCategorias.reduce((s, d) => s + d.value, 0);

        const temFiltroMat = filtroStatusMaterial.length > 0 || filtroFamiliasMateriais.length > 0;

        return (
          <>
            <PainelFiltros
              icon="filter_list"
              titulo="Filtros de Provisionamento"
              acoes={
                <button
                  type="button"
                  onClick={() => gerarRelatorioStockPDF(materiaisFiltrados, categorias, org)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <Icon name="picture_as_pdf" className="text-sm" /> Exportar PDF
                </button>
              }
            >
              <FiltroChips
                icon="info"
                titulo="Estado do Material"
                opcoes={STATUS_MATERIAL.map((o) => ({ ...o, count: contagemStatusMaterial[o.value] || 0 }))}
                valor={filtroStatusMaterial}
                onChange={setFiltroStatusMaterial}
                limparLabel="Todos"
              />
              <MultiSelect
                icon="folder_open"
                value={filtroFamiliasMateriais}
                onChange={setFiltroFamiliasMateriais}
                options={opcoesFamiliasMateriais}
                placeholder="Todas as famílias"
              />
              {temFiltroMat && (
                <p className="text-[11px] text-muted-foreground">
                  A mostrar <span className="text-foreground font-medium">{materiaisFiltrados.length}</span> de {materiais.length} materiais
                  {filtroStatusMaterial.length > 0 && <> · Estados: <span className="text-foreground">{filtroStatusMaterial.join(", ")}</span></>}
                  {filtroFamiliasMateriais.length > 0 && <> · Famílias: <span className="text-foreground">{filtroFamiliasMateriais.join(", ")}</span></>}
                </p>
              )}
            </PainelFiltros>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon="inventory_2" label="Total Materiais" value={totalItens} />
              <KpiCard icon="scale" label="Qtd. em Stock" value={totalQtd.toLocaleString("pt-AO")} />
              <KpiCard icon="payments" label="Valor Estoque" value={`Kz ${totalValor.toLocaleString("pt-AO")}`} />
              <KpiCard icon="warning" label="Críticos" value={`${criticos}`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <Ledger rotulo="Resumo por categoria ledger" className="lg:col-span-2">
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <h2 className="truncate text-sm font-semibold text-foreground">Resumo por Categoria</h2>
                  <button
                    type="button"
                    onClick={() => gerarRelatorioStockPDF(materiaisFiltrados, categorias, org)}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <Icon name="picture_as_pdf" className="text-sm" />
                    PDF
                  </button>
                </div>
                <LedgerTable>
                  <thead>
                    <tr className="border-b border-border">
                      <LedgerTh>Categoria</LedgerTh>
                      <LedgerTh className="text-right">Itens</LedgerTh>
                      <LedgerTh className="text-right">Qtd.</LedgerTh>
                      <LedgerTh className="text-right">Disponível</LedgerTh>
                      <LedgerTh className="hidden text-right sm:table-cell">Valor</LedgerTh>
                    </tr>
                  </thead>
                  <tbody>
                    {catSorted.map(([nome, d]) => {
                      const famCfg = familias[d.familia];
                      return (
                        <LedgerTr key={nome}>
                          <LedgerTd>
                            <span className="flex items-center gap-2">
                              {famCfg && <Icon name={famCfg.icon} className="text-sm text-muted-foreground" />}
                              <span className="font-medium">{nome}</span>
                            </span>
                          </LedgerTd>
                          <LedgerTd className="text-right font-mono text-xs tabular-nums">{d.itens}</LedgerTd>
                          <LedgerTd className="text-right font-mono text-xs tabular-nums">{d.qtd.toLocaleString("pt-AO")}</LedgerTd>
                          <LedgerTd className="text-right font-mono text-xs tabular-nums">{d.disponivel.toLocaleString("pt-AO")}</LedgerTd>
                          <LedgerTd className="hidden text-right font-mono text-xs tabular-nums sm:table-cell">Kz {d.valorTotal.toLocaleString("pt-AO")}</LedgerTd>
                        </LedgerTr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border font-medium">
                      <LedgerTd className="text-xs">TOTAL</LedgerTd>
                      <LedgerTd className="text-right font-mono text-xs tabular-nums">{totalItens}</LedgerTd>
                      <LedgerTd className="text-right font-mono text-xs tabular-nums">{totalQtd.toLocaleString("pt-AO")}</LedgerTd>
                      <LedgerTd className="text-right font-mono text-xs tabular-nums">{totalQtd.toLocaleString("pt-AO")}</LedgerTd>
                      <LedgerTd className="hidden text-right font-mono text-xs tabular-nums sm:table-cell">Kz {totalValor.toLocaleString("pt-AO")}</LedgerTd>
                    </tr>
                  </tfoot>
                </LedgerTable>
              </Ledger>

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
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-2xl font-semibold tabular-nums text-success">{materiaisFiltrados.filter((m) => m.status === "ok").length}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Saudáveis</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-2xl font-semibold tabular-nums text-warning">{abaixoMin}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Abaixo do Mínimo</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-2xl font-semibold tabular-nums text-error">{esgotados}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Esgotados</p>
              </div>
            </div>

            {criticos > 0 && (
              <Ledger rotulo="Itens críticos ledger">
                <LedgerHeader titulo="Itens Críticos" subtitulo={`${criticos} materiais em alerta`} />
                <LedgerTable>
                  <thead>
                    <tr className="border-b border-border">
                      <LedgerTh>Material</LedgerTh>
                      <LedgerTh>Estado</LedgerTh>
                      <LedgerTh className="text-right">Disponível</LedgerTh>
                    </tr>
                  </thead>
                  <tbody>
                    {materiaisFiltrados.filter((m) => m.status === "esgotado" || m.status === "repor").map((m) => {
                      const esgotado = m.status === "esgotado";
                      return (
                        <LedgerTr key={m.id}>
                          <LedgerTd>
                            <span className="flex items-center gap-2">
                              <Icon name={esgotado ? "error" : "warning"} className={`text-sm ${esgotado ? "text-error" : "text-warning"}`} />
                              <span className="text-sm font-medium text-foreground">{m.nome}</span>
                              <span className="text-xs text-muted-foreground">{m.categoria?.nome || ""}</span>
                            </span>
                          </LedgerTd>
                          <LedgerTd>
                            <StatusBadge tom={esgotado ? "error" : "warning"}>{esgotado ? "Esgotado" : "A repor"}</StatusBadge>
                          </LedgerTd>
                          <LedgerTd className="text-right font-mono text-xs tabular-nums text-foreground">
                            {toNum(m.estoque_disponivel).toLocaleString("pt-AO")} / {toNum(m.ponto_ressuprimento || m.estoque_min).toLocaleString("pt-AO")} {m.unidade}
                          </LedgerTd>
                        </LedgerTr>
                      );
                    })}
                  </tbody>
                </LedgerTable>
              </Ledger>
            )}
          </>
        );
      })()}

      {aba === "stocks" && (() => {
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
          const famOk = filtroFamilias.length === 0 || filtroFamilias.includes(normalizarFamilia(c.familia));
          const gruOk = filtroGrupos.length === 0 || filtroGrupos.includes(resolverGrupo(c));
          return famOk && gruOk;
        });

        const catMap = {};
        categoriasFiltradas.forEach((c) => {
          const fam = normalizarFamilia(c.familia);
          if (!catMap[fam]) catMap[fam] = [];
          catMap[fam].push(c);
        });

        const idsCatsFiltradas = new Set(categoriasFiltradas.map((c) => String(c.id)));
        const temFiltro = filtroFamilias.length > 0 || filtroGrupos.length > 0;
        const itensRecursos = temFiltro
          ? materiais.filter((m) => idsCatsFiltradas.has(String(m.categoria_id))).length
          : materiais.length;

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

        const labelDeFam = (k) => opcoesFamilias.find((o) => o.value === k)?.label || k;

        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon="category" label="Categorias" value={categoriasFiltradas.length} />
              <KpiCard icon="folder_open" label="Famílias" value={Object.keys(catMap).length} />
              <KpiCard icon="sell" label="Subfamílias" value={listaSubfamilias.length} />
              <KpiCard icon="inventory_2" label="Itens" value={itensRecursos} />
            </div>

            {/* ─────────── FILTROS (Grupo / Família — multi-seleção) ─────────── */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <MultiSelect icon="category" value={filtroGrupos} onChange={setFiltroGrupos} options={opcoesGrupos} placeholder="Todos os grupos" />
                <MultiSelect icon="folder" value={filtroFamilias} onChange={setFiltroFamilias} options={opcoesFamilias} placeholder="Todas as famílias" />
                {temFiltro && (
                  <button
                    type="button"
                    onClick={() => { setFiltroFamilias([]); setFiltroGrupos([]); }}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <Icon name="close" className="text-sm text-primary" /> Limpar filtros
                  </button>
                )}
              </div>
              {temFiltro && (
                <p className="mt-2.5 text-[11px] text-muted-foreground">
                  A mostrar {categoriasFiltradas.length} de {categorias.length} categorias
                  {filtroGrupos.length > 0 && <> · Grupos: <span className="text-foreground">{filtroGrupos.join(", ")}</span></>}
                  {filtroFamilias.length > 0 && <> · Famílias: <span className="text-foreground">{filtroFamilias.map(labelDeFam).join(", ")}</span></>}
                </p>
              )}
            </div>

            {/* ─────────── 3 GRÁFICOS DISTINTOS (Grupo / Família / Subfamília) ─────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              <CartaoGrafico icon="bar_chart" titulo="Grupo" sub="Categorias por grupo">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={listaGrupos} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" tick={false} axisLine={false} height={8} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={40} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip formato={(v) => `${v} categoria${v === 1 ? "" : "s"}`} />} cursor={{ fill: "var(--muted)" }} />
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
              <button
                type="button"
                onClick={() => gerarRelatorioCategoriasPDF(categorias, materiais, org, { familias: filtroFamilias.map(labelDeFam), grupos: filtroGrupos })}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <Icon name="picture_as_pdf" className="text-sm" /> Exportar
              </button>
            </div>
          </>
        );
      })()}

      <Modal
        open={!!relatorioVer}
        onClose={() => setRelatorioVer(null)}
        title={relatorioVer?.titulo || "Relatório"}
        icon={relatorioVer?.icon || "description"}
        size="lg"
      >
        {relatorioVer && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{relatorioVer.sub}</p>
            <p className="text-lg font-extrabold tracking-tight text-foreground tabular-nums">{relatorioVer.totalTexto}</p>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  {relatorioVer.colunas.map((c, i) => (
                    <LedgerTh key={c} className={i > 0 ? "text-right" : ""}>{c}</LedgerTh>
                  ))}
                </tr>
              </thead>
              <tbody>
                {relatorioVer.linhas.map((linha, i) => (
                  <LedgerTr key={i}>
                    {linha.map((celula, j) => (
                      <LedgerTd key={j} className={j > 0 ? "text-right tabular-nums" : ""}>{celula}</LedgerTd>
                    ))}
                  </LedgerTr>
                ))}
              </tbody>
            </LedgerTable>
            {relatorioVer.linhas.length === 0 && (
              <LedgerEmpty icone="bar_chart">Sem dados para apresentar</LedgerEmpty>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}