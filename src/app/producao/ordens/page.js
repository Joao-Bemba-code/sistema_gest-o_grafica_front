"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";

const sampleOPs = [
  { id: "OP-2024-001", cliente: "João Matos", empresa: "Gráfica Expresso", produto: "Catálogos Institucionais", quantidade: "500 un", dataEntrada: "2024-05-20", dataEntrega: "2024-05-25", orcamento: "ORC-2024-001", status: "em_producao", etapaAtual: "impressao" },
  { id: "OP-2024-002", cliente: "Pedro Neto", empresa: "Editora Nacional", produto: "Revistas", quantidade: "3000 un", dataEntrada: "2024-05-21", dataEntrega: "2024-05-31", orcamento: "ORC-2024-005", status: "em_producao", etapaAtual: "pre_impressao" },
  { id: "OP-2024-003", cliente: "Ana Ferreira", empresa: "Marketing Total", produto: "Flyers Promocionais", quantidade: "2000 un", dataEntrada: "2024-05-15", dataEntrega: "2024-05-17", orcamento: "ORC-2024-004", status: "entregue", etapaAtual: "entrega" },
  { id: "OP-2024-004", cliente: "Maria Santos", empresa: "PubliAngola Lda", produto: "Banners Publicitários", quantidade: "10 un", dataEntrada: "2024-05-22", dataEntrega: "2024-05-25", orcamento: "ORC-2024-002", status: "aguardando", etapaAtual: "pre_impressao" },
  { id: "OP-2024-005", cliente: "Carlos Fernandes", empresa: "Impressões Rápidas", produto: "Embalagens Personalizadas", quantidade: "1000 un", dataEntrada: "2024-05-23", dataEntrega: "2024-05-30", orcamento: "ORC-2024-003", status: "finalizado", etapaAtual: "entrega" },
];

