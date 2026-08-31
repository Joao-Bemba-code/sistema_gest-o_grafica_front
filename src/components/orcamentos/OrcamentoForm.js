"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import { inputCls, especificacoesObjeto, normalizarFamilia, dimensaoPadrao, dimensoesFolhaMaterial, dimensoesFormatoFinal, encaixeGuilhotina, calcCustoParcialFolha } from "@/lib/estoque";

export const formatosSugeridos = ["A3", "A4", "A5", "A6", "A7", "A8", "A9", "B4", "B5", "66x96", "70x100"];

const tabs = [
  { key: "cliente", label: "Dados do Cliente", icon: "person" },
  { key: "servicos", label: "Descrição dos Serviços", icon: "list" },
  { key: "valores", label: "Valores e Condições", icon: "payments" },
];

export const blankMaterial = { material_id: "", descricao: "", unidade: "un", quantidade: "", preco_venda: 0, custo_total: 0, mover_estoque: true, usar_parcial: false, formato_final: "", largura_final: "", altura_final: "", pecas_por_folha: 1, preco_folha: 0 };
export const blankItem = { descricao: "", quantidade: "", materiais: [{ ...blankMaterial }] };
export const blankServico = { servico_id: "", descricao: "", mob: 1, prazoExecucao: 1, valorHora: 0, duracaoHoras: 8, total: 0 };

export const blankForm = {
  cliente_id: "",
  cliente: "", empresa: "", nif: "", telefone: "", email: "",
  itens: [{ ...blankItem, materiais: [{ ...blankMaterial }] }],
  servicos: [{ ...blankServico }],
  iva: "", desconto: "", prazoExecucao: "", condicoesPagamento: "100% antecipado", observacoes: "",
};

export function precoUnitMaterial(m) {
  return Number(m.preco_venda) || 0;
}

export function custoParcialDoMaterial(m) {
  if (!m.usar_parcial || !ehFolhaMaterial(m)) return null;
  return calcCustoParcialFolha(m, m.formato_final, m.largura_final, m.altura_final);
}

export function custoTotalMaterial(m) {
  if (m.usar_parcial) {
    const calc = calcCustoParcialFolha(m, m.formato_final, m.largura_final, m.altura_final);
    if (calc && calc.pecas_por_folha > 1) {
      return (Number(m.quantidade) || 0) * (calc.preco_peca || 0);
    }
  }
  return (Number(m.quantidade) || 0) * (Number(m.preco_venda) || 0);
}

export function custoUnitItem(it) {
  return (it.materiais || []).reduce((s, m) => s + custoTotalMaterial(m), 0);
}

export function recalcularItem(it) {
  const custoTotal = custoUnitItem(it);
  const valorUnitario = Number(custoTotal.toFixed(2));
  return { valorUnitario, total: Number(custoTotal.toFixed(2)) };
}

export function recalcularServico(sv) {
  const mob = Number(sv.mob) || 1;
  const prazo = Number(sv.prazoExecucao) || 1;
  const duracaoHoras = prazo * 8;
  const valorHora = Number(sv.valorHora) || 0;
  const total = mob * duracaoHoras * valorHora;
  return { duracaoHoras, total: Number(total.toFixed(2)) };
}

const CONDICOES = ["100% antecipado", "50% de sinal + 50% na entrega", "Outro"];

function ehPapel(m) {
  return !!m && normalizarFamilia(m.categoria?.familia) === "papeis";
}

function ehFolhaMaterial(m) {
  if (!m) return false;
  const unidade = String(m.unidade || "").toLowerCase();
  const tipoEstoque = String(m.tipo_estoque || "").toLowerCase();
  if (tipoEstoque === "folha" || unidade === "folha" || unidade === "resma") return true;
  return !!dimensionaveisFolha(m);
}

function ehMaterialImpressao(m) {
  if (!m) return false;
  const nome = String(m.nome || m.nome_tecnico || m.descricao || "").toLowerCase();
  if (nome.includes("toner") || nome.includes("tinta")) return true;
  const unidade = String(m.unidade || "").toLowerCase();
  return unidade === "g" || unidade === "kg";
}

