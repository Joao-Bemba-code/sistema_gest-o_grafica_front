"use client";

import { useState, useCallback } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import FornecedorSelect from "./FornecedorSelect";
import CategoriaSelect from "./CategoriaSelect";
import UnidadeSelect from "./UnidadeSelect";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls, unidades, unidadesParaFamilia, camposDeCategoria, familias, normalizarFamilia, normalizarUnidade, prefixoFamilia, especificacoesObjeto, tiposItem, normalizarTipoItem, moverEstoqueDe, ehProduto } from "@/lib/estoque";

const tabs = [
  { key: "identificacao", label: "Identificação", icon: "badge" },
  { key: "especificacao", label: "Especificação", icon: "straighten" },
  { key: "estoque", label: "Stock", icon: "inventory" },
  { key: "composicao", label: "Composição", icon: "layers" },
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
  if (tipo === "data") {
    return (
      <Campo label={rotulo} obrigatorio={obrigatorio}>
        <input type="date" value={valor || ""} onChange={(e) => onChange(chave, e.target.value)} className={inputCls} />
      </Campo>
    );
  }
  return (
    <Campo label={rotulo} obrigatorio={obrigatorio}>
      <input value={valor || ""} onChange={(e) => onChange(chave, e.target.value)} className={inputCls} placeholder={rotulo} />
    </Campo>
  );
}

