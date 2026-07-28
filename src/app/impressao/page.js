"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";

const maquinas = [
  "Heidelberg Speedmaster 52",
  "Heidelberg CD 102",
  "Kompac Hydra 66",
  "ManRoland 700",
];

const sampleRegistros = [
  { id: 1, maquina: "Heidelberg Speedmaster 52", operador: "Carlos Silva", inicio: "2026-07-27T08:00", fim: "2026-07-27T12:00", produzido: 5000, rejeitado: 23, observacoes: "Manutenção preventiva realizada antes do início." },
  { id: 2, maquina: "Heidelberg CD 102", operador: "José Santos", inicio: "2026-07-27T13:00", fim: "2026-07-27T17:30", produzido: 3200, rejeitado: 45, observacoes: "Ajuste de registo necessário na 3ª hora." },
  { id: 3, maquina: "Kompac Hydra 66", operador: "Pedro Almeida", inicio: "2026-07-27T08:30", fim: "2026-07-27T11:45", produzido: 1800, rejeitado: 12, observacoes: "" },
];

const initialForm = { maquina: "", operador: "", inicio: "", fim: "", produzido: "", rejeitado: "", observacoes: "" };

export default function ImpressaoPage() {
  const [registros, setRegistros] = useState(sampleRegistros);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [observacaoEdit, setObservacaoEdit] = useState({ id: null, texto: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    const id = Math.max(...registros.map(r => r.id), 0) + 1;
    setRegistros([{ id, ...form, produzido: Number(form.produzido), rejeitado: Number(form.rejeitado) }, ...registros]);
    setForm(initialForm);
    setModal(false);
  };

  const salvarObservacao = (id) => {
    setRegistros(registros.map(r => r.id === id ? { ...r, observacoes: observacaoEdit.texto } : r));
    setObservacaoEdit({ id: null, texto: "" });
  };

  const totalProduzido = registros.reduce((s, r) => s + r.produzido, 0);
  const totalRejeitado = registros.reduce((s, r) => s + r.rejeitado, 0);
  const taxaRejeicao = totalProduzido > 0 ? ((totalRejeitado / totalProduzido) * 100).toFixed(2) : "0.00";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />
        <div className="p-6 md:p-8 space-y-6 flex-1">
          <Breadcrumbs />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-on-surface">Controlo de Produção — Impressão</h1>
              <p className="text-xs text-on-surface-variant mt-1">{registros.length} registos de produção</p>
            </div>
            <button onClick={() => setModal(true)} className="bg-primary text-on-primary font-semibold rounded-lg px-5 py-2.5 flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm text-xs">
              <Icon name="add" className="text-lg" />
              Novo Registo
            </button>
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Produzido", value: totalProduzido.toLocaleString(), icon: "checklist", color: "text-green-600", sub: "unidades" },
              { label: "Total Rejeitado", value: totalRejeitado.toLocaleString(), icon: "block", color: "text-red-500", sub: "unidades" },
              { label: "Taxa de Rejeição", value: `${taxaRejeicao}%`, icon: "analytics", color: taxaRejeicao > 3 ? "text-red-500" : "text-green-600", sub: taxaRejeicao > 3 ? "Acima do ideal" : "Dentro do ideal" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface-container dark:bg-surface-container p-4 rounded-xl border border-outline-variant flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center ${kpi.color}`}><Icon name={kpi.icon} className="text-[20px]" /></div>
                <div><p className="text-[10px] text-on-surface-variant">{kpi.label}</p><p className="text-lg font-bold text-on-surface">{kpi.value}</p><p className="text-[9px] text-on-surface-variant">{kpi.sub}</p></div>
              </div>
            ))}
          </section>

          <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
            <div className="px-5 py-3 border-b border-outline-variant bg-surface-container-high flex items-center gap-2">
              <Icon name="view_list" className="text-lg text-primary" />
              <h2 className="text-sm font-bold text-on-surface">Registos de Produção</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs hidden md:table">
                <thead>
                  <tr className="bg-surface-container-high text-on-surface-variant">
                    <th className="text-left px-4 py-3 font-semibold">Máquina</th>
                    <th className="text-left px-4 py-3 font-semibold">Operador</th>
                    <th className="text-left px-4 py-3 font-semibold">Início</th>
                    <th className="text-left px-4 py-3 font-semibold">Fim</th>
                    <th className="text-right px-4 py-3 font-semibold">Produzido</th>
                    <th className="text-right px-4 py-3 font-semibold">Rejeitado</th>
                    <th className="text-right px-4 py-3 font-semibold">% Rej.</th>
                    <th className="text-left px-4 py-3 font-semibold">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {registros.map((r) => {
                    const pct = r.produzido > 0 ? ((r.rejeitado / r.produzido) * 100).toFixed(1) : "0.0";
                    const editando = observacaoEdit.id === r.id;
                    return (
                      <tr key={r.id} className="hover:bg-surface-container-highest transition-colors">
                        <td className="px-4 py-3 font-medium text-on-surface">{r.maquina}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{r.operador}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{new Date(r.inicio).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{new Date(r.fim).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">{r.produzido}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-500">{r.rejeitado}</td>
                        <td className="px-4 py-3 text-right font-semibold text-on-surface-variant">{pct}%</td>
                        <td className="px-4 py-3 max-w-[200px]">
                          {editando ? (
                            <div className="flex flex-col gap-1">
                              <textarea value={observacaoEdit.texto} onChange={(e) => setObservacaoEdit({ ...observacaoEdit, texto: e.target.value })} className="w-full px-2 py-1 bg-surface-container-high border border-outline-variant rounded text-[10px] outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={2} />
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => setObservacaoEdit({ id: null, texto: "" })} className="px-2 py-0.5 text-[9px] text-on-surface-variant hover:text-on-surface">Cancelar</button>
                                <button onClick={() => salvarObservacao(r.id)} className="px-2 py-0.5 text-[9px] bg-primary text-on-primary rounded hover:bg-primary-container">Guardar</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-on-surface-variant text-[10px] truncate block max-w-[140px]">{r.observacoes || "—"}</span>
                              <button onClick={() => setObservacaoEdit({ id: r.id, texto: r.observacoes || "" })} className="text-primary hover:text-primary-container flex-shrink-0" title="Editar observações (admin)">
                                <Icon name="edit_note" className="text-sm" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="md:hidden space-y-3 p-3">
                {registros.map((r) => {
                  const pct = r.produzido > 0 ? ((r.rejeitado / r.produzido) * 100).toFixed(1) : "0.0";
                  const editando = observacaoEdit.id === r.id;
                  return (
                    <div key={r.id} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/50 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-on-surface">{r.maquina}</p>
                          <p className="text-[10px] text-on-surface-variant">{r.operador}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${Number(pct) > 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                          {pct}% rej.
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div><span className="text-on-surface-variant">Início:</span> <span className="font-medium text-on-surface">{new Date(r.inicio).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div>
                        <div><span className="text-on-surface-variant">Fim:</span> <span className="font-medium text-on-surface">{new Date(r.fim).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div>
                        <div><span className="text-on-surface-variant">Produzido:</span> <span className="font-bold text-green-600">{r.produzido}</span></div>
                        <div><span className="text-on-surface-variant">Rejeitado:</span> <span className="font-bold text-red-500">{r.rejeitado}</span></div>
                      </div>
                      <div className="pt-1 border-t border-outline-variant/30">
                        {editando ? (
                          <div className="flex flex-col gap-1">
                            <textarea value={observacaoEdit.texto} onChange={(e) => setObservacaoEdit({ ...observacaoEdit, texto: e.target.value })} className="w-full px-2 py-1 bg-surface-container border border-outline-variant rounded text-[10px] outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={2} />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setObservacaoEdit({ id: null, texto: "" })} className="px-2 py-1 text-[10px] text-on-surface-variant hover:text-on-surface">Cancelar</button>
                              <button onClick={() => salvarObservacao(r.id)} className="px-2 py-1 text-[10px] bg-primary text-on-primary rounded">Guardar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-on-surface-variant text-[10px] truncate">{r.observacoes || "Sem observações"}</span>
                            <button onClick={() => setObservacaoEdit({ id: r.id, texto: r.observacoes || "" })} className="text-primary flex-shrink-0">
                              <Icon name="edit_note" className="text-sm" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <Modal open={modal} onClose={() => setModal(false)} title="Novo Registo de Impressão" icon="print" size="md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Máquina *</label>
                <select required value={form.maquina} onChange={(e) => setForm({ ...form, maquina: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Selecionar máquina</option>
                  {maquinas.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Operador *</label>
                <input required value={form.operador} onChange={(e) => setForm({ ...form, operador: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nome do operador" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Hora Início *</label>
                <input required type="datetime-local" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Hora Fim *</label>
                <input required type="datetime-local" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Quantidade Produzida *</label>
                <input required type="number" min="0" value={form.produzido} onChange={(e) => setForm({ ...form, produzido: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 5000" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Quantidade Rejeitada</label>
                <input type="number" min="0" value={form.rejeitado} onChange={(e) => setForm({ ...form, rejeitado: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 10" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Observações <span className="text-primary">(admin)</span></label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={2} placeholder="Notas do administrador..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">Guardar Registo</button>
            </div>
          </form>
        </Modal>

        <footer className="p-6 text-center border-t border-outline-variant bg-surface-container mt-auto">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>
      </main>
    </div>
  );
}