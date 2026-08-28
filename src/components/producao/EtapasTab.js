"use client";

import { useEffect, useState, useMemo } from "react";
import Icon from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { listarOrdens, salvarPreImpressao, salvarImpressao, salvarAcabamento, salvarQualidade, atualizarOrdem } from "@/services/producao";

const etapas = [
  { id: "pre_impressao", label: "Pré-Impressão", icon: "rule" },
  { id: "impressao", label: "Impressão", icon: "print" },
  { id: "acabamento", label: "Acabamento", icon: "handyman" },
  { id: "qualidade", label: "Qualidade", icon: "verified" },
  { id: "entrega", label: "Entrega", icon: "local_shipping" },
];

const statusColors = { aguardando: "warning", em_producao: "info", finalizado: "success", entregue: "secondary" };
const statusLabels = { aguardando: "Aguardando", em_producao: "Em Produção", finalizado: "Finalizado", entregue: "Entregue" };
const etapaStatusOptions = ["pendente", "em_execucao", "concluido"];
const etapaStatusLabels = { pendente: "Pendente", em_execucao: "Em Execução", concluido: "Concluído" };
const etapaStatusVariants = { pendente: "outline", em_execucao: "warning", concluido: "success" };

function derivarEtapa(j) {
  if (j.estado === "entregue" || j.entrega_ok) return "entrega";
  if (j.qualidade_ok) return "qualidade";
  if (j.acabamento_ok) return "acabamento";
  if (j.impressao_ok) return "impressao";
  if (j.pre_impressao_ok) return "pre_impressao";
  return "pre_impressao";
}

const etapaLabels = Object.fromEntries(etapas.map((e) => [e.id, e.label]));

function normalizar(j) {
  const preRow = Array.isArray(j.pre_impressaos) ? j.pre_impressaos[0] : j.preImpressao;
  const impRow = Array.isArray(j.impressaos) ? j.impressaos[0] : j.impressao;
  const qualRow = Array.isArray(j.qualidades) ? j.qualidades[0] : j.qualidade;
  const pre = preRow ? {
    arquivoRecebido: !!preRow.arquivo,
    tamanhoCorreto: !!preRow.tamanho,
    CMYK: !!preRow.cmyk,
    fontesConvertidas: !!preRow.fontes,
    imagem300DPI: !!preRow.imagens,
    revisaoOrtografica: !!preRow.revisao,
    aprovacaoCliente: !!preRow.aprovacao,
    responsavel: preRow.responsavel || "",
  } : {};
  const imp = impRow ? {
    maquina: impRow.maquina || "",
    operador: impRow.operador || "",
    horaInicio: impRow.data_inicio || "",
    horaFim: impRow.data_fim || "",
    quantidadeProduzida: impRow.quantidade_produzida ?? "",
    quantidadeRejeitada: impRow.quantidade_rejeitada ?? "",
    observacoes: impRow.observacoes || "",
  } : {};
  const ac = (Array.isArray(j.acabamentos) ? j.acabamentos : []).reduce((acc, r) => {
    acc[r.servico === "hot_stamping" ? "hotStamping" : r.servico] = r.estado;
    return acc;
  }, {});
  return {
    ...j,
    status: j.estado || j.status || "aguardando",
    etapaAtual: derivarEtapa(j),
    cliente: j.cliente?.nome || j.cliente || "—",
    preImpressao: pre,
    impressao: imp,
    acabamento: ac,
    qualidade: qualRow || {},
  };
}

