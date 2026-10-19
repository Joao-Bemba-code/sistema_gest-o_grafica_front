"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { listar as listarFaturas } from "@/services/faturacao";
import { listarOrdens } from "@/services/producao";
import { listar as listarMateriais } from "@/services/materiais";
import { listar as listarPedidos } from "@/services/pedidos";
import { listar as listarMaquinas } from "@/services/maquinas";
import { listarMovimentos } from "@/services/tesouraria";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  LuCalendar,
  LuChevronDown,
  LuChartColumn,
  LuCog,
  LuShoppingCart,
  LuBox,
  LuCreditCard,
  LuOctagonAlert,
  LuTriangleAlert,
  LuBriefcase,
  LuUserPlus,
  LuFilePlus2,
  LuCheck,
} from "react-icons/lu";

const DIA_MS = 86400000;

function formatNum(v) {
  return Number(v || 0).toLocaleString("pt-AO");
}

function dataFatura(f) {
  const d = new Date(f.data_emissao || f.data || f.createdAt);
  return isNaN(d.getTime()) ? null : d;
}

function dataOrdem(o) {
  const d = new Date(o.createdAt);
  return isNaN(d.getTime()) ? null : d;
}

function dataPedido(p) {
  const d = p.data_pedido ? new Date(p.data_pedido) : p.createdAt ? new Date(p.createdAt) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

function parseDataISO(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, d);
}

function parseDataEntrega(o) {
  if (!o.data_entrega) return null;
  const [y, m, d] = String(o.data_entrega).split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, d);
}

