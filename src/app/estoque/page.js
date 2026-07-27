"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";

const categorias = ["Papel", "Tintas", "Lonas", "Vinil", "Cola", "Chapas"];
const categoriaIcones = {
  Papel: "description",
  Tintas: "format_color_fill",
  Lonas: "flag",
  Vinil: "sticker",
  Cola: "inventory_2",
  Chapas: "view_column",
};

const sampleItems = [
  { id: 1, nome: "Papel Couché 150g", categoria: "Papel", unidade: "resmas", saldo: 5, estoqueMinimo: 20 },
  { id: 2, nome: "Papel Offset 90g", categoria: "Papel", unidade: "resmas", saldo: 42, estoqueMinimo: 15 },
  { id: 12, nome: "Papel Couché 115g", categoria: "Papel", unidade: "resmas", saldo: 35, estoqueMinimo: 15 },
  { id: 3, nome: "Tinta Cyan", categoria: "Tintas", unidade: "kg", saldo: 8, estoqueMinimo: 5 },
  { id: 4, nome: "Tinta Magenta", categoria: "Tintas", unidade: "kg", saldo: 7, estoqueMinimo: 5 },
  { id: 5, nome: "Tinta Yellow", categoria: "Tintas", unidade: "kg", saldo: 9, estoqueMinimo: 5 },
  { id: 6, nome: "Tinta Black", categoria: "Tintas", unidade: "kg", saldo: 6, estoqueMinimo: 5 },
  { id: 7, nome: "Lona Front Light 440g", categoria: "Lonas", unidade: "rolos", saldo: 12, estoqueMinimo: 5 },
  { id: 8, nome: "Vinil Adesivo Brilho", categoria: "Vinil", unidade: "rolos", saldo: 3, estoqueMinimo: 4 },
  { id: 9, nome: "Vinil Adesivo Fosco", categoria: "Vinil", unidade: "rolos", saldo: 6, estoqueMinimo: 4 },
  { id: 10, nome: "Cola para Encadernação", categoria: "Cola", unidade: "litros", saldo: 2, estoqueMinimo: 3 },
  { id: 11, nome: "Chapas Offset", categoria: "Chapas", unidade: "un", saldo: 150, estoqueMinimo: 50 },
];

const initialItem = { nome: "", categoria: "Papel", unidade: "", estoqueMinimo: "" };

