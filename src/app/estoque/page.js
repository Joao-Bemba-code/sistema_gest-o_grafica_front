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

const fornecedores = ["Papelaria Angola", "Tintas Premium Lda", "Lonas & Vinis SA", "Colas Industriais", "Distribuidora Gráfica"];

const sampleItems = [
  { id: 1, codigo: "MAT-001", nome: "Papel Couché 150g", nomeTecnico: "C150-BO", categoria: "Papel", fornecedor: "Papelaria Angola", descricaoDetalhada: "Papel couché brilho 150g, formato A3, ideal para impressões de alta qualidade", especificidade: "Superfície brilhante, gramatura 150g/m²", condicaoArmazenagem: "Local seco e ventilado, temperatura ambiente", unidade: "resmas", saldo: 5, estoqueMaximo: 100, estoqueMinimo: 20, pontoReposicao: 30, precoCompra: 4500, precoVenda: 6500, custo: 4500, margem: 44 },
  { id: 2, codigo: "MAT-002", nome: "Papel Offset 90g", nomeTecnico: "OFF90-BO", categoria: "Papel", fornecedor: "Papelaria Angola", descricaoDetalhada: "Papel offset branco 90g, formato A4, para impressão convencional", especificidade: "Gramatura 90g/m², opaco", condicaoArmazenagem: "Evitar humidade, armazenar em paletes", unidade: "resmas", saldo: 42, estoqueMaximo: 200, estoqueMinimo: 15, pontoReposicao: 25, precoCompra: 2800, precoVenda: 4200, custo: 2800, margem: 50 },
  { id: 12, codigo: "MAT-003", nome: "Papel Couché 115g", nomeTecnico: "C115-BO", categoria: "Papel", fornecedor: "Papelaria Angola", descricaoDetalhada: "Papel couché fosco 115g, formato A3", especificidade: "Superínce fosca, gramatura 115g/m²", condicaoArmazenagem: "Local seco, evitar exposição solar", unidade: "resmas", saldo: 35, estoqueMaximo: 150, estoqueMinimo: 15, pontoReposicao: 20, precoCompra: 3800, precoVenda: 5500, custo: 3800, margem: 45 },
  { id: 3, codigo: "MAT-004", nome: "Tinta Cyan", nomeTecnico: "INK-CY-1K", categoria: "Tintas", fornecedor: "Tintas Premium Lda", descricaoDetalhada: "Tinta cyan para impressão offset, frasco de 1kg", especificidade: "Compatível com máquinas offset, secagem rápida", condicaoArmazenagem: "Armazenar em local fresco, longe de fontes de calor", unidade: "kg", saldo: 8, estoqueMaximo: 50, estoqueMinimo: 5, pontoReposicao: 10, precoCompra: 12000, precoVenda: 18000, custo: 12000, margem: 50 },
  { id: 4, codigo: "MAT-005", nome: "Tinta Magenta", nomeTecnico: "INK-MG-1K", categoria: "Tintas", fornecedor: "Tintas Premium Lda", descricaoDetalhada: "Tinta magenta para impressão offset, frasco de 1kg", especificidade: "Compatível com máquinas offset, secagem rápida", condicaoArmazenagem: "Armazenar em local fresco, longe de fontes de calor", unidade: "kg", saldo: 7, estoqueMaximo: 50, estoqueMinimo: 5, pontoReposicao: 10, precoCompra: 12000, precoVenda: 18000, custo: 12000, margem: 50 },
  { id: 5, codigo: "MAT-006", nome: "Tinta Yellow", nomeTecnico: "INK-YL-1K", categoria: "Tintas", fornecedor: "Tintas Premium Lda", descricaoDetalhada: "Tinta amarela para impressão offset, frasco de 1kg", especificidade: "Compatível com máquinas offset, secagem rápida", condicaoArmazenagem: "Armazenar em local fresco, longe de fontes de calor", unidade: "kg", saldo: 9, estoqueMaximo: 50, estoqueMinimo: 5, pontoReposicao: 10, precoCompra: 12000, precoVenda: 18000, custo: 12000, margem: 50 },
  { id: 6, codigo: "MAT-007", nome: "Tinta Black", nomeTecnico: "INK-BK-1K", categoria: "Tintas", fornecedor: "Tintas Premium Lda", descricaoDetalhada: "Tinta preta para impressão offset, frasco de 1kg", especificidade: "Compatível com máquinas offset, secagem rápida", condicaoArmazenagem: "Armazenar em local fresco, longe de fontes de calor", unidade: "kg", saldo: 6, estoqueMaximo: 50, estoqueMinimo: 5, pontoReposicao: 10, precoCompra: 12000, precoVenda: 18000, custo: 12000, margem: 50 },
  { id: 7, codigo: "MAT-008", nome: "Lona Front Light 440g", nomeTecnico: "LFL-440-R", categoria: "Lonas", fornecedor: "Lonas & Vinis SA", descricaoDetalhada: "Lona front light 440g para banners e outdoors, rolo de 50m", especificidade: "Resistente a UV e intempéries, impressão digital", condicaoArmazenagem: "Armazenar em local seco, evitar amassamentos", unidade: "rolos", saldo: 12, estoqueMaximo: 30, estoqueMinimo: 5, pontoReposicao: 8, precoCompra: 35000, precoVenda: 52000, custo: 35000, margem: 49 },
  { id: 8, codigo: "MAT-009", nome: "Vinil Adesivo Brilho", nomeTecnico: "VA-BR-R", categoria: "Vinil", fornecedor: "Lonas & Vinis SA", descricaoDetalhada: "Vinil adesivo brilho para adesivos e displays", especificidade: "Acabamento brilho, face adesiva acrílica", condicaoArmazenagem: "Armazenar na horizontal, temperatura 15-25°C", unidade: "rolos", saldo: 3, estoqueMaximo: 20, estoqueMinimo: 4, pontoReposicao: 6, precoCompra: 18000, precoVenda: 27000, custo: 18000, margem: 50 },
  { id: 9, codigo: "MAT-010", nome: "Vinil Adesivo Fosco", nomeTecnico: "VA-FC-R", categoria: "Vinil", fornecedor: "Lonas & Vinis SA", descricaoDetalhada: "Vinil adesivo fosco para adesivos e displays", especificidade: "Acabamento fosco, face adesiva acrílica", condicaoArmazenagem: "Armazenar na horizontal, temperatura 15-25°C", unidade: "rolos", saldo: 6, estoqueMaximo: 20, estoqueMinimo: 4, pontoReposicao: 6, precoCompra: 18000, precoVenda: 27000, custo: 18000, margem: 50 },
  { id: 10, codigo: "MAT-011", nome: "Cola para Encadernação", nomeTecnico: "COL-ENC-L", categoria: "Cola", fornecedor: "Colas Industriais", descricaoDetalhada: "Cola para encadernação de alta adesão, frasco de 5L", especificidade: "Secagem rápida, resistente a flexão", condicaoArmazenagem: "Armazenar em local ventilado, evitar congelamento", unidade: "litros", saldo: 2, estoqueMaximo: 30, estoqueMinimo: 3, pontoReposicao: 5, precoCompra: 8000, precoVenda: 12000, custo: 8000, margem: 50 },
  { id: 11, codigo: "MAT-012", nome: "Chapas Offset", nomeTecnico: "CHP-OF-U", categoria: "Chapas", fornecedor: "Distribuidora Gráfica", descricaoDetalhada: "Chapas offset para impressão, formato standard", especificidade: "Liga de alumínio, sensível à luz", condicaoArmazenagem: "Armazenar em local escuro e seco", unidade: "un", saldo: 150, estoqueMaximo: 500, estoqueMinimo: 50, pontoReposicao: 75, precoCompra: 3500, precoVenda: 5500, custo: 3500, margem: 57 },
];