export default function MaterialForm({ formId = "form-material", form, onChange, onSubmit, categorias, fornecedores, materiais = [], idMaterial }) {
  const [tab, setTab] = useState("identificacao");
  const id = (sufixo) => `${formId}-${sufixo}`;
  const categoria = categorias.find((c) => String(c.id) === String(form.categoria_id));
  const tipoLabel = categoria ? (tiposItem[normalizarTipoItem(categoria.tipo)]?.label || String(categoria.tipo || "")) : "";
  const catFamiliaLabel = categoria ? (familias[normalizarFamilia(categoria.familia)]?.label || categoria.familia || "") : "";
  const camposEspec = camposDeCategoria(categoria, form.unidade);
  const ePapel = ["folha", "resma"].includes(normalizarUnidade(form.unidade));
  const unidadesDisponiveis = categoria ? unidadesParaFamilia(categoria.familia) : unidades;
  const mover = form.mover_estoque === undefined ? moverEstoqueDe(categoria) : !!form.mover_estoque;
  const eComposicao = ehProduto(categoria);
  const tabsVisiveis = eComposicao ? tabs : tabs.filter((t) => t.key !== "composicao");
  const tabAtiva = tabsVisiveis.some((t) => t.key === tab) ? tab : tabsVisiveis[0]?.key || "identificacao";
  const candidatosComposicao = materiais.filter((m) => !idMaterial || String(m.id) !== String(idMaterial));
  const composicao = Array.isArray(form.composicao) ? form.composicao : [];

  const aoMudarComposicao = (novaComposicao) => onChange("composicao", novaComposicao);
  const addComponente = () => aoMudarComposicao([...composicao, { material_id: "", quantidade: "" }]);
  const setComponente = (ci, chave, valor) => {
    const nova = [...composicao];
    nova[ci] = { ...nova[ci], [chave]: valor };
    aoMudarComposicao(nova);
  };
  const removeComponente = (ci) => aoMudarComposicao(composicao.filter((_, i) => i !== ci));

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
    const mudou = String(novaCatId) !== String(form.categoria_id);
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
      if (mudou) {
        onChange("especificacoes", {
          ...(form.especificacoes || {}),
          subfamilia: String(cat.subfamilia || "").trim(),
        });
      }
    }
  }, [categorias, materiais, onChange, form]);

  const aoMudarEspec = (chave, valor) => {
    const especificacoes = { ...(form.especificacoes || {}) };
    especificacoes[chave] = valor;
    onChange("especificacoes", especificacoes);
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-5">
      <div role="tablist" aria-label="Secções do material" className="flex gap-2 flex-wrap bg-muted/60 border border-border p-1.5 rounded-full">
        {tabsVisiveis.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tabAtiva === t.key}
            aria-controls={`${formId}-painel-${t.key}`}
            id={id(`tab-${t.key}`)}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${tabAtiva === t.key ? "nav-pill text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name={t.icon} className="text-lg" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${formId}-painel-${tabAtiva}`} aria-labelledby={id(`tab-${tabAtiva}`)} className="animate-fade-up">
        {tabAtiva === "identificacao" && (
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
            <Campo label="Família">
              <input
                value={catFamiliaLabel}
                readOnly
                className={`${inputCls} bg-muted/50 cursor-not-allowed`}
                placeholder={form.categoria_id ? "Carregando família..." : "Escolha a categoria"}
              />
            </Campo>
            <Campo label="Grupo" obrigatorio>
              <input
                required
                aria-required="true"
                value={tipoLabel}
                readOnly
                className={`${inputCls} bg-muted/50 cursor-not-allowed`}
                placeholder={form.categoria_id ? "Carregando grupo..." : "Escolha a categoria"}
              />
            </Campo>
            <Campo label="Subfamília">
              <input
                list={`${formId}-subfamilias`}
                value={form.especificacoes?.subfamilia || ""}
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

        {tabAtiva === "especificacao" && (
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
                <Campo label="Largura (mm)">
                  <NumeroInput value={form.largura || ""} onChange={(e) => onChange("largura", e.target.value)} className={inputCls} placeholder="Ex: 297" />
                </Campo>
                <Campo label="Altura (mm)">
                  <NumeroInput value={form.altura || ""} onChange={(e) => onChange("altura", e.target.value)} className={inputCls} placeholder="Ex: 420" />
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
            <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg self-end cursor-pointer sm:col-span-2">
              <input type="checkbox" checked={!!form.controla_lote} onChange={(e) => onChange("controla_lote", e.target.checked)} className="w-4 h-4 rounded accent-primary" />
              <span className="text-xs text-foreground">Rastreabilidade por lote</span>
            </label>
            <Campo label="Marca" full>
              <input value={form.especificacoes?.marca || ""} onChange={(e) => aoMudarEspec("marca", e.target.value)} className={inputCls} placeholder="Ex: Canon, Roland..." />
            </Campo>
            <Campo label="Modelo" full>
              <input value={form.especificacoes?.modelo || ""} onChange={(e) => aoMudarEspec("modelo", e.target.value)} className={inputCls} placeholder="Ex: X-100, Pro 200..." />
            </Campo>
          </div>
        )}

        {tabAtiva === "estoque" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer sm:col-span-2">
              <input
                type="checkbox"
                checked={mover}
                onChange={(e) => onChange("mover_estoque", e.target.checked)}
                className="w-4 h-4 rounded accent-primary shrink-0"
              />
              <span>
                <span className="block text-sm font-semibold text-foreground">Mover estoque</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  {mover
                    ? "Este item conta no Qtd. Disponível e pode ter entradas, saídas e reservas."
                    : "Este item não movimenta estoque (registo apenas) — ex.: equipamentos usados na produção."}
                </span>
              </span>
            </label>
            <Campo label="Stock Mínimo">
              <NumeroInput  value={form.estoque_min} onChange={(e) => onChange("estoque_min", e.target.value)} className={inputCls} placeholder="Ex: 500" />
            </Campo>
            <Campo label="Stock Máximo">
              <NumeroInput  value={form.estoque_max} onChange={(e) => onChange("estoque_max", e.target.value)} className={inputCls} placeholder="Ex: 5000" />
            </Campo>
            <Campo label="Custo Unitário (Kz)">
              <NumeroInput value={form.custo_unit} onChange={(e) => onChange("custo_unit", e.target.value)} className={inputCls} placeholder="Ex: 45" />
            </Campo>
            <Campo label="Margem (%)">
              <NumeroInput value={form.lucro} onChange={(e) => onChange("lucro", e.target.value)} className={inputCls} placeholder="Ex: 25" />
            </Campo>
            <Campo label="Localização">
              <input value={form.localizacao} onChange={(e) => onChange("localizacao", e.target.value)} className={inputCls} placeholder="Ex: Prateleira A3, seção 2" />
            </Campo>
            <Campo label="Armazém">
              <input value={form.armazem || form.especificacoes?.armazem || ""} onChange={(e) => { onChange("armazem", e.target.value); aoMudarEspec("armazem", e.target.value); }} className={inputCls} placeholder="Ex: Armazém Central" />
            </Campo>
          </div>
        )}

        {tabAtiva === "composicao" && eComposicao && (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">
                Define quais <strong className="text-foreground">materiais do stock</strong> este produto consome para produzir <strong className="text-foreground">1 unidade</strong>.
                Quando o produto for incluído num orçamento, os materiais abaixo serão utilizados automaticamente.
              </p>
            </div>

            <div className="space-y-2">
              {composicao.length === 0 && (
                <p className="text-[11px] text-muted-foreground">Sem componentes — clique &quot;Adicionar componente&quot; para começar.</p>
              )}
              {composicao.map((comp, ci) => (
                <div key={ci} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-8 sm:col-span-9 flex flex-col gap-1.5">
                    <select
                      value={comp.material_id || ""}
                      onChange={(e) => setComponente(ci, "material_id", e.target.value)}
                      className={inputCls}
                      aria-label="Componente"
                    >
                      <option value="">Selecionar material...</option>
                      {candidatosComposicao.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome || m.nome_tecnico} — {m.unidade || "un"}
                          {Number(m.quantidade) > 0 ? ` (${Number(m.quantidade).toLocaleString("pt-AO")} disp.)` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3 sm:col-span-2 flex flex-col gap-1.5">
                    <NumeroInput
                      value={comp.quantidade}
                      onChange={(e) => setComponente(ci, "quantidade", e.target.value)}
                      className={inputCls}
                      placeholder="Qtd"
                      aria-label="Quantidade por unidade"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeComponente(ci)} title="Remover componente" className="text-error">
                      <Icon name="close" className="text-sm" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={addComponente}>
              <Icon name="add_circle" className="text-sm" /> Adicionar componente
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
