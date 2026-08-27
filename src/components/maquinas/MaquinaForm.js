"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import FornecedorSelect from "@/components/estoque/FornecedorSelect";
import CategoriaSelect from "@/components/estoque/CategoriaSelect";
import UnidadeSelect from "@/components/estoque/UnidadeSelect";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls } from "@/lib/estoque";
import { blankMaquina, estadoMaquinaOptions } from "@/lib/maquinas";

const tabs = [
  { key: "identificacao", label: "Identificação", icon: "badge" },
  { key: "especificacao", label: "Especificação", icon: "precision_manufacturing" },
  { key: "capacidade", label: "Capacidade", icon: "speed" },
  { key: "materiais", label: "Material Consumível", icon: "inventory_2" },
  { key: "manutencao", label: "Manutenção", icon: "handyman" },
  { key: "estoque", label: "Stock", icon: "inventory" },
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

const opcoesMaterialConsumivel = [
  { valor: "material", label: "Material / Substrato", icon: "layers" },
  { valor: "consumivel", label: "Consumíveis", icon: "local_fire_department" },
  { valor: "auxiliar", label: "Auxiliar Técnico", icon: "build" },
  { valor: "desgaste", label: "Peças de Desgaste", icon: "settings" },
];

function SecaoMaterialConsumivel({ itens, onChange }) {
  const alterar = (i, campo, valor) => {
    onChange(itens.map((x, idx) => (idx === i ? { ...x, [campo]: valor } : x)));
  };
  return (
    <div className="space-y-3">
      {itens.length === 0 && (
        <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-outline-variant p-4 text-center">
          Adicione os materiais/substratos consumíveis pela máquina.
        </p>
      )}
      {itens.map((it, i) => (
        <div key={i} className="rounded-xl border border-outline-variant/30 bg-muted/20 p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo</label>
            <select
              value={it.tipo || "material"}
              onChange={(e) => alterar(i, "tipo", e.target.value)}
              className={`${inputCls} mt-1`}
            >
              {opcoesMaterialConsumivel.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-6">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Designação</label>
            <input
              value={it.nome || ""}
              onChange={(e) => alterar(i, "nome", e.target.value)}
              className={`${inputCls} mt-1`}
              placeholder="Ex: Papel Couché 150g, Tinta UV, Sucata..."
            />
          </div>
          <div className="sm:col-span-1 flex items-center justify-end">
            <button
              type="button"
              onClick={() => onChange(itens.filter((_, idx) => idx !== i))}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-error hover:bg-error/10 transition-colors"
              title="Remover"
              aria-label="Remover linha"
            >
              <Icon name="delete" className="text-lg" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...itens, { tipo: "material", nome: "" }])}
        className="w-full py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors"
      >
        <Icon name="add" className="text-lg" /> Adicionar Material Consumível
      </button>
    </div>
  );
}

const tiposManutencao = ["Preventiva", "Corretiva", "Preditiva", "Inspeção", "Lubrificação", "Calibração"];

function SecaoManutencao({ form, onChange, onListItem, manutencoes, onChangeManutencoes }) {
  const alterar = (i, campo, valor) => {
    onChangeManutencoes(manutencoes.map((x, idx) => (idx === i ? { ...x, [campo]: valor } : x)));
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Tipo de Manutenção">
          <input
            list="maq-tipos-manutencao"
            value={form.manutencao_tipo || ""}
            onChange={(e) => onChange("manutencao_tipo", e.target.value)}
            className={inputCls}
            placeholder="Ex: Preventiva"
          />
          <datalist id="maq-tipos-manutencao">
            {tiposManutencao.map((o) => <option key={o} value={o} />)}
          </datalist>
        </Campo>
        <Campo label="Periodicidade">
          <input
            value={form.manutencao_periodicidade || ""}
            onChange={(e) => onChange("manutencao_periodicidade", e.target.value)}
            className={inputCls}
            placeholder="Ex: Mensal, a cada 500h de uso..."
          />
        </Campo>
        <Campo label="Última Manutenção">
          <input type="date" value={form.ultima_manutencao || ""} onChange={(e) => onChange("ultima_manutencao", e.target.value)} className={inputCls} />
        </Campo>
        <Campo label="Próxima Manutenção">
          <input type="date" value={form.proxima_manutencao || ""} onChange={(e) => onChange("proxima_manutencao", e.target.value)} className={inputCls} />
        </Campo>
      </div>

      <div>
        <p className="cyber-label mb-2">Intervenções Registadas</p>
        {manutencoes.length === 0 && (
          <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-outline-variant p-4 text-center">
            Sem intervenções registadas. Adicione as manutenções realizadas à máquina.
          </p>
        )}
        {manutencoes.map((m, i) => (
          <div key={i} className="rounded-xl border border-outline-variant/30 bg-muted/20 p-3 mb-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Data</label>
              <input type="date" value={m.data || ""} onChange={(e) => alterar(i, "data", e.target.value)} className={`${inputCls} mt-1`} />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Intervenção</label>
              <input value={m.intervencao || ""} onChange={(e) => alterar(i, "intervencao", e.target.value)} className={`${inputCls} mt-1`} placeholder="Tipo de intervenção" />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Peças Substituídas</label>
              <input value={m.pecas || ""} onChange={(e) => alterar(i, "pecas", e.target.value)} className={`${inputCls} mt-1`} placeholder="Ex: Rolamento 6204" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Paragem (h)</label>
              <NumeroInput value={m.tempo_paragem || ""} onChange={(e) => alterar(i, "tempo_paragem", e.target.value)} className={`${inputCls} mt-1`} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Estado Atual</label>
              <select value={m.estado || ""} onChange={(e) => alterar(i, "estado", e.target.value)} className={`${inputCls} mt-1`}>
                <option value="">—</option>
                {estadoMaquinaOptions.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-1 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onChangeManutencoes(manutencoes.filter((_, idx) => idx !== i))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-error hover:bg-error/10 transition-colors"
                title="Remover"
                aria-label="Remover intervenção"
              >
                <Icon name="delete" className="text-lg" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChangeManutencoes([...manutencoes, { data: "", intervencao: "", pecas: "", tempo_paragem: "", estado: "" }])}
          className="w-full py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors"
        >
          <Icon name="add" className="text-lg" /> Adicionar Intervenção
        </button>
      </div>
    </div>
  );
}

export default function MaquinaForm({ formId = "form-maquina", form, onChange, onSubmit, categorias, fornecedores }) {
  const [tab, setTab] = useState("identificacao");
  const id = (sufixo) => `${formId}-${sufixo}`;
  const catMaquinas = (categorias || []).filter((c) => (c.tipo || "").toLowerCase() === "maquina");

  const aoMudarCategoria = (novaCatId) => {
    onChange("categoria_id", novaCatId);
    const cat = (categorias || []).find((c) => String(c.id) === String(novaCatId));
    if (cat && !form.codigo) {
      const seq = Math.floor(Math.random() * 9000) + 1000;
      onChange("codigo", `MAQ-${seq}`);
    }
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-5">
      <div role="tablist" aria-label="Secções da máquina" className="flex gap-1.5 flex-wrap obsidian-glass cyber-border p-1.5 rounded-xl">
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
            <span className="hidden lg:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${formId}-painel-${tab}`} aria-labelledby={id(`tab-${tab}`)} className="animate-scale-in">
        {tab === "identificacao" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Código">
              <input value={form.codigo || ""} onChange={(e) => onChange("codigo", e.target.value)} className={inputCls} placeholder="Ex: MAQ-0001" />
            </Campo>
            <Campo label="Nome Comum" obrigatorio>
              <input required aria-required="true" value={form.nome_comum || ""} onChange={(e) => onChange("nome_comum", e.target.value)} className={inputCls} placeholder="Ex: Guilhotina Hidráulica" />
            </Campo>
            <Campo label="Nome Técnico">
              <input value={form.nome_tecnico || ""} onChange={(e) => onChange("nome_tecnico", e.target.value)} className={inputCls} placeholder="Ex: FQ-130 PRO" />
            </Campo>
            <Campo label="Categoria">
              <CategoriaSelect
                value={form.categoria_id}
                categorias={catMaquinas}
                onChange={aoMudarCategoria}
                placeholder="Pesquisar categoria de maquinaria..."
              />
            </Campo>
            <Campo label="Sub-família">
              <input value={form.subfamilia || ""} onChange={(e) => onChange("subfamilia", e.target.value)} className={inputCls} placeholder="Ex: Corte, Impressão, Dobra..." />
            </Campo>
            <Campo label="Fornecedor">
              <FornecedorSelect
                value={form.fornecedor || ""}
                onChange={(v) => onChange("fornecedor", v)}
                fornecedores={fornecedores}
                placeholder="Procurar fornecedor ou escrever novo..."
              />
            </Campo>
            <Campo label="Unidade">
              <UnidadeSelect
                value={form.unidade || ""}
                unidades={["un", "linha", "conjunto", "sistema"]}
                onChange={(v) => onChange("unidade", v)}
                placeholder="Pesquisar unidade..."
              />
            </Campo>
            <Campo label="Descrição" full>
              <textarea rows={2} value={form.descricao || ""} onChange={(e) => onChange("descricao", e.target.value)} className={`${inputCls} resize-none`} placeholder="Descrição geral da máquina e da sua função..." />
            </Campo>
          </div>
        )}

        {tab === "especificacao" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Marca">
              <input value={form.marca || ""} onChange={(e) => onChange("marca", e.target.value)} className={inputCls} placeholder="Ex: Heidelberg" />
            </Campo>
            <Campo label="Modelo">
              <input value={form.modelo || ""} onChange={(e) => onChange("modelo", e.target.value)} className={inputCls} placeholder="Ex: GTO 52" />
            </Campo>
            <Campo label="Nº de Série">
              <input value={form.numero_serie || ""} onChange={(e) => onChange("numero_serie", e.target.value)} className={inputCls} placeholder="Ex: SN-123456" />
            </Campo>
            <Campo label="Fabricante">
              <input value={form.fabricante || ""} onChange={(e) => onChange("fabricante", e.target.value)} className={inputCls} placeholder="Ex: Heidelberg GmbH" />
            </Campo>
            <Campo label="Ano de Fabrico">
              <NumeroInput value={form.ano_fabrico || ""} onChange={(e) => onChange("ano_fabrico", e.target.value)} className={inputCls} placeholder="Ex: 2018" />
            </Campo>
            <Campo label="Nº Patrimonial">
              <input value={form.numero_patrimonial || ""} onChange={(e) => onChange("numero_patrimonial", e.target.value)} className={inputCls} placeholder="Ex: PAT-0021" />
            </Campo>
            <Campo label="Estado">
              <select value={form.estado || "operacional"} onChange={(e) => onChange("estado", e.target.value)} className={inputCls}>
                {estadoMaquinaOptions.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
              </select>
            </Campo>
          </div>
        )}

        {tab === "capacidade" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Capacidade Nominal" full>
              <div className="flex items-center gap-2">
                <NumeroInput value={form.capacidade_nominal || ""} onChange={(e) => onChange("capacidade_nominal", e.target.value)} className={inputCls} placeholder="Ex: 15000" />
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">un/h</span>
              </div>
            </Campo>
            <Campo label="Capacidade Prática" full>
              <div className="flex items-center gap-2">
                <NumeroInput value={form.capacidade_pratica || ""} onChange={(e) => onChange("capacidade_pratica", e.target.value)} className={inputCls} placeholder="Ex: 12000" />
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">un/h</span>
              </div>
            </Campo>
            <Campo label="Tempo Médio de Setup">
              <div className="flex items-center gap-2">
                <NumeroInput value={form.tempo_medio_setup || ""} onChange={(e) => onChange("tempo_medio_setup", e.target.value)} className={inputCls} placeholder="Ex: 45" />
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">min</span>
              </div>
            </Campo>
            <Campo label="Eficiência Média">
              <div className="flex items-center gap-2">
                <NumeroInput value={form.eficiencia_media || ""} onChange={(e) => onChange("eficiencia_media", e.target.value)} className={inputCls} placeholder="Ex: 85" />
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">%</span>
              </div>
            </Campo>
            <Campo label="Horas Disponível/Dia">
              <div className="flex items-center gap-2">
                <NumeroInput value={form.horas_disponiveis_dia || ""} onChange={(e) => onChange("horas_disponiveis_dia", e.target.value)} className={inputCls} placeholder="Ex: 16" />
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">h</span>
              </div>
            </Campo>
            <Campo label="Horas Produtivas/Dia">
              <div className="flex items-center gap-2">
                <NumeroInput value={form.horas_produtivas_dia || ""} onChange={(e) => onChange("horas_produtivas_dia", e.target.value)} className={inputCls} placeholder="Ex: 12" />
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">h</span>
              </div>
            </Campo>
            <Campo label="Produção Média">
              <div className="flex items-center gap-2">
                <NumeroInput value={form.producao_media || ""} onChange={(e) => onChange("producao_media", e.target.value)} className={inputCls} placeholder="Ex: 9000" />
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">un/dia</span>
              </div>
            </Campo>
          </div>
        )}

        {tab === "materiais" && (
          <SecaoMaterialConsumivel
            itens={Array.isArray(form.materiais_consumiveis) ? form.materiais_consumiveis : []}
            onChange={(itens) => onChange("materiais_consumiveis", itens)}
          />
        )}

        {tab === "manutencao" && (
          <SecaoManutencao
            form={form}
            onListItem={null}
            manutencoes={Array.isArray(form.manutencoes) ? form.manutencoes : []}
            onChange={onChange}
            onChangeManutencoes={(itens) => onChange("manutencoes", itens)}
          />
        )}

        {tab === "estoque" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Stock Mínimo">
              <NumeroInput value={form.estoque_min || ""} onChange={(e) => onChange("estoque_min", e.target.value)} className={inputCls} placeholder="Ex: 1" />
            </Campo>
            <Campo label="Stock Máximo">
              <NumeroInput value={form.estoque_max || ""} onChange={(e) => onChange("estoque_max", e.target.value)} className={inputCls} placeholder="Ex: 10" />
            </Campo>
            <Campo label="Custo Unitário (Kz)">
              <NumeroInput value={form.custo_unit || ""} onChange={(e) => onChange("custo_unit", e.target.value)} className={inputCls} placeholder="Ex: 2500000" />
            </Campo>
            <Campo label="Margem (%)">
              <NumeroInput value={form.margem || ""} onChange={(e) => onChange("margem", e.target.value)} className={inputCls} placeholder="Ex: 20" />
            </Campo>
            <Campo label="Localização" full>
              <input value={form.localizacao || ""} onChange={(e) => onChange("localizacao", e.target.value)} className={inputCls} placeholder="Ex: Nave A, sector 3" />
            </Campo>
          </div>
        )}
      </div>
    </form>
  );
}
