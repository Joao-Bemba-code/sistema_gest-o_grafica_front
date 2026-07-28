"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Icon from "@/components/Icon";

const inkChannels = [
  { id: "C", label: "CIANO", level: 75, color: "#00e5ff", viscosity: "12.4 cP", temp: "24.1 °C", calib: "OK [V2]" },
  { id: "M", label: "MAGENTA", level: 50, color: "#ff4081", viscosity: "11.8 cP", temp: "25.5 °C", calib: "OK [V2]" },
  { id: "Y", label: "AMARELO", level: 92, color: "#ffd740", viscosity: "12.1 cP", temp: "23.9 °C", calib: "OK [V2]" },
  { id: "K", label: "PRETO", level: 32, color: "#b0bec5", viscosity: "13.2 cP", temp: "26.8 °C", calib: "SINCRONIZAR" },
];

const logMessages = [
  "[14:22:01] NODE_01 SINCRONIZADO COM SUCESSO",
  "[14:22:05] AQUECEDOR_UV_P2 POTÊNCIA ESTÁVEL: 4.2kW",
  "[14:22:12] PACOTE_RECEBIDO: SIG_7748_V",
  "[14:23:44] CABEÇA_INK_JET_A: ALINHAMENTO OK",
  "[14:24:01] VERIF_LIMITE_TEMP: PASSOU",
  "[14:24:15] ALERTA: TENSÃO_ALIMENTADOR_LIM_INF",
  "[14:24:20] CORREÇÃO_AUTOMÁTICA_ATIVADA",
  "[14:24:22] TENSÃO_NOMINAL",
  "[14:25:01] AJUSTE_TENSÃO_ROLERO: +0.2N",
  "[14:25:14] DENSIDADE_UV_ESTÁVEL",
  "[14:25:30] NÍVEL_BUFFER_PRONTO",
  "[14:26:01] VENTILADOR_REFRIG_AUTOMÁTICO",
  "[14:26:15] CALIBRAÇÃO_VELOCIDADE_BOMBA_OK",
  "[14:26:30] PACOTE_DADOS_VERIFICADO",
];

const materialLines = [
  { name: "PAPEL_BRILHO_80G", color: "#c3f5ff", data: [150, 120, 140, 80, 110, 60, 90] },
  { name: "PAPEL_FOSCO_120G", color: "#b7c8e1", data: [170, 140, 160, 120, 140, 100, 130] },
  { name: "REVESTIMENTO_ESPECIAL", color: "#ffb4ab", data: [190, 180, 195, 170, 185, 160, 155] },
];

const kpis = [
  { icon: "request_quote", label: "Orçamentos Hoje", value: "23", badge: "+8%", barColor: "bg-primary", barWidth: "76%" },
  { icon: "precision_manufacturing", label: "Em Produção", value: "47", unit: "ativos", badge: "Alta", barColor: "bg-primary", barWidth: "70%" },
  { icon: "task_alt", label: "Concluídos", value: "156", unit: "mês", badge: "+12%", barColor: "bg-primary", barWidth: "85%" },
  { icon: "paid", label: "Faturação", value: "Kz 285k", badge: "+5.2%", barColor: "bg-primary", barWidth: "72%" },
];

function CircularGauge({ level, color, size = 128 }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (level / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" fill="transparent" r={r} stroke="currentColor" strokeWidth="8" className="text-surface-container-highest" />
        <circle cx="50" cy="50" fill="transparent" r={r} stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="butt" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-data-lg text-data-lg text-on-surface">{level}%</span>
        <span className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider">NÍVEL</span>
      </div>
    </div>
  );
}

