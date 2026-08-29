"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { inputCls } from "@/lib/estoque";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { listarOrdens, salvarImpressao } from "@/services/producao";

const operacionais = ["Heidelberg Speedmaster 52", "Heidelberg CD 102", "Kompac Hydra 66", "ManRoland 700"];

const initialForm = { op: "", maquina: "", operador: "", inicio: "", fim: "", produzido: "", rejeitado: "", observacoes: "" };

export default function ImpressaoPage() {
  const [registros, setRegistros] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const { addToast } = useToast();

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const ordensData = await listarOrdens();
      const arr = Array.isArray(ordensData) ? ordensData : ordensData?.ordens || [];
      setOrdens(arr);
      const mapped = [];
      arr.forEach(o => {
        const regs = o.impressaos || [];
        (Array.isArray(regs) ? regs : [regs]).forEach((r, idx) => {
          if (r && typeof r === "object") mapped.push({
            id: `${o.id}-${idx}`, op: o.id, cliente: o.cliente?.nome || o.cliente || "—", produto: o.produto || "—",
            maquina: r.maquina || "—", operador: r.operador || "—",
            inicio: r.data_inicio || r.inicio || r.horaInicio || "—", fim: r.data_fim || r.fim || r.horaFim || "—",
            produzido: r.quantidade_produzida || r.produzido || r.quantidadeProduzida || 0,
            rejeitado: r.quantidade_rejeitada || r.rejeitado || r.quantidadeRejeitada || 0,
            observacoes: r.observacoes || "",
          });
        });
      });
      setRegistros(mapped);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { carregarDados(); }, [carregarDados]);
/* eslint-enable react-hooks/set-state-in-effect */

  const totalProduzido = registros.reduce((s, r) => s + Number(r.produzido), 0);
  const totalRejeitado = registros.reduce((s, r) => s + Number(r.rejeitado), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.op) {
      addToast("Seleccione uma ordem de produção", "error");
      return;
    }
    try {
      await salvarImpressao(Number(form.op), {
        maquina: form.maquina,
        operador: form.operador,
        horaInicio: form.inicio,
        horaFim: form.fim,
        quantidadeProduzida: Number(form.produzido) || 0,
        quantidadeRejeitada: Number(form.rejeitado) || 0,
        observacoes: form.observacoes,
      });
      setForm(initialForm); setModal(false);
      await carregarDados();
      addToast("Registo de impressão guardado", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar registo de impressão", "error");
    }
  };

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Impressão</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">{registros.length} registos de impressão // IMP</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setModal(true)} className="bg-primary/20 text-primary border border-primary/50 px-5 py-2 rounded font-mono flex items-center gap-2 hover:bg-primary/30 transition-all text-[11px] uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(128,213,203,0.2)] hover:shadow-[0_0_25px_rgba(128,213,203,0.4)]">
            <Icon name="add" className="text-[16px]" /> Novo Registo
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[
          { label: "Total Produzido", value: totalProduzido?.toLocaleString() ?? "0", icon: "print", iconVariant: "primary" },
          { label: "Total Rejeitado", value: totalRejeitado?.toLocaleString() ?? "0", icon: "block", iconVariant: "error" },
          { label: "Taxa de Aproveitamento", value: totalProduzido ? `${(((totalProduzido - totalRejeitado) / totalProduzido) * 100).toFixed(1)}%` : "0%", icon: "check_circle", iconVariant: "success" },
          { label: "Operacionais", value: operacionais.length, icon: "precision_manufacturing", iconVariant: "secondary" },
        ].map((kpi) => (
          <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} iconVariant={kpi.iconVariant} />
        ))}
      </section>

      <div className="space-y-3">
        {registros.map((r) => (
          <Card key={r.id} className="hover-lift">
            <CardContent className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
                <div><span className="text-[10px] text-muted-foreground block">OP</span><span className="font-semibold text-foreground">{r.op}</span></div>
                <div><span className="text-[10px] text-muted-foreground block">Operacional</span><span className="text-foreground">{r.maquina}</span></div>
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
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ordem de Produção *</label>
              <select required value={form.op} onChange={(e) => setForm({ ...form, op: e.target.value })} className={inputCls}>
                <option value="">Seleccionar OP...</option>
                {ordens.map((o) => <option key={o.id} value={o.id}>{o.id} — {o.cliente?.nome || o.cliente || ""} ({o.produto || "—"})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Operacional *</label>
              <select required value={form.maquina} onChange={(e) => setForm({ ...form, maquina: e.target.value })} className={inputCls}>
                <option value="">Seleccionar...</option>
                {operacionais.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Operador *</label>
              <input required value={form.operador} onChange={(e) => setForm({ ...form, operador: e.target.value })} className={inputCls} placeholder="Nome do operador" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hora Início *</label>
              <input required type="time" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hora Fim *</label>
              <input required type="time" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Qtd Produzida *</label>
              <NumeroInput required value={form.produzido} onChange={(e) => setForm({ ...form, produzido: e.target.value })} className={inputCls} placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Qtd Rejeitada</label>
              <NumeroInput value={form.rejeitado} onChange={(e) => setForm({ ...form, rejeitado: e.target.value })} className={inputCls} placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</label>
              <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} className={`${inputCls} resize-none`} placeholder="Notas..." />
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