const statusConfig = {
  aguardando: { label: "Aguardando", color: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  em_producao: { label: "Em Produção", color: "bg-primary/10 text-primary", dot: "bg-primary" },
  finalizado: { label: "Finalizado", color: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400", dot: "bg-green-500" },
  entregue: { label: "Entregue", color: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400", dot: "bg-purple-500" },
};

const etapaLabels = { pre_impressao: "Pré-Impressão", impressao: "Impressão", acabamento: "Acabamento", qualidade: "Qualidade", entrega: "Entrega" };

const initialForm = { cliente: "", empresa: "", produto: "", quantidade: "", dataEntrega: "", orcamento: "" };

export default function OrdensProducaoPage() {
  const [ops, setOps] = useState(sampleOPs);
  const [filter, setFilter] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const filtered = filter === "todos" ? ops : ops.filter((o) => o.status === filter);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const n = String(ops.length + 1).padStart(3, "0");
    const nova = {
      id: `OP-2024-${n}`,
      ...form,
      quantidade: form.quantidade + " un",
      dataEntrada: new Date().toISOString().split("T")[0],
      status: "aguardando",
      etapaAtual: "pre_impressao",
    };
    setOps([nova, ...ops]);
    setForm(initialForm);
    setModalOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />
        <div className="p-6 md:p-8 space-y-6 flex-1">
          <Breadcrumbs />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-on-surface">Ordens de Produção</h1>
              <p className="text-xs text-on-surface-variant mt-1">{ops.length} OPs registadas</p>
            </div>
            <button onClick={() => setModalOpen(true)} className="bg-primary text-on-primary font-semibold rounded-lg px-5 py-2.5 flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm text-xs">
              <Icon name="add" className="text-lg" />
              Nova OP
            </button>
          </div>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <div key={key} className="bg-surface-container p-4 rounded-xl border border-outline-variant">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-xs text-on-surface-variant">{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold text-on-surface">{ops.filter((o) => o.status === key).length}</p>
              </div>
            ))}
          </section>

          <div className="flex gap-2 flex-wrap">
            {["todos", ...Object.keys(statusConfig)].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filter === f ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-highest"}`}>
                {f === "todos" ? "Todos" : statusConfig[f]?.label || f}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((op) => {
              const sc = statusConfig[op.status];
              const etapas = Object.keys(etapaLabels);
              const etapaIdx = etapas.indexOf(op.etapaAtual);
              return (
                <div key={op.id} className="bg-surface-container rounded-xl border border-outline-variant p-5 cursor-pointer hover:border-primary transition-all" onClick={() => setSelected(selected === op.id ? null : op.id)}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon name="construction" className="text-primary text-[20px]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-on-surface">{op.id}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.color}`}><span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant">{op.cliente} — {op.produto} ({op.quantidade})</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                      <span>Entrada: {new Date(op.dataEntrada).toLocaleDateString("pt-BR")}</span>
                      <span>Entrega: {new Date(op.dataEntrega).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1">
                    {etapas.map((et, i) => (
                      <div key={et} className="flex-1 flex items-center gap-1">
                        <div className={`h-2 flex-1 rounded-full ${i <= etapaIdx ? "bg-primary" : "bg-surface-container-highest"}`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {etapas.map((et) => (
                      <span key={et} className={`text-[9px] ${et === op.etapaAtual ? "text-primary font-bold" : "text-on-surface-variant"}`}>{etapaLabels[et]}</span>
                    ))}
                  </div>

                  {selected === op.id && (
                    <div className="mt-4 pt-4 border-t border-outline-variant grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-on-surface-variant text-xs block">OP</span><span className="font-bold text-on-surface">{op.id}</span></div>
                      <div><span className="text-on-surface-variant text-xs block">Cliente</span><span className="font-medium text-on-surface">{op.cliente}</span></div>
                      <div><span className="text-on-surface-variant text-xs block">Produto</span><span className="font-medium text-on-surface">{op.produto}</span></div>
                      <div><span className="text-on-surface-variant text-xs block">Quantidade</span><span className="font-medium text-on-surface">{op.quantidade}</span></div>
                      <div><span className="text-on-surface-variant text-xs block">Orçamento</span><span className="font-medium text-primary">{op.orcamento}</span></div>
                      <div><span className="text-on-surface-variant text-xs block">Data Entrada</span><span className="font-medium text-on-surface">{new Date(op.dataEntrada).toLocaleDateString("pt-BR")}</span></div>
                      <div><span className="text-on-surface-variant text-xs block">Data Entrega</span><span className="font-medium text-on-surface">{new Date(op.dataEntrega).toLocaleDateString("pt-BR")}</span></div>
                      <div><span className="text-on-surface-variant text-xs block">Empresa</span><span className="font-medium text-on-surface">{op.empresa}</span></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Ordem de Produção" icon="add" size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Cliente *</label>
                <select required name="cliente" value={form.cliente} onChange={handleChange} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Seleccionar...</option>
                  <option value="João Matos">João Matos</option>
                  <option value="Maria Santos">Maria Santos</option>
                  <option value="Carlos Fernandes">Carlos Fernandes</option>
                  <option value="Ana Ferreira">Ana Ferreira</option>
                  <option value="Pedro Neto">Pedro Neto</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Empresa</label>
                <input name="empresa" value={form.empresa} onChange={handleChange} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Gráfica Expresso" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Produto *</label>
                <input required name="produto" value={form.produto} onChange={handleChange} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Catálogos Institucionais" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Quantidade *</label>
                <input required name="quantidade" value={form.quantidade} onChange={handleChange} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Data de Entrega *</label>
                <input required type="date" name="dataEntrega" value={form.dataEntrega} onChange={handleChange} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Orçamento de Referência</label>
                <select name="orcamento" value={form.orcamento} onChange={handleChange} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Nenhum</option>
                  <option value="ORC-2024-001">ORC-2024-001</option>
                  <option value="ORC-2024-002">ORC-2024-002</option>
                  <option value="ORC-2024-003">ORC-2024-003</option>
                  <option value="ORC-2024-004">ORC-2024-004</option>
                  <option value="ORC-2024-005">ORC-2024-005</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">Criar OP</button>
            </div>
          </form>
        </Modal>

        <footer className="p-6 text-center border-t border-outline-variant bg-surface-container-high">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>
      </main>
    </div>
  );
}