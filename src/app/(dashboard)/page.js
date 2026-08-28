"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { listar as listarOrcamentos } from "@/services/orcamentos";
import { listar as listarClientes } from "@/services/clientes";
import { listar as listarMateriais, extrato, movimentar } from "@/services/materiais";
import { listar as listarFaturas } from "@/services/faturacao";
import { listarOrdens } from "@/services/producao";
import { listar as listarFornecedores } from "@/services/fornecedores";
import { getUsuario } from "@/services/auth";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import ComboKpiCard from "@/components/ui/ComboKpiCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { KPIGridSkeleton, CardSkeleton, ListSkeleton } from "@/components/Skeleton";
import FornecedorSelect from "@/components/estoque/FornecedorSelect";
import NumeroInput from "@/components/ui/NumeroInput";

const inputCls =
  "w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all";

function formatNum(v) {
  return Number(v || 0).toLocaleString("pt-AO");
}

function formatHora(v) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

const ORDEM_ESTADOS = {
  pendente: { label: "Pendente", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "info" },
  em_producao: { label: "Em Produção", variant: "warning" },
  finalizado: { label: "Finalizado", variant: "success" },
  entregue: { label: "Entregue", variant: "success" },
  cancelado: { label: "Cancelado", variant: "outline" },
  atrasado: { label: "Atrasado", variant: "destructive" },
};

function parseDataEntrada(o) {
  if (o.data_entrada) {
    const [y, m, d] = String(o.data_entrada).split("-").map(Number);
    if (y && m) return new Date(y, m - 1, d);
  }
  if (o.createdAt) return new Date(o.createdAt);
  return null;
}

function parseDataEntrega(o) {
  if (!o.data_entrega) return null;
  const [y, m, d] = String(o.data_entrega).split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, d);
}

function agregarOrdens(ordens, periodo) {
  const hoje = new Date();
  if (periodo === "semanal") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - (6 - i));
      const label = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      const value = ordens.filter((o) => {
        const od = parseDataEntrada(o);
        return od && od.toDateString() === d.toDateString();
      }).length;
      return { label, value };
    });
  }
  if (periodo === "anual") {
    const ano = hoje.getFullYear();
    return Array.from({ length: 6 }, (_, i) => {
      const y = ano - (5 - i);
      return {
        label: String(y).slice(2),
        value: ordens.filter((o) => {
          const od = parseDataEntrada(o);
          return od && od.getFullYear() === y;
        }).length,
      };
    });
  }
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const ano = hoje.getFullYear();
  return meses.map((m, i) => ({
    label: m,
    value: ordens.filter((o) => {
      const od = parseDataEntrada(o);
      return od && od.getFullYear() === ano && od.getMonth() === i;
    }).length,
  }));
}

