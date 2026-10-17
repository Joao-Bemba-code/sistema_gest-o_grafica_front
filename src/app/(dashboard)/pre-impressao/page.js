"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
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
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import { inputCls } from "@/lib/estoque";
import { listarOrdens, salvarPreImpressao } from "@/services/producao";

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

const statusTons = { ok: "success", nok: "error", pendente: "neutral" };
const statusLabels = { ok: "OK", nok: "NOK", pendente: "Pendente" };

const resultadoTons = { aprovado: "success", reprovado: "error", pendente: "neutral" };

const CAMPOS = [
  { value: "geral", label: "Todos os campos", obter: (j) => `${j.id} ${j.cliente} ${j.produto} ${j.responsavel || ""}` },
  { value: "id", label: "OP", obter: (j) => String(j.id || "") },
  { value: "cliente", label: "Cliente", obter: (j) => j.cliente || "" },
  { value: "produto", label: "Produto", obter: (j) => j.produto || "" },
  { value: "responsavel", label: "Responsável", obter: (j) => j.responsavel || "" },
];

const pillBase = "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-colors";
const pillAtiva = "border-primary/40 bg-primary/10 text-primary";
const pillInativa = "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground";

const initialChecklist = Object.fromEntries(checklistItems.map(c => [c.key, "pendente"]));
const initialForm = { job: "", cliente: "", produto: "", responsavel: "", ...initialChecklist };

function calcularPreResultado(job) {
  const vals = checklistItems.map(c => job[c.key]);
  if (vals.some(v => v === "nok")) return "reprovado";
  if (vals.every(v => v === "ok")) return "aprovado";
  return "pendente";
}

