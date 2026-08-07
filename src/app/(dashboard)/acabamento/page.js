"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { inputCls } from "@/lib/estoque";
import { listarOrdens, salvarAcabamento } from "@/services/producao";

const servicos = [
  { id: "corte", label: "Corte", icon: "content_cut" },
  { id: "dobra", label: "Dobra", icon: "flip" },
  { id: "encadernacao", label: "Encadernação", icon: "menu_book" },
  { id: "laminacao", label: "Laminação", icon: "layers" },
  { id: "verniz", label: "Verniz", icon: "format_paint" },
  { id: "hot_stamping", label: "Hot Stamping", icon: "star" },
  { id: "ilhos", label: "Ilhós", icon: "circle" },
];

const etapaOptions = ["pendente", "em_execucao", "concluido"];
const etapaLabels = { pendente: "Pendente", em_execucao: "Em Execução", concluido: "Concluído" };
const etapaVariants = { pendente: "outline", em_execucao: "warning", concluido: "success" };
const initialForm = { op: "", cliente: "", produto: "", prazo: "", responsavel: "" };
const initialServicos = Object.fromEntries(servicos.map(s => [s.id, "pendente"]));

export default function AcabamentoPage() {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [servicosForm, setServicosForm] = useState(initialServicos);
  const { addToast } = useToast();

  useEffect(() => {
    listarOrdens().then(data => {
      const arr = Array.isArray(data) ? data : data?.ordens || [];
      setOrdens(arr.map(o => {
        const acMap = (Array.isArray(o.acabamentos) ? o.acabamentos : []).reduce((acc, r) => ({ ...acc, [r.servico]: r.estado }), {});
        return {
          id: o.id, cliente: o.cliente?.nome || o.cliente || "—", produto: o.produto || "—",
          prazo: o.data_entrega || o.prazo || "—", responsavel: o.responsavel_acabamento || "",
          servicos: servicos.reduce((acc, s) => ({ ...acc, [s.id]: acMap[s.id] || "pendente" }), {}),
        };
      }));
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const toggleServico = (opId, servId) => {
    setOrdens(prev => prev.map(o => {
      if (o.id !== opId) return o;
      const atual = o.servicos[servId];
      const idx = etapaOptions.indexOf(atual);
      const next = etapaOptions[(idx + 1) % etapaOptions.length];
      return { ...o, servicos: { ...o.servicos, [servId]: next } };
    }));
  };

  const handleSave = async (opId) => {
    const op = ordens.find(o => o.id === opId);
    if (!op) return;
    try {
      await salvarAcabamento(opId, op.servicos);
      addToast("Acabamento actualizado com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar acabamento", "error");
    }
  };

  const handleEdit = (op) => {
    setForm({ op: op.id, cliente: op.cliente, produto: op.produto, prazo: op.prazo, responsavel: op.responsavel });
    setServicosForm({ ...op.servicos });
    setSelected(op.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await salvarAcabamento(form.op, servicosForm);
      setOrdens(prev => prev.map(o => o.id === form.op ? { ...o, servicos: { ...servicosForm }, responsavel: form.responsavel } : o));
      setModalOpen(false);
      addToast("Acabamento actualizado com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar acabamento", "error");
    }
  };

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Acabamento</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Acompanhamento dos serviços de acabamento // ACB</p>
        </div>
      </div>

      <div className="space-y-3">
        {ordens.map((op) => {
          const todosConcluidos = servicos.every(s => op.servicos[s.id] === "concluido");
          const algumExec = servicos.some(s => op.servicos[s.id] === "em_execucao");
          return (
            <Card key={op.id} className="hover-lift cursor-pointer" onClick={() => setSelected(selected === op.id ? null : op.id)}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon name="handyman" className="text-primary text-[20px]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{op.id}</span>
                        <Badge variant={todosConcluidos ? "success" : algumExec ? "warning" : "outline"} className="text-[10px]">
                          {todosConcluidos ? "Concluído" : algumExec ? "Em Andamento" : "Pendente"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{op.cliente} — {op.produto}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">Prazo: {op.prazo}</span>
                </div>

                {selected === op.id && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
                      {servicos.map((s) => {
                        const val = op.servicos[s.id];
                        return (
                          <button key={s.id} onClick={() => { toggleServico(op.id, s.id); }}
                            className={`p-3 rounded-xl border text-center transition-all text-xs font-bold ${
                              val === "concluido" ? "border-green-300 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" :
                              val === "em_execucao" ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" :
                              "border-border bg-muted/50 text-muted-foreground"
                            }`}>
                            <Icon name={s.icon} className="text-lg block mb-1 mx-auto" />
                            <span className="block">{s.label}</span>
                            <span className="block text-[9px] mt-0.5 opacity-70">{etapaLabels[val]}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(op.id)}>Guardar</Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(op)}><Icon name="edit" className="text-sm" /> Editar Tudo</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {ordens.length === 0 && (
          <div className="text-center p-12 text-muted-foreground">
            <Icon name="handyman" className="text-4xl block mx-auto mb-2 opacity-30" />
            <p className="font-medium">Nenhuma ordem de acabamento encontrada</p>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Editar Acabamento" icon="handyman" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" form="form-acabamento">Guardar</Button></>}>
        <form id="form-acabamento" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">OP</label>
              <input value={form.op} disabled className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-xs text-foreground" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Responsável</label>
              <input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className={inputCls} placeholder="Nome do responsável" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {servicos.map((s) => {
              const val = servicosForm[s.id];
              return (
                <button key={s.id} type="button" onClick={() => {
                  const idx = etapaOptions.indexOf(val);
                  const next = etapaOptions[(idx + 1) % etapaOptions.length];
                  setServicosForm(prev => ({ ...prev, [s.id]: next }));
                }}
                  className={`p-3 rounded-xl border-2 text-center transition-all text-xs font-bold ${
                    val === "concluido" ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" :
                    val === "em_execucao" ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" :
                    "border-border bg-background text-muted-foreground"
                  }`}>
                  <Icon name={s.icon} className="text-lg block mb-1 mx-auto" />
                  <span>{s.label}</span>
                  <Badge variant={etapaVariants[val]} className="block mt-1 text-[9px]">{etapaLabels[val]}</Badge>
                </button>
              );
            })}
          </div>
        </form>
      </Modal>

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