function ThermalChart() {
  const [bars, setBars] = useState([]);

  useEffect(() => {
    const generated = Array.from({ length: 48 }, () => ({
      height: Math.floor(Math.random() * 60 + 40),
      isHigh: Math.random() > 0.8,
      opacity: Math.random() * 0.8 + 0.2,
    }));
    setBars(generated);
  }, []);

  return (
    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 lg:grid-cols-24 h-32 gap-[2px] items-end">
      {bars.map((bar, i) => (
        <div
          key={i}
          className={`rounded-t-[1px] transition-all duration-1000 hover:scale-y-110 ${bar.isHigh ? "bg-primary" : "bg-secondary-container"}`}
          style={{ height: `${bar.height}%`, opacity: bar.opacity }}
        />
      ))}
    </div>
  );
}

function TerminalLog() {
  const [logs, setLogs] = useState(logMessages);
  const ref = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const time = new Date().toLocaleTimeString("pt-PT", { hour12: false });
      const msgs = [
        "PACOTE_DADOS_VERIFICADO",
        "AJUSTE_TENSÃO_ROLERO: +0.2N",
        "DENSIDADE_UV_ESTÁVEL",
        "NÍVEL_BUFFER_PRONTO",
        "VENTILADOR_REFRIG_AUTOMÁTICO",
        "CALIBRAÇÃO_VELOCIDADE_BOMBA_OK",
      ];
      const newLog = `[${time}] ${msgs[Math.floor(Math.random() * msgs.length)]}`;
      setLogs((prev) => [...prev.slice(-14), newLog]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div ref={ref} className="h-48 overflow-y-auto space-y-1 font-data-md text-data-md text-primary/70 pr-2">
      {logs.map((log, i) => {
        const isWarn = log.includes("ALERTA");
        return (
          <p key={i} className={`leading-tight ${isWarn ? "text-error/80" : ""}`}>
            <span className="text-on-surface-variant">{log.match(/\[.*?\]/)?.[0]}</span>{" "}
            {log.replace(/\[.*?\]\s*/, "")}
          </p>
        );
      })}
    </div>
  );
}