export default function PreImpressaoPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editJob, setEditJob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [filtro, setFiltro] = useState({ campo: "geral", operador: "contem", termo: "" });
  const [filtroResultado, setFiltroResultado] = useState("todos");
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    listarOrdens().then(data => {
      const arr = Array.isArray(data) ? data : data?.ordens || [];
      setJobs(arr.map(j => {
        const pre = Array.isArray(j.pre_impressaos) ? j.pre_impressaos[0] : j.preImpressao;
        return {
        id: j.id, cliente: j.cliente?.nome || j.cliente || "—", produto: j.produto || "—",
        responsavel: pre?.responsavel || j.responsavel_pre_impressao || "",
        ...checklistItems.reduce((acc, c) => ({ ...acc, [c.key]: pre?.[c.key] ? "ok" : "pendente" }), {}),
      };
      }));
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleEdit = (job) => {
    setEditId(job.id);
    setForm({ job: job.id, cliente: job.cliente, produto: job.produto, responsavel: job.responsavel || "", ...checklistItems.reduce((acc, c) => ({ ...acc, [c.key]: job[c.key] || "pendente" }), {}) });
    setEditJob(job);
    setModalOpen(true);
  };

  const toggleStatus = (key) => {
    const ordem = ["pendente", "ok", "nok"];
    const atual = form[key] || "pendente";
    const idx = ordem.indexOf(atual);
    const prox = ordem[(idx + 1) % ordem.length];
    setField(key, prox);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editId) return;
    try {
      const dados = {
        responsavel: form.responsavel || "",
        ...checklistItems.reduce((acc, c) => ({ ...acc, [c.key]: form[c.key] === "ok" }), {}),
      };
      const salvo = await salvarPreImpressao(editId, dados);
      setJobs(prev => prev.map(j => j.id === editId ? {
        ...j,
        responsavel: form.responsavel || "",
        ...checklistItems.reduce((acc, c) => ({ ...acc, [c.key]: salvo[c.key] ? "ok" : "pendente" }), {}),
      } : j));
      setModalOpen(false);
      addToast("Pré-impressão actualizada com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar pré-impressão", "error");
    }
  };

  const contagensResultado = useMemo(() => jobs.reduce((acc, j) => {
    const r = calcularPreResultado(j);
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {}), [jobs]);

  const resultadoLista = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...jobs];
    if (termo) {
      const cfg = CAMPOS.find(c => c.value === filtro.campo) || CAMPOS[0];
      res = res.filter(j => {
        const alvo = String(cfg.obter(j) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (filtroResultado !== "todos") {
      res = res.filter(j => calcularPreResultado(j) === filtroResultado);
    }
    return res;
  }, [jobs, filtro, filtroResultado]);

  const pag = usePaginacao({ items: resultadoLista });

  const pillsResultado = [
    { value: "todos", label: "Todos", count: jobs.length },
    { value: "aprovado", label: "Aprovado", count: contagensResultado.aprovado || 0 },
    { value: "pendente", label: "Pendente", count: contagensResultado.pendente || 0 },
    { value: "reprovado", label: "Reprovado", count: contagensResultado.reprovado || 0 },
  ];

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-normal text-foreground">Pré-Impressão</h1>
        <p className="text-xs text-muted-foreground">Checklist de preparação de arquivos</p>
      </div>

      <Ledger rotulo="Pré-impressão ledger">
        <LedgerHeader
          titulo="Pré-impressão"
          subtitulo={`${resultadoLista.length} de ${jobs.length} ordens · ${contagensResultado.aprovado || 0} aprovadas · ${contagensResultado.reprovado || 0} reprovadas`}
          onToggleFiltros={() => setFiltrosAbertos((v) => !v)}
          filtrosAbertos={filtrosAbertos}
        />
        {filtrosAbertos && (
          <FilterRow
            campo={filtro.campo}
            setCampo={(v) => setFiltro((f) => ({ ...f, campo: v }))}
            campos={CAMPOS.map(({ value, label }) => ({ value, label }))}
            operador={filtro.operador}
            setOperador={(v) => setFiltro((f) => ({ ...f, operador: v }))}
            termo={filtro.termo}
            setTermo={(v) => setFiltro((f) => ({ ...f, termo: v }))}
            aoLimpar={() => setFiltro((f) => ({ ...f, termo: "" }))}
            placeholder="Pesquisar por OP, cliente, produto..."
          />
        )}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
          {pillsResultado.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setFiltroResultado(p.value)}
              aria-pressed={filtroResultado === p.value}
              className={`${pillBase} ${filtroResultado === p.value ? pillAtiva : pillInativa}`}
            >
              {p.label}
              <span className="text-[11px] text-muted-foreground">{p.count}</span>
            </button>
          ))}
        </div>

        <LedgerTable>
          <thead>
            <tr className="border-b border-border">
              <LedgerTh>OP</LedgerTh>
              <LedgerTh>Cliente</LedgerTh>
              <LedgerTh>Produto</LedgerTh>
              <LedgerTh>Responsável</LedgerTh>
              <LedgerTh>Resultado</LedgerTh>
              <LedgerTh className="w-32" />
            </tr>
          </thead>
          <tbody>
            {pag.visiveis.map((job) => {
              const resultado = calcularPreResultado(job);
              const expanded = selected === job.id;
              return (
                <Fragment key={job.id}>
                  <LedgerTr onClick={() => setSelected(expanded ? null : job.id)}>
                    <LedgerTd className="max-w-36">
                      <IdCell id={job.id} meta={`${job.cliente} — ${job.produto}`} />
                    </LedgerTd>
                    <LedgerTd className="max-w-48"><span className="block truncate text-muted-foreground">{job.cliente}</span></LedgerTd>
                    <LedgerTd className="max-w-48"><span className="block truncate text-muted-foreground">{job.produto}</span></LedgerTd>
                    <LedgerTd className="max-w-40"><span className="block truncate text-muted-foreground">{job.responsavel || "—"}</span></LedgerTd>
                    <LedgerTd>
                      <StatusBadge tom={resultadoTons[resultado]}>{resultado}</StatusBadge>
                    </LedgerTd>
                    <LedgerTd>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleEdit(job); }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      >
                        <Icon name="edit" className="text-base" /> Editar
                      </button>
                    </LedgerTd>
                  </LedgerTr>
                  {expanded && (
                    <tr className="border-b border-border bg-muted/20">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {checklistItems.map((c) => {
                            const val = job[c.key] || "pendente";
                            return (
                              <div key={c.key} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                                val === "ok" ? "border-success/30 bg-success/10 text-success" :
                                val === "nok" ? "border-error/30 bg-error/10 text-error" :
                                "border-border bg-muted/50 text-muted-foreground"
                              }`}>
                                <Icon name={c.icon} className="text-sm shrink-0" />
                                <span className="truncate">{c.label}</span>
                                <StatusBadge tom={statusTons[val]} className="ml-auto">{statusLabels[val]}</StatusBadge>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </LedgerTable>
        {pag.total === 0 && (
          jobs.length === 0
            ? <LedgerEmpty icone="rule">Nenhuma ordem de pré-impressão</LedgerEmpty>
            : <LedgerEmpty icone="search_off">Nenhuma ordem corresponde ao filtro</LedgerEmpty>
        )}
        <Paginacao {...pag} label="ordens" />
      </Ledger>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Editar Pré-Impressão" icon="rule" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" form="form-pre-impressao">Guardar</Button></>}>
        <form id="form-pre-impressao" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">OP</label>
              <input value={form.job} disabled className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-xs text-foreground" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Responsável</label>
              <input value={form.responsavel} onChange={(e) => setField("responsavel", e.target.value)} className={inputCls} placeholder="Nome do responsável" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {checklistItems.map((c) => (
              <button key={c.key} type="button" onClick={() => toggleStatus(c.key)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-xs font-bold text-left transition-all ${
                  form[c.key] === "ok" ? "border-success bg-success/10 text-success" :
                  form[c.key] === "nok" ? "border-error bg-error/10 text-error" :
                  "border-border bg-background text-muted-foreground hover:border-muted-foreground/30"
                }`}>
                <Icon name={c.icon} className="text-lg shrink-0" />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </form>
      </Modal>
    </div>
  );
}
