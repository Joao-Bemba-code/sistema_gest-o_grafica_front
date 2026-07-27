"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";

const checklistItems = [
  { key: "arquivo", label: "Arquivo Recebido", icon: "file_present" },
  { key: "tamanho", label: "Tamanho Correto", icon: "straighten" },
  { key: "sangria", label: "Sangria", icon: "crop" },
  { key: "cmyk", label: "CMYK", icon: "palette" },
  { key: "fontes", label: "Fontes Convertidas", icon: "text_fields" },
  { key: "imagens", label: "Imagens 300DPI", icon: "image" },
  { key: "revisao", label: "Revisão Ortográfica", icon: "spellcheck" },
  { key: "aprovacao", label: "Aprovação do Cliente", icon: "thumb_up" },
];

const statusClasses = {
  ok: "bg-primary/10 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  nok: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-error/30 dark:border-red-800",
  pendente: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
};

const initialChecklist = Object.fromEntries(checklistItems.map(c => [c.key, "pendente"]));

const sampleJobs = [
  { id: "PRE-001", job: "JOB-2026-001", cliente: "João Matos", produto: "Catálogos Institucionais", responsavel: "Márcia Dias", ...initialChecklist, arquivo: "ok", tamanho: "ok", sangria: "ok", cmyk: "ok", fontes: "nok", imagens: "ok", revisao: "ok", aprovacao: "pendente" },
  { id: "PRE-002", job: "JOB-2026-003", cliente: "Ana Ferreira", produto: "Flyers Promocionais", responsavel: "Rui Costa", ...initialChecklist, arquivo: "ok", tamanho: "ok", sangria: "ok", cmyk: "ok", fontes: "ok", imagens: "ok", revisao: "ok", aprovacao: "ok" },
  { id: "PRE-003", job: "JOB-2026-005", cliente: "Carlos Fernandes", produto: "Embalagens Personalizadas", responsavel: "Márcia Dias", ...initialChecklist, arquivo: "ok", tamanho: "ok", sangria: "nok", cmyk: "ok", fontes: "ok", imagens: "ok", revisao: "pendente", aprovacao: "pendente" },
];

const initialForm = { job: "", cliente: "", produto: "", responsavel: "", ...initialChecklist };

function calcularPreResultado(job) {
  const vals = checklistItems.map(c => job[c.key]);
  if (vals.some(v => v === "nok")) return "reprovado";
  if (vals.every(v => v === "ok")) return "aprovado";
  return "pendente";
}

