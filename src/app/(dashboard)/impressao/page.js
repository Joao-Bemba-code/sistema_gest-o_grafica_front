"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { listarOrdens } from "@/services/producao";

const maquinas = ["Heidelberg Speedmaster 52", "Heidelberg CD 102", "Kompac Hydra 66", "ManRoland 700"];

const initialForm = { maquina: "", operador: "", inicio: "", fim: "", produzido: "", rejeitado: "", observacoes: "" };

export default function ImpressaoPage() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const { addToast } = useToast();

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const ordens = await listarOrdens();
      const mapped = [];
      (Array.isArray(ordens) ? ordens : ordens?.ordens || []).forEach(o => {
        const regs = o.impressao || [];
        (Array.isArray(regs) ? regs : [regs]).forEach((r, idx) => {
          if (r && typeof r === "object") mapped.push({
            id: `${o.id}-${idx}`, op: o.id, cliente: o.cliente || "—", produto: o.produto || "—",
            maquina: r.maquina || "—", operador: r.operador || "—",
            inicio: r.inicio || r.horaInicio || "—", fim: r.fim || r.horaFim || "—",
            produzido: r.produzido || r.quantidadeProduzida || 0,
            rejeitado: r.rejeitado || r.quantidadeRejeitada || 0,
            observacoes: r.observacoes || "",
          });
        });
      });
      setRegistros(mapped);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const totalProduzido = registros.reduce((s, r) => s + Number(r.produzido), 0);
  const totalRejeitado = registros.reduce((s, r) => s + Number(r.rejeitado), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setRegistros(prev => [{ ...form, id: `REG-${Date.now()}`, op: "Manual", cliente: "—", produto: "—" }, ...prev]);
    setForm(initialForm); setModal(false);
    addToast("Registo de impressão adicionado", "success");
  };

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Impressão</h1>
          <p className="text-xs text-muted-foreground mt-1">{registros.length} registos de impressão</p>
        </div>
        <Button onClick={() => setModal(true)}><Icon name="add" className="text-lg" /> Novo Registo</Button>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[
          { label: "Total Produzido", value: totalProduzido?.toLocaleString() ?? "0", icon: "print" },
          { label: "Total Rejeitado", value: totalRejeitado?.toLocaleString() ?? "0", icon: "block" },
          { label: "Taxa de Aproveitamento", value: totalProduzido ? `${(((totalProduzido - totalRejeitado) / totalProduzido) * 100).toFixed(1)}%` : "0%", icon: "check_circle" },
          { label: "Máquinas", value: maquinas.length, icon: "precision_manufacturing" },
        ].map((kpi) => (
          <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} />
        ))}
      </section>

      <div className="space-y-3">
        {registros.map((r) => (
          <Card key={r.id} className="hover-lift">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
                <div><span className="text-[10px] text-muted-foreground block">OP</span><span className="font-semibold text-foreground">{r.op}</span></div>
                <div><span className="text-[10px] text-muted-foreground block">Máquina</span><span className="text-foreground">{r.maquina}</span></div>
                <div><span className="text-[10px] text-muted-foreground block">Operador</span><span className="text-foreground">{r.operador}</span></div>
                <div><span className="text-[10px] text-muted-foreground block">Início</span><span className="text-foreground">{r.inicio}</span></div>
                <div><span className="text-[10px] text-muted-foreground block">Fim</span><span className="text-foreground">{r.fim}</span></div>
                <div className="flex items-center gap-2">
                  <div><span className="text-[10px] text-muted-foreground block">Produzido</span><span className="font-bold text-primary">{r.produzido}</span></div>
                  <span className="text-muted-foreground">/</span>
                  <div><span className="text-[10px] text-muted-foreground block">Rejeitado</span><span className="font-bold text-destructive">{r.rejeitado}</span></div>
                </div>
                {r.observacoes && <div className="col-span-2 lg:col-span-2"><span className="text-[10px] text-muted-foreground block">Obs</span><span className="text-xs text-muted-foreground">{r.observacoes}</span></div>}
              </div>
            </CardContent>
          </Card>
        ))}
        {registros.length === 0 && (
          <div className="text-center p-12 text-muted-foreground">
            <Icon name="print" className="text-4xl block mx-auto mb-2 opacity-30" />
            <p className="font-medium">Nenhum registo de impressão encontrado</p>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Registo de Impressão" icon="print" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button type="submit" form="form-impressao">Registar</Button></>}>
        <form id="form-impressao" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Máquina *</label>
              <select required value={form.maquina} onChange={(e) => setForm({ ...form, maquina: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                <option value="">Seleccionar...</option>
                {maquinas.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Operador *</label>
              <input required value={form.operador} onChange={(e) => setForm({ ...form, operador: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Nome do operador" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hora Início *</label>
              <input required type="time" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hora Fim *</label>
              <input required type="time" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Qtd Produzida *</label>
              <input required type="number" value={form.produzido} onChange={(e) => setForm({ ...form, produzido: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Qtd Rejeitada</label>
              <input type="number" value={form.rejeitado} onChange={(e) => setForm({ ...form, rejeitado: e.target.value })} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</label>
              <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" placeholder="Notas..." />
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
