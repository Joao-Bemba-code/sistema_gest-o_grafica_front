"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Icon from "@/components/Icon";

const etapas = [
  { id: "pre_impressao", label: "Pré-Impressão", icon: "rule" },
  { id: "impressao", label: "Impressão", icon: "print" },
  { id: "acabamento", label: "Acabamento", icon: "handyman" },
  { id: "qualidade", label: "Qualidade", icon: "verified" },
  { id: "entrega", label: "Entrega", icon: "local_shipping" },
];

const sampleJobs = [
  { id: "OP-2024-001", cliente: "João Matos", produto: "Catálogos Institucionais", quantidade: "500 un", status: "em_producao", etapaAtual: "impressao",
    preImpressao: { arquivoRecebido: true, tamanhoCorreto: true, CMYK: true, fontesConvertidas: true, imagem300DPI: true, revisaoOrtografica: true, aprovacaoCliente: true, responsavel: "Carlos Silva" },
    impressao: { maquina: "Offset Heidelberg", operador: "Ricardo Silva", horaInicio: "08:00", horaFim: "", quantidadeProduzida: 320, quantidadeRejeitada: 5, observacoes: "Boa aderência de tinta" },
    acabamento: { corte: "concluido", dobra: "em_execucao", encadernacao: "pendente", laminacao: "pendente", verniz: "pendente", hotStamping: "pendente" },
    qualidade: { cor: "", corte: "", quantidade: "", acabamento: "", embalagem: "", resultado: "" },
  },
  { id: "OP-2024-002", cliente: "Pedro Neto", produto: "Revistas", quantidade: "3000 un", status: "em_producao", etapaAtual: "pre_impressao",
    preImpressao: { arquivoRecebido: true, tamanhoCorreto: true, CMYK: false, fontesConvertidas: true, imagem300DPI: false, revisaoOrtografica: true, aprovacaoCliente: false, responsavel: "Ana Costa" },
    impressao: { maquina: "", operador: "", horaInicio: "", horaFim: "", quantidadeProduzida: 0, quantidadeRejeitada: 0, observacoes: "" },
    acabamento: { corte: "pendente", dobra: "pendente", encadernacao: "pendente", laminacao: "pendente", verniz: "pendente", hotStamping: "pendente" },
    qualidade: { cor: "", corte: "", quantidade: "", acabamento: "", embalagem: "", resultado: "" },
  },
  { id: "OP-2024-004", cliente: "Maria Santos", produto: "Banners Publicitários", quantidade: "10 un", status: "aguardando", etapaAtual: "pre_impressao",
    preImpressao: { arquivoRecebido: true, tamanhoCorreto: false, CMYK: false, fontesConvertidas: false, imagem300DPI: false, revisaoOrtografica: false, aprovacaoCliente: false, responsavel: "" },
    impressao: { maquina: "", operador: "", horaInicio: "", horaFim: "", quantidadeProduzida: 0, quantidadeRejeitada: 0, observacoes: "" },
    acabamento: { corte: "pendente", dobra: "pendente", encadernacao: "pendente", laminacao: "pendente", verniz: "pendente", hotStamping: "pendente" },
    qualidade: { cor: "", corte: "", quantidade: "", acabamento: "", embalagem: "", resultado: "" },
  },
];