export default function EtapasTab() {
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState("pre_impressao");
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { addToast } = useToast();

  const carregarDados = () => {
    listarOrdens().then((data) => {
      const arr = (Array.isArray(data) ? data : data?.ordens || []).map(normalizar);
      setJobs(arr);
      setSelectedJob((prev) => prev ?? arr[0]?.id ?? null);
    }).catch(() => addToast("Erro ao carregar ordens", "error")).finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter((j) =>
      j.cliente?.toLowerCase().includes(q) ||
      j.produto?.toLowerCase().includes(q) ||
      String(j.id).includes(q)
    );
  }, [jobs, search]);

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
    const atual = job.acabamento[proc] || "pendente";
    const idx = etapaStatusOptions.indexOf(atual);
    const next = etapaStatusOptions[(idx + 1) % etapaStatusOptions.length];
    setJobs(jobs.map(j => j.id === jobId ? { ...j, acabamento: { ...j.acabamento, [proc]: next } } : j));
  };

  const handleSave = async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    if (job.requisicao_estado === "pendente" && job.status === "aguardando" && activeTab !== "entrega") {
      addToast("Primeiro liberte os materiais da OP (saída de stock) para avançar", "error");
      return;
    }
    try {
      if (activeTab === "pre_impressao") await salvarPreImpressao(jobId, job.preImpressao);
      else if (activeTab === "impressao") await salvarImpressao(jobId, job.impressao);
      else if (activeTab === "acabamento") await salvarAcabamento(jobId, job.acabamento);
      else if (activeTab === "qualidade") await salvarQualidade(jobId, job.qualidade);
      else if (activeTab === "entrega") await atualizarOrdem(jobId, { status: "entregue" });
      addToast("Operação realizada com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  if (loading) return <CardSkeleton lines={6} />;

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {etapas.map((e) => (
          <Button key={e.id} variant={activeTab === e.id ? "default" : "outline"} size="sm" onClick={() => { setActiveTab(e.id); if (selectedJob == null && jobs.length) setSelectedJob(jobs[0].id); }}>
            <Icon name={e.icon} className="text-[16px]" />
            {e.label}
          </Button>
        ))}
      </div>

      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por cliente, produto, nº da OP..."
          className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <Icon name="close" className="text-[16px]" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filteredJobs.map((job) => (
          <Card key={job.id}>
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="construction" className="text-primary text-[20px]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{job.id}</span>
                    <Badge variant={statusColors[job.status] || "outline"} className="text-[10px]">{statusLabels[job.status] || job.status}</Badge>
                    <Badge variant="outline" className="text-[10px]">{etapaLabels[job.etapaAtual]}</Badge>
                    {job.requisicao_estado === "pendente" && (
                      <Badge variant="destructive" className="text-[10px]">Aguardando saída de materiais</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{job.cliente} — {job.produto}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{job.quantidade}</span>
            </div>

            {selectedJob === job.id && (
              <div className="border-t p-5 space-y-4">
                {job.requisicao_estado === "pendente" && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <Icon name="inventory" className="text-[20px] text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Aguardando libertação de materiais</p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                        Esta OP ainda não teve a saída de materiais confirmada pelo armazém. Só depois da libertação é que pode avançar para produção. Vá à aba &quot;Ordens&quot; → &quot;Dar saída de materiais&quot;.
                      </p>
                    </div>
                  </div>
                )}
                {activeTab === "pre_impressao" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Icon name="rule" className="text-[18px] text-primary" /> Checklist Pré-Impressão</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {["arquivoRecebido", "tamanhoCorreto", "CMYK", "fontesConvertidas", "imagem300DPI", "revisaoOrtografica", "aprovacaoCliente"].map((key) => (
                        <label key={key} className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border cursor-pointer hover:bg-muted transition-colors">
                          <input type="checkbox" checked={!!job.preImpressao[key]} onChange={(e) => updateJob(job.id, "preImpressao", key, e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                          <span className="text-sm text-foreground">{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <Icon name="person" className="text-[18px] text-muted-foreground" />
                      <input className="text-sm bg-transparent outline-none border-b border-transparent focus:border-primary text-foreground flex-1" value={job.preImpressao.responsavel} onChange={(e) => updateJob(job.id, "preImpressao", "responsavel", e.target.value)} placeholder="Responsável" />
                    </div>
                    <div className="flex justify-end"><Button size="sm" onClick={() => handleSave(job.id)}>Guardar</Button></div>
                  </div>
                )}

                {activeTab === "impressao" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Icon name="print" className="text-[18px] text-primary" /> Dados de Impressão</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {["maquina", "operador", "horaInicio", "horaFim", "quantidadeProduzida", "quantidadeRejeitada"].map((f) => (
                        <div key={f} className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">{f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</label>
                          <input type={f.includes("hora") ? "time" : f.includes("quantidade") ? "number" : "text"} value={job.impressao[f] || ""} onChange={(e) => updateImpressao(job.id, f, f.includes("quantidade") ? Number(e.target.value) : e.target.value)} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder={f.replace(/([A-Z])/g, " $1")} />
                        </div>
                      ))}
                      <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Observações</label>
                        <textarea value={job.impressao.observacoes || ""} onChange={(e) => updateImpressao(job.id, "observacoes", e.target.value)} rows={2} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Notas sobre a impressão..." />
                      </div>
                    </div>
                    <div className="flex justify-end"><Button size="sm" onClick={() => handleSave(job.id)}>Guardar</Button></div>
                  </div>
                )}

                {activeTab === "acabamento" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Icon name="handyman" className="text-[18px] text-primary" /> Acabamento</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {["corte", "dobra", "encadernacao", "laminacao", "verniz", "hotStamping"].map((proc) => {
                        const val = job.acabamento[proc] || "pendente";
                        const icons = { corte: "content_cut", dobra: "flip", encadernacao: "menu_book", laminacao: "layers", verniz: "format_paint", hotStamping: "star" };
                        return (
                          <button key={proc} onClick={() => toggleAcabamento(job.id, proc)} className={`p-3 rounded-xl border text-center transition-all hover:shadow-sm ${
                            val === "pendente" ? "border-border bg-muted/50 text-muted-foreground" :
                            val === "em_execucao" ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" :
                            "border-green-300 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          }`}>
                            <Icon name={icons[proc]} className="text-[20px] block mb-1" />
                            <p className="text-xs font-bold capitalize">{proc === "hotStamping" ? "Hot Stamping" : proc}</p>
                            <p className="text-[10px] mt-1">{etapaStatusLabels[val]}</p>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-end"><Button size="sm" onClick={() => handleSave(job.id)}>Guardar</Button></div>
                  </div>
                )}

                {activeTab === "qualidade" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Icon name="verified" className="text-[18px] text-primary" /> Controlo de Qualidade</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {["cor", "corte", "quantidade", "acabamento", "embalagem"].map((campo) => (
                        <div key={campo} className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">{campo}</label>
                          <select value={job.qualidade[campo] || ""} onChange={(e) => updateQualidade(job.id, campo, e.target.value)} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30">
                            <option value="">Seleccionar...</option>
                            <option value="aprovado">Aprovado</option>
                            <option value="reprovado">Reprovado</option>
                          </select>
                        </div>
                      ))}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Resultado Final</label>
                        <select value={job.qualidade.resultado || ""} onChange={(e) => updateQualidade(job.id, "resultado", e.target.value)} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 font-bold">
                          <option value="">Seleccionar...</option>
                          <option value="aprovado">APROVADO</option>
                          <option value="reprovado">REPROVADO</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end"><Button size="sm" onClick={() => handleSave(job.id)}>Guardar</Button></div>
                  </div>
                )}

                {activeTab === "entrega" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Icon name="local_shipping" className="text-[18px] text-primary" /> Entrega</h3>
                    <div className="p-6 bg-muted/50 rounded-xl text-center">
                      <Icon name="local_shipping" className="text-4xl text-muted-foreground/30 block mb-2" />
                      <p className="text-sm text-muted-foreground">Estado da entrega: <strong className="text-foreground">{job.status === "entregue" ? "Concluído" : "Pendente"}</strong></p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {jobs.length === 0 && !loading && (
        <div className="text-center p-12 text-muted-foreground">
          <Icon name="construction" className="text-4xl block mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhuma ordem de produção encontrada</p>
          <p className="text-xs mt-1">Aprove um orçamento na Área Comercial para gerar a OP automaticamente.</p>
        </div>
      )}
    </div>
  );
}