function folhasDeMaterial(m) {
  if (!m) return 0;
  const qtd = Number(m.quantidade) || 0;
  const unidade = String(m.unidade || "").toLowerCase();
  const tipoEstoque = String(m.tipo_estoque || "").toLowerCase();
  if (unidade === "resma") return qtd * 500;
  if (unidade === "folha" || tipoEstoque === "folha") return qtd;
  return 0;
}

export function gramasTonerParaFolhas(folhas) {
  const n = Number(folhas) || 0;
  if (n <= 0) return 0;
  return Number((n / 25).toFixed(2));
}

function dimensionaveisFolha(m) {
  const dims = dimensoesFolhaMaterial(m);
  return dims && dims.largura > 0 && dims.altura > 0 ? dims : null;
}

function dimensionaveld(m) {
  return !!dimensionaveisFolha(m);
}

function dimensoesFolha(m) {
  const esp = especificacoesObjeto(m?.especificacoes);
  const dims = dimensaoPadrao(
    m?.formato,
    Number(m?.largura) || Number(esp.largura) || 0,
    Number(m?.altura) || Number(esp.altura) || 0
  );
  if (dims) return `${dims.largura}×${dims.altura} mm`;
  return "";
}

export function resumoFolha(m) {
  if (!m) return "";
  const partes = [];
  if (m.formato) partes.push(String(m.formato).toUpperCase());
  const dims = dimensoesFolha(m);
  if (dims) partes.push(dims);
  const gram = Number(m.gramagem) || 0;
  if (gram > 0) partes.push(`${gram} g/m²`);
  return partes.join(" · ");
}