const statusColors = { aguardando: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400", em_producao: "bg-blue-50 dark:bg-blue-900/20 text-primary dark:text-blue-400", finalizado: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400", entregue: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400" };
const statusLabels = { aguardando: "Aguardando", em_producao: "Em Produção", finalizado: "Finalizado", entregue: "Entregue" };
const etapaStatusOptions = ["pendente", "em_execucao", "concluido"];
const etapaStatusLabels = { pendente: "Pendente", em_execucao: "Em Execução", concluido: "Concluído" };
const etapaStatusColors = { pendente: "border-zinc-200 dark:border-zinc-700 bg-surface-container-high text-on-surface-variant", em_execucao: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400", concluido: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" };

export default function ProducaoPage() {
  const [jobs, setJobs] = useState(sampleJobs);
  const [activeTab, setActiveTab] = useState("pre_impressao");
  const [selectedJob, setSelectedJob] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const updateJob = (jobId, section, key, value) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, [section]: { ...j[section], [key]: value } } : j));
  };

  const updateImpressao = (jobId, key, value) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, impressao: { ...j.impressao, [key]: value } } : j));
  };

  const updateQualidade = (jobId, key, value) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, qualidade: { ...j.qualidade, [key]: value } } : j));
  };

  const toggleAcabamento = (jobId, proc) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const atual = job.acabamento[proc];
    const idx = etapaStatusOptions.indexOf(atual);
    const next = etapaStatusOptions[(idx + 1) % etapaStatusOptions.length];
    setJobs(jobs.map(j => j.id === jobId ? { ...j, acabamento: { ...j.acabamento, [proc]: next } } : j));
  };

  const handleSave = (jobId) => {
    setFeedback({ ok: true, msg: "Dados guardados com sucesso!" });
    setTimeout(() => setFeedback(null), 2000);
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
              <h1 className="text-xl font-bold text-on-surface">Controlo de Produção</h1>
              <p className="text-xs text-on-surface-variant mt-1">Acompanhamento das etapas de produção</p>
            </div>
          </div>

          {feedback && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2 text-sm text-green-700 dark:text-green-400 animate-[fade-up_0.2s_ease-out]">
              {feedback.msg}
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-2">
            {etapas.map((e) => (
              <button key={e.id} onClick={() => setActiveTab(e.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeTab === e.id ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-highest text-on-surface-variant hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}>
                <Icon name={e.icon} className="text-[16px]" />
                {e.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {jobs.map((job) => {
              const sc = statusColors[job.status];
              const sl = statusLabels[job.status];
              return (
                <div key={job.id} className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors" onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon name="construction" className="text-primary text-[20px]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-on-surface">{job.id}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{sl}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant">{job.cliente} — {job.produto}</p>
                      </div>
                    </div>
                    <span className="text-xs text-on-surface-variant">{job.quantidade}</span>
                  </div>

                  {selectedJob === job.id && (
                    <div className="border-t border-outline-variant p-5">
                      {activeTab === "pre_impressao" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2"><Icon name="rule" className="text-[18px] text-primary" /> Checklist Pré-Impressão</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[
                              { label: "Arquivo Recebido", key: "arquivoRecebido" },
                              { label: "Tamanho Correto", key: "tamanhoCorreto" },
                              { label: "Modo CMYK", key: "CMYK" },
                              { label: "Fontes Convertidas", key: "fontesConvertidas" },
                              { label: "Imagem 300 DPI", key: "imagem300DPI" },
                              { label: "Revisão Ortográfica", key: "revisaoOrtografica" },
                              { label: "Aprovação do Cliente", key: "aprovacaoCliente" },
                            ].map((item) => (
                              <label key={item.key} className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-high border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={!!job.preImpressao[item.key]}
                                  onChange={(e) => updateJob(job.id, "preImpressao", item.key, e.target.checked)}
                                  className="w-4 h-4 rounded accent-primary"
                                />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.label}</span>
                              </label>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-surface-container-high rounded-lg">
                            <Icon name="person" className="text-[18px] text-on-surface-variant" />
                            <input
                              className="text-sm bg-transparent outline-none border-b border-transparent focus:border-primary text-zinc-700 dark:text-zinc-300 flex-1"
                              value={job.preImpressao.responsavel}
                              onChange={(e) => updateJob(job.id, "preImpressao", "responsavel", e.target.value)}
                              placeholder="Responsável"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => handleSave(job.id)} className="px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-sm">Guardar</button>
                          </div>
                        </div>
                      )}

                      {activeTab === "impressao" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2"><Icon name="print" className="text-[18px] text-primary" /> Dados de Impressão</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-on-surface-variant uppercase">Máquina</label><input value={job.impressao.maquina} onChange={(e) => updateImpressao(job.id, "maquina", e.target.value)} className="px-3 py-2 bg-surface-container-high border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Offset Heidelberg" /></div>
                            <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-on-surface-variant uppercase">Operador</label><input value={job.impressao.operador} onChange={(e) => updateImpressao(job.id, "operador", e.target.value)} className="px-3 py-2 bg-surface-container-high border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nome do operador" /></div>
                            <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-on-surface-variant uppercase">Hora Início</label><input type="time" value={job.impressao.horaInicio} onChange={(e) => updateImpressao(job.id, "horaInicio", e.target.value)} className="px-3 py-2 bg-surface-container-high border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div>
                            <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-on-surface-variant uppercase">Hora Fim</label><input type="time" value={job.impressao.horaFim} onChange={(e) => updateImpressao(job.id, "horaFim", e.target.value)} className="px-3 py-2 bg-surface-container-high border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div>
                            <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-on-surface-variant uppercase">Qtd Produzida</label><input type="number" value={job.impressao.quantidadeProduzida} onChange={(e) => updateImpressao(job.id, "quantidadeProduzida", Number(e.target.value))} className="px-3 py-2 bg-surface-container-high border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div>
                            <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-on-surface-variant uppercase">Qtd Rejeitada</label><input type="number" value={job.impressao.quantidadeRejeitada} onChange={(e) => updateImpressao(job.id, "quantidadeRejeitada", Number(e.target.value))} className="px-3 py-2 bg-surface-container-high border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30" /></div>
                            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3"><label className="text-[10px] font-bold text-on-surface-variant uppercase">Observações</label><textarea value={job.impressao.observacoes} onChange={(e) => updateImpressao(job.id, "observacoes", e.target.value)} rows={2} className="px-3 py-2 bg-surface-container-high border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Notas sobre a impressão..." /></div>
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => handleSave(job.id)} className="px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-sm">Guardar</button>
                          </div>
                        </div>
                      )}

                      {activeTab === "acabamento" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2"><Icon name="handyman" className="text-[18px] text-primary" /> Acabamento</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            {["corte", "dobra", "encadernacao", "laminacao", "verniz", "hotStamping"].map((proc) => {
                              const val = job.acabamento[proc];
                              const st = etapaStatusColors[val] || etapaStatusColors.pendente;
                              const icons = { corte: "content_cut", dobra: "flip", encadernacao: "menu_book", laminacao: "layers", verniz: "format_paint", hotStamping: "star" };
                              return (
                                <button key={proc} onClick={() => toggleAcabamento(job.id, proc)} className={`p-3 rounded-lg border text-center transition-all hover:shadow-sm ${st}`}>
                                  <Icon name={icons[proc]} className="text-[20px] block mb-1" />
                                  <p className="text-xs font-bold capitalize text-zinc-700 dark:text-zinc-300">{proc === "hotStamping" ? "Hot Stamping" : proc}</p>
                                  <p className="text-[10px] mt-1">{etapaStatusLabels[val] || "Pendente"}</p>
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => handleSave(job.id)} className="px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-sm">Guardar</button>
                          </div>
                        </div>
                      )}

                      {activeTab === "qualidade" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2"><Icon name="verified" className="text-[18px] text-primary" /> Controlo de Qualidade</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {["cor", "corte", "quantidade", "acabamento", "embalagem"].map((campo) => (
                              <div key={campo} className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-on-surface-variant uppercase">{campo}</label>
                                <select value={job.qualidade[campo] || ""} onChange={(e) => updateQualidade(job.id, campo, e.target.value)} className="px-3 py-2 bg-surface-container-high border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 text-zinc-700 dark:text-zinc-300">
                                  <option value="">Seleccionar...</option>
                                  <option value="aprovado">Aprovado</option>
                                  <option value="reprovado">Reprovado</option>
                                </select>
                              </div>
                            ))}
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-on-surface-variant uppercase">Resultado Final</label>
                              <select value={job.qualidade.resultado || ""} onChange={(e) => updateQualidade(job.id, "resultado", e.target.value)} className="px-3 py-2 bg-surface-container-high border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 font-bold text-zinc-700 dark:text-zinc-300">
                                <option value="">Seleccionar...</option>
                                <option value="aprovado">APROVADO</option>
                                <option value="reprovado">REPROVADO</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => handleSave(job.id)} className="px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-sm">Guardar</button>
                          </div>
                        </div>
                      )}

                      {activeTab === "entrega" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2"><Icon name="local_shipping" className="text-[18px] text-primary" /> Entrega</h3>
                          <div className="p-4 bg-surface-container-high rounded-lg text-center">
                            <Icon name="local_shipping" className="text-4xl text-zinc-200 dark:text-zinc-700 block mb-2" />
                            <p className="text-sm text-on-surface-variant">Estado da entrega: <strong className="text-on-surface">{etapaStatusLabels[job.acabamento?.entrega] || "Pendente"}</strong></p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <footer className="p-6 text-center border-t border-outline-variant bg-zinc-50 dark:bg-zinc-900/50">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>
      </main>
    </div>
  );
}
