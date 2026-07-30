"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { listarOrdens, criarOrdem } from "@/services/producao";
import { listar as listarClientes } from "@/services/clientes";

const statusConfig = {
  aguardando: { label: "Aguardando", variant: "warning" },
  em_producao: { label: "Em Produção", variant: "info" },
  finalizado: { label: "Finalizado", variant: "success" },
  entregue: { label: "Entregue", variant: "secondary" },
};

const etapaLabels = { pre_impressao: "Pré-Impressão", impressao: "Impressão", acabamento: "Acabamento", qualidade: "Qualidade", entrega: "Entrega" };

const initialForm = { cliente: "", empresa: "", produto: "", quantidade: "", dataEntrega: "", orcamento: "" };

export default function OrdensProducaoPage() {
  const [ops, setOps] = useState([]);
  const [filter, setFilter] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([listarOrdens(), listarClientes()]).then(([ordensData, clientesData]) => {
      setOps(Array.isArray(ordensData) ? ordensData : ordensData?.ordens || []);
      setClientes(Array.isArray(clientesData) ? clientesData : clientesData?.clientes || []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "todos" ? ops : ops.filter((o) => o.status === filter);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const nova = await criarOrdem({
        ...form, quantidade: form.quantidade + " un",
        dataEntrada: new Date().toISOString().split("T")[0],
        status: "aguardando", etapaAtual: "pre_impressao",
      });
      setOps([nova, ...ops]);
      setForm(initialForm); setModalOpen(false);
      addToast("Operação realizada com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Ordens de Produção</h1>
          <p className="text-xs text-muted-foreground mt-1">{ops.length} OPs registadas</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Icon name="add" className="text-lg" /> Nova OP</Button>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <Card key={key} className="hover-lift">
            <CardContent className="p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.variant === "info" ? "bg-primary" : cfg.variant === "warning" ? "bg-amber-500" : cfg.variant === "success" ? "bg-green-500" : "bg-purple-500"}`} />
                <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>
              </div>
              <p className="text-3xl font-extrabold text-foreground tracking-tight">{ops.filter((o) => o.status === key).length}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="flex gap-2 flex-wrap">
        {["todos", ...Object.keys(statusConfig)].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "todos" ? "Todos" : statusConfig[f]?.label || f}
          </Button>
        ))}
      </div>

      {loading ? <CardSkeleton lines={6} /> : (
        <div className="space-y-3">
          {filtered.map((op) => {
            const sc = statusConfig[op.status];
            const etapas = Object.keys(etapaLabels);
            const etapaIdx = etapas.indexOf(op.etapaAtual);
            return (
              <Card key={op.id} className="cursor-pointer hover-lift hover:border-primary transition-colors" onClick={() => setSelected(selected === op.id ? null : op.id)}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon name="construction" className="text-primary text-[20px]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{op.id}</span>
                          <Badge variant={sc.variant || "info"} className="text-[10px]">{sc.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{op.cliente} — {op.produto} ({op.quantidade})</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Entrada: {new Date(op.dataEntrada).toLocaleDateString("pt-BR")}</span>
                      <span>Entrega: {new Date(op.dataEntrega).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1">
                    {etapas.map((et, i) => (
                      <div key={et} className="flex-1 flex items-center gap-1">
                        <div className={`h-2 flex-1 rounded-full ${i <= etapaIdx ? "bg-primary" : "bg-muted"}`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {etapas.map((et) => (
                      <span key={et} className={`text-[9px] ${et === op.etapaAtual ? "text-primary font-bold" : "text-muted-foreground"}`}>{etapaLabels[et]}</span>
                    ))}
                  </div>

                  {selected === op.id && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {[
                        { label: "OP", value: op.id },
                        { label: "Cliente", value: op.cliente },
                        { label: "Produto", value: op.produto },
                        { label: "Quantidade", value: op.quantidade },
                        { label: "Orçamento", value: op.orcamento, highlight: "text-primary" },
                        { label: "Data Entrada", value: new Date(op.dataEntrada).toLocaleDateString("pt-BR") },
                        { label: "Data Entrega", value: new Date(op.dataEntrega).toLocaleDateString("pt-BR") },
                        { label: "Empresa", value: op.empresa },
                      ].map((f) => (
                        <div key={f.label}>
                          <span className="text-muted-foreground text-xs block">{f.label}</span>
                          <span className={`font-medium ${f.highlight || "text-foreground"}`}>{f.value || "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Ordem de Produção" icon="add" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" form="form-ordem">Criar OP</Button></>}>
        <form id="form-ordem" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente *</label>
              <select required name="cliente" value={form.cliente} onChange={handleChange} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                <option value="">Seleccionar...</option>
                {clientes.map((c) => (<option key={c.id || c.nome} value={c.nome}>{c.nome}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Empresa</label>
              <input name="empresa" value={form.empresa} onChange={handleChange} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: Gráfica Expresso" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Produto *</label>
              <input required name="produto" value={form.produto} onChange={handleChange} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: Catálogos Institucionais" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quantidade *</label>
              <input required name="quantidade" value={form.quantidade} onChange={handleChange} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: 500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data de Entrega *</label>
              <input required type="date" name="dataEntrega" value={form.dataEntrega} onChange={handleChange} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Orçamento de Referência</label>
              <select name="orcamento" value={form.orcamento} onChange={handleChange} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                <option value="">Nenhum</option>
                {[1,2,3,4,5].map((n) => <option key={n} value={`ORC-2024-00${n}`}>ORC-2024-00{n}</option>)}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
