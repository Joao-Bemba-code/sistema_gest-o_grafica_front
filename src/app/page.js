"use client";

import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Icon from "@/components/Icon";

const kpis = [
  {
    icon: "request_quote",
    label: "Orçamento do Dia",
    value: "Kz 12.850",
    badge: "+8%",
    barColor: "bg-primary",
    barWidth: "64%",
  },
  {
    icon: "check_circle",
    label: "Orçamentos Aprovados",
    value: "23",
    unit: "hoje",
    badge: "+5",
    badgeColor: "text-primary dark:text-primary/80",
    barColor: "bg-primary",
    barWidth: "76%",
  },
  {
    icon: "precision_manufacturing",
    label: "Trabalhos em Produção",
    value: "47",
    unit: "ativos",
    badge: "Alta Demanda",
    badgeColor: "text-primary dark:text-primary/80",
    barColor: "bg-primary",
    barWidth: "70%",
  },
  {
    icon: "task_alt",
    label: "Trabalhos Concluídos",
    value: "156",
    unit: "este mês",
    badge: "+12%",
    badgeColor: "text-primary dark:text-primary/80",
    barColor: "bg-primary",
    barWidth: "85%",
  },
  {
    icon: "paid",
    label: "Faturação Mensal",
    value: "Kz 285.400",
    badge: "+5.2%",
    badgeColor: "text-primary dark:text-primary/80",
    barColor: "bg-primary",
    barWidth: "72%",
  },
  {
    icon: "groups",
    label: "Clientes Ativos",
    value: "342",
    badge: "+18",
    badgeColor: "text-primary dark:text-primary/80",
    barColor: "bg-primary",
    barWidth: "68%",
  },
  {
    icon: "warning",
    label: "Trabalhos em Atraso",
    value: "8",
    unit: "pendentes",
    badge: "Atenção",
    badgeColor: "text-red-600 dark:text-red-400",
    barColor: "bg-red-500",
    barWidth: "16%",
  },
];

const activities = [
  {
    name: "Ana Costa",
    action: "cadastrou novo pedido de impressão",
    tag: "Venda",
    description: "Pedido #8492 — Catálogos Institucionais, 1.000 unidades, 48 páginas.",
    time: "2 minutos atrás",
    borderColor: "border-primary",
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDtzEYNW6OYtKqZzk5DwikYshvA0YesUmrfMJvhVKrTp2DgUC51L19EeUqWKdhPCSPu11ZPVbErIUBJOvHqmSjmfMqk1rgYM9WZ6n0E3EZGR3NJbrAwtbHamHjx2Vr45-xJGemd1LIkTAQ7nLMIgNpKiHSw0gSLihgtMkJyTkKyKPr4WCnN_HXFbYYR178U6trY2NuWEJ1RpHo_H7EO3Hz2KpzwG4u4BS61OhFYn-AxPfyDz0NCHv52pdh5_Ruibo_VESLn6Cy5QSh_",
  },
  {
    name: "Ricardo Silva",
    action: "finalizou ajuste de calibragem",
    tag: "Manutenção",
    description: "Máquina Offset 1 — ajuste de densidade e registro concluído.",
    time: "18 minutos atrás",
    borderColor: "border-primary",
    imgSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAqQvkib2qJHeFx6Xm1jbYpQQlLlRzk5zYkUOgMgXcVS2Q7JfKc202gNLlFdWS3hdwA6Hu9xhoo0RQnHP7xpGkqVvbictVBeJ4CDD30rdFUAxFkEd7nh5OFhAClGewE_oiVhCrFIVh6OqojsYpd4V2yLVHmF91GmTnedFMMtzyf4JzlA5ph8ZI8QRPt_y0lG655lCDL-92hSB0jsagJRAvBGZG7k0Q9Fgt14IcRT3CTsjwwhyPT7oaamYqEMFCI9860DvF_RtdZnurF",
  },
  {
    name: "Departamento Técnico",
    action: "aprovou layout de embalagem",
    tag: "Aprovação",
    description: "Embalagem Kraft Personalizada — arte-final verificada e liberada.",
    time: "1 hora atrás",
    borderColor: "border-primary",
    imgSrc: null,
  },
];