function BarChart({ dados }) {
  const max = Math.max(...dados.map((b) => b.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-52 px-1">
      {dados.map((b, i) => (
        <div key={i} className="flex flex-col items-center justify-end flex-1 h-full gap-1.5" title={`${b.label}: ${b.value}`}>
          <span className="text-[9px] font-bold text-foreground">{b.value || ""}</span>
          <div
            className="w-full max-w-[38px] rounded-t-lg bg-gradient-to-t from-primary/60 to-primary transition-all duration-500"
            style={{ height: `${Math.max((b.value / max) * 100, 3)}%` }}
          />
          <span className="text-[9px] font-semibold text-muted-foreground uppercase">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [carregando, setCarregando] = useState(true);
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [periodo, setPeriodo] = useState("mensal");
  const [reporModal, setReporModal] = useState({ open: false, material: null });
  const [reporForm, setReporForm] = useState({ quantidade: "", fornecedor: "", lote: "", observacoes: "" });
  const [aRepor, setARepor] = useState(false);
  const [histAberto, setHistAberto] = useState(false);
  const [histFiltro, setHistFiltro] = useState("");
  const [histPagina, setHistPagina] = useState(1);
  const HIST_POR_PAGINA = 8;
  const [consumoAberto, setConsumoAberto] = useState(false);
  const [consumoFiltro, setConsumoFiltro] = useState("");
  const [consumoPagina, setConsumoPagina] = useState(1);
  const CONSUMO_POR_PAGINA = 10;
  const { addToast } = useToast();

  const nomeUsuario = getUsuario()?.nome || "";

  const carregarDados = () => {
    Promise.all([
      listarOrcamentos().catch(() => []),
      listarClientes({ tipo: "cliente" }).catch(() => []),
      listarMateriais().catch(() => []),
      listarFaturas().catch(() => []),
      listarOrdens().catch(() => []),
      extrato().catch(() => []),
      listarFornecedores().catch(() => []),
    ]).then(([o, c, m, f, p, mv, fo]) => {
      setOrcamentos(o); setClientes(c); setMateriais(m);
      setFaturas(f); setOrdens(p); setMovimentos(mv); setFornecedores(fo);
    }).finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregarDados();
  }, []);


  const hoje = new Date();
  const orcamentosHoje = orcamentos.filter((o) => {
    const d = o.data_emissao || o.data;
    return d ? new Date(d).toDateString() === hoje.toDateString() : false;
  });
  const totalDia = orcamentosHoje.reduce((s, o) => s + parseFloat(o.total_com_iva ?? o.total ?? 0), 0);
  const aprovados = orcamentos.filter((o) => o.estado === "aprovado").length;
  const producao = ordens.filter((o) => o.estado === "em_producao").length;
  const concluidos = ordens.filter((o) => o.estado === "finalizado" || o.estado === "entregue").length;
  const faturacaoMes = faturas.filter((f) => {
    const d = new Date(f.data_emissao);
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });
  const totalFaturacao = faturacaoMes.reduce((s, f) => s + parseFloat(f.total || f.valor || 0), 0);
  const atrasados = ordens.filter((o) => {
    if (!o.data_entrega || o.estado === "entregue" || o.estado === "finalizado") return false;
    const d = parseDataEntrega(o);
    return d && d < hoje;
  }).length;

  const faturacaoHoje = faturas.filter((f) => {
    const d = new Date(f.data_emissao);
    return !isNaN(d.getTime()) && d.toDateString() === hoje.toDateString();
  });
  const totalFaturamentoDia = faturacaoHoje.reduce((s, f) => s + parseFloat(f.total || f.valor || 0), 0);

  const clientesDoDia = clientes.filter((c) => {
    const d = c.dataCadastro ? new Date(c.dataCadastro) : null;
    return d && !isNaN(d.getTime()) && d.toDateString() === hoje.toDateString();
  });

  const kpis = [
    {
      icon: "request_quote",
      title: "Orçamentos",
      subtitle: "Área Comercial",
      stats: [
        { label: "Orçamentos do Dia", value: orcamentosHoje.length, sublabel: `Kz ${totalDia.toLocaleString()}` },
        { label: "Aprovados", value: aprovados, sublabel: `${orcamentos.length} total` },
      ],
      iconVariant: "primary",
    },
    {
      icon: "task_alt",
      title: "Trabalhos",
      subtitle: "Produção",
      stats: [
        { label: "Concluídos", value: concluidos, sublabel: `${ordens.length} ordens` },
        { label: "Em Atraso", value: atrasados, sublabel: atrasados > 0 ? "Atenção" : "OK", iconVariant: atrasados > 0 ? "error" : "success" },
      ],
      iconVariant: atrasados > 0 ? "error" : "success",
    },
    {
      icon: "paid",
      title: "Faturação",
      subtitle: "Comercial",
      stats: [
        { label: "Mensal", value: `Kz ${totalFaturacao.toLocaleString()}`, sublabel: `${faturacaoMes.length} faturas` },
        { label: "do Dia", value: `Kz ${totalFaturamentoDia.toLocaleString()}`, sublabel: `${faturacaoHoje.length} faturas` },
      ],
      iconVariant: "primary",
    },
    {
      icon: "groups",
      title: "Clientes",
      subtitle: "Cadastros",
      stats: [
        { label: "Ativos", value: clientes.length, sublabel: "cadastrados" },
        { label: "do Dia", value: clientesDoDia.length, sublabel: "novos hoje" },
      ],
      iconVariant: "secondary",
    },
  ];

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const atividades = useMemo(() => {
    return ordens.slice(0, 3).map((o) => ({
      name: `Ordem #${o.numero || o.id}`,
      action: `estado: ${(o.estado || "").replace("_", " ")}`,
      tag: o.produto || "Produção",
      description: o.observacoes || `Cliente #${o.cliente_id} — ${o.quantidade || 0} unidades`,
      time: o.createdAt ? `${Math.floor((now - new Date(o.createdAt)) / 60000)} min atrás` : "Hoje",
    }));
  }, [ordens, now]);

  const ordensOrdenadas = useMemo(
    () => [...ordens].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [ordens]
  );

  const histFiltradas = useMemo(() => {
    const q = (histFiltro || "").trim().toLowerCase();
    return ordensOrdenadas.filter((o) => {
      if (q && !String(`${o.numero} ${o.produto} ${o.estado}`).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ordensOrdenadas, histFiltro]);

  const histPaginas = Math.max(1, Math.ceil(histFiltradas.length / HIST_POR_PAGINA));
  const histVisiveis = histFiltradas.slice((histPagina - 1) * HIST_POR_PAGINA, histPagina * HIST_POR_PAGINA);

  const dadosGrafico = agregarOrdens(ordens, periodo);

  const materiaisBaixo = materiais
    .filter((m) => m.status === "repor" || m.status === "esgotado")
    .sort((a, b) => (a.estoque_disponivel || 0) - (b.estoque_disponivel || 0))
    .slice(0, 3);

  const saidasMes = movimentos.filter((mv) => {
    const d = new Date(mv.createdAt);
    return mv.tipo === "saida" && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });
  const consumoMes = saidasMes.reduce((s, mv) => s + (parseFloat(mv.quantidade) || 0), 0);
  const saidasTotal = movimentos.filter((mv) => mv.tipo === "saida").length;

  const consumoRecente = movimentos
    .filter((mv) => mv.tipo === "saida")
    .slice(0, 5)
    .map((mv) => ({
      nome: mv.material?.nome || "—",
      detalhe: `${Number(mv.quantidade)} ${mv.material?.unidade || "un"}`,
      hora: formatHora(mv.createdAt),
    }));

  const saidasOrdenadas = useMemo(
    () => movimentos.filter((mv) => mv.tipo === "saida").sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [movimentos]
  );

  const consumoFiltradas = useMemo(() => {
    const q = (consumoFiltro || "").trim().toLowerCase();
    return saidasOrdenadas.filter((mv) => {
      if (q) {
        const material = (mv.material?.nome || "").toLowerCase();
        const motivo = (mv.motivo || "").toLowerCase();
        const lote = (mv.lote || "").toLowerCase();
        const fornecedor = (mv.fornecedor_nome || "").toLowerCase();
        const quantidade = String(mv.quantidade || "");
        if (!material.includes(q) && !motivo.includes(q) && !lote.includes(q) && !fornecedor.includes(q) && !quantidade.includes(q)) return false;
      }
      return true;
    });
  }, [saidasOrdenadas, consumoFiltro]);

  const consumoPaginas = Math.max(1, Math.ceil(consumoFiltradas.length / CONSUMO_POR_PAGINA));
  const consumoVisiveis = consumoFiltradas.slice((consumoPagina - 1) * CONSUMO_POR_PAGINA, consumoPagina * CONSUMO_POR_PAGINA);

  const mesLabel = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const [mesAgenda, setMesAgenda] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const mesView = mesAgenda;
  const eMesAtual = mesView.getFullYear() === hoje.getFullYear() && mesView.getMonth() === hoje.getMonth();
  const diasNoMes = new Date(mesView.getFullYear(), mesView.getMonth() + 1, 0).getDate();
  const primeiroDia = new Date(mesView.getFullYear(), mesView.getMonth(), 1).getDay();
  const mesLabelView = mesView.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const entregasMes = ordens
    .map((o) => ({ o, d: parseDataEntrega(o) }))
    .filter((x) => x.d && x.d.getMonth() === mesView.getMonth() && x.d.getFullYear() === mesView.getFullYear())
    .sort((a, b) => a.d - b.d);
  const diasComEntrega = new Set(entregasMes.map((x) => x.d.getDate()));
  const mudarMes = (delta) => setMesAgenda((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const abrirRepor = (m) => {
    setReporForm({ quantidade: "", fornecedor: "", lote: "", observacoes: "" });
    setReporModal({ open: true, material: m });
  };

  const enviarRepor = async (e) => {
    e.preventDefault();
    const m = reporModal.material;
    if (!m || !reporForm.fornecedor) return;
    setARepor(true);
    try {
      await movimentar({
        material_id: m.id,
        tipo: "entrada",
        quantidade: Number(reporForm.quantidade),
        lote: reporForm.lote || undefined,
        motivo: "Reposição de stock",
        fornecedor_nome: reporForm.fornecedor,
        solicitado_por: nomeUsuario || "Sistema",
        observacoes: reporForm.observacoes || "",
      });
      addToast(`Entrada registada para ${m.nome}`, "success");
      setReporModal({ open: false, material: null });
      setReporForm({ quantidade: "", fornecedor: "", lote: "", observacoes: "" });
      Promise.all([listarMateriais().catch(() => []), extrato().catch(() => [])]).then(([mts, mv]) => {
        setMateriais(mts); setMovimentos(mv);
      });
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao registar entrada", "error");
    } finally {
      setARepor(false);
    }
  };

  if (carregando) {
    return (
      <div className="space-y-6">
        <KPIGridSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><CardSkeleton lines={6} /></div>
          <div><CardSkeleton lines={4} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2"><ListSkeleton count={3} /></div>
          <div><CardSkeleton lines={5} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Painel de Controlo</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Painel de controlo // DASH · Visão geral · {mesLabel}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/estoque">
            <button className="bg-surface-variant text-on-surface border border-outline-variant px-4 py-2 rounded font-mono flex items-center gap-2 hover:border-primary hover:text-primary transition-all text-[11px] uppercase tracking-wider">
              <Icon name="inventory_2" className="text-[16px]" /> Estoque
            </button>
          </Link>
          <Link href="/orcamentos">
            <button className="bg-primary/20 text-primary border border-primary/50 px-5 py-2 rounded font-mono flex items-center gap-2 hover:bg-primary/30 transition-all text-[11px] uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(128,213,203,0.2)] hover:shadow-[0_0_25px_rgba(128,213,203,0.4)]">
              <Icon name="request_quote" className="text-[16px]" /> Orçamentos
            </button>
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {kpis.map((kpi) => (
          <ComboKpiCard
            key={kpi.title}
            icon={kpi.icon}
            title={kpi.title}
            subtitle={kpi.subtitle}
            stats={kpi.stats}
            iconVariant={kpi.iconVariant}
            className="group relative overflow-hidden"
          />
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Volume de Produção</CardTitle>
              <CardDescription>Ordens de produção por período (dados reais)</CardDescription>
            </div>
            <div className="flex gap-1">
              {[["semanal", "Semanal"], ["mensal", "Mensal"], ["anual", "Anual"]].map(([key, label]) => (
                <Button key={key} variant={periodo === key ? "default" : "outline"} size="sm" onClick={() => setPeriodo(key)}>
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <BarChart dados={dadosGrafico} />
            <p className="text-[10px] text-muted-foreground mt-3 px-1">
              Total de ordens: <strong className="text-foreground">{ordens.length}</strong> — distribuição real do registo de produção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status de Insumos e Produção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {materiaisBaixo.length > 0 ? (
              materiaisBaixo.map((m) => (
                <div key={m.id} className="bg-destructive/10 border border-destructive/30 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-destructive/15 flex items-center justify-center text-destructive shrink-0">
                      <Icon name="inventory_2" className="text-lg" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{m.nome}</p>
                      <p className="text-[10px] text-destructive font-medium">
                        Apenas {Number(m.estoque_disponivel)} {m.unidade || "un"} disponíveis
                      </p>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => abrirRepor(m)}>Repor</Button>
                </div>
              ))
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0">
                  <Icon name="check_circle" className="text-lg" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Estoque em dia</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Nenhum material em falta</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-xl flex flex-col justify-center border">
                <Icon name="imagesearch_roller" className="text-primary mb-1" />
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Consumo do Mês</p>
                <p className="text-lg font-bold text-foreground">{formatNum(consumoMes)}</p>
                <p className="text-[10px] text-muted-foreground">{saidasTotal} saídas registadas</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-xl flex flex-col justify-center border">
                <Icon name="settings_input_component" className="text-primary mb-1" />
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Produção</p>
                <p className="text-lg font-bold text-foreground">{producao}</p>
                <p className="text-[10px] font-semibold text-emerald-600">Ativa — em produção</p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Consumo Recente</p>
                <Button variant="ghost" size="sm" onClick={() => setConsumoAberto(true)} className="shrink-0 gap-1.5">
                  <Icon name="history" className="text-base" />
                  Ver Histórico Completo
                </Button>
              </div>
              <div className="space-y-2.5">
                {consumoRecente.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm gap-2">
                    <span className="flex items-center gap-2 text-muted-foreground min-w-0">
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span className="truncate">{item.nome}</span>
                    </span>
                    <span className="text-muted-foreground/60 text-xs shrink-0 text-right">
                      {item.detalhe} · {item.hora}
                    </span>
                  </div>
                ))}
                {consumoRecente.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum consumo recente</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Atividades da Produção</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setHistAberto(true)} className="shrink-0 gap-1.5">
              Ver Histórico Completo
              <Icon name="arrow_forward" className="text-base" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {atividades.map((activity, idx) => (
                <div key={idx} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/30">
                      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Icon name="description" className="text-lg" />
                      </div>
                    </div>
                    {idx < atividades.length - 1 && <div className="w-px h-full bg-border mt-2" />}
                  </div>
                  <div className={`flex-1 ${idx < atividades.length - 1 ? "pb-4" : ""}`}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {activity.name}{" "}
                        <span className="font-normal text-muted-foreground">{activity.action}</span>
                      </p>
                      <Badge variant="secondary" className="text-[10px] uppercase shrink-0">{activity.tag}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                    <p className="text-[11px] text-primary font-medium mt-2">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Agenda</CardTitle>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="w-7 h-7" onClick={() => mudarMes(-1)} aria-label="Mês anterior" title="Mês anterior">
                <Icon name="chevron_left" className="text-base" />
              </Button>
              <span className="text-sm font-medium text-primary capitalize w-28 text-center truncate">{mesLabelView}</span>
              <Button type="button" variant="ghost" size="icon" className="w-7 h-7" onClick={() => mudarMes(1)} aria-label="Próximo mês" title="Próximo mês">
                <Icon name="chevron_right" className="text-base" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center mb-4">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <span key={i} className="text-[10px] font-semibold text-muted-foreground">{d}</span>
              ))}
              {Array.from({ length: primeiroDia }).map((_, i) => <div key={`b${i}`} />)}
              {Array.from({ length: diasNoMes }).map((_, i) => {
                const day = i + 1;
                const temEntrega = diasComEntrega.has(day);
                const eHoje = eMesAtual && day === hoje.getDate();
                return (
                  <div key={day} className="relative">
                    <span className={`inline-flex items-center justify-center w-8 h-8 text-xs rounded-lg cursor-pointer transition-all
                      ${eHoje ? "bg-primary text-on-primary font-bold shadow-sm" : "hover:bg-primary/10 text-foreground"}`}>
                      {day}
                    </span>
                    {temEntrega && <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {entregasMes.map(({ o, d }) => (
                <div key={o.id} className="p-3 bg-muted/50 rounded-xl border-l-4 border-primary flex gap-4 items-center">
                  <div className="text-center leading-tight">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                      {d.toLocaleDateString("pt-BR", { month: "short" })}
                    </p>
                    <p className="text-xl font-bold text-foreground">{d.getDate()}</p>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold text-foreground truncate">Entrega Pedido #{o.numero || o.id}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {o.produto || "Produção"}{o.cliente?.nome ? ` · ${o.cliente?.nome}` : ""}
                    </p>
                  </div>
                </div>
              ))}
              {entregasMes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhuma entrega agendada neste mês</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={reporModal.open}
        onClose={() => setReporModal({ open: false, material: null })}
        title="Repor Material"
        icon="inventory_2"
        size="sm"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setReporModal({ open: false, material: null })}>Cancelar</Button>
            <Button type="submit" form="form-repor" loading={aRepor}>Registar Entrada</Button>
          </>
        }
      >
        <form id="form-repor" onSubmit={enviarRepor} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Material</label>
            <div className="px-3 py-2.5 bg-muted border border-input rounded-xl text-xs font-semibold text-foreground">
              {reporModal.material?.nome}
              <span className="text-muted-foreground font-normal">
                {" "}({reporModal.material?.unidade || "un"}) — disponível {Number(reporModal.material?.estoque_disponivel)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quantidade *</label>
              <NumeroInput required value={reporForm.quantidade}
                onChange={(e) => setReporForm({ ...reporForm, quantidade: e.target.value })}
                className={inputCls} placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lote</label>
              <input value={reporForm.lote}
                onChange={(e) => setReporForm({ ...reporForm, lote: e.target.value })}
                className={inputCls} placeholder="Opcional" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fornecedor *</label>
            <FornecedorSelect
              value={reporForm.fornecedor}
              onChange={(v) => setReporForm({ ...reporForm, fornecedor: v })}
              fornecedores={fornecedores}
              placeholder="Procurar fornecedor ou escrever novo..."
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</label>
            <textarea rows={2} value={reporForm.observacoes}
              onChange={(e) => setReporForm({ ...reporForm, observacoes: e.target.value })}
              className={`${inputCls} resize-none`} placeholder="Nota da reposição..." />
          </div>
        </form>
      </Modal>

      <Modal
        open={histAberto}
        onClose={() => { setHistAberto(false); setHistPagina(1); }}
        title="Histórico Completo de Ordens"
        icon="history"
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <p className="text-xs text-muted-foreground">
              {histFiltradas.length} ordem{histFiltradas.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={histPagina <= 1} onClick={() => setHistPagina((p) => Math.max(1, p - 1))}>
                Anterior
              </Button>
              <span className="text-xs font-semibold text-muted-foreground px-1">
                {histPagina} / {histPaginas}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={histPagina >= histPaginas} onClick={() => setHistPagina((p) => Math.min(histPaginas, p + 1))}>
                Seguinte
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-0">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
              <input
                value={histFiltro}
                onChange={(e) => { setHistFiltro(e.target.value); setHistPagina(1); }}
                className="w-full pl-9 pr-3 py-2 bg-muted/50 border rounded-xl text-xs focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Pesquisar por número, produto ou estado..."
              />
            </div>
            <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => { setHistFiltro(""); setHistPagina(1); }}>
              Limpar
            </Button>
          </div>

          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
              <span className="spinner" aria-hidden="true" /> A carregar histórico...
            </div>
          ) : histVisiveis.length === 0 ? (
            <div className="py-12 text-center">
              <Icon name="inbox" className="text-3xl text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma ordem encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                    <th className="py-2 pr-3 font-semibold">Ordem</th>
                    <th className="py-2 pr-3 font-semibold">Produto</th>
                    <th className="py-2 pr-3 font-semibold">Quantidade</th>
                    <th className="py-2 pr-3 font-semibold">Estado</th>
                    <th className="py-2 pr-3 font-semibold">Entrega</th>
                    <th className="py-2 font-semibold">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {histVisiveis.map((o) => {
                    const cfg = ORDEM_ESTADOS[o.estado] || ORDEM_ESTADOS.pendente;
                    return (
                      <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 pr-3 font-semibold text-foreground">#{o.numero || o.id}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground truncate max-w-[10rem]">{o.produto || "—"}</td>
                        <td className="py-2.5 pr-3">{o.quantidade ?? "—"}</td>
                        <td className="py-2.5 pr-3">
                          <Badge variant={cfg.variant} className="text-[10px] uppercase">{cfg.label}</Badge>
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{o.data_entrega ? formatHora(o.data_entrega) : "—"}</td>
                        <td className="py-2.5 text-muted-foreground">{formatHora(o.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={consumoAberto}
        onClose={() => { setConsumoAberto(false); setConsumoPagina(1); setConsumoFiltro(""); }}
        title="Histórico Completo de Consumos"
        icon="bar_chart"
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <p className="text-xs text-muted-foreground">
              {consumoFiltradas.length} consumo{consumoFiltradas.length === 1 ? "" : "s"} (saídas)
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={consumoPagina <= 1} onClick={() => setConsumoPagina((p) => Math.max(1, p - 1))}>
                Anterior
              </Button>
              <span className="text-xs font-semibold text-muted-foreground px-1">
                {consumoPagina} / {consumoPaginas}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={consumoPagina >= consumoPaginas} onClick={() => setConsumoPagina((p) => Math.min(consumoPaginas, p + 1))}>
                Seguinte
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-0">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
              <input
                value={consumoFiltro}
                onChange={(e) => { setConsumoFiltro(e.target.value); setConsumoPagina(1); }}
                className="w-full pl-9 pr-3 py-2 bg-muted/50 border rounded-xl text-xs focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Pesquisar por material, motivo, lote, fornecedor..."
              />
            </div>
            <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => { setConsumoFiltro(""); setConsumoPagina(1); }}>
              Limpar
            </Button>
          </div>

          {consumoVisiveis.length === 0 ? (
            <div className="py-12 text-center">
              <Icon name="inbox" className="text-3xl text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum consumo registado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                    <th className="py-2 pr-3 font-semibold">Material</th>
                    <th className="py-2 pr-3 font-semibold">Quantidade</th>
                    <th className="py-2 pr-3 font-semibold">Motivo</th>
                    <th className="py-2 pr-3 font-semibold">Lote</th>
                    <th className="py-2 pr-3 font-semibold">Fornecedor</th>
                    <th className="py-2 font-semibold">Data / Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {consumoVisiveis.map((mv) => (
                    <tr key={mv.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 pr-3 font-semibold text-foreground">{mv.material?.nome || "—"}</td>
                      <td className="py-2.5 pr-3">
                        <span className="font-semibold text-foreground">{Number(mv.quantidade)}</span>
                        <span className="text-muted-foreground"> {mv.material?.unidade || "un"}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{mv.motivo || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{mv.lote || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{mv.fornecedor_nome || "—"}</td>
                      <td className="py-2.5 text-muted-foreground">{formatHora(mv.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
