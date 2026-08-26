"use client";

import { useState, useCallback } from "react";
import Icon from "@/components/Icon";
import FornecedorSelect from "./FornecedorSelect";
import CategoriaSelect from "./CategoriaSelect";
import UnidadeSelect from "./UnidadeSelect";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls, unidades, unidadesParaFamilia, camposDeCategoria, familias, normalizarFamilia, normalizarUnidade, prefixoFamilia, especificacoesObjeto } from "@/lib/estoque";

const tabs = [
  { key: "basicos", label: "Identificação do Material", icon: "badge" },
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
          <NumeroInput value={valor || ""} onChange={(e) => onChange(chave, e.target.value)} className={inputCls} placeholder="0" />
          {sufixo}
        </div>
      </Campo>
    );
  }
  if (tipo === "selecao") {
    return (
      <Campo label={rotulo} obrigatorio={obrigatorio}>
        <input
          list={`esp-${chave}`}
          value={valor || ""}
          onChange={(e) => onChange(chave, e.target.value)}
          className={inputCls}
          placeholder="Selecionar ou escrever..."
        />
        <datalist id={`esp-${chave}`}>
          {(opcoes || []).map((o) => <option key={o} value={o} />)}
        </datalist>
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

export default function MaterialForm({ formId = "form-material", form, onChange, onSubmit, categorias, fornecedores, materiais = [] }) {
  const [tab, setTab] = useState("basicos");
  const id = (sufixo) => `${formId}-${sufixo}`;
  const categoria = categorias.find((c) => String(c.id) === String(form.categoria_id));
  const camposEspec = camposDeCategoria(categoria, form.unidade);
  const ePapel = ["folha", "resma"].includes(normalizarUnidade(form.unidade));
  const unidadesDisponiveis = categoria ? unidadesParaFamilia(categoria.familia) : unidades;

  const subfamiliasSugeridas = (() => {
    if (!categoria) return [];
    const fam = normalizarFamilia(categoria.familia);
    const vistas = new Set();
    for (const m of materiais) {
      if (normalizarFamilia(m.categoria?.familia) !== fam) continue;
      const s = String(especificacoesObjeto(m.especificacoes).subfamilia || m.categoria?.subfamilia || "").trim();
      if (s) vistas.add(s);
    }
    return [...vistas];
  })();

  const aoMudarCategoria = useCallback((novaCatId) => {
    onChange("categoria_id", novaCatId);
    const cat = categorias.find((c) => String(c.id) === String(novaCatId));
    if (cat) {
      const prefixo = prefixoFamilia(cat.familia);
      let maxNum = 0;
      for (const m of materiais) {
        const cod = m.codigo || "";
        if (cod.startsWith(prefixo + "-")) {
          const num = parseInt(cod.split("-")[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      onChange("codigo", `${prefixo}-${String(maxNum + 1).padStart(4, "0")}`);
    }
  }, [categorias, materiais, onChange]);

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
              <div className="flex items-center gap-2">
                <input required aria-required="true" value={form.codigo} readOnly className={`${inputCls} bg-muted/50 cursor-not-allowed`} placeholder="Selecione a categoria" />
                {form.codigo && <span className="text-[10px] font-mono text-primary whitespace-nowrap">AUTO</span>}
              </div>
            </Campo>
            <Campo label="Nome" obrigatorio>
              <input required aria-required="true" value={form.nome} onChange={(e) => onChange("nome", e.target.value)} className={inputCls} placeholder="Ex: Papel Couché 150g A3" />
            </Campo>
            <Campo label="Categoria" obrigatorio>
              <CategoriaSelect
                value={form.categoria_id}
                categorias={categorias}
                onChange={(id) => aoMudarCategoria(id)}
              />
            </Campo>
            <Campo label="Subfamília">
              <input
                list={`${formId}-subfamilias`}
                value={(form.especificacoes?.subfamilia || "").trim()}
                onChange={(e) => aoMudarEspec("subfamilia", e.target.value)}
                className={inputCls}
                placeholder="Ex: Couché, Offset, etc."
              />
              <datalist id={`${formId}-subfamilias`}>
                {subfamiliasSugeridas.map((s) => <option key={s} value={s} />)}
              </datalist>
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
              <UnidadeSelect
                value={form.unidade}
                unidades={unidadesDisponiveis}
                onChange={(v) => onChange("unidade", v)}
                placeholder="Pesquisar unidade..."
              />
            </Campo>
            <Campo label="Descrição" full>
              <textarea rows={2} value={form.descricao} onChange={(e) => onChange("descricao", e.target.value)} className={`${inputCls} resize-none`} placeholder="Descrição completa do material..." />
            </Campo>
          </div>
        )}

        {tab === "especificacoes" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ePapel && (
              <>
                <Campo label="Formato">
                  <input value={form.formato || ""} onChange={(e) => onChange("formato", e.target.value)} className={inputCls} placeholder="Ex: A3, 70×100, SRA3..." />
                </Campo>
                <Campo label="Gramagem">
                  <div className="flex items-center gap-2">
                    <NumeroInput value={form.gramagem || ""} onChange={(e) => onChange("gramagem", e.target.value)} className={inputCls} placeholder="Ex: 150" />
                    <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">g/m²</span>
                  </div>
                </Campo>
              </>
            )}

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
              <NumeroInput value={form.percentual_quebra} onChange={(e) => onChange("percentual_quebra", e.target.value)} className={inputCls} placeholder="Ex: 5" />
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
              <NumeroInput  value={form.estoque_min} onChange={(e) => onChange("estoque_min", e.target.value)} className={inputCls} placeholder="Ex: 500" />
            </Campo>
            <Campo label="Estoque Máximo">
              <NumeroInput  value={form.estoque_max} onChange={(e) => onChange("estoque_max", e.target.value)} className={inputCls} placeholder="Ex: 5000" />
            </Campo>
            <Campo label="Ponto de Pedido">
              <NumeroInput value={form.ponto_ressuprimento} onChange={(e) => onChange("ponto_ressuprimento", e.target.value)} className={inputCls} placeholder="Ex: 800" />
            </Campo>
            <Campo label="Custo Unitário (Kz)">
              <NumeroInput value={form.custo_unit} onChange={(e) => onChange("custo_unit", e.target.value)} className={inputCls} placeholder="Ex: 45" />
            </Campo>
            <Campo label="Lucro (%)">
              <NumeroInput value={form.lucro} onChange={(e) => onChange("lucro", e.target.value)} className={inputCls} placeholder="Ex: 25" />
            </Campo>
            <Campo label="Localização na Prateleira" full>
              <input value={form.localizacao} onChange={(e) => onChange("localizacao", e.target.value)} className={inputCls} placeholder="Ex: Prateleira A3, seção 2" />
            </Campo>
          </div>
        )}
      </div>
    </form>
  );
}