const calendarDays = [
  { day: 28, dim: true },
  { day: 29, dim: true },
  { day: 30, dim: true },
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4 },
  { day: 5, active: true },
  { day: 6, dot: "bg-primary" },
  { day: 7 },
  { day: 8 },
  { day: 9, dot: "bg-primary" },
  { day: 10 },
  { day: 11 },
];

const scheduleItems = [
  {
    month: "Mai",
    day: "06",
    title: "Entrega Pedido #742",
    subtitle: "Campanha Marketing Regional",
    borderColor: "border-primary",
  },
  {
    month: "Mai",
    day: "09",
    title: "Manutenção Preventiva",
    subtitle: "Impressora Digital HP Indigo",
    borderColor: "border-primary",
  },
];

const consumptionItems = [
  { label: "Vinil Adesivo Brilho", time: "2m atrás", dotColor: "bg-primary" },
  { label: "Lona Front Light", time: "15m atrás", dotColor: "bg-primary" },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />

        <div className="p-6 md:p-8 space-y-6">
          <Breadcrumbs />

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-md hover:border-primary/30 dark:hover:border-primary/20 transition-all duration-200 flex flex-col gap-2 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Icon name={kpi.icon} className="text-4xl" />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{kpi.label}</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                    {kpi.value}{" "}
                    {kpi.unit && (
                      <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">{kpi.unit}</span>
                    )}
                  </h3>
                  <span
                    className={`font-semibold text-xs mb-1 flex items-center ${kpi.badgeColor || "text-primary"}`}
                  >
                    {kpi.badge}
                    {kpi.badge === "+8%" || kpi.badge === "+12%" || kpi.badge === "+5.2%" || kpi.badge === "+5" || kpi.badge === "+18" ? (
                      <Icon name="trending_up" className="text-[14px]" />
                    ) : null}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-1 overflow-hidden">
                  <div
                    className={`h-full ${kpi.barColor} rounded-full transition-all duration-700`}
                    style={{ width: kpi.barWidth }}
                  />
                </div>
              </div>
            ))}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                    Volume de Impressão Mensal
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Produção vs. Prazo de Entrega (Acumulado)
                  </p>
                </div>
                <div className="flex gap-1">
                  <button className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    Semanal
                  </button>
                  <button className="px-3 py-1 rounded-full bg-primary text-white text-xs font-medium shadow-sm hover:bg-primary/90 transition-colors">
                    Mensal
                  </button>
                  <button className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    Anual
                  </button>
                </div>
              </div>

              <div className="w-full h-64 relative flex items-end gap-2 px-2">
                <div className="absolute inset-0 border-b border-l border-zinc-200 dark:border-zinc-700 flex flex-col justify-between">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="border-t border-zinc-100 dark:border-zinc-800 w-full" />
                  ))}
                </div>
                <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M0 80 Q 20 60, 40 70 T 80 30 T 100 15" fill="none" stroke="#4edea3" strokeWidth="2" />
                  <path d="M0 80 Q 20 60, 40 70 T 80 30 T 100 15 V 100 H 0 Z" fill="url(#grad1)" opacity="0.08" />
                  <path d="M0 85 Q 25 80, 50 75 T 75 60 T 100 55" fill="none" stroke="#4edea3" strokeWidth="2" />
                  <defs>
                    <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#4edea3" stopOpacity="1" />
                      <stop offset="100%" stopColor="#4edea3" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="flex justify-between mt-3 px-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
                <span>Jan</span>
                <span>Fev</span>
                <span>Mar</span>
                <span>Abr</span>
                <span>Mai</span>
                <span>Jun</span>
              </div>
            </section>

            <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col p-6">
              <h2 className="text-base font-semibold mb-4 text-zinc-800 dark:text-zinc-200">
                Status de Maquinário e Insumos
              </h2>
              <div className="flex-1 grid grid-cols-1 gap-4">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                      <Icon name="inventory_2" className="text-lg" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Estoque Baixo: Papel Couché 150g
                      </p>
                      <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                        Apenas 5 resmas disponíveis
                      </p>
                    </div>
                  </div>
                  <button className="text-red-600 dark:text-red-400 font-semibold text-sm hover:underline">
                    Repor
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg flex flex-col justify-center border border-zinc-200 dark:border-zinc-700">
                    <Icon name="imagesearch_roller" className="text-primary mb-1" />
                    <p className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">
                      Tinta CMYK
                    </p>
                    <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100">78%</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg flex flex-col justify-center border border-zinc-200 dark:border-zinc-700">
                    <Icon name="settings_input_component" className="text-primary mb-1" />
                    <p className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">
                      Offset 1
                    </p>
                    <p className="text-lg font-bold text-primary dark:text-primary/80">Ativa</p>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm font-semibold mb-2 text-zinc-800 dark:text-zinc-200">Consumo Recente</p>
                  <div className="space-y-2">
                    {consumptionItems.map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                          <span className={`w-2 h-2 rounded-full ${item.dotColor}`} />
                          {item.label}
                        </span>
                        <span className="text-zinc-400 dark:text-zinc-500 text-xs">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <section className="xl:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                  Atividades da Produção
                </h2>
                <button className="text-primary dark:text-primary/80 font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all">
                  Ver Histórico Completo
                  <Icon name="arrow_forward" className="text-[18px]" />
                </button>
              </div>

              <div className="space-y-4">
                {activities.map((activity, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border-2 ${activity.borderColor}`}>
                        {activity.imgSrc ? (
                          <Image className="object-cover" alt={activity.name} src={activity.imgSrc} width={40} height={40} unoptimized />
                        ) : (
                          <div className="w-full h-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                            <Icon name="description" className="text-lg" />
                          </div>
                        )}
                      </div>
                      {idx < activities.length - 1 && (
                        <div className="w-px h-full bg-zinc-200 dark:bg-zinc-800 mt-2" />
                      )}
                    </div>
                    <div className={`flex-1 ${idx < activities.length - 1 ? "pb-4" : ""}`}>
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {activity.name}{" "}
                          <span className="font-normal text-zinc-500 dark:text-zinc-400">
                            {activity.action}
                          </span>
                        </p>
                        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase shrink-0">
                          {activity.tag}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {activity.description}
                      </p>
                      <p className="text-[11px] text-primary dark:text-primary/80 font-medium mt-2">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Agenda</h2>
                <span className="text-sm font-medium text-primary dark:text-primary/80">
                  Maio 2024
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-4">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                  <span key={i} className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                    {d}
                  </span>
                ))}
                {calendarDays.map((item, i) => (
                  <div key={i} className="relative">
                    <span className={`inline-flex items-center justify-center w-8 h-8 text-xs rounded-lg cursor-pointer
                      ${item.dim ? "opacity-30" : "hover:bg-primary/10 dark:hover:bg-primary/20 text-zinc-700 dark:text-zinc-300"}
                      ${item.active ? "bg-primary text-white font-bold hover:bg-primary/90" : ""}
                    `}>
                      {item.day}
                    </span>
                    {item.dot && (
                      <div className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${item.dot}`} />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-auto space-y-2">
                {scheduleItems.map((item) => (
                  <div key={item.day} className={`p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border-l-4 ${item.borderColor} flex gap-4 items-center`}>
                    <div className="text-center leading-tight">
                      <p className="text-[10px] font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                        {item.month}
                      </p>
                      <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                        {item.day}
                      </p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{item.title}</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <footer className="mt-auto p-6 text-center border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            SIGRAF — Sistema de Gestão para Indústria Gráfica
          </p>
        </footer>
      </main>
    </div>
  );
}
