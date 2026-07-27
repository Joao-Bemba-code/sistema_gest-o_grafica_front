"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";

const servicos = [
  { id: "corte", label: "Corte", icon: "content_cut" },
  { id: "dobra", label: "Dobra", icon: "flip" },
  { id: "encadernacao", label: "Encadernação", icon: "menu_book" },
  { id: "laminacao", label: "Laminação", icon: "layers" },
  { id: "verniz", label: "Verniz", icon: "format_paint" },
  { id: "hot_stamping", label: "Hot Stamping", icon: "star" },
  { id: "ilhos", label: "Ilhós", icon: "circle" },
];

const sampleOS = [
  { id: "AC-001", op: "OP-2024-001", cliente: "João Matos", produto: "Catálogos Institucionais", dataEntrada: "2024-05-23", prazo: "2024-05-25", responsavel: "Carlos Silva",
    servicos: { corte: "concluido", dobra: "concluido", encadernacao: "em_execucao", laminacao: "pendente", verniz: "pendente", hot_stamping: "pendente", ilhos: "pendente" } },
  { id: "AC-002", op: "OP-2024-005", cliente: "Carlos Fernandes", produto: "Embalagens Personalizadas", dataEntrada: "2024-05-24", prazo: "2024-05-30", responsavel: "Ana Costa",
    servicos: { corte: "concluido", dobra: "em_execucao", encadernacao: "pendente", laminacao: "pendente", verniz: "pendente", hot_stamping: "em_execucao", ilhos: "pendente" } },
  { id: "AC-003", op: "OP-2024-002", cliente: "Pedro Neto", produto: "Revistas", dataEntrada: "2024-05-24", prazo: "2024-05-31", responsavel: "Ricardo Silva",
    servicos: { corte: "pendente", dobra: "pendente", encadernacao: "pendente", laminacao: "pendente", verniz: "pendente", hot_stamping: "pendente", ilhos: "pendente" } },
];

const etapaOptions = ["pendente", "em_execucao", "concluido"];
const etapaLabels = { pendente: "Pendente", em_execucao: "Em Execução", concluido: "Concluído" };
const etapaCores = {
  pendente: "border-outline-variant bg-surface-container-high text-on-surface-variant hover:border-outline/60",
  em_execucao: "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:border-amber-500/60",
  concluido: "border-primary/40 bg-primary/10 text-primary hover:border-primary/60",
};

const initialForm = { op: "", cliente: "", produto: "", prazo: "", responsavel: "" };
const initialServicos = Object.fromEntries(servicos.map(s => [s.id, "pendente"]));

