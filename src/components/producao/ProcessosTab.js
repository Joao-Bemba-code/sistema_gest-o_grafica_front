"use client";

import { useEffect, useState, useMemo } from "react";
import Icon from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import { situacaoOP, situacaoMaterial, bloqueadaPorMaterial, SITUACAO_MATERIAL } from "@/lib/producaoStatus";
import { listarOrdens, salvarPreImpressao, salvarImpressao, salvarAcabamento, salvarQualidade, atualizarOrdem } from "@/services/producao";
import { listar as listarMaquinas } from "@/services/maquinas";
import { descricaoErroApi } from "@/services/api";

const processos = [
  { id: "pre_impressao", label: "Pré-Impressão", icon: "rule" },
  { id: "impressao", label: "Impressão", icon: "print" },
  { id: "acabamento", label: "Acabamento", icon: "handyman" },
  { id: "qualidade", label: "Qualidade", icon: "verified" },
  { id: "entrega", label: "Entrega", icon: "local_shipping" },
];

const processoStatusOptions = ["pendente", "em_execucao", "concluido"];
const processoStatusLabels = { pendente: "Pendente", em_execucao: "Em Execução", concluido: "Concluído" };
const processoStatusVariants = { pendente: "outline", em_execucao: "warning", concluido: "success" };

function derivarProcesso(j) {
  if (j.estado === "entregue" || j.entrega_ok) return "entrega";
  if (j.qualidade_ok) return "qualidade";
  if (j.acabamento_ok) return "acabamento";
  if (j.impressao_ok) return "impressao";
  if (j.pre_impressao_ok) return "pre_impressao";
  return "pre_impressao";
}

const processoLabels = Object.fromEntries(processos.map((e) => [e.id, e.label]));

const processoIcone = {
  pre_impressao: "rule",
  impressao: "print",
  acabamento: "handyman",
  qualidade: "verified",
  entrega: "local_shipping",
};

function fmtHistData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function detalhesEntrada(e) {
  const d = [];
  if (e.processo === "impressao") {
    if (e.maquina) d.push(`Máquina: ${e.maquina}`);
    if (e.operador) d.push(`Operador: ${e.operador}`);
    if (e.data_inicio) d.push(`Início: ${e.data_inicio}`);
    if (e.data_fim) d.push(`Fim: ${e.data_fim}`);
    if (e.tempo_estimado) d.push(`Tempo previsto: ${e.tempo_estimado}`);
    if (e.quantidade_produzida != null) d.push(`Produzido: ${e.quantidade_produzida}`);
    if (e.quantidade_rejeitada != null) d.push(`Rejeitado: ${e.quantidade_rejeitada}`);
    if (e.taxa_rejeicao != null) d.push(`Taxa rejeição: ${e.taxa_rejeicao}%`);
  } else if (e.processo === "acabamento") {
    if (e.maquina) d.push(`Máquina: ${e.maquina}`);
    if (e.tempo_estimado) d.push(`Tempo previsto: ${e.tempo_estimado}`);
    if (e.erros != null) d.push(`Erros: ${e.erros}`);
    if (e.perdas != null) d.push(`Perdas: ${e.perdas}`);
    if (e.servicos) {
      const conc = Object.entries(e.servicos).filter(([k, v]) => v === "concluido").map(([k]) => k);
      if (conc.length) d.push(`Concluídos: ${conc.join(", ")}`);
    }
  } else if (e.processo === "pre_impressao") {
    if (e.resultado) d.push(`Resultado: ${e.resultado}`);
    if (e.responsavel) d.push(`Responsável: ${e.responsavel}`);
  } else if (e.processo === "qualidade") {
    if (e.resultado) d.push(`Resultado: ${e.resultado}`);
  }
  if (e.observacoes) d.push(`Obs: ${e.observacoes}`);
  return d;
}

