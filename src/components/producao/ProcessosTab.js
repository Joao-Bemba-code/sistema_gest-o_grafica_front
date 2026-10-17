"use client";

import { useEffect, useState, useMemo } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import Modal from "@/components/Modal";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import {
  Ledger,
  LedgerHeader,
  FilterRow,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
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

const statusTons = {
  aguardando: "warning",
  em_producao: "info",
  finalizado: "success",
  entregue: "neutral",
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

const inputCls = "h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/25 transition-colors";

export default function ProcessosTab() {
  const [jobs, setJobs] = useState([]);
  const [activeProcesso, setActiveProcesso] = useState("pre_impressao");
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState({ campo: "cliente", operador: "contem", termo: "" });
  const [situacao, setSituacao] = useState("em_curso");
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
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

  const situacaoConfig = useMemo(() => [
    { value: "em_curso", label: "Em curso", test: (j) => ["aguardando", "em_producao"].includes(j.status) },
    { value: "bloqueadas", label: "Paradas por material", test: (j) => bloqueadaPorMaterial(j) },
    { value: "liberadas", label: "Com material", test: (j) => j.status !== "aguardando" && j.status !== "em_producao" ? true : situacaoMaterial(j) === SITUACAO_MATERIAL.material_liberado || situacaoMaterial(j) === SITUACAO_MATERIAL.sem_material },
    { value: "concluidas", label: "Concluídas", test: (j) => ["finalizado", "entregue"].includes(j.status) },
    { value: "todos", label: "Todas", test: () => true },
  ], []);

  const filtrados = useMemo(() => {
    const termo = filtro.termo.toLowerCase().trim();
    const cfg = situacaoConfig.find((f) => f.value === situacao) || situacaoConfig[0];
    return jobs.filter((j) => {
      if (!cfg.test(j)) return false;
      if (!termo) return true;
      let alvo = "";
      if (filtro.campo === "cliente") alvo = j.cliente;
      else if (filtro.campo === "produto") alvo = j.produto;
      else alvo = String(j.id);
      alvo = String(alvo || "").toLowerCase();
      if (filtro.operador === "igual") return alvo === termo;
      if (filtro.operador === "comeca") return alvo.startsWith(termo);
      return alvo.includes(termo);
    });
  }, [jobs, filtro, situacao, situacaoConfig]);

  const contagens = useMemo(() => {
    const c = {};
    for (const f of situacaoConfig) c[f.value] = jobs.filter(f.test).length;
    return c;
  }, [jobs, situacaoConfig]);

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

  const jobAtivo = selectedJob ? jobs.find((j) => j.id === selectedJob) : null;

  if (loading) return <CardSkeleton lines={6} />;

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5 overflow-x-auto max-w-full">
        {processos.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setActiveProcesso(e.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeProcesso === e.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={e.icon} className="text-sm" />
            {e.label}
          </button>
        ))}
      </div>

      <Ledger rotulo="Processos ledger">
        <LedgerHeader
          titulo={processoLabels[activeProcesso]}
          subtitulo={`${filtrados.length} de ${jobs.length} OPs · conclua todos os processos para finalizar cada OP`}
          onToggleFiltros={() => setFiltrosAbertos((v) => !v)}
          filtrosAbertos={filtrosAbertos}
        />
        {filtrosAbertos && (
          <>
            <FilterRow
              campo={filtro.campo}
              setCampo={(v) => setFiltro((f) => ({ ...f, campo: v }))}
              campos={[
                { value: "cliente", label: "Cliente" },
                { value: "produto", label: "Produto" },
                { value: "op", label: "Nº da OP" },
              ]}
              operador={filtro.operador}
              setOperador={(v) => setFiltro((f) => ({ ...f, operador: v }))}
              termo={filtro.termo}
              setTermo={(v) => setFiltro((f) => ({ ...f, termo: v }))}
              aoLimpar={() => setFiltro((f) => ({ ...f, termo: "" }))}
              placeholder="Pesquisar..."
            />
            <div className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-2">
              {situacaoConfig.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setSituacao(f.value)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors border ${
                    situacao === f.value
                      ? "border-border bg-card text-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                  <span className={`rounded px-1.5 py-0.5 text-[9px] ${situacao === f.value ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {contagens[f.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        <LedgerTable>
          <thead>
            <tr className="border-b border-border">
              <LedgerTh>OP</LedgerTh>
              <LedgerTh>Cliente</LedgerTh>
              <LedgerTh>Produto</LedgerTh>
              <LedgerTh>Processo</LedgerTh>
              <LedgerTh>Estado</LedgerTh>
              <LedgerTh className="w-10" />
            </tr>
          </thead>
          <tbody>
            {visiveis.map((job) => {
              const matSit = situacaoMaterial(job);
              return (
                <LedgerTr key={job.id} onClick={() => setSelectedJob(job.id)}>
                  <LedgerTd className="max-w-40">
                    <IdCell id={`OP #${job.id}`} meta={job.produto ? `Qtd: ${job.quantidade}` : ""} aoAbrir={() => setSelectedJob(job.id)} />
                  </LedgerTd>
                  <LedgerTd className="max-w-48"><span className="block truncate text-sm">{job.cliente}</span></LedgerTd>
                  <LedgerTd className="max-w-48"><span className="block truncate">{job.produto || "—"}</span></LedgerTd>
                  <LedgerTd>
                    <span className="flex flex-wrap items-center gap-1">
                      <StatusBadge tom="neutral">{processoLabels[job.processoAtual]}</StatusBadge>
                      {matSit && matSit.bloqueia && <StatusBadge tom="error">Material por libertar</StatusBadge>}
                    </span>
                  </LedgerTd>
                  <LedgerTd><StatusBadge tom={statusTons[job.status] || "neutral"}>{situacaoOP(job)?.label || job.status}</StatusBadge></LedgerTd>
                  <LedgerTd>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedJob(job.id); }}>
                      <Icon name="edit" className="text-sm" /> Abrir
                    </Button>
                  </LedgerTd>
                </LedgerTr>
              );
            })}
          </tbody>
        </LedgerTable>
        {pag.total === 0 && (
          jobs.length === 0
            ? <LedgerEmpty icone="construction">Nenhuma ordem de produção encontrada</LedgerEmpty>
            : <LedgerEmpty icone="search_off">Nenhuma OP neste filtro</LedgerEmpty>
        )}
        <Paginacao {...pag} label="OPs" />
      </Ledger>

      <Modal
        open={Boolean(jobAtivo)}
        onClose={() => setSelectedJob(null)}
        title={jobAtivo ? `OP #${jobAtivo.id} — ${processoLabels[activeProcesso]}` : ""}
        icon={processoIcone[activeProcesso]}
        size="xl"
      >
        {jobAtivo && (() => {
          const job = jobAtivo;
          const matSit = situacaoMaterial(job);
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{job.cliente}</span>
                  {job.produto ? <> — {job.produto}</> : ""} · Qtd: <strong>{job.quantidade}</strong>
                </p>
                <StatusBadge tom={statusTons[job.status] || "neutral"}>{situacaoOP(job)?.label || job.status}</StatusBadge>
              </div>

              {matSit && matSit.bloqueia && (
                <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
                  <Icon name="inventory" className="text-[20px] text-warning shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {matSit === SITUACAO_MATERIAL.aguardando_liberacao
                        ? "Aguardando libertação de material"
                        : "Aguardando libertação de materiais"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {matSit === SITUACAO_MATERIAL.aguardando_liberacao
                        ? "A requisição de material já foi submetida, mas o armazém ainda não deu a saída. Só após a libertação é que a OP pode avançar para produção. Vá à aba \"Ordens\" para aprovar."
                        : "Esta OP não tem a saída de material confirmada pelo armazém. Só após a libertação é que pode avançar para produção. Vá à aba \"Ordens\" → \"Requisição material\"."}
                    </p>
                  </div>
                </div>
              )}

              {activeProcesso === "pre_impressao" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {["arquivoRecebido", "tamanhoCorreto", "CMYK", "fontesConvertidas", "imagem300DPI", "revisaoOrtografica", "aprovacaoCliente"].map((key) => (
                      <label key={key} className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3.5 cursor-pointer hover:bg-muted/70 transition-colors">
                        <input type="checkbox" checked={!!job.preImpressao[key]} onChange={(e) => updateJob(job.id, "preImpressao", key, e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                        <span className="text-sm text-foreground">{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                    <Icon name="person" className="text-[18px] text-muted-foreground" />
                    <input className="text-sm bg-transparent outline-none border-b border-transparent focus:border-primary text-foreground flex-1" value={job.preImpressao.responsavel} onChange={(e) => updateJob(job.id, "preImpressao", "responsavel", e.target.value)} placeholder="Responsável" />
                  </div>
                  <div className="flex justify-end"><Button size="sm" onClick={() => handleSave(job.id)}>Guardar</Button></div>
                </div>
              )}

              {activeProcesso === "impressao" && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Registe cada máquina usada com o seu colaborador e o tempo de trabalho.
                  </p>
                  {(job.impressao?.registos?.length ? job.impressao.registos : [{ ...registoVazio }]).map((r, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex flex-col gap-1 lg:col-span-2">
                        <label className="text-[10px] font-semibold text-muted-foreground">Máquina {idx + 1}</label>
                        <select value={r.maquina || ""} onChange={(e) => updateRegisto(job.id, idx, "maquina", e.target.value)} className={inputCls}>
                          <option value="">Seleccionar máquina...</option>
                          {maquinas.map((m) => (
                            <option key={m.id} value={m.nome_comum || m.codigo}>{m.nome_comum || m.codigo}{m.localizacao ? ` — ${m.localizacao}` : ""}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">Colaborador</label>
                        <input type="text" value={r.operador || ""} onChange={(e) => updateRegisto(job.id, idx, "operador", e.target.value)} className={inputCls} placeholder="Nome do colaborador" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">Início</label>
                        <input type="time" value={r.horaInicio || ""} onChange={(e) => updateRegisto(job.id, idx, "horaInicio", e.target.value)} className={inputCls} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">Fim</label>
                        <input type="time" value={r.horaFim || ""} onChange={(e) => updateRegisto(job.id, idx, "horaFim", e.target.value)} className={inputCls} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">Produzido</label>
                        <input type="number" min="0" value={r.quantidadeProduzida ?? ""} onChange={(e) => updateRegisto(job.id, idx, "quantidadeProduzida", Number(e.target.value))} className={inputCls} placeholder="0" />
                      </div>
                      <div className="flex items-end justify-between gap-2 lg:col-span-6">
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-[10px] font-semibold text-muted-foreground">Rejeitado</label>
                          <input type="number" min="0" value={r.quantidadeRejeitada ?? ""} onChange={(e) => updateRegisto(job.id, idx, "quantidadeRejeitada", Number(e.target.value))} className={inputCls} placeholder="0" />
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
                    <label className="text-[10px] font-semibold text-muted-foreground">Observações</label>
                    <textarea value={job.impressao.observacoes || ""} onChange={(e) => updateImpressao(job.id, "observacoes", e.target.value)} rows={2} className={`${inputCls} h-auto resize-none py-2`} placeholder="Notas sobre a impressão..." />
                  </div>
                  <div className="flex justify-end"><Button size="sm" onClick={() => handleSave(job.id)}>Guardar</Button></div>
                </div>
              )}

              {activeProcesso === "acabamento" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {["corte", "dobra", "encadernacao", "laminacao", "verniz", "hotStamping"].map((proc) => {
                      const val = job.acabamento[proc] || "pendente";
                      const icons = { corte: "content_cut", dobra: "flip", encadernacao: "menu_book", laminacao: "layers", verniz: "format_paint", hotStamping: "star" };
                      return (
                        <button key={proc} onClick={() => toggleAcabamento(job.id, proc)} className={`p-3 rounded-lg border text-center transition-colors ${
                          val === "pendente" ? "border-border bg-muted/40 text-muted-foreground" :
                          val === "em_execucao" ? "border-warning/30 bg-warning/10 text-warning" :
                          "border-success/30 bg-success/10 text-success"
                        }`}>
                          <Icon name={icons[proc]} className="text-[20px] block mb-1" />
                          <p className="text-xs font-medium capitalize">{proc === "hotStamping" ? "Hot Stamping" : proc}</p>
                          <p className="text-[10px] mt-1">{processoStatusLabels[val]}</p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Registe as máquinas usadas no acabamento, com o colaborador e o tempo de trabalho de cada uma.
                  </p>
                  {(job.acabamento.maquinas?.length ? job.acabamento.maquinas : [maquinaAcabamentoVazia]).map((m, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex flex-col gap-1 lg:col-span-2">
                        <label className="text-[10px] font-semibold text-muted-foreground">Máquina {idx + 1}</label>
                        <select value={m.maquina || ""} onChange={(e) => updateMaquinaAcabamento(job.id, idx, "maquina", e.target.value)} className={inputCls}>
                          <option value="">Seleccionar máquina...</option>
                          {maquinas.map((mm) => (
                            <option key={mm.id} value={mm.nome_comum || mm.codigo}>{mm.nome_comum || mm.codigo}{mm.localizacao ? ` — ${mm.localizacao}` : ""}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">Colaborador</label>
                        <input type="text" value={m.operador || ""} onChange={(e) => updateMaquinaAcabamento(job.id, idx, "operador", e.target.value)} className={inputCls} placeholder="Nome do colaborador" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">Tempo</label>
                        <input type="text" value={m.tempoEstimado || ""} onChange={(e) => updateMaquinaAcabamento(job.id, idx, "tempoEstimado", e.target.value)} className={inputCls} placeholder="ex: 1h30" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">Erros</label>
                        <input type="number" min="0" value={m.erros ?? ""} onChange={(e) => updateMaquinaAcabamento(job.id, idx, "erros", Number(e.target.value))} className={inputCls} placeholder="0" />
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-[10px] font-semibold text-muted-foreground">Perdas</label>
                          <input type="number" min="0" value={m.perdas ?? ""} onChange={(e) => updateMaquinaAcabamento(job.id, idx, "perdas", Number(e.target.value))} className={inputCls} placeholder="0" />
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
                    <label className="text-[10px] font-semibold text-muted-foreground">Observações</label>
                    <textarea rows={1} value={job.acabamento.observacoes || ""} onChange={(e) => updateJob(job.id, "acabamento", "observacoes", e.target.value)} className={`${inputCls} h-auto resize-none py-2`} placeholder="Notas..." />
                  </div>
                  <div className="flex justify-end"><Button size="sm" onClick={() => handleSave(job.id)}>Guardar</Button></div>
                </div>
              )}

              {activeProcesso === "qualidade" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {["cor", "corte", "quantidade", "acabamento", "embalagem"].map((campo) => (
                      <div key={campo} className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-muted-foreground capitalize">{campo}</label>
                        <select value={job.qualidade[campo] || ""} onChange={(e) => updateQualidade(job.id, campo, e.target.value)} className={inputCls}>
                          <option value="">Seleccionar...</option>
                          <option value="aprovado">Aprovado</option>
                          <option value="reprovado">Reprovado</option>
                        </select>
                      </div>
                    ))}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground">Resultado Final</label>
                      <select value={job.qualidade.resultado || ""} onChange={(e) => updateQualidade(job.id, "resultado", e.target.value)} className={`${inputCls} font-medium`}>
                        <option value="">Seleccionar...</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="reprovado">Reprovado</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end"><Button size="sm" onClick={() => handleSave(job.id)}>Guardar</Button></div>
                </div>
              )}

              {activeProcesso === "entrega" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/40 p-6 text-center">
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
          );
        })()}
      </Modal>
    </div>
  );
}