export default function AcabamentoPage() {
  const [ordens, setOrdens] = useState(sampleOS);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [servicosForm, setServicosForm] = useState(initialServicos);

  const toggleServico = (ordemId, servicoId) => {
    setOrdens(ordens.map(o =>
      o.id === ordemId
        ? { ...o, servicos: { ...o.servicos, [servicoId]: etapaOptions[(etapaOptions.indexOf(o.servicos[servicoId]) + 1) % 3] } }
        : o
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const n = String(ordens.length + 1).padStart(3, "0");
    const nova = {
      id: `AC-${n}`, ...form, dataEntrada: new Date().toISOString().split("T")[0],
      servicos: { ...servicosForm },
    };
    setOrdens([nova, ...ordens]);
    setForm(initialForm);
    setServicosForm(initialServicos);
    setModalOpen(false);
  };

  const pendentes = ordens.filter(o => Object.values(o.servicos).some(v => v === "pendente")).length;
  const concluidas = ordens.filter(o => Object.values(o.servicos).every(v => v === "concluido")).length;

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col bg-surface">
        <TopBar />
        <div className="p-6 md:p-8 space-y-6 flex-1">
          <Breadcrumbs />

          {/* Cabeçalho com título e ação */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-on-surface tracking-tight">Acabamento</h1>
              <p className="text-xs text-on-surface-variant mt-0.5 font-mono tracking-wide">
                {ordens.length} ordens em processamento
              </p>
            </div>
            <button 
              onClick={() => setModalOpen(true)} 
              className="bg-primary text-on-primary font-semibold rounded-lg px-5 py-2.5 flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 text-xs tracking-wide uppercase"
            >
              <Icon name="add" className="text-lg" />
              Nova Ordem
            </button>
          </div>

          {/* KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total de Ordens", value: ordens.length, icon: "handyman", color: "text-primary" },
              { label: "Com Pendências", value: pendentes, icon: "pending", color: "text-amber-400" },
              { label: "Concluídas", value: concluidas, icon: "check_circle", color: "text-primary" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface-container p-5 rounded-xl border border-outline-variant hover:border-primary/30 transition-all duration-300 group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center ${kpi.color} group-hover:scale-105 transition-transform`}>
                    <Icon name={kpi.icon} className="text-2xl" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-2xl font-bold text-on-surface tracking-tight">{kpi.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Lista de Ordens */}
          <div className="space-y-3">
            {ordens.map((ordem) => (
              <div 
                key={ordem.id} 
                className="bg-surface-container rounded-xl border border-outline-variant hover:border-primary/30 transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Cabeçalho da ordem - sempre visível */}
                <div 
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-surface-container-high/50 transition-colors" 
                  onClick={() => setSelected(selected === ordem.id ? null : ordem.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Icon name="handyman" className="text-primary text-[20px]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface tracking-tight">{ordem.id}</span>
                        <span className="text-[10px] text-on-surface-variant/60 font-mono">← {ordem.op}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">{ordem.cliente} — {ordem.produto}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant">
                      {ordem.responsavel}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      Prazo: {new Date(ordem.prazo).toLocaleDateString("pt-BR")}
                    </span>
                    <Icon name="chevron_right" className={`text-on-surface-variant/40 text-lg transition-transform duration-300 ${selected === ordem.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Detalhes expandidos - serviços */}
                {selected === ordem.id && (
                  <div className="border-t border-outline-variant p-5 bg-surface-container/30">
                    <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Icon name="handyman" className="text-[16px] text-primary" />
                      Serviços de Acabamento
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                      {servicos.map((s) => {
                        const val = ordem.servicos[s.id];
                        return (
                          <button 
                            key={s.id} 
                            onClick={() => toggleServico(ordem.id, s.id)}
                            className={`p-4 rounded-lg border text-center transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 ${etapaCores[val] || etapaCores.pendente}`}
                          >
                            <Icon name={s.icon} className="text-2xl block mb-1.5 mx-auto" />
                            <p className="text-xs font-semibold text-on-surface">{s.label}</p>
                            <p className="text-[10px] mt-1 font-mono">{etapaLabels[val] || "Pendente"}</p>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-[10px] text-on-surface-variant/60">
                      <Icon name="info" className="text-[14px]" />
                      Clique em cada serviço para alternar entre Pendente → Em Execução → Concluído
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Nova Ordem */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Ordem de Acabamento" icon="add" size="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">OP de Referência *</label>
                <select 
                  required 
                  name="op" 
                  value={form.op} 
                  onChange={(e) => setForm({ ...form, op: e.target.value })} 
                  className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
                >
                  <option value="">Seleccionar...</option>
                  <option>OP-2024-001</option><option>OP-2024-002</option><option>OP-2024-003</option><option>OP-2024-004</option><option>OP-2024-005</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Responsável *</label>
                <input 
                  required 
                  name="responsavel" 
                  value={form.responsavel} 
                  onChange={(e) => setForm({ ...form, responsavel: e.target.value })} 
                  className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-on-surface-variant/40" 
                  placeholder="Nome do operador" 
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Cliente *</label>
                <select 
                  required 
                  name="cliente" 
                  value={form.cliente} 
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })} 
                  className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                >
                  <option value="">Seleccionar...</option>
                  <option>João Matos</option><option>Maria Santos</option><option>Carlos Fernandes</option><option>Ana Ferreira</option><option>Pedro Neto</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Produto *</label>
                <input 
                  required 
                  name="produto" 
                  value={form.produto} 
                  onChange={(e) => setForm({ ...form, produto: e.target.value })} 
                  className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-on-surface-variant/40" 
                  placeholder="Ex: Catálogos Institucionais" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Prazo de Entrega *</label>
                <input 
                  required 
                  type="date" 
                  name="prazo" 
                  value={form.prazo} 
                  onChange={(e) => setForm({ ...form, prazo: e.target.value })} 
                  className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono" 
                />
              </div>
            </div>

            <div className="border-t border-outline-variant pt-4">
              <h4 className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Estado dos Serviços</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {servicos.map((s) => (
                  <div key={s.id} className="flex flex-col gap-1.5 p-3 rounded-lg bg-surface-container-high border border-outline-variant">
                    <label className="text-[10px] font-medium text-on-surface-variant flex items-center gap-1.5">
                      <Icon name={s.icon} className="text-[14px] text-primary" />
                      {s.label}
                    </label>
                    <select 
                      value={servicosForm[s.id]} 
                      onChange={(e) => setServicosForm({ ...servicosForm, [s.id]: e.target.value })}
                      className="w-full px-2 py-1.5 bg-surface-container border border-outline-variant rounded text-[10px] text-on-surface outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_execucao">Em Execução</option>
                      <option value="concluido">Concluído</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant">
              <button 
                type="button" 
                onClick={() => { setModalOpen(false); setServicosForm(initialServicos); }} 
                className="px-5 py-2.5 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                Criar Ordem
              </button>
            </div>
          </form>
        </Modal>

        <footer className="p-6 text-center border-t border-outline-variant bg-surface-container/30">
          <p className="text-xs text-on-surface-variant/50 font-mono tracking-wider">
            SIGRAF Precision Emerald — Acabamento v2.4
          </p>
        </footer>
      </main>
    </div>
  );
}