function HistoricoProcesso({ historico }) {
  const itens = Array.isArray(historico) && historico.length > 0 ? [...historico].reverse() : [];
  return (
    <div className="border-t pt-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <Icon name="history" className="text-[18px] text-primary" /> Histórico do Processo
      </h3>
      {itens.length === 0 ? (
        <p className="text-xs text-muted-foreground">Ainda não há registos deste processo.</p>
      ) : (
        <div className="relative pl-6">
          <span className="absolute left-[9px] top-1 bottom-1 w-px bg-border/40" aria-hidden="true" />
          <div className="space-y-4">
            {itens.map((e, i) => (
              <div key={i} className="relative">
                <span className="absolute -left-6 top-0.5 w-[18px] h-[18px] rounded-full bg-primary/15 text-primary flex items-center justify-center">
                  <Icon name={processoIcone[e.processo] || "history"} className="text-[11px]" />
                </span>
                <div className="text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-foreground">{processoLabels[e.processo] || e.processo}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{fmtHistData(e.data)}</span>
                  </div>
                  {detalhesEntrada(e).length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                      {detalhesEntrada(e).map((d, j) => <span key={j}>{d}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizar(j) {
  const preRow = Array.isArray(j.pre_impressaos) ? j.pre_impressaos[0] : j.preImpressao;
  const impRows = Array.isArray(j.impressaos) && j.impressaos.length > 0 ? j.impressaos : (j.impressao ? [j.impressao] : []);
  const impRow = impRows[0];
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
    tempoEstimado: impRow.tempo_estimado || "",
    quantidadeProduzida: impRow.quantidade_produzida ?? "",
    quantidadeRejeitada: impRow.quantidade_rejeitada ?? "",
    observacoes: impRow.observacoes || "",
  } : {};
  // Várias máquinas por OP: cada uma com o seu colaborador e tempo de trabalho.
  imp.registos = impRows.map((r) => ({
    maquina: r.maquina || "",
    operador: r.operador || "",
    horaInicio: r.data_inicio || "",
    horaFim: r.data_fim || "",
    tempoEstimado: r.tempo_estimado || "",
    quantidadeProduzida: r.quantidade_produzida ?? "",
    quantidadeRejeitada: r.quantidade_rejeitada ?? "",
  }));
  const acRows = Array.isArray(j.acabamentos) ? j.acabamentos : [];
  const ac = acRows.reduce((acc, r) => {
    acc[r.servico === "hot_stamping" ? "hotStamping" : r.servico] = r.estado;
    return acc;
  }, {});
  const acRow = acRows[0] || (Array.isArray(j.acabamentos) ? null : j.acabamento) || {};
  // Várias máquinas por OP: cada linha guarda a sua máquina/colaborador/tempo.
  const maquinasVistas = new Set();
  ac.maquinas = acRows
    .filter((r) => String(r.maquina || "").trim())
    .filter((r) => {
      const chave = `${r.maquina}|${r.operador || ""}`;
      if (maquinasVistas.has(chave)) return false;
      maquinasVistas.add(chave);
      return true;
    })
    .map((r) => ({
      maquina: r.maquina || "",
      operador: r.operador || "",
      tempoEstimado: r.tempo_estimado || "",
      erros: r.erros ?? "",
      perdas: r.perdas ?? "",
    }));
  // Dados antigos: uma única linha com máquina, sem lista de máquinas.
  if (ac.maquinas.length === 0 && acRow.maquina) {
    ac.maquinas = [{
      maquina: acRow.maquina || "",
      operador: acRow.operador || "",
      tempoEstimado: acRow.tempo_estimado || "",
      erros: acRow.erros ?? "",
      perdas: acRow.perdas ?? "",
    }];
  }
  ac.observacoes = (acRows[0] && acRows[0].observacoes) || acRow.observacoes || "";
  return {
    ...j,
    status: j.estado || j.status || "aguardando",
    processoAtual: derivarProcesso(j),
    cliente: j.cliente?.nome || j.cliente || "—",
    preImpressao: pre,
    impressao: imp,
    acabamento: ac,
    qualidade: qualRow || {},
  };
}

export default function ProcessosTab() {
  const [jobs, setJobs] = useState([]);
  const [activeProcesso, setActiveProcesso] = useState("pre_impressao");
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("em_curso");
  const [maquinas, setMaquinas] = useState([]);
  const { addToast } = useToast();

  const carregarDados = () => {
    Promise.allSettled([listarOrdens(), listarMaquinas()]).then(([ordensRes, maquinasRes]) => {
      if (ordensRes.status === "rejected") {
        addToast(`Erro ao carregar ordens — ${descricaoErroApi(ordensRes.reason, "ordens")}`, "error");
        return;
      }
      const data = ordensRes.value;
      const arr = (Array.isArray(data) ? data : data?.ordens || []).map(normalizar);
      setJobs(arr);
      setSelectedJob((prev) => prev ?? arr[0]?.id ?? null);
      if (maquinasRes.status === "rejected") {
        setMaquinas([]);
        addToast(`Aviso: máquinas indisponíveis — ${descricaoErroApi(maquinasRes.reason, "máquinas")}`, "warning");
      } else {
        const maquinasData = maquinasRes.value;
        setMaquinas(Array.isArray(maquinasData) ? maquinasData : maquinasData?.data || []);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Com milhares de OPs não dá para mostrar tudo: filtra-se primeiro pelo
  // que interessa ao operador (o que está a decorrer e o que está parado por
  // falta de material) e só depois se pagina o resto.
  const filtroConfig = useMemo(() => [
    { value: "em_curso", label: "Em curso", icon: "pending_actions", test: (j) => ["aguardando", "em_producao"].includes(j.status) },
    { value: "bloqueadas", label: "Paradas por material", icon: "lock_clock", test: (j) => bloqueadaPorMaterial(j) },
    { value: "liberadas", label: "Com material", icon: "check_circle", test: (j) => j.status !== "aguardando" && j.status !== "em_producao" ? true : situacaoMaterial(j) === SITUACAO_MATERIAL.material_liberado || situacaoMaterial(j) === SITUACAO_MATERIAL.sem_material },
    { value: "concluidas", label: "Concluídas", icon: "task_alt", test: (j) => ["finalizado", "entregue"].includes(j.status) },
    { value: "todos", label: "Todas", icon: "filter_list", test: () => true },
  ], []);

  const filtrados = useMemo(() => {
    const q = search.toLowerCase().trim();
    const cfg = filtroConfig.find((f) => f.value === filtro) || filtroConfig[0];
    return jobs.filter((j) => {
      if (!cfg.test(j)) return false;
      if (!q) return true;
      return (
        String(j.cliente || "").toLowerCase().includes(q) ||
        String(j.produto || "").toLowerCase().includes(q) ||
        String(j.id).includes(q)
      );
    });
  }, [jobs, search, filtro, filtroConfig]);

  const contagens = useMemo(() => {
    const c = {};
    for (const f of filtroConfig) c[f.value] = jobs.filter(f.test).length;
    return c;
  }, [jobs, filtroConfig]);

  const { visiveis, ...pag } = usePaginacao({ items: filtrados });

  const updateJob = (jobId, section, key, value) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, [section]: { ...j[section], [key]: value } } : j));
  };

  const updateImpressao = (jobId, key, value) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, impressao: { ...j.impressao, [key]: value } } : j));
  };

  const registoVazio = { maquina: "", operador: "", horaInicio: "", horaFim: "", tempoEstimado: "", quantidadeProduzida: "", quantidadeRejeitada: "" };

  const updateRegisto = (jobId, idx, key, value) => {
    setJobs(jobs.map(j => {
      if (j.id !== jobId) return j;
      const registos = [...(j.impressao?.registos || [])];
      registos[idx] = { ...(registos[idx] || registoVazio), [key]: value };
      return { ...j, impressao: { ...j.impressao, registos } };
    }));
  };

  const adicionarRegisto = (jobId) => {
    setJobs(jobs.map(j => j.id === jobId
      ? { ...j, impressao: { ...j.impressao, registos: [...(j.impressao?.registos || []), { ...registoVazio }] } }
      : j));
  };

  const removerRegisto = (jobId, idx) => {
    setJobs(jobs.map(j => {
      if (j.id !== jobId) return j;
      const registos = [...(j.impressao?.registos || [])];
      registos.splice(idx, 1);
      return { ...j, impressao: { ...j.impressao, registos: registos.length ? registos : [{ ...registoVazio }] } };
    }));
  };

  const maquinaAcabamentoVazia = { maquina: "", operador: "", tempoEstimado: "", erros: "", perdas: "" };

  const updateMaquinaAcabamento = (jobId, idx, key, value) => {
    setJobs(jobs.map(j => {
      if (j.id !== jobId) return j;
      const maquinas = [...(j.acabamento?.maquinas || [])];
      maquinas[idx] = { ...(maquinas[idx] || maquinaAcabamentoVazia), [key]: value };
      return { ...j, acabamento: { ...j.acabamento, maquinas } };
    }));
  };

  const adicionarMaquinaAcabamento = (jobId) => {
    setJobs(jobs.map(j => j.id === jobId
      ? { ...j, acabamento: { ...j.acabamento, maquinas: [...(j.acabamento?.maquinas || []), { ...maquinaAcabamentoVazia }] } }
      : j));
  };

  const removerMaquinaAcabamento = (jobId, idx) => {
    setJobs(jobs.map(j => {
      if (j.id !== jobId) return j;
      const maquinas = [...(j.acabamento?.maquinas || [])];
      maquinas.splice(idx, 1);
      return { ...j, acabamento: { ...j.acabamento, maquinas } };
    }));
  };

  const updateQualidade = (jobId, key, value) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, qualidade: { ...j.qualidade, [key]: value } } : j));
  };

  const toggleAcabamento = (jobId, proc) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const atual = job.acabamento[proc] || "pendente";
    const idx = processoStatusOptions.indexOf(atual);
    const next = processoStatusOptions[(idx + 1) % processoStatusOptions.length];
    setJobs(jobs.map(j => j.id === jobId ? { ...j, acabamento: { ...j.acabamento, [proc]: next } } : j));
  };

  const handleSave = async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    // Espelha `podeAvancar` no backend: com material reservado, a OP fica
    // parada até `requisicao_estado === "libertada"`. Qualquer estado
    // anterior deixava o utilizador gravar e receber 422 do servidor.
    if (bloqueadaPorMaterial(job) && activeProcesso !== "entrega") {
      addToast("Primeiro liberte os materiais da OP (saída de stock) para avançar", "error");
      return;
    }
    try {
      if (activeProcesso === "pre_impressao") await salvarPreImpressao(jobId, job.preImpressao);
      else if (activeProcesso === "impressao") {
        const regs = (job.impressao?.registos || []).filter((r) => (r.maquina || "").trim());
        if (!regs.length) {
          addToast("Selecione pelo menos uma máquina para a impressão", "error");
          return;
        }
        await salvarImpressao(jobId, {
          registos: regs.map((r, i) => ({ ...r, observacoes: i === 0 ? (job.impressao.observacoes || "") : undefined })),
        });
      }
      else if (activeProcesso === "acabamento") {
        const servicosAc = ["corte", "dobra", "encadernacao", "laminacao", "verniz", "hotStamping"].map((s) => ({
          servico: s,
          estado: job.acabamento[s] || "pendente",
        }));
        const maquinasAc = (job.acabamento.maquinas || [])
          .filter((m) => (m.maquina || "").trim())
          .map((m) => ({
            maquina: m.maquina,
            operador: m.operador,
            tempoEstimado: m.tempoEstimado,
            erros: m.erros === "" || m.erros == null ? null : Number(m.erros) || 0,
            perdas: m.perdas === "" || m.perdas == null ? null : Number(m.perdas) || 0,
          }));
        await salvarAcabamento(jobId, {
          servicos: servicosAc,
          maquinas: maquinasAc,
          observacoes: job.acabamento.observacoes || "",
        });
      }
      else if (activeProcesso === "qualidade") await salvarQualidade(jobId, job.qualidade);
      else if (activeProcesso === "entrega") {
        const atualizada = await atualizarOrdem(jobId, { status: "entregue" });
        setJobs(jobs.map(j => j.id === jobId ? normalizar(atualizada) : j));
      }
      addToast("Operação realizada com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  if (loading) return <CardSkeleton lines={6} />;

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {processos.map((e) => (
          <Button key={e.id} variant={activeProcesso === e.id ? "default" : "outline"} size="sm" onClick={() => { setActiveProcesso(e.id); if (selectedJob == null && jobs.length) setSelectedJob(jobs[0].id); }}>
            <Icon name={e.icon} className="text-[16px]" />
            {e.label}
          </Button>
        ))}
      </div>

      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por cliente, produto, nº da OP..."
          className="w-full pl-10 pr-10 py-2.5 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Limpar pesquisa"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap items-center">
        {filtroConfig.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFiltro(f.value)}
            aria-pressed={filtro === f.value}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ease-in-out border ${
              filtro === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-outline-variant/30 bg-background/40 text-muted-foreground hover:border-outline-variant hover:text-foreground"
            }`}
          >
            <Icon name={f.icon} className="text-xs" />
            {f.label}
            <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] ${filtro === f.value ? "bg-primary/20" : "bg-muted"}`}>
              {contagens[f.value] ?? 0}
            </span>
          </button>
        ))}
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          {filtrados.length} de {jobs.length}
        </span>
      </div>

      <div className="space-y-3">
        {visiveis.map((job) => {
          const sc = situacaoOP(job);
          const matSit = situacaoMaterial(job);
          return (
          <Card key={job.id}>
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon name="construction" className="text-primary text-[20px]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">OP #{job.id}</span>
                    <Badge variant={sc.variant || "outline"} className="text-[10px]">{sc.label}</Badge>
                    <Badge variant="outline" className="text-[10px]">{processoLabels[job.processoAtual]}</Badge>
                    {matSit && matSit.bloqueia && (
                      <Badge variant="destructive" className="text-[10px]">
                        <Icon name="inventory_2" className="text-[12px]" /> Material por libertar
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{job.cliente} — {job.produto}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">Qtd: {job.quantidade}</span>
            </div>

            {selectedJob === job.id && (
              <div className="border-t p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">OP #{job.id}</span>
                    {job.produto ? <> — {job.produto}</> : ""} · Qtd: <strong>{job.quantidade}</strong>
                  </p>
                  {!["finalizado", "entregue"].includes(job.status) && (
                    <p className="text-xs text-muted-foreground">
                      Conclua todos os processos — a OP passa a <strong>Finalizada</strong> automaticamente quando a <strong>qualidade</strong> for aprovada.
                    </p>
                  )}
                </div>
                {matSit && matSit.bloqueia && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <Icon name="inventory" className="text-[20px] text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        {matSit === SITUACAO_MATERIAL.aguardando_liberacao
                          ? "Aguardando libertação de material"
                          : "Aguardando libertação de materiais"}
                      </p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                        {matSit === SITUACAO_MATERIAL.aguardando_liberacao
                          ? "A requisição de material já foi submetida, mas o armazém ainda não deu a saída. Só após a libertação é que a OP pode avançar para produção. Vá à aba \"Ordens\" para aprovar."
                          : "Esta OP não tem a saída de material confirmada pelo armazém. Só após a libertação é que pode avançar para produção. Vá à aba \"Ordens\" → \"Requisição material\"."}
                      </p>
                    </div>
                  </div>
                )}
                {activeProcesso === "pre_impressao" && (
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

                {activeProcesso === "impressao" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Icon name="print" className="text-[18px] text-primary" /> Dados de Impressão</h3>
                    <p className="text-xs text-muted-foreground">
                      Registe cada máquina usada com o seu colaborador e o tempo de trabalho.
                    </p>
                    {(job.impressao?.registos?.length ? job.impressao.registos : [{ ...registoVazio }]).map((r, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                        <div className="flex flex-col gap-1 lg:col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Máquina {idx + 1}</label>
                          <select value={r.maquina || ""} onChange={(e) => updateRegisto(job.id, idx, "maquina", e.target.value)} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30">
                            <option value="">Seleccionar máquina...</option>
                            {maquinas.map((m) => (
                              <option key={m.id} value={m.nome_comum || m.codigo}>{m.nome_comum || m.codigo}{m.localizacao ? ` — ${m.localizacao}` : ""}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Colaborador</label>
                          <input type="text" value={r.operador || ""} onChange={(e) => updateRegisto(job.id, idx, "operador", e.target.value)} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nome do colaborador" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Início</label>
                          <input type="time" value={r.horaInicio || ""} onChange={(e) => updateRegisto(job.id, idx, "horaInicio", e.target.value)} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Fim</label>
                          <input type="time" value={r.horaFim || ""} onChange={(e) => updateRegisto(job.id, idx, "horaFim", e.target.value)} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Produzido</label>
                          <input type="number" min="0" value={r.quantidadeProduzida ?? ""} onChange={(e) => updateRegisto(job.id, idx, "quantidadeProduzida", Number(e.target.value))} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                        </div>
                        <div className="flex items-end justify-between gap-2 lg:col-span-6">
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Rejeitado</label>
                            <input type="number" min="0" value={r.quantidadeRejeitada ?? ""} onChange={(e) => updateRegisto(job.id, idx, "quantidadeRejeitada", Number(e.target.value))} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removerRegisto(job.id, idx)} title="Remover esta máquina" className="text-error">
                            <Icon name="delete" className="text-[16px]" /> Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => adicionarRegisto(job.id)}>
                      <Icon name="add" className="text-[16px]" /> Adicionar máquina
                    </Button>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Observações</label>
                      <textarea value={job.impressao.observacoes || ""} onChange={(e) => updateImpressao(job.id, "observacoes", e.target.value)} rows={2} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Notas sobre a impressão..." />
                    </div>
                    <div className="flex justify-end"><Button size="sm" onClick={() => handleSave(job.id)}>Guardar</Button></div>
                  </div>
                )}

                {activeProcesso === "acabamento" && (
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
                            <p className="text-[10px] mt-1">{processoStatusLabels[val]}</p>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Registe as máquinas usadas no acabamento, com o colaborador e o tempo de trabalho de cada uma.
                    </p>
                    {(job.acabamento.maquinas?.length ? job.acabamento.maquinas : [maquinaAcabamentoVazia]).map((m, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                        <div className="flex flex-col gap-1 lg:col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Máquina {idx + 1}</label>
                          <select value={m.maquina || ""} onChange={(e) => updateMaquinaAcabamento(job.id, idx, "maquina", e.target.value)} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30">
                            <option value="">Seleccionar máquina...</option>
                            {maquinas.map((mm) => (
                              <option key={mm.id} value={mm.nome_comum || mm.codigo}>{mm.nome_comum || mm.codigo}{mm.localizacao ? ` — ${mm.localizacao}` : ""}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Colaborador</label>
                          <input type="text" value={m.operador || ""} onChange={(e) => updateMaquinaAcabamento(job.id, idx, "operador", e.target.value)} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nome do colaborador" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Tempo</label>
                          <input type="text" value={m.tempoEstimado || ""} onChange={(e) => updateMaquinaAcabamento(job.id, idx, "tempoEstimado", e.target.value)} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="ex: 1h30" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Erros</label>
                          <input type="number" min="0" value={m.erros ?? ""} onChange={(e) => updateMaquinaAcabamento(job.id, idx, "erros", Number(e.target.value))} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Perdas</label>
                            <input type="number" min="0" value={m.perdas ?? ""} onChange={(e) => updateMaquinaAcabamento(job.id, idx, "perdas", Number(e.target.value))} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removerMaquinaAcabamento(job.id, idx)} title="Remover esta máquina" className="text-error">
                            <Icon name="delete" className="text-[16px]" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => adicionarMaquinaAcabamento(job.id)}>
                      <Icon name="add" className="text-[16px]" /> Adicionar máquina
                    </Button>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Observações</label>
                      <textarea rows={1} value={job.acabamento.observacoes || ""} onChange={(e) => updateJob(job.id, "acabamento", "observacoes", e.target.value)} className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Notas..." />
                    </div>
                    <div className="flex justify-end"><Button size="sm" onClick={() => handleSave(job.id)}>Guardar</Button></div>
                  </div>
                )}

                {activeProcesso === "qualidade" && (
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

                {activeProcesso === "entrega" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Icon name="local_shipping" className="text-[18px] text-primary" /> Entrega</h3>
                    <div className="p-6 bg-muted/50 rounded-xl text-center">
                      <Icon name="local_shipping" className="text-4xl text-muted-foreground/30 block mb-2" />
                      <p className="text-sm text-muted-foreground">Estado da entrega: <strong className="text-foreground">{job.status === "entregue" ? "Concluído" : "Pendente"}</strong></p>
                    </div>
                    {job.status !== "entregue" && (
                      <div className="flex justify-end">
                        <Button size="sm" variant="success" onClick={() => handleSave(job.id)}>
                          <Icon name="local_shipping" className="text-[16px]" /> Marcar como entregue
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <HistoricoProcesso historico={job.historico_processos} />
              </div>
            )}
          </Card>
          );
        })}
      </div>

      {jobs.length === 0 && !loading && (
        <div className="text-center p-12 text-muted-foreground">
          <Icon name="construction" className="text-4xl block mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhuma ordem de produção encontrada</p>
          <p className="text-xs mt-1">Aprove um orçamento na Área Comercial para gerar a OP automaticamente.</p>
        </div>
      )}

      {jobs.length > 0 && filtrados.length === 0 && (
        <div className="text-center p-12 text-muted-foreground">
          <Icon name="search_off" className="text-4xl block mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhuma OP neste filtro</p>
          <p className="text-xs mt-1">Ajuste a pesquisa ou mude o filtro acima.</p>
        </div>
      )}

      {filtrados.length > 0 && <Paginacao {...pag} label="OPs" />}
    </div>
  );
}