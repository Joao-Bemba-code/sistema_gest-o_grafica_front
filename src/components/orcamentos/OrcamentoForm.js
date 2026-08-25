"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import { inputCls } from "@/lib/estoque";

const tabs = [
  { key: "cliente", label: "Dados do Cliente", icon: "person" },
  { key: "servicos", label: "Descrição dos Serviços", icon: "list" },
  { key: "valores", label: "Valores e Condições", icon: "payments" },
];

export const blankMaterial = { material_id: "", descricao: "", unidade: "un", quantidade: "", preco_venda: 0, custo_total: 0, mover_estoque: true };
export const blankItem = { descricao: "", quantidade: "", materiais: [{ ...blankMaterial }] };
export const blankServico = { servico_id: "", descricao: "", mob: 1, prazoExecucao: 1, valorHora: 0, duracaoHoras: 8, total: 0 };

export const SPEC_DEFAULT_LINES = [
  { rotulo: "Produto", valor: "" },
  { rotulo: "Formato", valor: "" },
  { rotulo: "Papel/Material", valor: "" },
  { rotulo: "Impressão", valor: "" },
  { rotulo: "Acabamento", valor: "" },
];

export const blankForm = {
  cliente_id: "",
  cliente: "", empresa: "", nif: "", telefone: "", email: "",
  itens: [{ ...blankItem, materiais: [{ ...blankMaterial }] }],
  servicos: [{ ...blankServico }],
  specLines: SPEC_DEFAULT_LINES.map((l) => ({ ...l })),
  iva: "", desconto: "", prazoExecucao: "", condicoesPagamento: "100% antecipado", observacoes: "",
};

export function placeholderSpec(rotulo) {
  const chave = String(rotulo || "").toLowerCase();
  if (chave.includes("produto")) return "Ex: Caderno Escolar A5";
  if (chave.includes("formato")) return "Ex: A5 (148×210 mm)";
  if (chave.includes("papel") || chave.includes("material")) return "Ex: Papel Couché 150g";
  if (chave.includes("impress")) return "Ex: Offset, 4 cores";
  if (chave.includes("acabamento")) return "Ex: Brochura com lombada";
  return "Ex: Offset, 4 cores...";
}

export function custoUnitItem(it) {
  return (it.materiais || []).reduce((s, m) => s + (Number(m.quantidade) || 0) * (Number(m.preco_venda) || 0), 0);
}

export function recalcularItem(it) {
  const custoTotal = custoUnitItem(it);
  const q = Number(it.quantidade) || 1;
  const valorUnitario = Number((custoTotal / q).toFixed(2));
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
          mat[mi].descricao = matEstoque.nome || matEstoque.nome_tecnico || "";
          mat[mi].unidade = matEstoque.unidade || "un";
          mat[mi].preco_venda = Number(matEstoque.preco_venda) || Number(matEstoque.custo_unit) || 0;
        } else {
          mat[mi].descricao = "";
          mat[mi].preco_venda = 0;
        }
      }
      if (key === "quantidade" || key === "preco_venda" || key === "material_id") {
        const q = Number(mat[mi].quantidade) || 0;
        const pv = Number(mat[mi].preco_venda) || 0;
        mat[mi].custo_total = Number((q * pv).toFixed(2));
      }
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

  const setSpecLine = (idx, key, val) => {
    setForm((p) => {
      const specLines = [...p.specLines];
      specLines[idx] = { ...specLines[idx], [key]: val };
      return { ...p, specLines };
    });
  };
  const addSpecLine = () => setForm((p) => ({ ...p, specLines: [...p.specLines, { rotulo: "", valor: "" }] }));
  const removeSpecLine = (idx) => setForm((p) => (p.specLines.length <= 1 ? p : { ...p, specLines: p.specLines.filter((_, i) => i !== idx) }));

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
                              {mat.nome || mat.nome_tecnico} — {mat.unidade || "un"}{Number(mat.quantidade) > 0 ? ` (${Number(mat.quantidade).toLocaleString("pt-AO")} disp.)` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <NumeroInput value={m.quantidade} onChange={(e) => setItemMaterial(idx, mi, "quantidade", e.target.value)} className={inputCls} placeholder="Qtd/un." aria-label="Quantidade por unidade" />
                          {m.unidade && <span className="text-[10px] font-mono text-primary font-bold shrink-0">{m.unidade}</span>}
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-2 flex flex-col gap-1.5">
                        <div className="px-2.5 py-2 bg-muted border border-input rounded-lg text-xs font-mono text-muted-foreground truncate">{`Kz ${Number(m.preco_venda || 0).toLocaleString("pt-AO")}`}</div>
                      </div>
                      <div className="col-span-3 sm:col-span-2 flex flex-col gap-1.5">
                        <div className="px-2.5 py-2 bg-muted border border-input rounded-lg text-xs font-bold font-mono text-foreground truncate">{`Kz ${Number(m.custo_total || 0).toLocaleString("pt-AO")}`}</div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <label className="flex items-center gap-1 cursor-pointer" title="Marcar para mover o estoque ao faturar/produzir">
                          <input type="checkbox" checked={!!m.mover_estoque} onChange={(e) => setItemMaterial(idx, mi, "mover_estoque", e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                          <span className="text-[9px] font-bold text-muted-foreground uppercase hidden sm:inline">Mover</span>
                        </label>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {it.materiais.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(idx, mi)} title="Remover material" className="text-error"><Icon name="close" className="text-sm" /></Button>
                        )}
                      </div>
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

            <div className="flex items-center justify-between pt-1">
              <span className="cyber-label">Especificação Técnica</span>
              <Button type="button" variant="ghost" size="sm" onClick={addSpecLine}><Icon name="add_circle" className="text-sm" /> Adicionar campo</Button>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2">
              Detalhes do produto que ficam visíveis no orçamento (formato, papel, impressão, acabamento, etc.). Opcional.
            </p>
            <div className="rounded-xl border bg-background overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 border-b items-center">
                <span className="col-span-5 cyber-label">Campo</span>
                <span className="col-span-6 cyber-label">Valor</span>
                <span className="col-span-1" />
              </div>
              {form.specLines.map((line, idx) => {
                const ehImpressao = String(line.rotulo || "").toLowerCase().includes("impress");
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2.5 border-b border-border/30 last:border-0 items-center">
                    <div className="col-span-5">
                      <input required aria-required="true" value={line.rotulo} onChange={(e) => setSpecLine(idx, "rotulo", e.target.value)} list={`${formId}-spec-campo-list`} className={`${inputCls} w-full`} placeholder="Ex: Formato" />
                    </div>
                    <div className="col-span-6">
                      <input required aria-required="true" value={line.valor} onChange={(e) => setSpecLine(idx, "valor", e.target.value)} list={ehImpressao ? `${formId}-spec-impressao-list` : undefined} className={`${inputCls} w-full`} placeholder={placeholderSpec(line.rotulo)} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {form.specLines.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSpecLine(idx)} title="Remover campo" className="text-error">
                          <Icon name="close" className="text-sm" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <datalist id={`${formId}-spec-campo-list`}>
              <option value="Produto" /><option value="Formato" /><option value="Papel/Material" /><option value="Impressão" /><option value="Acabamento" /><option value="Tiragem" /><option value="Nº de Cores" /><option value="Gramagem" />
            </datalist>
            <datalist id={`${formId}-spec-impressao-list`}>
              <option value="Offset" /><option value="Digital" /><option value="Serigrafia" /><option value="Flexografia" />
            </datalist>
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