export default function PreImpressaoPage() {
  const [jobs, setJobs] = useState(sampleJobs);
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editandoId, setEditandoId] = useState(null);

  const filtered = filtro === "todos" ? jobs : jobs.filter(j => calcularPreResultado(j) === filtro);
  const aprovados = jobs.filter(j => calcularPreResultado(j) === "aprovado").length;
  const reprovados = jobs.filter(j => calcularPreResultado(j) === "reprovado").length;
  const pendentes = jobs.filter(j => calcularPreResultado(j) === "pendente").length;

  const alterarItem = (jobId, itemKey, valor) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, [itemKey]: valor } : j));
  };

  const abrirEdicao = (job) => {
    const f = { job: job.job, cliente: job.cliente, produto: job.produto, responsavel: job.responsavel };
    checklistItems.forEach(c => f[c.key] = job[c.key]);
    setForm(f);
    setEditandoId(job.id);
    setModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editandoId) {
      setJobs(jobs.map(j => j.id === editandoId ? { ...j, ...form } : j));
    } else {
      const id = `PRE-${String(jobs.length + 1).padStart(3, "0")}`;
      setJobs([{ id, ...form }, ...jobs]);
    }
    setForm({ job: "", cliente: "", produto: "", responsavel: "", ...initialChecklist });
    setEditandoId(null);
    setModal(false);
  };

  const proximoStatus = (atual) => atual === "ok" ? "nok" : atual === "nok" ? "pendente" : "ok";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />
        <div className="p-6 md:p-8 space-y-6 flex-1">
          <Breadcrumbs />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-on-surface">Pré-Impressão</h1>
              <p className="text-xs text-on-surface-variant mt-1">{jobs.length} trabalhos em verificação</p>
            </div>
            <button onClick={() => { setForm({ job: "", cliente: "", produto: "", responsavel: "", ...initialChecklist }); setEditandoId(null); setModal(true); }} className="bg-primary text-on-primary font-semibold rounded-lg px-5 py-2.5 flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm text-xs">
              <Icon name="add" className="text-lg" />
              Novo Job
            </button>
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Aprovados", value: aprovados, icon: "check_circle", color: "text-primary", bg: "bg-primary/10 dark:bg-green-900/20" },
              { label: "Reprovados", value: reprovados, icon: "cancel", color: "text-error", bg: "bg-error-container/10 dark:bg-red-900/20" },
              { label: "Pendentes", value: pendentes, icon: "pending", color: "text-tertiary", bg: "bg-tertiary-container/10 dark:bg-amber-900/20" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface-container dark:bg-surface-container p-5 rounded-xl border border-outline-variant flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}><Icon name={kpi.icon} className="" /></div>
                <div><p className="text-xs text-on-surface-variant">{kpi.label}</p><p className="text-xl font-bold text-on-surface">{kpi.value}</p></div>
              </div>
            ))}
          </section>

          <div className="flex gap-2 flex-wrap">
            {[
              { key: "todos", label: "Todos" },
              { key: "aprovado", label: "Aprovados", icon: "check_circle" },
              { key: "reprovado", label: "Reprovados", icon: "cancel" },
              { key: "pendente", label: "Pendentes", icon: "pending" },
            ].map((f) => (
              <button key={f.key} onClick={() => setFiltro(f.key)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${filtro === f.key ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container"}`}>
                {f.icon && <Icon name={f.icon} className="text-sm" />}{f.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-container-high text-on-surface-variant">
                  <th className="text-left px-2 py-3 font-semibold">ID</th>
                  <th className="text-left px-2 py-3 font-semibold">Job</th>
                  <th className="text-left px-2 py-3 font-semibold">Produto</th>
                  <th className="text-left px-2 py-3 font-semibold">Cliente</th>
                  <th className="text-left px-2 py-3 font-semibold">Responsável</th>
                  {checklistItems.map(c => <th key={c.key} className="text-center px-1 py-3 font-semibold text-[9px] leading-tight">{c.label}</th>)}
                  <th className="text-center px-2 py-3 font-semibold">Resultado</th>
                  <th className="text-center px-2 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((job) => {
                  const resultado = calcularPreResultado(job);
                  const resCfg = resultado === "aprovado" ? { color: "text-primary", bg: "bg-primary/10 dark:bg-green-900/20", icon: "check_circle" } : resultado === "reprovado" ? { color: "text-error", bg: "bg-error-container/10 dark:bg-red-900/20", icon: "cancel" } : { color: "text-tertiary", bg: "bg-tertiary-container/10 dark:bg-amber-900/20", icon: "pending" };
                  return (
                    <tr key={job.id} className="hover:bg-surface-container-high transition-colors">
                      <td className="px-2 py-3 font-bold text-on-surface whitespace-nowrap">{job.id}</td>
                      <td className="px-2 py-3 text-on-surface-variant whitespace-nowrap">{job.job}</td>
                      <td className="px-2 py-3 text-on-surface-variant whitespace-nowrap">{job.produto}</td>
                      <td className="px-2 py-3 text-on-surface-variant whitespace-nowrap">{job.cliente}</td>
                      <td className="px-2 py-3 text-on-surface-variant whitespace-nowrap">{job.responsavel}</td>
                      {checklistItems.map(c => {
                        const val = job[c.key];
                        return (
                          <td key={c.key} className="px-1 py-3 text-center">
                            <button
                              onClick={() => alterarItem(job.id, c.key, proximoStatus(val))}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[9px] font-bold border cursor-pointer transition-all ${statusClasses[val]}`}
                              title={`${c.label}: ${val === "ok" ? "OK" : val === "nok" ? "NOK" : "Pendente"} — clique para alternar`}
                            >
                              <Icon name={val === "ok" ? "check_circle" : val === "nok" ? "cancel" : "radio_button_unchecked"} className="text-[10px]" />
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold ${resCfg.bg} ${resCfg.color}`}>
                          <Icon name={resCfg.icon} className="text-[10px]" />
                          {resultado === "aprovado" ? "Aprovado" : resultado === "reprovado" ? "Reprovado" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button onClick={() => abrirEdicao(job)} className="text-primary transition-colors" title="Editar">
                          <Icon name="edit" className="text-lg" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">
              <Icon name="preview" className="text-4xl block mb-2" />
              <p className="text-sm font-medium">Nenhum trabalho encontrado</p>
            </div>
          )}
        </div>

        <Modal open={modal} onClose={() => { setModal(false); setEditandoId(null); setForm({ job: "", cliente: "", produto: "", responsavel: "", ...initialChecklist }); }} title={editandoId ? "Editar Job" : "Novo Job de Pré-Impressão"} icon="preview" size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Job *</label>
                <input required value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: JOB-2026-001" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Responsável *</label>
                <input required value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nome do operador de pré-impressão" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Produto *</label>
                <input required value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Flyers A5" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Cliente *</label>
                <input required value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nome do cliente" />
              </div>
            </div>

            <div className="border-t border-outline-variant pt-4">
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Checklist de Verificação</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {checklistItems.map(c => (
                  <div key={c.key} className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${form[c.key] === "ok" ? "bg-primary/10 border-outline-variant" : form[c.key] === "nok" ? "bg-error-container/10 border-error/30" : "bg-surface-container-highest border-outline-variant"}`}
                    onClick={() => {
                      const next = form[c.key] === "ok" ? "nok" : form[c.key] === "nok" ? "pendente" : "ok";
                      setForm({ ...form, [c.key]: next });
                    }}
                  >
                    <Icon name={c.icon} className="text-lg block mb-1 text-on-surface-variant" />
                    <p className="text-[9px] font-bold text-on-surface-variant">{c.label}</p>
                    <span className={`text-[9px] font-bold mt-1 block ${form[c.key] === "ok" ? "text-primary" : form[c.key] === "nok" ? "text-error" : "text-on-surface-variant"}`}>
                      {form[c.key] === "ok" ? "OK" : form[c.key] === "nok" ? "NOK" : "Pendente"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-3 rounded-lg text-center text-xs font-bold ${checklistItems.some(c => form[c.key] === "nok") ? "bg-error-container/10 text-error" : checklistItems.every(c => form[c.key] === "ok") ? "bg-primary/10 text-primary" : "bg-tertiary-container/10 text-tertiary"}`}>
              Resultado: {checklistItems.some(c => form[c.key] === "nok") ? "Reprovado" : checklistItems.every(c => form[c.key] === "ok") ? "Aprovado" : "Pendente"}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setModal(false); setEditandoId(null); setForm({ job: "", cliente: "", produto: "", responsavel: "", ...initialChecklist }); }} className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">{editandoId ? "Guardar Alterações" : "Criar Job"}</button>
            </div>
          </form>
        </Modal>

        <footer className="p-6 text-center border-t border-outline-variant bg-surface-container-highest mt-auto">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>
      </main>
    </div>
  );
}