function MaterialChart() {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"];
  const viewW = 1000;
  const viewH = 200;

  function buildPath(data) {
    const max = 200;
    const step = viewW / (data.length - 1);
    return data
      .map((v, i) => {
        const x = i * step;
        const y = viewH - (v / max) * viewH;
        return i === 0 ? `M${x} ${y}` : `L${x} ${y}`;
      })
      .join(" ");
  }

  return (
    <div className="w-full h-64 relative bg-surface-container-highest/20 border border-outline-variant/30 rounded-sm overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #3b494c 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${viewW} ${viewH}`}>
        {[50, 100, 150].map((y) => (
          <line key={y} x1="0" x2={viewW} y1={y} y2={y} stroke="#3b494c" strokeWidth="0.5" />
        ))}
        {materialLines.map((line) => (
          <path key={line.name} d={buildPath(line.data)} fill="none" stroke={line.color} strokeWidth="2" />
        ))}
      </svg>
      <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between text-[9px] text-on-surface-variant/60 py-2">
        <span>100%</span>
        <span>75%</span>
        <span>50%</span>
        <span>25%</span>
        <span>0%</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />
        <div className="p-4 sm:p-6 md:p-8 space-y-6 flex-1">
          <Breadcrumbs />

          {/* KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-surface-container p-5 rounded-xl border border-outline-variant flex flex-col gap-2 relative overflow-hidden group hover:border-primary/30 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Icon name={kpi.icon} className="text-4xl" />
                </div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{kpi.label}</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-2xl font-bold text-on-surface">{kpi.value}</h3>
                  {kpi.unit && <span className="text-sm text-on-surface-variant mb-1">{kpi.unit}</span>}
                  <span className="text-xs font-bold text-primary mb-1 flex items-center gap-0.5">{kpi.badge} <Icon name="trending_up" className="text-[12px]" /></span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-highest rounded-full mt-1 overflow-hidden">
                  <div className={`h-full ${kpi.barColor} rounded-full`} style={{ width: kpi.barWidth }} />
                </div>
              </div>
            ))}
          </section>

          {/* Live Ink Matrix */}
          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-6 overflow-hidden relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Icon name="format_color_fill" className="text-primary text-lg" />
                <h2 className="text-base sm:text-lg font-bold text-on-surface uppercase tracking-tight">Matriz de Tinta ao Vivo</h2>
              </div>
              <span className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> NOMINAL
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {inkChannels.map((ch) => (
                <div key={ch.id} className="bg-surface-container-high border border-outline-variant p-4 flex flex-col items-center rounded-xl">
                  <div className="w-full flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">CANAL_0{inkChannels.indexOf(ch) + 1} [{ch.label}]</span>
                    <Icon name="info" className="text-on-surface-variant/40 text-[16px]" />
                  </div>
                  <CircularGauge level={ch.level} color={ch.color} />
                  <div className="w-full space-y-1.5 border-t border-outline-variant/30 pt-3 mt-4 text-xs">
                    <div className="flex justify-between font-data-md"><span className="text-on-surface-variant">VISCOSIDADE</span><span className="text-on-surface">{ch.viscosity}</span></div>
                    <div className="flex justify-between font-data-md"><span className="text-on-surface-variant">TEMP</span><span className="text-on-surface">{ch.temp}</span></div>
                    <div className="flex justify-between font-data-md"><span className="text-on-surface-variant">CALIBRAÇÃO</span><span className={ch.calib.includes("SINCRONIZAR") ? "text-tertiary" : "text-primary"}>{ch.calib}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Thermal Production Flow */}
            <section className="lg:col-span-2 bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon name="thermostat" className="text-primary text-lg" />
                  <h2 className="text-[10px] font-bold text-on-surface uppercase tracking-widest">Fluxo de Produção Térmico</h2>
                </div>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant">
                    <span className="w-2.5 h-2.5 bg-primary" /> ALTA
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant">
                    <span className="w-2.5 h-2.5 bg-secondary-container" /> NORMAL
                  </span>
                </div>
              </div>
              <ThermalChart />
              <div className="mt-3 flex justify-between text-[10px] text-on-surface-variant font-bold uppercase tracking-widest border-t border-outline-variant/30 pt-2">
                <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>00:00</span>
              </div>
            </section>

            {/* Active Machine Nodes */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 relative overflow-hidden min-h-[320px]">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="terminal" className="text-primary text-[16px]" />
                <h2 className="text-[10px] font-bold text-on-surface uppercase tracking-widest">Nós de Máquinas Ativos</h2>
              </div>
              {/* Waveform */}
              <div className="h-12 mb-4 border-b border-outline-variant/30 overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)" }}>
                <svg className="w-full h-full text-primary" viewBox="0 0 400 60">
                  <path d="M0 30 L50 30 L60 10 L70 50 L80 30 L150 30 L160 5 L170 55 L180 30 L250 30 L260 15 L270 45 L280 30 L350 30 L360 0 L370 60 L380 30 L400 30" fill="none" stroke="currentColor" strokeDasharray="1000" strokeDashoffset="1000" strokeWidth="1.5">
                    <animate attributeName="stroke-dashoffset" dur="4s" from="1000" repeatCount="indefinite" to="0" />
                  </path>
                </svg>
              </div>
              <TerminalLog />
            </section>
          </div>

          {/* Material Consumption */}
          <section className="bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Icon name="show_chart" className="text-primary text-lg" />
                <h2 className="text-base sm:text-lg font-bold text-on-surface uppercase tracking-tight">Consumo de Materiais</h2>
              </div>
              <div className="flex gap-3 flex-wrap">
                {materialLines.map((l) => (
                  <span key={l.name} className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant border border-outline-variant px-2.5 py-1 rounded-sm uppercase tracking-widest">
                    <span className="w-3 h-[2px] rounded-sm" style={{ backgroundColor: l.color }} /> {l.name}
                  </span>
                ))}
              </div>
            </div>
            <MaterialChart />
          </section>
        </div>

        <footer className="mt-auto p-6 text-center border-t border-outline-variant bg-surface-container">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>
      </main>
    </div>
  );
}