function variacao(atual, anterior) {
  if (!anterior) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

function estaAtrasada(o, ref) {
  if (!o.data_entrega || o.estado === "finalizado" || o.estado === "entregue") return false;
  const d = parseDataEntrega(o);
  return d && d < ref;
}

/* ═══════════════ Componentes ═══════════════ */

function Kpi({ icon: Icone, chipCls, iconCls, label, value, delta, deltaCls = "text-success", sub }) {
  return (
    <div className="flex items-start space-x-3 rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className={cn("mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", chipCls)}>
        <Icone className={cn("h-[18px] w-[18px]", iconCls)} />
      </div>
      <div className="overflow-hidden">
        <span className="block text-[11px] font-medium leading-tight text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-base font-bold tracking-tight text-foreground">{value}</span>
        {delta != null ? (
          <div className={cn("mt-1 flex items-center text-[10px] font-semibold", deltaCls)}>
            <span>
              {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%
            </span>
            <span className="ml-1 font-normal text-muted-foreground">{sub}</span>
          </div>
        ) : (
          <div className="mt-1 flex items-center text-[10px] font-normal text-muted-foreground">
            <span>{sub}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CartaoMarca() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl bg-[#061528] p-5 text-white shadow-sm">
      <div
        className="absolute bottom-0 right-0 top-0 w-3/5 bg-cover bg-right opacity-90 mix-blend-luminosity"
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDhI9g_ceAsrhLbFjXmMlLPfN8mRlghz9NW5U-wsm5i8YaMF3gxR0b96dX0jPiYfu26bWKB8R5L0o5_Ykk4356dkW5TE4m9kRJGZy0N4QfglBIi702terU2jbq0W7pXQ6-PVVGZDORHLbzx6c5ik8n0l2jtA_dXlRU55FyWD1vQdlU532gHL8wsaEvSm9BWKfbqjJP9rgqar3RNxoZAgYjck4NroOiyWDiBgHNp4gYD-h62me317MN4uw')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#061528] via-[#061528]/90 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 overflow-hidden">
        <div className="absolute bottom-0 left-0 h-16 w-16 rounded-tr-3xl bg-blue-600" />
        <div className="absolute bottom-4 left-6 h-12 w-12 rounded-full bg-amber-500 opacity-90 mix-blend-screen" />
        <div className="absolute bottom-8 left-0 h-10 w-10 bg-cyan-400" />
      </div>
      <div className="relative z-10 space-y-0.5">
        <h2 className="text-xl font-black leading-tight tracking-tight text-white">Mais controlo.</h2>
        <h2 className="text-xl font-black leading-tight tracking-tight text-white">Mais eficiência.</h2>
        <h2 className="text-xl font-black leading-tight tracking-tight text-white">Mais resultados.</h2>
      </div>
      <div className="relative z-10">
        <p className="max-w-[190px] text-[11px] font-medium leading-relaxed text-slate-300">
          Gestão integrada para a sua oficina de artes gráficas.
        </p>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--foreground)",
};

/* ═══════════════ Página ═══════════════ */

export default function DashboardPage() {
  const [carregando, setCarregando] = useState(true);
  const [faturas, setFaturas] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [periodo, setPeriodo] = useState("mes");
  const [mesRef, setMesRef] = useState(null);
  const [nMeses, setNMeses] = useState(6);
  const [menuMesAberto, setMenuMesAberto] = useState(false);
  const [menuGraficoAberto, setMenuGraficoAberto] = useState(false);
  const menuMesRef = useRef(null);
  const menuGraficoRef = useRef(null);

  const carregar = useCallback(async () => {
    try {
      const [f, o, m, p, ma, mv] = await Promise.all([
        listarFaturas().catch(() => []),
        listarOrdens().catch(() => []),
        listarMateriais().catch(() => []),
        listarPedidos().catch(() => []),
        listarMaquinas().catch(() => []),
        listarMovimentos().catch(() => []),
      ]);
      setFaturas(f);
      setOrdens(o);
      setMateriais(m);
      setPedidos(Array.isArray(p) ? p : p?.data || []);
      setMaquinas(Array.isArray(ma) ? ma : []);
      setMovimentos(Array.isArray(mv) ? mv : mv?.data || []);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!menuMesAberto && !menuGraficoAberto) return undefined;
    const fecharFora = (e) => {
      if (menuMesAberto && menuMesRef.current && !menuMesRef.current.contains(e.target)) setMenuMesAberto(false);
      if (menuGraficoAberto && menuGraficoRef.current && !menuGraficoRef.current.contains(e.target)) setMenuGraficoAberto(false);
    };
    const fecharTecla = (e) => {
      if (e.key === "Escape") {
        setMenuMesAberto(false);
        setMenuGraficoAberto(false);
      }
    };
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharTecla);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharTecla);
    };
  }, [menuMesAberto, menuGraficoAberto]);

  const trocarPeriodo = (v) => {
    setPeriodo(v);
    if (v !== "mes") setMesRef(null);
  };

  const escolherMes = (d) => {
    setMesRef(d);
    setPeriodo("mes");
    setMenuMesAberto(false);
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const intervalo = (() => {
    const y = hoje.getFullYear();
    const m = hoje.getMonth();
    const d = hoje.getDate();
    if (periodo === "dia") {
      const ini = new Date(y, m, d);
      return { ini, fim: new Date(y, m, d + 1), iniAnt: new Date(y, m, d - 1), fimAnt: ini };
    }
    if (periodo === "semana") {
      const ini = new Date(hoje.getTime() - 6 * DIA_MS);
      const iniAnt = new Date(ini.getTime() - 7 * DIA_MS);
      return { ini, fim: new Date(hoje.getTime() + DIA_MS), iniAnt, fimAnt: ini };
    }
    if (periodo === "ano") {
      const ini = new Date(y, 0, 1);
      return { ini, fim: new Date(y + 1, 0, 1), iniAnt: new Date(y - 1, 0, 1), fimAnt: ini };
    }
    if (mesRef) {
      const ry = mesRef.getFullYear();
      const rm = mesRef.getMonth();
      return { ini: new Date(ry, rm, 1), fim: new Date(ry, rm + 1, 1), iniAnt: new Date(ry, rm - 1, 1), fimAnt: new Date(ry, rm, 1) };
    }
    const ini = new Date(y, m, 1);
    return { ini, fim: new Date(y, m + 1, 1), iniAnt: new Date(y, m - 1, 1), fimAnt: ini };
  })();

  const somarFaturas = (ini, fim) =>
    faturas.reduce((s, f) => {
      const dd = dataFatura(f);
      return dd && dd >= ini && dd < fim ? s + parseFloat(f.total || f.valor || 0) : s;
    }, 0);
  const contarOrdens = (ini, fim) =>
    ordens.filter((o) => {
      const dd = dataOrdem(o);
      return dd && dd >= ini && dd < fim;
    }).length;
  const somarPedidos = (ini, fim) =>
    pedidos.reduce((s, p) => {
      const dd = dataPedido(p);
      return dd && dd >= ini && dd < fim ? s + Number(p.total || 0) : s;
    }, 0);
  const somarSaidas = (ini, fim) =>
    movimentos.reduce((s, mv) => {
      if (mv.tipo !== "saida") return s;
      const dd = parseDataISO(mv.data_movimento);
      return dd && dd >= ini && dd < fim ? s + Number(mv.valor || 0) : s;
    }, 0);

  const vendasAtual = somarFaturas(intervalo.ini, intervalo.fim);
  const vendasAnt = somarFaturas(intervalo.iniAnt, intervalo.fimAnt);
  const opsAtual = contarOrdens(intervalo.ini, intervalo.fim);
  const opsAnt = contarOrdens(intervalo.iniAnt, intervalo.fimAnt);
  const comprasAtual = somarPedidos(intervalo.ini, intervalo.fim);
  const comprasAnt = somarPedidos(intervalo.iniAnt, intervalo.fimAnt);
  const despesasAtual = somarSaidas(intervalo.ini, intervalo.fim);
  const despesasAnt = somarSaidas(intervalo.iniAnt, intervalo.fimAnt);
  const deltaVendas = variacao(vendasAtual, vendasAnt);
  const deltaOps = variacao(opsAtual, opsAnt);
  const deltaCompras = variacao(comprasAtual, comprasAnt);
  const deltaDespesas = variacao(despesasAtual, despesasAnt);

  const atrasadas = ordens.filter((o) => estaAtrasada(o, hoje));
  const emProducao = ordens.filter((o) => o.estado === "em_producao").length;
  const concluidas = ordens.filter((o) => o.estado === "finalizado" || o.estado === "entregue").length;
  const preparacao = ordens.filter((o) => o.estado === "pendente" || o.estado === "aprovado").length;
  const materiaisAlerta = materiais.filter(
    (m) => m.status === "repor" || m.status === "esgotado" || m.status === "critico"
  );

  const faturasPorPagar = faturas.filter((f) => {
    const total = Number(f.total || 0);
    const pago = Number(f.valor_pago || 0);
    return total > 0 && pago < total && f.estado !== "paga";
  });
  const saldoPorPagar = faturasPorPagar.reduce(
    (s, f) => s + (Number(f.total || 0) - Number(f.valor_pago || 0)),
    0
  );
  const faturasVencidas = faturasPorPagar.filter((f) => {
    const v = parseDataISO(f.data_vencimento);
    return v && v < hoje;
  }).length;

  const maquinasManutencao = maquinas.filter(
    (m) => m.estado === "manutencao" || m.estado === "avariada"
  );

  /* ─── Donut: estado das ordens ─── */
  const CIRC = 2 * Math.PI * 38;
  const totalSeg = Math.max(1, concluidas + emProducao + preparacao + atrasadas.length);
  let accSeg = 0;
  const segmentosDonut = [
    { label: "Concluídas", value: concluidas, color: "#10b981" },
    { label: "Em produção", value: emProducao, color: "#0ea5e9" },
    { label: "Em preparação", value: preparacao, color: "#f59e0b" },
    { label: "Atrasadas", value: atrasadas.length, color: "#ef4444" },
  ].map((s) => {
    const len = (s.value / totalSeg) * CIRC;
    const offset = -(accSeg / totalSeg) * CIRC;
    accSeg += s.value;
    return { ...s, len, offset };
  });

  /* ─── Gráfico meses: vendas vs produção ─── */
  const dadosMeses = (() => {
    const ref = mesRef || hoje;
    const arr = [];
    for (let i = nMeses - 1; i >= 0; i--) {
      const ini = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      const fim = new Date(ref.getFullYear(), ref.getMonth() - i + 1, 1);
      const vendas = faturas.reduce((s, f) => {
        const dd = dataFatura(f);
        return dd && dd >= ini && dd < fim ? s + parseFloat(f.total || f.valor || 0) : s;
      }, 0);
      const ops = ordens.filter((o) => {
        const dd = dataOrdem(o);
        return dd && dd >= ini && dd < fim;
      }).length;
      arr.push({
        label: ini.toLocaleDateString("pt-PT", { month: "short" }).replace(".", ""),
        vendas,
        ops,
      });
    }
    return arr;
  })();

  /* ─── Alertas ─── */
  const alertas = [
    faturasPorPagar.length > 0 && {
      icon: faturasVencidas > 0 ? LuOctagonAlert : LuTriangleAlert,
      tone: faturasVencidas > 0 ? "bg-error/10 text-error" : "bg-warning/10 text-warning",
      titulo: `${faturasPorPagar.length} ${faturasPorPagar.length === 1 ? "Factura" : "Facturas"} por pagar`,
      desc: `${formatNum(saldoPorPagar)} Kz em dívida${faturasVencidas > 0 ? ` · ${faturasVencidas} vencida${faturasVencidas === 1 ? "" : "s"}` : ""}`,
    },
    atrasadas.length > 0 && { icon: LuOctagonAlert, tone: "bg-error/10 text-error", titulo: `${atrasadas.length} ${atrasadas.length === 1 ? "Ordem" : "Ordens"} de produção atrasadas`, desc: "Rever planeamento" },
    materiaisAlerta.length > 0 && { icon: LuTriangleAlert, tone: "bg-warning/10 text-warning", titulo: `${materiaisAlerta.length} ${materiaisAlerta.length === 1 ? "Artigo" : "Artigos"} com stock mínimo`, desc: "Necessitam reposição" },
    maquinasManutencao.length > 0 && { icon: LuCog, tone: "bg-primary/10 text-primary", titulo: `${maquinasManutencao.length} ${maquinasManutencao.length === 1 ? "Equipamento" : "Equipamentos"} em manutenção`, desc: maquinasManutencao[0]?.nome_comum || maquinasManutencao[0]?.nome || "Verificar estado" },
  ].filter(Boolean);

  const mesLabel = hoje.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  const mesAtual = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const opcoesMes = [
    { rotulo: "Mês atual", valor: null },
    ...Array.from({ length: 11 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (11 - i), 1);
      return {
        rotulo: capitalizar(d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })),
        valor: d,
      };
    }),
  ];
  const rotuloMes = mesRef
    ? capitalizar(mesRef.toLocaleDateString("pt-PT", { month: "long", year: "numeric" }))
    : mesAtual;
  const opcoesGrafico = [3, 6, 12].map((n) => ({ rotulo: `Últimos ${n} meses`, valor: n }));

  const kpis = [
    { icon: LuChartColumn, chipCls: "bg-primary/10", iconCls: "text-primary", label: "Vendas", value: `${formatNum(vendasAtual)} Kz`, delta: deltaVendas, sub: "vs. mês anterior" },
    { icon: LuCog, chipCls: "bg-error/10", iconCls: "text-error", label: "Produção (OP)", value: formatNum(opsAtual), delta: deltaOps, sub: "ordens concluídas" },
    { icon: LuShoppingCart, chipCls: "bg-warning/10", iconCls: "text-warning", label: "Compras", value: `${formatNum(comprasAtual)} Kz`, delta: deltaCompras, sub: "em materiais" },
    { icon: LuBox, chipCls: "bg-success/10", iconCls: "text-success", label: "Stocks", value: formatNum(materiais.length), delta: null, sub: "artigos activos" },
    { icon: LuCreditCard, chipCls: "bg-error/10", iconCls: "text-error", label: "Despesas", value: `${formatNum(despesasAtual)} Kz`, delta: deltaDespesas, deltaCls: "text-error", sub: "vs. mês anterior" },
  ];

  const acoesRapidas = [
    { icon: LuBriefcase, bg: "bg-primary/5 hover:bg-primary/10 border-primary/15", chip: "bg-primary text-primary-foreground", href: "/producao", label: "Nova OP" },
    { icon: LuUserPlus, bg: "bg-success/5 hover:bg-success/10 border-success/15", chip: "bg-success text-white", href: "/clientes", label: "Novo Cliente" },
    { icon: LuShoppingCart, bg: "bg-error/5 hover:bg-error/10 border-error/15", chip: "bg-error text-white", href: "/estoque/novo", label: "Nova Compra" },
    { icon: LuFilePlus2, bg: "bg-info/5 hover:bg-info/10 border-info/15", chip: "bg-info text-white", href: "/faturacao", label: "Nova Factura" },
  ];

  if (carregando) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto grid w-full max-w-[1300px] flex-1 grid-cols-1 content-start gap-4 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 lg:col-span-9">
            <div className="h-12 animate-pulse rounded-xl bg-card" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="grid grid-cols-2 gap-3 md:col-span-7 lg:col-span-5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-[92px] animate-pulse rounded-xl bg-card" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:col-span-5 lg:col-span-7">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[92px] animate-pulse rounded-xl bg-card" />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-3 lg:col-start-10 lg:row-span-2 lg:row-start-1 lg:mb-[144px]">
            <div className="h-full min-h-[240px] animate-pulse rounded-xl bg-card" />
          </div>
          <div className="min-w-0 lg:col-span-9">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="h-64 animate-pulse rounded-xl bg-card md:col-span-7 lg:col-span-5" />
              <div className="h-64 animate-pulse rounded-xl bg-card md:col-span-5 lg:col-span-7" />
            </div>
          </div>
          <div className="h-[114px] animate-pulse rounded-xl bg-card self-end lg:col-span-3 lg:col-start-10 lg:row-start-2" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto grid w-full max-w-[1300px] flex-1 grid-cols-1 content-start gap-4 lg:grid-cols-12">
        {/* ══════════ Topo esquerdo: cabeçalho + KPIs ══════════ */}
        <div className="min-w-0 space-y-4 lg:col-span-9">
          {/* Cabeçalho: título + filtros */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Visão Geral</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Acompanhe o desempenho da sua gráfica em tempo real.</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative" ref={menuMesRef}>
                <button
                  type="button"
                  onClick={() => setMenuMesAberto((v) => !v)}
                  className="flex items-center space-x-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted/60"
                >
                  <LuCalendar className="h-4 w-4 text-muted-foreground" />
                  <span>{rotuloMes}</span>
                  <LuChevronDown className="ml-1 h-3 w-3 text-muted-foreground" />
                </button>
                {menuMesAberto && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-dropdown">
                    {opcoesMes.map((o) => {
                      const ativo = o.valor
                        ? mesRef && mesRef.getFullYear() === o.valor.getFullYear() && mesRef.getMonth() === o.valor.getMonth()
                        : !mesRef;
                      return (
                        <button
                          key={o.rotulo}
                          type="button"
                          onClick={() => escolherMes(o.valor)}
                          className={cn(
                            "flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-colors hover:bg-muted",
                            ativo ? "font-semibold text-primary" : "text-foreground"
                          )}
                        >
                          <span>{o.rotulo}</span>
                          {ativo && <LuCheck className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs font-medium text-muted-foreground shadow-sm">
                {[
                  { value: "dia", label: "Dia" },
                  { value: "semana", label: "Semana" },
                  { value: "mes", label: "Mês" },
                  { value: "ano", label: "Ano" },
                ].map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => trocarPeriodo(o.value)}
                    className={cn(
                      "rounded px-2.5 py-1 transition-colors hover:text-foreground",
                      periodo === o.value ? "bg-primary font-semibold text-primary-foreground" : ""
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Linha de KPIs: 2 + 3 alinhados com os cartões de baixo */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="grid grid-cols-2 gap-3 md:col-span-7 lg:col-span-5">
              {kpis.slice(0, 2).map((k) => (
                <Kpi key={k.label} {...k} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:col-span-5 lg:col-span-7">
              {kpis.slice(2).map((k) => (
                <Kpi key={k.label} {...k} />
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ Topo direito: imagem ══════════ */}
        <div className="lg:col-span-3 lg:col-start-10 lg:row-span-2 lg:row-start-1 lg:mb-[144px]">
          <CartaoMarca />
        </div>

        {/* ══════════ Linha dos gráficos + acesso rápido ══════════ */}
        <div className="min-w-0 lg:col-span-9">
          {/* Linha de gráficos: 12 colunas (5/4/3) */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            {/* Vendas vs Produção */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm md:col-span-7 lg:col-span-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground">Vendas vs Produção (últimos {nMeses} meses)</h3>
                <div className="relative" ref={menuGraficoRef}>
                  <button
                    type="button"
                    onClick={() => setMenuGraficoAberto((v) => !v)}
                    className="flex items-center space-x-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <span>Últimos {nMeses} meses</span>
                    <LuChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                  </button>
                  {menuGraficoAberto && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-dropdown">
                      {opcoesGrafico.map((o) => (
                        <button
                          key={o.valor}
                          type="button"
                          onClick={() => {
                            setNMeses(o.valor);
                            setMenuGraficoAberto(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between px-3.5 py-2 text-left text-[11px] transition-colors hover:bg-muted",
                            nMeses === o.valor ? "font-semibold text-primary" : "text-foreground"
                          )}
                        >
                          <span>{o.rotulo}</span>
                          {nMeses === o.valor && <LuCheck className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="relative mt-2 h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dadosMeses} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 8.5 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 8 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={(v) => (v >= 1000000 ? `${v / 1000000}M` : v)}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v, name) => [
                        name === "vendas" ? `Kz ${formatNum(v)}` : `${v} OPs`,
                        name === "vendas" ? "Vendas" : "Produção",
                      ]}
                    />
                    <Bar dataKey="vendas" fill="var(--primary)" radius={[1.5, 1.5, 0, 0]} barSize={16} />
                    <Line dataKey="ops" type="monotone" stroke="var(--error)" strokeWidth={1.8} dot={{ r: 2.5, fill: "var(--error)", strokeWidth: 0 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center space-x-6 pt-1 text-[10px]">
                <div className="flex items-center space-x-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  <span className="text-muted-foreground">Vendas (Kz)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="relative flex h-0.5 w-3.5 items-center justify-center bg-error">
                    <span className="h-1.5 w-1.5 rounded-full bg-error" />
                  </div>
                  <span className="text-muted-foreground">Produção (OP)</span>
                </div>
              </div>
            </div>

            {/* Estado das OP + Alertas: agrupados para alinhar com Compras/Stocks/Despesas */}
            <div className="flex flex-col gap-3 md:col-span-5 lg:col-span-7 lg:grid lg:grid-cols-7">
              {/* Estado das Ordens de Produção (donut) */}
              <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-4">
                <h3 className="mb-2 text-xs font-bold text-foreground">Estado das Ordens de Produção</h3>
                <div className="my-auto flex items-center justify-between">
                  <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" fill="none" r="38" stroke="var(--muted)" strokeWidth="13" />
                      {segmentosDonut.map((s) => (
                        <circle
                          key={s.label}
                          cx="50"
                          cy="50"
                          fill="none"
                          r="38"
                          stroke={s.color}
                          strokeWidth="13"
                          strokeDasharray={`${s.len} ${CIRC}`}
                          strokeDashoffset={s.offset}
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-base font-bold leading-none text-foreground">{ordens.length}</span>
                      <span className="mt-0.5 text-[9px] font-bold leading-none tracking-tight text-muted-foreground">OP</span>
                    </div>
                  </div>
                  <div className="space-y-2 pl-3 text-[10px]">
                    {segmentosDonut.map((s) => (
                      <div key={s.label} className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-muted-foreground">{s.label}</span>
                        </div>
                        <span className="font-bold text-foreground">
                          {s.value} ({Math.round((s.value / totalSeg) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-1" />
              </div>

              {/* Alertas do Sistema */}
              <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground">Alertas do Sistema</h3>
                  <Link href="/relatorios" className="text-[10px] font-medium text-primary hover:underline">
                    Ver todos →
                  </Link>
                </div>
                <div className="space-y-2.5">
                  {alertas.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Sem alertas de momento.</p>
                  ) : (
                    alertas.map((a) => {
                      const Icone = a.icon;
                      return (
                        <div key={a.titulo} className="flex items-start space-x-2.5">
                          <div className={cn("mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full", a.tone)}>
                            <Icone className="h-3 w-3" />
                          </div>
                          <div>
                            <h4 className="text-[11px] font-bold leading-tight text-foreground">{a.titulo}</h4>
                            <p className="text-[9.5px] leading-tight text-muted-foreground">{a.desc}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ Acesso rápido: mesma linha dos gráficos ══════════ */}
        <div className="self-end rounded-xl border border-border bg-card p-3.5 shadow-sm lg:col-span-3 lg:col-start-10 lg:row-start-2">
          <h3 className="mb-2.5 text-xs font-bold text-foreground">Acesso rápido</h3>
          <div className="grid grid-cols-4 gap-2">
            {acoesRapidas.map((a) => {
              const Icone = a.icon;
              return (
                <Link
                  key={a.label}
                  href={a.href}
                  className={cn(
                    "group flex flex-col items-center justify-center rounded-lg border p-2 transition",
                    a.bg
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 flex h-7 w-7 items-center justify-center rounded-md text-white shadow-xs transition-transform group-hover:scale-105",
                      a.chip
                    )}
                  >
                    <Icone className="h-4 w-4" />
                  </div>
                  <span className="text-[9.5px] font-semibold leading-tight text-foreground">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
