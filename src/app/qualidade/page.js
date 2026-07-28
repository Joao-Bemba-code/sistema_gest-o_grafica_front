"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";

const sampleInspecoes = [
  { id: "QC-001", op: "OP-2024-001", cliente: "João Matos", produto: "Catálogos Institucionais", data: "2026-07-27", responsavel: "Ana Costa", cor: "aprovado", corte: "aprovado", quantidade: "aprovado", acabamento: "aprovado", embalagem: "aprovado" },
  { id: "QC-002", op: "OP-2024-003", cliente: "Ana Ferreira", produto: "Flyers Promocionais", data: "2026-07-27", responsavel: "Carlos Silva", cor: "aprovado", corte: "aprovado", quantidade: "aprovado", acabamento: "aprovado", embalagem: "aprovado" },
  { id: "QC-003", op: "OP-2024-005", cliente: "Carlos Fernandes", produto: "Embalagens Personalizadas", data: "2026-07-26", responsavel: "Ana Costa", cor: "aprovado", corte: "reprovado", quantidade: "aprovado", acabamento: "aprovado", embalagem: "pendente" },
  { id: "QC-004", op: "OP-2024-002", cliente: "Pedro Neto", produto: "Revistas", data: "2026-07-25", responsavel: "Ricardo Silva", cor: "pendente", corte: "pendente", quantidade: "pendente", acabamento: "pendente", embalagem: "pendente" },
];

const campos = [
  { key: "cor", label: "Cor", icon: "palette" },
  { key: "corte", label: "Corte", icon: "content_cut" },
  { key: "quantidade", label: "Quantidade", icon: "numbers" },
  { key: "acabamento", label: "Acabamento", icon: "handyman" },
  { key: "embalagem", label: "Embalagem", icon: "inventory_2" },
];

const statusClasses = {
  aprovado: "bg-primary/10 text-primary border-primary/20",
  reprovado: "bg-error-container/10 text-error border-error-container/20",
  pendente: "bg-surface-container-highest text-on-surface-variant border-outline-variant/30",
};

const initialForm = { op: "", cliente: "", produto: "", responsavel: "", cor: "pendente", corte: "pendente", quantidade: "pendente", acabamento: "pendente", embalagem: "pendente" };

function calcularResultado(insp) {
  const valores = campos.map(c => insp[c.key]);
  if (valores.some(v => v === "reprovado")) return "reprovado";
  if (valores.every(v => v === "aprovado")) return "aprovado";
  return "pendente";
}

