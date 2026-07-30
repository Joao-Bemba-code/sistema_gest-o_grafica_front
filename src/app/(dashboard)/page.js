"use client";

import { useEffect, useState } from "react";
import { listar as listarOrcamentos } from "@/services/orcamentos";
import { listar as listarClientes } from "@/services/clientes";
import { listar as listarMateriais } from "@/services/materiais";
import { listar as listarFaturas } from "@/services/faturacao";
import { listarOrdens } from "@/services/producao";
import Image from "next/image";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { KPIGridSkeleton, CardSkeleton, ListSkeleton } from "@/components/Skeleton";

const calendarDays = [
  { day: 28, dim: true }, { day: 29, dim: true }, { day: 30, dim: true },
  { day: 1 }, { day: 2 }, { day: 3 }, { day: 4 },
  { day: 5, active: true }, { day: 6, dot: true }, { day: 7 },
  { day: 8 }, { day: 9, dot: true }, { day: 10 }, { day: 11 },
];

const scheduleItems = [
  { month: "Mai", day: "06", title: "Entrega Pedido #742", subtitle: "Campanha Marketing Regional" },
  { month: "Mai", day: "09", title: "Manutenção Preventiva", subtitle: "Impressora Digital HP Indigo" },
];

export default function DashboardPage() {
  const [carregando, setCarregando] = useState(true);
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [ordens, setOrdens] = useState([]);

  useEffect(() => {
    Promise.all([
      listarOrcamentos(), listarClientes(), listarMateriais(),
      listarFaturas(), listarOrdens(),
    ]).then(([o, c, m, f, p]) => {
      setOrcamentos(o); setClientes(c); setMateriais(m);
      setFaturas(f); setOrdens(p);
    }).catch(() => {}).finally(() => setCarregando(false));
  }, []);

  const hoje = new Date();
  const orcamentosHoje = orcamentos.filter((o) => new Date(o.data_emissao).toDateString() === hoje.toDateString());
  const totalDia = orcamentosHoje.reduce((s, o) => s + parseFloat(o.total_com_iva || 0), 0);
  const aprovados = orcamentos.filter((o) => o.estado === "aprovado").length;
  const producao = ordens.filter((o) => o.estado === "em_producao").length;
  const concluidos = ordens.filter((o) => o.estado === "finalizado" || o.estado === "entregue").length;
  const faturacaoMes = faturas.filter((f) => {
    const d = new Date(f.data_emissao);
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });
  const totalFaturacao = faturacaoMes.reduce((s, f) => s + parseFloat(f.valor || 0), 0);
  const atrasados = ordens.filter((o) => {
    if (!o.data_entrega || o.estado === "entregue" || o.estado === "finalizado") return false;
    return new Date(o.data_entrega) < hoje;
  }).length;

  const kpis = [
    { icon: "request_quote", label: "Orçamento do Dia", value: `Kz ${totalDia.toLocaleString()}`, badge: `${orcamentosHoje.length} hoje`, barPct: Math.min((orcamentosHoje.length / 10) * 100, 100) },
    { icon: "check_circle", label: "Orçamentos Aprovados", value: aprovados, unit: "total", badge: `${orcamentos.length} total`, barPct: orcamentos.length ? Math.round((aprovados / orcamentos.length) * 100) : 0 },
    { icon: "precision_manufacturing", label: "Trabalhos em Produção", value: producao, unit: "ativos", badge: "Em andamento", barPct: ordens.length ? Math.round((producao / ordens.length) * 100) : 0 },
    { icon: "task_alt", label: "Trabalhos Concluídos", value: concluidos, unit: "total", badge: `${ordens.length} ordens`, barPct: ordens.length ? Math.round((concluidos / ordens.length) * 100) : 0 },
    { icon: "paid", label: "Faturação Mensal", value: `Kz ${totalFaturacao.toLocaleString()}`, badge: `${faturacaoMes.length} faturas`, barPct: 72 },
    { icon: "groups", label: "Clientes Ativos", value: clientes.length, badge: "cadastrados", barPct: 68 },
    { icon: "warning", label: "Trabalhos em Atraso", value: atrasados, unit: "pendentes", badge: atrasados > 0 ? "Atenção" : "OK", barPct: ordens.length ? Math.round((atrasados / ordens.length) * 100) : 0 },
  ];

  const activities = ordens.slice(0, 3).map((o) => ({
    name: `Ordem #${o.numero || o.id}`,
    action: `estado: ${(o.estado || "").replace("_", " ")}`,
    tag: o.produto || "Produção",
    description: o.observacoes || `Cliente #${o.cliente_id} — ${o.quantidade || 0} unidades`,
    time: o.createdAt ? `${Math.floor((Date.now() - new Date(o.createdAt)) / 60000)} min atrás` : "Hoje",
  }));
  while (activities.length < 3) {
    const i = activities.length;
    activities.push({
      name: ["Ana Costa", "Ricardo Silva", "Departamento Técnico"][i],
      action: ["cadastrou novo pedido", "finalizou ajuste", "aprovou layout"][i],
      tag: ["Venda", "Manutenção", "Aprovação"][i],
      description: "Atividade registrada no sistema",
      time: `${Math.floor(Math.random() * 60) + i * 20} min atrás`,
    });
  }

  const materiaisBaixo = materiais.filter((m) => parseFloat(m.quantidade) <= parseFloat(m.estoque_min));
  const consumptionItems = materiaisBaixo.slice(0, 3).map((m) => ({
    label: m.nome, time: `${parseFloat(m.quantidade)} ${m.unidade || "un"}`,
  }));

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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="group relative overflow-hidden hover-lift">
            <div className="absolute top-0 right-0 p-5 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
              <Icon name={kpi.icon} className="text-5xl" />
            </div>
            <CardContent className="p-5 md:p-6">
              <p className="text-xs text-muted-foreground font-medium mb-3">{kpi.label}</p>
              <div className="flex items-end justify-between gap-2 mb-3">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                  {kpi.value}
                  {kpi.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{kpi.unit}</span>}
                </h3>
                <Badge variant={kpi.badge === "Atenção" ? "destructive" : kpi.badge === "OK" ? "success" : "info"} className="text-[9px] px-2 py-0.5 shrink-0">
                  {kpi.badge}
                </Badge>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${kpi.barPct}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Volume de Impressão Mensal</CardTitle>
              <CardDescription>Produção vs. Prazo de Entrega (Acumulado)</CardDescription>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm">Semanal</Button>
              <Button size="sm">Mensal</Button>
              <Button variant="outline" size="sm">Anual</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64 relative flex items-end gap-2 px-2">
              <div className="absolute inset-0 border-b border-l border-border flex flex-col justify-between">
                {[...Array(4)].map((_, i) => <div key={i} className="border-t border-muted w-full" />)}
              </div>
              <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M0 80 Q 20 60, 40 70 T 80 30 T 100 15" fill="none" stroke="var(--primary)" strokeWidth="2" />
                <path d="M0 80 Q 20 60, 40 70 T 80 30 T 100 15 V 100 H 0 Z" fill="url(#chartGrad1)" opacity="0.08" />
                <path d="M0 85 Q 25 80, 50 75 T 75 60 T 100 55" fill="none" stroke="var(--primary)" strokeWidth="2" />
                <defs>
                  <linearGradient id="chartGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex justify-between mt-3 px-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status de Maquinário e Insumos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-destructive/15 flex items-center justify-center text-destructive">
                  <Icon name="inventory_2" className="text-lg" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Estoque Baixo: Papel Couché 150g</p>
                  <p className="text-[10px] text-destructive font-medium">Apenas 5 resmas disponíveis</p>
                </div>
              </div>
              <Button variant="destructive" size="sm">Repor</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-xl flex flex-col justify-center border">
                <Icon name="imagesearch_roller" className="text-primary mb-1" />
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Tinta CMYK</p>
                <p className="text-lg font-bold text-foreground">78%</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-xl flex flex-col justify-center border">
                <Icon name="settings_input_component" className="text-primary mb-1" />
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Offset 1</p>
                <p className="text-lg font-bold text-primary">Ativa</p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-semibold mb-3 text-foreground">Consumo Recente</p>
              <div className="space-y-2.5">
                {consumptionItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {item.label}
                    </span>
                    <span className="text-muted-foreground/60 text-xs">{item.time}</span>
                  </div>
                ))}
                {consumptionItems.length === 0 && (
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
            <Button variant="ghost" size="sm" className="gap-1 text-primary">
              Ver Histórico Completo
              <Icon name="arrow_forward" className="text-lg" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity, idx) => (
                <div key={idx} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/30">
                      <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Icon name="description" className="text-lg" />
                      </div>
                    </div>
                    {idx < activities.length - 1 && <div className="w-px h-full bg-border mt-2" />}
                  </div>
                  <div className={`flex-1 ${idx < activities.length - 1 ? "pb-4" : ""}`}>
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
            <span className="text-sm font-medium text-primary">Maio 2024</span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center mb-4">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <span key={i} className="text-[10px] font-semibold text-muted-foreground">{d}</span>
              ))}
              {calendarDays.map((item, i) => (
                <div key={i} className="relative">
                  <span className={`inline-flex items-center justify-center w-8 h-8 text-xs rounded-lg cursor-pointer transition-all
                    ${item.dim ? "opacity-30" : "hover:bg-primary/10 text-foreground"}
                    ${item.active ? "bg-primary text-white font-bold hover:bg-primary/90 shadow-sm" : ""}
                  `}>
                    {item.day}
                  </span>
                  {item.dot && <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {scheduleItems.map((item) => (
                <div key={item.day} className="p-3 bg-muted/50 rounded-xl border-l-4 border-primary flex gap-4 items-center">
                  <div className="text-center leading-tight">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{item.month}</p>
                    <p className="text-xl font-bold text-foreground">{item.day}</p>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