function Campo({ label, children, obrigatorio, full }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="cyber-label">
        {label} {obrigatorio && <span className="text-destructive" aria-hidden="true">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function OrcamentoForm({ formId = "form-orcamento", form, setField, setForm, onSubmit, onClienteSelect, clientes = [], materiais = [], servicosCatalogo = [] }) {
  const [tab, setTab] = useState("cliente");
  const id = (sufixo) => `${formId}-${sufixo}`;

  const addItem = () => setForm((p) => ({ ...p, itens: [...p.itens, { ...blankItem, materiais: [{ ...blankMaterial }] }] }));
  const removeItem = (idx) => setForm((p) => ({ ...p, itens: p.itens.filter((_, i) => i !== idx) }));

  const setItem = (idx, key, val) => {
    setForm((p) => {
      const itens = [...p.itens];
      itens[idx] = { ...itens[idx], [key]: val };
      if (key === "quantidade") {
        const calc = recalcularItem(itens[idx]);
        itens[idx].valorUnitario = calc.valorUnitario;
        itens[idx].total = calc.total;
      }
      return { ...p, itens };
    });
  };

  const setItemMaterial = (idx, mi, key, val) => {
    setForm((p) => {
      const itens = [...p.itens];
      const mat = [...(itens[idx].materiais || [])];
      mat[mi] = { ...mat[mi], [key]: val };
      if (key === "material_id") {
        const matEstoque = materiais.find((m) => String(m.id) === String(val));
        if (matEstoque) {
          const dims = dimensoesFolhaMaterial(matEstoque);
          mat[mi].descricao = matEstoque.nome || matEstoque.nome_tecnico || "";
          mat[mi].unidade = matEstoque.unidade || "un";
          mat[mi].tipo_estoque = matEstoque.tipo_estoque || "";
          mat[mi].formato = matEstoque.formato || "";
          mat[mi].largura_mm = dims?.largura ?? (matEstoque.largura || 0);
          mat[mi].altura_mm = dims?.altura ?? (matEstoque.altura || 0);
          mat[mi].especificacoes = matEstoque.especificacoes || {};
          mat[mi].categoria = matEstoque.categoria || null;
          mat[mi].preco_venda = Number(matEstoque.preco_venda) || Number(matEstoque.custo_unit) || 0;
          mat[mi].preco_folha = mat[mi].preco_venda;
          mat[mi].usar_parcial = false;
          mat[mi].formato_final = "";
          mat[mi].largura_final = "";
          mat[mi].altura_final = "";
          mat[mi].pecas_por_folha = 1;
        } else {
          mat[mi].descricao = "";
          mat[mi].preco_venda = 0;
        }
      }
      mat[mi].custo_total = Number(custoTotalMaterial(mat[mi]).toFixed(2));
      const calcParcial = custoParcialDoMaterial(mat[mi]);
      mat[mi].pecas_por_folha = calcParcial ? calcParcial.pecas_por_folha : 1;
      itens[idx] = { ...itens[idx], materiais: mat };
      const calc = recalcularItem(itens[idx]);
      itens[idx].valorUnitario = calc.valorUnitario;
      itens[idx].total = calc.total;
      return { ...p, itens };
    });
  };

  const addMaterial = (idx) =>
    setForm((p) => {
      const itens = [...p.itens];
      itens[idx] = { ...itens[idx], materiais: [...(itens[idx].materiais || []), { ...blankMaterial }] };
      return { ...p, itens };
    });

  const removeMaterial = (idx, mi) =>
    setForm((p) => {
      const itens = [...p.itens];
      itens[idx] = { ...itens[idx], materiais: (itens[idx].materiais || []).filter((_, i) => i !== mi) };
      const calc = recalcularItem(itens[idx]);
      itens[idx].valorUnitario = calc.valorUnitario;
      itens[idx].total = calc.total;
      return { ...p, itens };
    });

  const addServico = () => setForm((p) => ({ ...p, servicos: [...(p.servicos || []), { ...blankServico }] }));
  const removeServico = (idx) => setForm((p) => (p.servicos.length <= 1 ? p : { ...p, servicos: p.servicos.filter((_, i) => i !== idx) }));

  const selecionarServico = (idx, servicoId) => {
    const catalogo = (servicosCatalogo || []).find((s) => String(s.id) === String(servicoId));
    setForm((p) => {
      const servicos = [...(p.servicos || [])];
      if (catalogo) {
        servicos[idx] = {
          ...servicos[idx],
          servico_id: catalogo.id,
          descricao: catalogo.nome,
        };
      } else {
        servicos[idx] = { ...servicos[idx], servico_id: "", descricao: "" };
      }
      const calc = recalcularServico(servicos[idx]);
      servicos[idx].duracaoHoras = calc.duracaoHoras;
      servicos[idx].total = calc.total;
      return { ...p, servicos };
    });
  };

  const setServico = (idx, key, val) => {
    setForm((p) => {
      const servicos = [...(p.servicos || [])];
      servicos[idx] = { ...servicos[idx], [key]: val };
      const calc = recalcularServico(servicos[idx]);
      servicos[idx].duracaoHoras = calc.duracaoHoras;
      servicos[idx].total = calc.total;
      return { ...p, servicos };
    });
  };

  const subtotalCalc = form.itens.reduce((s, it) => s + (Number(it.total) || 0), 0) + (form.servicos || []).reduce((s, sv) => s + (Number(sv.total) || 0), 0);
  const descontoCalc = Number(form.desconto) || 0;
  const ivaCalc = Number(form.iva) || 0;
  const totalCalc = subtotalCalc - descontoCalc + ivaCalc;

return (
    <form id={formId} onSubmit={onSubmit} className="space-y-5">
      <div role="tablist" aria-label="Secções do orçamento" className="flex gap-1.5 flex-wrap obsidian-glass cyber-border p-1.5 rounded-xl">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`${formId}-painel-${t.key}`}
            id={id(`tab-${t.key}`)}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${tab === t.key ? "nav-pill shadow-none text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name={t.icon} className="text-lg" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="px-5 sm:px-6 py-5">
          
        {tab === "cliente" && (
          <div className="glass-panel rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Cliente" obrigatorio full>
              <select required aria-required="true" name="cliente_id" value={form.cliente_id || ""} onChange={onClienteSelect} className={inputCls}>
                <option value="">Selecionar cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome || c.razao_social}{c.empresa ? ` — ${c.empresa}` : ""}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Empresa">
              <input name="empresa" value={form.empresa} onChange={(e) => setField("empresa", e.target.value)} className={inputCls} placeholder="Nome da empresa" />
            </Campo>
            <Campo label="NIF" obrigatorio>
              <input required aria-required="true" name="nif" value={form.nif} onChange={(e) => setField("nif", e.target.value)} className={inputCls} placeholder="Nº de identificação fiscal" />
            </Campo>
            <Campo label="Telefone" obrigatorio>
              <input required aria-required="true" name="telefone" value={form.telefone} onChange={(e) => setField("telefone", e.target.value)} className={inputCls} placeholder="+244 9XX XXX XXX" />
            </Campo>
            <Campo label="Email">
              <input name="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className={inputCls} placeholder="cliente@email.com" />
            </Campo>
          </div>
        )}

        {tab === "servicos" && (
          <div className="glass-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="cyber-label">Itens do orçamento</span>
              <Button type="button" variant="ghost" size="sm" onClick={addItem}><Icon name="add_circle" className="text-sm" /> Adicionar Item</Button>
            </div>

            {form.itens.length === 0 && (
              <div className="text-center py-6 text-muted-foreground border border-dashed border-outline-variant/40 rounded-xl">
                <Icon name="inventory_2" className="text-3xl block mx-auto mb-2 opacity-30" />
                <p className="text-xs">Sem itens — pode ir directamente para a tab <strong>Serviços</strong> se pretende apenas cobrar mão de obra.</p>
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addItem}><Icon name="add_circle" className="text-sm" /> Adicionar Item</Button>
              </div>
            )}

            {form.itens.map((it, idx) => (
              <div key={idx} className="bg-muted/50 rounded-xl p-3 space-y-3">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5">
                    {idx === 0 && <span className="cyber-label">Descrição do Produto *</span>}
                    <input required aria-required="true" value={it.descricao} onChange={(e) => setItem(idx, "descricao", e.target.value)} className={inputCls} placeholder="Ex: Caderno A5, Cartão de visita" />
                  </div>
                  <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                    {idx === 0 && <span className="cyber-label">Quantidade *</span>}
                    <NumeroInput required aria-required="true" value={it.quantidade} onChange={(e) => setItem(idx, "quantidade", e.target.value)} className={inputCls} placeholder="0" />
                  </div>
                  <div className="col-span-4 sm:col-span-3 flex flex-col gap-1.5">
                    {idx === 0 && <span className="cyber-label">Preço Venda/Un.</span>}
                    <div className="px-2.5 py-2 bg-primary/10 border border-primary/30 rounded-lg text-xs font-bold font-mono text-primary">{`Kz ${(it.valorUnitario || 0).toLocaleString("pt-AO")}`}</div>
                  </div>
                  <div className="col-span-4 sm:col-span-1 flex justify-center">
                    {form.itens.length > 0 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} title="Remover item" className="text-error">
                        <Icon name="close" className="text-sm" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/40 pt-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="cyber-label">Materiais do estoque</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => addMaterial(idx)}><Icon name="add_circle" className="text-sm" /> Adicionar material</Button>
                  </div>
                  {materiais.length === 0 && (
                    <p className="text-[10px] text-muted-foreground">Ainda não há materiais no estoque. Adicione materiais no módulo Estoque.</p>
                  )}
                  {(it.materiais || []).map((m, mi) => (
                    <div key={mi} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 sm:col-span-4 flex flex-col gap-1.5">
                        <select value={m.material_id || ""} onChange={(e) => setItemMaterial(idx, mi, "material_id", e.target.value)} className={inputCls} aria-label="Material">
                          <option value="">Selecionar material...</option>
                          {materiais.map((mat) => (
                            <option key={mat.id} value={mat.id}>
                              {mat.nome || mat.nome_tecnico} — {mat.unidade || "un"}
                              {ehPapel(mat) && resumoFolha(mat) ? ` · ${resumoFolha(mat)}` : ""}
                              {Number(mat.quantidade) > 0 ? ` (${Number(mat.quantidade).toLocaleString("pt-AO")} disp.)` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <NumeroInput value={m.quantidade} onChange={(e) => setItemMaterial(idx, mi, "quantidade", e.target.value)} className={inputCls} placeholder={m.usar_parcial && m.pecas_por_folha > 1 ? "Peças" : "Qtd/un."} aria-label="Quantidade por unidade" />
                          {(() => {
                            if (m.usar_parcial && m.pecas_por_folha > 1) return <span className="text-[10px] font-mono text-primary font-bold shrink-0">peça{Number(m.quantidade) !== 1 ? "s" : ""}</span>;
                            return m.unidade ? <span className="text-[10px] font-mono text-primary font-bold shrink-0">{m.unidade}</span> : null;
                          })()}
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-2 flex flex-col gap-1.5">
                        <div className="px-2.5 py-2 bg-muted border border-input rounded-lg text-xs font-mono text-muted-foreground truncate">{`Kz ${Number(m.preco_venda || 0).toLocaleString("pt-AO")}`}</div>
                      </div>
                      <div className="col-span-3 sm:col-span-3 flex flex-col gap-1.5">
                        <div className="px-2.5 py-2 bg-muted border border-input rounded-lg text-xs font-bold font-mono text-foreground truncate">{`Kz ${Number(m.custo_total || 0).toLocaleString("pt-AO")}`}</div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {it.materiais.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(idx, mi)} title="Remover material" className="text-error"><Icon name="close" className="text-sm" /></Button>
                        )}
                      </div>
                      {(() => {
                        const sel = materiais.find((mt) => String(mt.id) === String(m.material_id));
                        const resumo = ehPapel(sel) ? resumoFolha(sel) : "";
                        return resumo ? (
                          <div className="col-span-12 flex items-center gap-1.5 text-[10px] text-primary">
                            <Icon name="straighten" className="text-[13px] text-primary" />
                            <span className="font-mono">Formato: <strong>{resumo}</strong></span>
                          </div>
                        ) : null;
                      })()}
                      {(() => {
                        const sel = materiais.find((mt) => String(mt.id) === String(m.material_id));
                        if (!ehMaterialImpressao(sel)) return null;
                        const totalFolhas = (it.materiais || []).reduce((s, mm) => s + folhasDeMaterial(mm), 0);
                        if (totalFolhas <= 0) return null;
                        const gramas = gramasTonerParaFolhas(totalFolhas);
                        const unidade = String(sel.unidade || "").toLowerCase();
                        const pv = Number(sel.preco_venda) || Number(sel.custo_unit) || 0;
                        const precoPorG = unidade === "kg" ? pv / 1000 : pv;
                        const custo = gramas * precoPorG;
                        const nome = sel.nome || sel.nome_tecnico || "toner/tinta";
                        return (
                          <div className="col-span-12 text-[10px] text-muted-foreground">
                            ≈ {gramas} g de {nome} p/ imprimir {totalFolhas.toLocaleString("pt-AO")} folha{totalFolhas !== 1 ? "s" : ""}
                            {custo > 0 && <> · Kz {custo.toLocaleString("pt-AO")}</>}
                          </div>
                        );
                      })()}
                      {(() => {
                        const sel = materiais.find((mt) => String(mt.id) === String(m.material_id));
                        const dims = dimensionaveisFolha(m);
                        if (!dims) return null;
                        const calc = calcCustoParcialFolha(m, m.formato_final, m.largura_final, m.altura_final);
                        return (
                          <div className="col-span-12 flex flex-col gap-2 border border-primary/20 bg-primary/5 rounded-xl p-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!m.usar_parcial}
                                onChange={(e) => setItemMaterial(idx, mi, "usar_parcial", e.target.checked)}
                                className="w-4 h-4 rounded accent-primary"
                              />
                              <span className="text-[11px] font-semibold text-foreground">Usar apenas parte da folha (formato menor)</span>
                              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{dims.largura}×{dims.altura} mm</span>
                            </label>
                            {m.usar_parcial && (
                              <>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Formato final da peça</span>
                                    <input
                                      list={`${formId}-formatos-finais`}
                                      value={m.formato_final || ""}
                                      onChange={(e) => setItemMaterial(idx, mi, "formato_final", e.target.value)}
                                      className={inputCls}
                                      placeholder="Ex: A7"
                                    />
                                    <datalist id={`${formId}-formatos-finais`}>
                                      {formatosSugeridos.map((f) => <option key={f} value={f} />)}
                                    </datalist>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Largura (mm) opcional</span>
                                    <NumeroInput value={m.largura_final} onChange={(e) => setItemMaterial(idx, mi, "largura_final", e.target.value)} className={inputCls} placeholder="—" />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Altura (mm) opcional</span>
                                    <NumeroInput value={m.altura_final} onChange={(e) => setItemMaterial(idx, mi, "altura_final", e.target.value)} className={inputCls} placeholder="—" />
                                  </div>
                                </div>
                                {calc && calc.pecas_por_folha > 1 && (
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono">
                                    <span className="text-primary"><Icon name="grid_view" className="inline text-[12px] mr-1" />{calc.pecas_por_folha} peças / folha</span>
                                    <span className="text-foreground">{Number(m.quantidade) || 0} peça{Number(m.quantidade) !== 1 ? "s" : ""} = <strong>{Math.ceil((Number(m.quantidade) || 0) / calc.pecas_por_folha).toLocaleString("pt-AO")} folha{Math.ceil((Number(m.quantidade) || 0) / calc.pecas_por_folha) !== 1 ? "s" : ""}</strong></span>
                                    <span className="text-muted-foreground">Preço por folha: {`Kz ${Number(m.preco_venda || 0).toLocaleString("pt-AO")}`} · peça: {`Kz ${calc.preco_peca.toLocaleString("pt-AO")}`}</span>
                                  </div>
                                )}
                                {m.usar_parcial && (!calc || calc.pecas_por_folha <= 1) && (
                                  <p className="text-[10px] text-destructive">
                                    Informe o formato final da peça (ou largura/altura) menor que {dims.largura}×{dims.altura} mm. A quantidade acima conta em folhas.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-border/40 pt-2.5">
                    <div className="flex items-center justify-between px-2.5 py-2 bg-muted border border-input rounded-lg">
                      <span className="cyber-label">Custo materiais/un.</span>
                      <span className="text-xs font-bold font-mono text-foreground">{`Kz ${custoUnitItem(it).toLocaleString("pt-AO")}`}</span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-2 bg-primary/10 border border-primary/30 rounded-lg">
                      <span className="cyber-label">Total do item</span>
                      <span className="text-xs font-bold font-mono text-primary">{`Kz ${(it.total || 0).toLocaleString("pt-AO")}`}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <span className="cyber-label">Serviços</span>
              <Button type="button" variant="ghost" size="sm" onClick={addServico}><Icon name="add_circle" className="text-sm" /> Adicionar serviço</Button>
            </div>

            {(form.servicos || []).map((sv, idx) => (
              <div key={idx} className="bg-muted/50 rounded-xl p-3 space-y-2">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-4 flex flex-col gap-1.5">
                    {idx === 0 && <span className="cyber-label">Serviço *</span>}
                    <select required aria-required="true" value={sv.servico_id || ""} onChange={(e) => selecionarServico(idx, e.target.value)} className={inputCls}>
                      <option value="">Seleccionar serviço...</option>
                      {(servicosCatalogo || []).map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}{s.categoria ? ` (${s.categoria.nome})` : ""}</option>
                      ))}
                    </select>
                    {!sv.servico_id && sv.descricao && (
                      <input value={sv.descricao} onChange={(e) => setServico(idx, "descricao", e.target.value)} className={`${inputCls} mt-1`} placeholder="Ou digite a descrição..." />
                    )}
                  </div>
                  <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                    {idx === 0 && <span className="cyber-label">Trabalhadores *</span>}
                    <NumeroInput required aria-required="true" value={sv.mob} onChange={(e) => setServico(idx, "mob", e.target.value)} className={inputCls} placeholder="1" />
                  </div>
                  <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                    {idx === 0 && <span className="cyber-label">Prazo (dias)</span>}
                    <NumeroInput value={sv.prazoExecucao} onChange={(e) => setServico(idx, "prazoExecucao", e.target.value)} className={inputCls} placeholder="1" />
                  </div>
                  <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                    {idx === 0 && <span className="cyber-label">Valor/Hora</span>}
                    <NumeroInput value={sv.valorHora} onChange={(e) => setServico(idx, "valorHora", e.target.value)} className={inputCls} placeholder="0" />
                  </div>
                  <div className="col-span-12 sm:col-span-2 flex flex-col gap-1.5">
                    {idx === 0 && <span className="cyber-label">Total</span>}
                    <div className="px-2.5 py-2 bg-primary/10 border border-primary/30 rounded-lg text-xs font-bold font-mono text-primary">{`Kz ${(sv.total || 0).toLocaleString("pt-AO")}`}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span>Trabalhadores: <strong className="text-foreground">{sv.mob || 1}</strong></span>
                  <span>Duração: <strong className="text-foreground">{sv.duracaoHoras || 8}h</strong> ({sv.prazoExecucao || 1} dia{Number(sv.prazoExecucao) !== 1 ? "s" : ""})</span>
                  {(form.servicos || []).length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeServico(idx)} title="Remover serviço" className="text-error ml-auto"><Icon name="close" className="text-sm" /></Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "valores" && (
          <div className="glass-panel rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="IVA (Kz) — Opcional">
              <NumeroInput name="iva" value={form.iva} onChange={(e) => setField("iva", e.target.value)} className={inputCls} placeholder="0" />
            </Campo>
            <Campo label="Desconto (Kz) — Opcional">
              <NumeroInput name="desconto" value={form.desconto} onChange={(e) => setField("desconto", e.target.value)} className={inputCls} placeholder="0" />
            </Campo>
            <Campo label="Prazo de Execução" obrigatorio>
              <input required aria-required="true" name="prazoExecucao" value={form.prazoExecucao} onChange={(e) => setField("prazoExecucao", e.target.value)} className={inputCls} placeholder="Ex: 5 dias úteis" />
            </Campo>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="cyber-label">Condições de Pagamento *</span>
              <div className="flex gap-2 flex-wrap">
                {CONDICOES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setField("condicoesPagamento", c)}
                    aria-pressed={form.condicoesPagamento === c}
                    className={`px-3 py-2 rounded-xl border-2 text-[10px] font-bold transition-all ${
                      form.condicoesPagamento === c ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-muted-foreground hover:border-outline"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {!CONDICOES.includes(form.condicoesPagamento) && (
                <input required aria-required="true" className={`${inputCls} mt-1`} placeholder="Especificar condições..." value={form.condicoesPagamento} onChange={(e) => setField("condicoesPagamento", e.target.value)} />
              )}
            </div>
            <Campo label="Observações" full>
              <textarea name="observacoes" rows={3} value={form.observacoes} onChange={(e) => setField("observacoes", e.target.value)} className={`${inputCls} resize-none`} placeholder="Notas adicionais..." />
            </Campo>

            <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between sm:col-span-2">
              <div className="text-xs font-mono text-muted-foreground space-y-0.5">
                <p>Subtotal: <strong className="text-foreground">{`Kz ${subtotalCalc.toLocaleString("pt-AO")}`}</strong></p>
                {descontoCalc > 0 && <p>Desconto: <strong className="text-green-600">{`-Kz ${descontoCalc.toLocaleString("pt-AO")}`}</strong></p>}
                {ivaCalc > 0 && <p>IVA: <strong className="text-foreground">{`Kz ${ivaCalc.toLocaleString("pt-AO")}`}</strong></p>}
              </div>
              <div className="text-right">
                <p className="cyber-label">Total</p>
                <p className="text-lg font-bold font-mono text-primary">{`Kz ${totalCalc.toLocaleString("pt-AO")}`}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </form>
  );
}
