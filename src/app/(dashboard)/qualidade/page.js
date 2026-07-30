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

const campos = [
  { key: "cor", label: "Cor", icon: "palette" },
  { key: "corte", label: "Corte", icon: "content_cut" },
  { key: "quantidade", label: "Quantidade", icon: "numbers" },
  { key: "acabamento", label: "Acabamento", icon: "handyman" },
  { key: "embalagem", label: "Embalagem", icon: "inventory_2" },
];

const statusVariants = { aprovado: "success", reprovado: "destructive", pendente: "outline" };
const initialForm = { op: "", cliente: "", produto: "", responsavel: "", cor: "pendente", corte: "pendente", quantidade: "pendente", acabamento: "pendente", embalagem: "pendente" };

function calcularResultado(insp) {
  const valores = campos.map(c => insp[c.key]);
  if (valores.some(v => v === "reprovado")) return "reprovado";
  if (valores.every(v => v === "aprovado")) return "aprovado";
  return "pendente";
}

export default function QualidadePage() {
  const [inspecoes, setInspecoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editandoId, setEditandoId] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    listarOrdens().then(data => {
      const arr = Array.isArray(data) ? data : data?.ordens || [];
      setInspecoes(arr.map(o => ({
        id: o.id, op: o.id, cliente: o.cliente || "—", produto: o.produto || "—",
        responsavel: o.qualidade?.responsavel || o.responsavel_qualidade || "",
        ...campos.reduce((acc, c) => ({ ...acc, [c.key]: o.qualidade?.[c.key] || "pendente" }), {}),
      })));
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const filtered = filtro === "todos" ? inspecoes : inspecoes.filter(i => calcularResultado(i) === filtro);

  const toggleCampo = (key) => {
    const ordem = ["pendente", "aprovado", "reprovado"];
    const atual = form[key] || "pendente";
    const idx = ordem.indexOf(atual);
    const next = ordem[(idx + 1) % ordem.length];
    setForm(prev => ({ ...prev, [key]: next }));
  };

  const handleEdit = (insp) => {
    setEditandoId(insp.id);
    setForm({ op: insp.op, cliente: insp.cliente, produto: insp.produto, responsavel: insp.responsavel || "", ...campos.reduce((acc, c) => ({ ...acc, [c.key]: insp[c.key] || "pendente" }), {}) });
    setModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setInspecoes(prev => prev.map(i => i.id === editandoId ? { ...i, ...form, responsavel: form.responsavel } : i));
    setModal(false);
    addToast("Inspeção actualizada com sucesso", "success");
  };

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Controlo de Qualidade</h1>
        <p className="text-xs text-muted-foreground mt-1">{inspecoes.length} inspeções registadas</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["todos", "aprovado", "pendente", "reprovado"].map((f) => (
          <Button key={f} variant={filtro === f ? "default" : "outline"} size="sm" onClick={() => setFiltro(f)}>
            {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((insp) => {
          const resultado = calcularResultado(insp);
          return (
            <Card key={insp.id} className="hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon name="verified" className="text-primary text-[20px]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{insp.op}</span>
                        <Badge variant={resultado === "aprovado" ? "success" : resultado === "reprovado" ? "destructive" : "warning"} className="text-[10px]">{resultado}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{insp.cliente} — {insp.produto}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(insp)}><Icon name="edit" className="text-sm" /> Inspecionar</Button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {campos.map((c) => {
                    const val = insp[c.key];
                    return (
                      <div key={c.key} className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs ${
                        val === "aprovado" ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" :
                        val === "reprovado" ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" :
                        "border-border bg-muted/50 text-muted-foreground"
                      }`}>
                        <Icon name={c.icon} className="text-base" />
                        <span className="text-[9px] font-semibold">{c.label}</span>
                        <Badge variant={statusVariants[val]} className="text-[8px] px-1 py-0">{val}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center p-12 text-muted-foreground">
            <Icon name="verified" className="text-4xl block mx-auto mb-2 opacity-30" />
            <p className="font-medium">Nenhuma inspeção encontrada</p>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Inspeção de Qualidade" icon="verified" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button type="submit" form="form-qualidade">Concluir Inspeção</Button></>}>
        <form id="form-qualidade" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">OP</label>
              <input value={form.op} disabled className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-xs text-foreground" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Responsável</label>
              <input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Nome do inspector" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {campos.map((c) => (
              <button key={c.key} type="button" onClick={() => toggleCampo(c.key)}
                className={`p-4 rounded-xl border-2 text-center transition-all text-xs font-bold ${
                  form[c.key] === "aprovado" ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" :
                  form[c.key] === "reprovado" ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" :
                  "border-border bg-background text-muted-foreground"
                }`}>
                <Icon name={c.icon} className="text-xl block mb-1 mx-auto" />
                <span className="block">{c.label}</span>
                <span className="block text-[9px] mt-1 opacity-70">{form[c.key]}</span>
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
