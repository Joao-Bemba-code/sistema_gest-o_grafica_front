"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import FornecedorSelect from "./FornecedorSelect";
import { inputCls, tiposEstoque, unidades, camposDeCategoria } from "@/lib/estoque";

const tabs = [
  { key: "basicos", label: "Dados Básicos", icon: "badge" },
  { key: "especificacoes", label: "Especificações", icon: "straighten" },
  { key: "estoque", label: "Estoque", icon: "inventory" },
];

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

function CampoEspecificacao({ campo, valor, onChange }) {
  const { chave, rotulo, tipo, unidade, opcoes, obrigatorio } = campo;
  const sufixo = unidade ? <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{unidade}</span> : null;
  if (tipo === "numero") {
    return (
      <Campo label={rotulo} obrigatorio={obrigatorio}>
        <div className="flex items-center gap-2">
          <input type="number" min="0" step="any" value={valor || ""} onChange={(e) => onChange(chave, e.target.value)} className={inputCls} placeholder="0" />
          {sufixo}
        </div>
      </Campo>
    );
  }
  if (tipo === "selecao") {
    return (
      <Campo label={rotulo} obrigatorio={obrigatorio}>
        <select value={valor || ""} onChange={(e) => onChange(chave, e.target.value)} className={inputCls}>
          <option value="">Selecionar...</option>
          {(opcoes || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Campo>
    );
  }
  if (tipo === "area") {
    return (
      <Campo label={rotulo} obrigatorio={obrigatorio} full>
        <textarea rows={2} value={valor || ""} onChange={(e) => onChange(chave, e.target.value)} className={`${inputCls} resize-none`} placeholder={rotulo} />
      </Campo>
    );
  }
  return (
    <Campo label={rotulo} obrigatorio={obrigatorio}>
      <input value={valor || ""} onChange={(e) => onChange(chave, e.target.value)} className={inputCls} placeholder={rotulo} />
    </Campo>
  );
}

export default function MaterialForm({ formId = "form-material", form, onChange, onSubmit, categorias, fornecedores }) {
  const [tab, setTab] = useState("basicos");
  const id = (sufixo) => `${formId}-${sufixo}`;
  const categoria = categorias.find((c) => String(c.id) === String(form.categoria_id));
  const camposEspec = camposDeCategoria(categoria);

  const aoMudarEspec = (chave, valor) => {
    const especificacoes = { ...(form.especificacoes || {}) };
    especificacoes[chave] = valor;
    onChange("especificacoes", especificacoes);
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-5">
      <div role="tablist" aria-label="Secções do material" className="flex gap-1.5 flex-wrap obsidian-glass cyber-border p-1.5 rounded-xl">
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

      <div role="tabpanel" id={`${formId}-painel-${tab}`} aria-labelledby={id(`tab-${tab}`)} className="animate-scale-in">
        {tab === "basicos" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Código" obrigatorio>
              <input required aria-required="true" value={form.codigo} onChange={(e) => onChange("codigo", e.target.value)} className={inputCls} placeholder="Ex: PAP-013" />
            </Campo>
            <Campo label="Nome" obrigatorio>
              <input required aria-required="true" value={form.nome} onChange={(e) => onChange("nome", e.target.value)} className={inputCls} placeholder="Ex: Papel Couché 150g A3" />
            </Campo>
            <Campo label="Categoria" obrigatorio>
              <select required aria-required="true" value={form.categoria_id} onChange={(e) => onChange("categoria_id", e.target.value)} className={inputCls}>
                <option value="" disabled>Selecionar...</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
            <Campo label="Fornecedor">
              <FornecedorSelect
                value={form.fornecedor}
                onChange={(v) => onChange("fornecedor", v)}
                fornecedores={fornecedores}
                placeholder="Procurar fornecedor ou escrever novo..."
              />
            </Campo>
            <Campo label="Nome Técnico">
              <input value={form.nome_tecnico} onChange={(e) => onChange("nome_tecnico", e.target.value)} className={inputCls} placeholder="Ex: C150-A3" />
            </Campo>
            <Campo label="Unidade" obrigatorio>
              <select required aria-required="true" value={form.unidade} onChange={(e) => onChange("unidade", e.target.value)} className={inputCls}>
                {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Campo>
            <Campo label="Descrição" full>
              <textarea rows={2} value={form.descricao} onChange={(e) => onChange("descricao", e.target.value)} className={`${inputCls} resize-none`} placeholder="Descrição completa do material..." />
            </Campo>
            <Campo label="Localização na Prateleira" full>
              <input value={form.localizacao} onChange={(e) => onChange("localizacao", e.target.value)} className={inputCls} placeholder="Ex: Prateleira A3, seção 2" />
            </Campo>
          </div>
        )}

        {tab === "especificacoes" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Tipo de Estoque">
              <select value={form.tipo_estoque} onChange={(e) => onChange("tipo_estoque", e.target.value)} className={inputCls}>
                {tiposEstoque.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>

            {!categoria && (
              <div className="sm:col-span-2 rounded-xl border border-dashed border-outline-variant p-4 text-xs text-muted-foreground">
                Selecione uma categoria para definir as especificações técnicas deste material.
              </div>
            )}

            {camposEspec.map((campo) => (
              <CampoEspecificacao
                key={campo.chave}
                campo={campo}
                valor={form.especificacoes?.[campo.chave]}
                onChange={aoMudarEspec}
              />
            ))}

            <Campo label="Quebra técnica (%)">
              <input type="number" min="0" max="100" value={form.percentual_quebra} onChange={(e) => onChange("percentual_quebra", e.target.value)} className={inputCls} placeholder="Ex: 5" />
            </Campo>
            <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl self-end cursor-pointer sm:col-span-2">
              <input type="checkbox" checked={!!form.controla_lote} onChange={(e) => onChange("controla_lote", e.target.checked)} className="w-4 h-4 rounded accent-primary" />
              <span className="text-xs text-foreground">Rastreabilidade por lote</span>
            </label>
            <Campo label="Especificidade" full>
              <textarea rows={2} value={form.especificidade} onChange={(e) => onChange("especificidade", e.target.value)} className={`${inputCls} resize-none`} placeholder="Características técnicas específicas..." />
            </Campo>
            <Campo label="Condição de Armazenagem" full>
              <textarea rows={2} value={form.condicao_armazenagem} onChange={(e) => onChange("condicao_armazenagem", e.target.value)} className={`${inputCls} resize-none`} placeholder="Condições necessárias para armazenamento..." />
            </Campo>
          </div>
        )}

        {tab === "estoque" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Estoque Mínimo">
              <input type="number" min="0" value={form.estoque_min} onChange={(e) => onChange("estoque_min", e.target.value)} className={inputCls} placeholder="Ex: 500" />
            </Campo>
            <Campo label="Estoque Máximo">
              <input type="number" min="0" value={form.estoque_max} onChange={(e) => onChange("estoque_max", e.target.value)} className={inputCls} placeholder="Ex: 5000" />
            </Campo>
            <Campo label="Ponto de Pedido">
              <input type="number" min="0" value={form.ponto_ressuprimento} onChange={(e) => onChange("ponto_ressuprimento", e.target.value)} className={inputCls} placeholder="Ex: 800" />
            </Campo>
            <Campo label="Custo Unitário (Kz)">
              <input type="number" min="0" value={form.custo_unit} onChange={(e) => onChange("custo_unit", e.target.value)} className={inputCls} placeholder="Ex: 45" />
            </Campo>
            <Campo label="Margem (%)">
              <input type="number" min="0" value={form.margem} onChange={(e) => onChange("margem", e.target.value)} className={inputCls} placeholder="Ex: 30" />
            </Campo>
          </div>
        )}
      </div>
    </form>
  );
}