const initialItem = { codigo: "", categoria: "Papel", fornecedor: "", nomeComercial: "", nomeTecnico: "", descricaoDetalhada: "", especificidade: "", condicaoArmazenagem: "", unidade: "", estoqueMaximo: "", estoqueMinimo: "", pontoReposicao: "", precoCompra: "", precoVenda: "", custo: "", margem: "" };

export default function EstoquePage() {
  const [items, setItems] = useState(sampleItems);
  const [movModal, setMovModal] = useState({ open: false, item: null, tipo: "entrada" });
  const [movQtd, setMovQtd] = useState("");
  const [itemModal, setItemModal] = useState(false);
  const [form, setForm] = useState(initialItem);

  const alertas = items.filter((i) => i.saldo <= i.pontoReposicao);

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
    setItems([{ id, nome: form.nomeComercial, ...form, saldo: 0, estoqueMaximo: Number(form.estoqueMaximo), estoqueMinimo: Number(form.estoqueMinimo), pontoReposicao: Number(form.pontoReposicao) }, ...items]);
    setForm(initialItem);
    setItemModal(false);
  };

  const totalGeral = items.reduce((s, i) => s + i.saldo, 0);
  const emAlerta = items.filter(i => i.saldo <= i.pontoReposicao).length;
  const ok = items.filter(i => i.saldo > i.pontoReposicao).length;

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
                      <span key={a.id} className="px-2.5 py-1 bg-error-container/10 text-error text-[10px] font-bold rounded-full">{a.nome}: {a.saldo}/{a.pontoReposicao} {a.unidade}</span>
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
                    const pct = item.estoqueMaximo > 0 ? Math.min(100, Math.round((item.saldo / item.estoqueMaximo) * 100)) : 100;
                    return (
                      <div key={item.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-surface-container-high/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">{item.nome}</p>
                          <p className="text-[10px] text-on-surface-variant">{item.codigo} — {item.nomeTecnico}</p>
                          <p className="text-[10px] text-on-surface-variant">{item.fornecedor} • {item.unidade}</p>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="text-center min-w-[45px]">
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Máx</p>
                            <p className="text-sm font-bold text-on-surface">{item.estoqueMaximo}</p>
                          </div>
                          <div className="text-center min-w-[45px]">
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Mín</p>
                            <p className="text-sm font-bold text-on-surface-variant">{item.estoqueMinimo}</p>
                          </div>
                          <div className="text-center min-w-[50px]">
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Reposição</p>
                            <p className="text-sm font-bold text-tertiary">{item.pontoReposicao}</p>
                          </div>
                          <div className="text-center min-w-[55px]">
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Saldo</p>
                            <p className={`text-base font-bold ${isLow ? "text-error" : "text-primary"}`}>{item.saldo}</p>
                          </div>

                          <div className="text-center min-w-[60px] hidden sm:block">
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Preço Venda</p>
                            <p className="text-sm font-bold text-primary">Kz {item.precoVenda?.toLocaleString("pt-AO")}</p>
                          </div>

                          <div className="text-center min-w-[45px] hidden sm:block">
                            <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Margem</p>
                            <p className="text-sm font-bold text-tertiary">{item.margem}%</p>
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

        <Modal open={itemModal} onClose={() => setItemModal(false)} title="Novo Material" icon="add_box" size="lg">
          <form onSubmit={handleNewItem} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Código *</label>
                <input required name="codigo" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: MAT-013" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Categoria *</label>
                <select required name="categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30">
                  {categorias.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Fornecedor *</label>
                <select required name="fornecedor" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="" disabled>Selecionar fornecedor</option>
                  {fornecedores.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Nome Comercial *</label>
                <input required name="nomeComercial" value={form.nomeComercial} onChange={(e) => setForm({ ...form, nomeComercial: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Papel Couché 150g" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Nome Técnico *</label>
                <input required name="nomeTecnico" value={form.nomeTecnico} onChange={(e) => setForm({ ...form, nomeTecnico: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: C150-BO" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Unidade *</label>
                <input required name="unidade" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: resmas, kg" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Descrição Detalhada *</label>
                <textarea required name="descricaoDetalhada" value={form.descricaoDetalhada} onChange={(e) => setForm({ ...form, descricaoDetalhada: e.target.value })} rows={2} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Descrição completa do material..." />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Especificidade *</label>
                <textarea required name="especificidade" value={form.especificidade} onChange={(e) => setForm({ ...form, especificidade: e.target.value })} rows={2} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Características técnicas específicas..." />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Condição de Armazenagem *</label>
                <textarea required name="condicaoArmazenagem" value={form.condicaoArmazenagem} onChange={(e) => setForm({ ...form, condicaoArmazenagem: e.target.value })} rows={2} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Condições necessárias para armazenamento..." />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Estoque Máximo *</label>
                <input required type="number" name="estoqueMaximo" value={form.estoqueMaximo} onChange={(e) => setForm({ ...form, estoqueMaximo: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 100" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Estoque Mínimo *</label>
                <input required type="number" name="estoqueMinimo" value={form.estoqueMinimo} onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 10" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Ponto de Reposição *</label>
                <input required type="number" name="pontoReposicao" value={form.pontoReposicao} onChange={(e) => setForm({ ...form, pontoReposicao: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 20" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Preço de Compra (Kz) *</label>
                <input required type="number" name="precoCompra" value={form.precoCompra} onChange={(e) => setForm({ ...form, precoCompra: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 4500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Preço de Venda (Kz) *</label>
                <input required type="number" name="precoVenda" value={form.precoVenda} onChange={(e) => setForm({ ...form, precoVenda: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 6500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Custo (Kz) *</label>
                <input required type="number" name="custo" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 4500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Margem (%) *</label>
                <input required type="number" name="margem" value={form.margem} onChange={(e) => setForm({ ...form, margem: e.target.value })} className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 44" />
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