export default function QualidadePage() {
  const [inspecoes, setInspecoes] = useState(sampleInspecoes);
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editandoId, setEditandoId] = useState(null);

  const filtered = filtro === "todos" ? inspecoes : inspecoes.filter(i => calcularResultado(i) === filtro);
  const aprovadas = inspecoes.filter(i => calcularResultado(i) === "aprovado").length;
  const reprovadas = inspecoes.filter(i => calcularResultado(i) === "reprovado").length;
  const pendentes = inspecoes.filter(i => calcularResultado(i) === "pendente").length;

  const abrirEdicao = (insp) => {
    setForm({ op: insp.op, cliente: insp.cliente, produto: insp.produto, responsavel: insp.responsavel, cor: insp.cor, corte: insp.corte, quantidade: insp.quantidade, acabamento: insp.acabamento, embalagem: insp.embalagem });
    setEditandoId(insp.id);
    setModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataAtual = new Date().toISOString().slice(0, 10);
    if (editandoId) {
      setInspecoes(inspecoes.map(i => i.id === editandoId ? { ...i, ...form, data: dataAtual } : i));
    } else {
      const id = `QC-${String(inspecoes.length + 1).padStart(3, "0")}`;
      setInspecoes([{ id, ...form, data: dataAtual }, ...inspecoes]);
    }
    setForm(initialForm);
    setEditandoId(null);
    setModal(false);
  };

  const alterarCampo = (inspId, campoKey, valor) => {
    setInspecoes(inspecoes.map(i => i.id === inspId ? { ...i, [campoKey]: valor } : i));
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />
        <div className="p-6 md:p-8 space-y-6 flex-1">
          <Breadcrumbs />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-on-surface">Controlo de Qualidade</h1>
              <p className="text-xs text-on-surface-variant mt-1">{inspecoes.length} inspeções registadas</p>
            </div>
            <button onClick={() => { setForm(initialForm); setEditandoId(null); setModal(true); }} className="bg-primary text-on-primary font-semibold rounded-lg px-5 py-2.5 flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm text-xs">
              <Icon name="add" className="text-lg" />
              Nova Inspeção
            </button>
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Aprovadas", value: aprovadas, icon: "check_circle", color: "text-primary", bg: "bg-primary/10" },
              { label: "Reprovadas", value: reprovadas, icon: "cancel", color: "text-error", bg: "bg-error-container/10" },
              { label: "Pendentes", value: pendentes, icon: "pending", color: "text-tertiary", bg: "bg-tertiary-container/10" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface-container dark:bg-surface-container p-5 rounded-xl border border-outline-variant flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}><Icon name={kpi.icon} /></div>
                <div><p className="text-xs text-on-surface-variant">{kpi.label}</p><p className="text-xl font-bold text-on-surface">{kpi.value}</p></div>
              </div>
            ))}
          </section>

          <div className="flex gap-2 flex-wrap">
            {[
              { key: "todos", label: "Todos" },
              { key: "aprovado", label: "Aprovados", icon: "check_circle" },
              { key: "reprovado", label: "Reprovados", icon: "cancel" },
              { key: "pendente", label: "Pendentes", icon: "pending" },
            ].map((f) => (
              <button key={f.key} onClick={() => setFiltro(f.key)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${filtro === f.key ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-highest"}`}>
                {f.icon && <Icon name={f.icon} className="text-sm" />}{f.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs hidden md:table">
              <thead>
                <tr className="bg-surface-container-highest text-on-surface-variant">
                  <th className="text-left px-3 py-3 font-semibold">ID</th>
                  <th className="text-left px-3 py-3 font-semibold">Produto</th>
                  <th className="text-left px-3 py-3 font-semibold">Cliente</th>
                  <th className="text-left px-3 py-3 font-semibold">Responsável</th>
                  <th className="text-left px-3 py-3 font-semibold">Data</th>
                  {campos.map(c => <th key={c.key} className="text-center px-2 py-3 font-semibold">{c.label}</th>)}
                  <th className="text-center px-3 py-3 font-semibold">Resultado</th>
                  <th className="text-center px-3 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filtered.map((insp) => {
                  const resultado = calcularResultado(insp);
                  const resConfig = resultado === "aprovado" ? { color: "text-primary", bg: "bg-primary/10", icon: "check_circle" } : resultado === "reprovado" ? { color: "text-error", bg: "bg-error-container/10", icon: "cancel" } : { color: "text-tertiary", bg: "bg-tertiary-container/10", icon: "pending" };
                  return (
                    <tr key={insp.id} className="hover:bg-surface-container-highest transition-colors">
                      <td className="px-3 py-3 font-bold text-on-surface whitespace-nowrap">{insp.id}</td>
                      <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">{insp.produto}</td>
                      <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">{insp.cliente}</td>
                      <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">{insp.responsavel}</td>
                      <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">{new Date(insp.data).toLocaleDateString("pt-PT")}</td>
                      {campos.map(c => {
                        const val = insp[c.key];
                        return (
                          <td key={c.key} className="px-2 py-3 text-center">
                            <button
                              onClick={() => {
                                const next = val === "aprovado" ? "reprovado" : val === "reprovado" ? "pendente" : "aprovado";
                                alterarCampo(insp.id, c.key, next);
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer transition-all ${statusClasses[val]}`}
                              title={`Clique para alterar (${val === "aprovado" ? "aprovado → reprovado" : val === "reprovado" ? "reprovado → pendente" : "pendente → aprovado"})`}
                            >
                              <Icon name={val === "aprovado" ? "check_circle" : val === "reprovado" ? "cancel" : "radio_button_unchecked"} className="text-xs" />
                              {val === "aprovado" ? "OK" : val === "reprovado" ? "NOK" : "—"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${resConfig.bg} ${resConfig.color}`}>
                          <Icon name={resConfig.icon} className="text-xs" />
                          {resultado === "aprovado" ? "Aprovado" : resultado === "reprovado" ? "Reprovado" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => abrirEdicao(insp)} className="text-primary transition-colors" title="Editar">
                          <Icon name="edit" className="text-lg" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="md:hidden space-y-3 p-3">
              {filtered.map((insp) => {
                const resultado = calcularResultado(insp);
                const resConfig = resultado === "aprovado" ? { color: "text-primary", bg: "bg-primary/10", icon: "check_circle" } : resultado === "reprovado" ? { color: "text-error", bg: "bg-error-container/10", icon: "cancel" } : { color: "text-tertiary", bg: "bg-tertiary-container/10", icon: "pending" };
                return (
                  <div key={insp.id} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-on-surface">{insp.id} — {insp.produto}</p>
                        <p className="text-[10px] text-on-surface-variant">{insp.cliente} · {insp.responsavel}</p>
                        <p className="text-[10px] text-on-surface-variant">{new Date(insp.data).toLocaleDateString("pt-PT")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${resConfig.bg} ${resConfig.color}`}>
                          <Icon name={resConfig.icon} className="text-xs" />
                          {resultado === "aprovado" ? "OK" : resultado === "reprovado" ? "NOK" : "Pendente"}
                        </span>
                        <button onClick={() => abrirEdicao(insp)} className="text-primary">
                          <Icon name="edit" className="text-base" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {campos.map(c => {
                        const val = insp[c.key];
                        return (
                          <button key={c.key} onClick={() => alterarCampo(insp.id, c.key, val === "aprovado" ? "reprovado" : val === "reprovado" ? "pendente" : "aprovado")}
                            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border text-center cursor-pointer transition-all ${statusClasses[val]}`}>
                            <Icon name={c.icon} className="text-xs" />
                            <span className="text-[8px] font-bold leading-tight">{c.label}</span>
                            <span className="text-[8px] font-bold">{val === "aprovado" ? "OK" : val === "reprovado" ? "NOK" : "—"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">
              <Icon name="verified" className="text-4xl block mb-2" />
              <p className="text-sm font-medium">Nenhuma inspeção encontrada</p>
            </div>
          )}
        </div>

        <Modal open={modal} onClose={() => { setModal(false); setEditandoId(null); setForm(initialForm); }} title={editandoId ? "Editar Inspeção" : "Nova Inspeção"} icon="verified" size="md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Ordem de Produção *</label>
                <input required value={form.op} onChange={(e) => setForm({ ...form, op: e.target.value })} className="px-3 py-2 bg-surface-container-highest border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: OP-2024-001" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Responsável *</label>
                <input required value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className="px-3 py-2 bg-surface-container-highest border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nome do inspetor" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Produto *</label>
                <input required value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} className="px-3 py-2 bg-surface-container-highest border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Flyers Promocionais" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Cliente *</label>
                <input required value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} className="px-3 py-2 bg-surface-container-highest border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nome do cliente" />
              </div>
            </div>

            <div className="border-t border-outline-variant pt-4">
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Verificações</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {campos.map(c => (
                  <div key={c.key} className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${form[c.key] === "aprovado" ? "bg-primary/10 border-primary/20" : form[c.key] === "reprovado" ? "bg-error-container/10 border-error-container/20" : "bg-surface-container-highest border-outline-variant"}`}
                    onClick={() => {
                      const next = form[c.key] === "aprovado" ? "reprovado" : form[c.key] === "reprovado" ? "pendente" : "aprovado";
                      setForm({ ...form, [c.key]: next });
                    }}
                  >
                    <Icon name={c.icon} className="text-lg block mb-1 text-on-surface-variant" />
                    <p className="text-[10px] font-bold text-on-surface-variant">{c.label}</p>
                    <span className={`text-[10px] font-bold mt-1 block ${form[c.key] === "aprovado" ? "text-primary" : form[c.key] === "reprovado" ? "text-error" : "text-on-surface-variant"}`}>
                      {form[c.key] === "aprovado" ? "Aprovado" : form[c.key] === "reprovado" ? "Reprovado" : "Pendente"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-3 rounded-lg text-center text-xs font-bold ${form.cor !== "pendente" || form.corte !== "pendente" ? form.cor === "reprovado" || form.corte === "reprovado" || form.quantidade === "reprovado" || form.acabamento === "reprovado" || form.embalagem === "reprovado" ? "bg-error-container/10 text-error" : form.cor === "aprovado" && form.corte === "aprovado" && form.quantidade === "aprovado" && form.acabamento === "aprovado" && form.embalagem === "aprovado" ? "bg-primary/10 text-primary" : "bg-tertiary-container/10 text-tertiary" : "bg-surface-container-highest text-on-surface-variant"}`}>
              Resultado: {form.cor === "reprovado" || form.corte === "reprovado" || form.quantidade === "reprovado" || form.acabamento === "reprovado" || form.embalagem === "reprovado" ? "Reprovado" : form.cor === "aprovado" && form.corte === "aprovado" && form.quantidade === "aprovado" && form.acabamento === "aprovado" && form.embalagem === "aprovado" ? "Aprovado" : "Pendente (preencha todas as verificações)"}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setModal(false); setEditandoId(null); setForm(initialForm); }} className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">{editandoId ? "Guardar Alterações" : "Criar Inspeção"}</button>
            </div>
          </form>
        </Modal>

        <footer className="p-6 text-center border-t border-outline-variant bg-surface-container-highest mt-auto">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>
      </main>
    </div>
  );
}