export default function EstoquePage() {
  const [items, setItems] = useState(sampleItems);
  const [movModal, setMovModal] = useState({ open: false, item: null, tipo: "entrada" });
  const [movQtd, setMovQtd] = useState("");
  const [itemModal, setItemModal] = useState(false);
  const [form, setForm] = useState(initialItem);

  const alertas = items.filter((i) => i.saldo <= i.estoqueMinimo);

  const registrarMov = () => {
    const qtd = Number(movQtd);
    if (!qtd || qtd <= 0) return;
    setItems(items.map(i =>
      i.id === movModal.item.id
        ? { ...i, saldo: movModal.tipo === "entrada" ? i.saldo + qtd : Math.max(0, i.saldo - qtd) }
        : i
    ));
    setMovQtd("");
    setMovModal({ open: false, item: null, tipo: "entrada" });
  };

  const handleNewItem = (e) => {
    e.preventDefault();
    const id = Math.max(...items.map(i => i.id)) + 1;
    setItems([{ id, ...form, saldo: 0, estoqueMinimo: Number(form.estoqueMinimo) }, ...items]);
    setForm(initialItem);
    setItemModal(false);
  };

  const totalGeral = items.reduce((s, i) => s + i.saldo, 0);
  const emAlerta = items.filter(i => i.saldo <= i.estoqueMinimo).length;
  const ok = items.filter(i => i.saldo > i.estoqueMinimo).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />
        <div className="p-6 md:p-8 space-y-6 flex-1">
          <Breadcrumbs />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-on-surface">Estoque</h1>
              <p className="text-xs text-on-surface-variant mt-1">{items.length} materiais em {categorias.length} categorias</p>
            </div>
            <button onClick={() => setItemModal(true)} className="bg-primary text-on-primary font-semibold rounded-lg px-5 py-2.5 flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm text-xs">
              <Icon name="add" className="text-lg" />
              Novo Material
            </button>
          </div>

          {alertas.length > 0 && (
            <div className="bg-error-container/10 border border-error/30 rounded-xl p-4 flex items-start gap-3">
              <Icon name="warning" className="text-error mt-0.5" />
              <div>
                <p className="text-sm font-bold text-error">Materiais com Estoque Baixo</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {alertas.map((a) => (
                    <span key={a.id} className="px-2.5 py-1 bg-error-container/10 text-error text-[10px] font-bold rounded-full">{a.nome}: {a.saldo}/{a.estoqueMinimo} {a.unidade}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Itens", value: items.length, icon: "inventory_2", color: "text-primary" },
              { label: "Qtd em Stock", value: totalGeral, icon: "checklist", color: "text-on-surface" },
              { label: "Estável", value: ok, icon: "check_circle", color: "text-primary" },
              { label: "Alerta", value: emAlerta, icon: "warning", color: "text-error" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface-container dark:bg-surface-container p-4 rounded-xl border border-outline-variant flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center ${kpi.color}`}><Icon name={kpi.icon} className="text-[20px]" /></div>
                <div><p className="text-[10px] text-on-surface-variant">{kpi.label}</p><p className="text-lg font-bold text-on-surface">{kpi.value}</p></div>
              </div>
            ))}
          </section>

          {categorias.map((cat) => {
            const catItems = items.filter(i => i.categoria === cat);
            if (catItems.length === 0) return null;
            return (
              <section key={cat} className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
                <div className="px-5 py-3 border-b border-outline-variant bg-surface-container/50 flex items-center gap-2">
                  <Icon name={categoriaIcones[cat]} className="text-lg text-primary" />
                  <h2 className="text-sm font-bold text-on-surface">{cat}</h2>
                  <span className="text-[10px] text-on-surface-variant ml-auto">{catItems.length} materiais</span>
                </div>
                <div className="divide-y divide-outline-variant/30">
                  {catItems.map((item) => {
                    const isLow = item.saldo <= item.estoqueMinimo;
                    const pct = item.estoqueMinimo > 0 ? Math.min(100, Math.round((item.saldo / item.estoqueMinimo) * 100)) : 100;
                    return (
                      <div key={item.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-surface-container-high/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">{item.nome}</p>
                          <p className="text-[10px] text-on-surface-variant">{item.unidade}</p>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="text-center min-w-[60px]">
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Saldo</p>
                            <p className={`text-base font-bold ${isLow ? "text-error" : "text-primary"}`}>{item.saldo}</p>
                          </div>

                          <div className="text-center min-w-[60px]">
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Mínimo</p>
                            <p className="text-base font-bold text-on-surface-variant">{item.estoqueMinimo}</p>
                          </div>

                          <div className="hidden sm:block w-20">
                            <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct <= 50 ? "bg-primary" : pct <= 80 ? "bg-tertiary" : "bg-error"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>

                          <div className="flex gap-1">
                            <button
                              onClick={() => { setMovModal({ open: true, item, tipo: "entrada" }); setMovQtd(""); }}
                              className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 text-[10px] font-bold"
                              title="Registrar entrada"
                            >
                              <Icon name="add" className="text-sm" />
                              Entrada
                            </button>
                            <button
                              onClick={() => { setMovModal({ open: true, item, tipo: "saida" }); setMovQtd(""); }}
                              className="px-2.5 py-1.5 rounded-lg bg-error-container/10 text-error hover:bg-error-container/10 transition-colors flex items-center gap-1 text-[10px] font-bold"
                              title="Registrar saída"
                            >
                              <Icon name="remove" className="text-sm" />
                              Saída
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <Modal open={movModal.open} onClose={() => setMovModal({ open: false, item: null, tipo: "entrada" })} title={`Registrar ${movModal.tipo === "entrada" ? "Entrada" : "Saída"}`} icon={movModal.tipo === "entrada" ? "add" : "remove"} size="sm">
          <div className="space-y-4">
            <div className="bg-surface-container-high rounded-lg p-3">
              <p className="text-xs text-on-surface-variant">Material</p>
              <p className="text-sm font-bold text-on-surface">{movModal.item?.nome}</p>
              <p className="text-[10px] text-on-surface-variant">Saldo atual: <strong>{movModal.item?.saldo}</strong> {movModal.item?.unidade}</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Quantidade</label>
              <input type="number" min="1" value={movQtd} onChange={(e) => setMovQtd(e.target.value)} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 5" autoFocus />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setMovModal({ open: false, item: null, tipo: "entrada" })} className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Cancelar</button>
              <button onClick={registrarMov} className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">
                {movModal.tipo === "entrada" ? "Dar Entrada" : "Registar Saída"}
              </button>
            </div>
          </div>
        </Modal>

        <Modal open={itemModal} onClose={() => setItemModal(false)} title="Novo Material" icon="add_box" size="md">
          <form onSubmit={handleNewItem} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Nome do Material *</label>
                <input required name="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Papel Couché 150g" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Categoria *</label>
                <select required name="categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30">
                  {categorias.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Unidade *</label>
                <input required name="unidade" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: resmas, kg" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Estoque Mínimo *</label>
                <input required type="number" name="estoqueMinimo" value={form.estoqueMinimo} onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 10" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setItemModal(false)} className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">Guardar</button>
            </div>
          </form>
        </Modal>

        <footer className="p-6 text-center border-t border-outline-variant bg-surface-container-highest/50">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>
      </main>
    </div>
  );
}