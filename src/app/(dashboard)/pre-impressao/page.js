"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { listarOrdens } from "@/services/producao";

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

const statusVariants = { ok: "success", nok: "destructive", pendente: "outline" };
const statusLabels = { ok: "OK", nok: "NOK", pendente: "Pendente" };

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
  const { addToast } = useToast();

  useEffect(() => {
    listarOrdens().then(data => {
      const arr = Array.isArray(data) ? data : data?.ordens || [];
      setJobs(arr.map(j => ({
        id: j.id, cliente: j.cliente || j.cliente_nome || "—", produto: j.produto || "—",
        responsavel: j.preImpressao?.responsavel || j.responsavel_pre_impressao || "",
        ...checklistItems.reduce((acc, c) => ({ ...acc, [c.key]: j.preImpressao?.[c.key] || j[c.key] || "pendente" }), {}),
      })));
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
    addToast("Pré-impressão actualizada com sucesso", "success");
    setJobs(prev => prev.map(j => j.id === editId ? { ...j, ...form, responsavel: form.responsavel } : j));
    setModalOpen(false);
  };

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Pré-Impressão</h1>
        <p className="text-xs text-muted-foreground mt-1">Checklist de preparação de arquivos</p>
      </div>

      <div className="grid gap-3">
        {jobs.map((job) => {
          const resultado = calcularPreResultado(job);
          return (
            <Card key={job.id} className="hover-lift cursor-pointer" onClick={() => setSelected(selected === job.id ? null : job.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon name="rule" className="text-primary text-[20px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{job.id}</span>
                        <Badge variant={resultado === "aprovado" ? "success" : resultado === "reprovado" ? "destructive" : "warning"} className="text-[10px]">{resultado}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{job.cliente} — {job.produto}</p>
                    </div>
                  </div>
                  {job.responsavel && <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">Resp: {job.responsavel}</span>}
                </div>

                {selected === job.id && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      {checklistItems.map((c) => {
                        const val = job[c.key] || "pendente";
                        return (
                          <div key={c.key} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                            val === "ok" ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" :
                            val === "nok" ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" :
                            "border-border bg-muted/50 text-muted-foreground"
                          }`}>
                            <Icon name={c.icon} className="text-sm shrink-0" />
                            <span className="truncate">{c.label}</span>
                            <Badge variant={statusVariants[val]} className="ml-auto text-[9px] px-1 py-0">{statusLabels[val]}</Badge>
                          </div>
                        );
                      })}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(job)}><Icon name="edit" className="text-sm" /> Editar Checklist</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
              <input value={form.responsavel} onChange={(e) => setField("responsavel", e.target.value)} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Nome do responsável" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {checklistItems.map((c) => (
              <button key={c.key} type="button" onClick={() => toggleStatus(c.key)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-xs font-bold text-left transition-all ${
                  form[c.key] === "ok" ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" :
                  form[c.key] === "nok" ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" :
                  "border-border bg-background text-muted-foreground hover:border-muted-foreground/30"
                }`}>
                <Icon name={c.icon} className="text-lg shrink-0" />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </form>
      </Modal>

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
