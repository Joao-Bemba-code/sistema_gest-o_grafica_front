"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import SugestaoSelect from "@/components/ui/SugestaoSelect";
import { inputCls } from "@/lib/estoque";
import {
  CATEGORIAS,
  SETORES,
  PROVINCIAS,
  MUNICIPIOS_POR_PROVINCIA,
  MUNICIPIOS_TODOS,
} from "@/lib/clienteReferencias";

const TABS = [
  { key: "identificacao", label: "01 Identificação do Cliente", icon: "person" },
  { key: "contactos", label: "02 Contactos e Localização", icon: "phone" },
  { key: "classificacao", label: "03 Classificação e Controlo", icon: "groups" },
  { key: "observacoes", label: "04 Observações & Documentos", icon: "attach_file" },
];

const TIPOS_CLIENTE = [
  "Pessoa singular", "Empresa privada", "Instituição pública", "ONG",
  "Associação/Fundação", "Organismo internacional", "Outro",
];
const UNIDADES_NEGOCIO = [
  "UN-01 Artes Gráficas",
  "UN-02 Formação Profissional",
  "UN-03 Soluções Digitais",
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

function formatBytes(n) {
  const v = Number(n || 0);
  if (!v) return "0 B";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClienteForm({
  formId = "form-cliente",
  form,
  onChange,
  existentes = [],
  ficheiros = [],
  onFicheiros,
}) {
  const [tab, setTab] = useState("identificacao");
  const id = (sufixo) => `${formId}-${sufixo}`;

  const sugestoesTodas = useMemo(() => {
    const fundir = (lista, campo) => {
      const mapa = new Map();
      const adicionar = (valor) => {
        const texto = String(valor || "").trim();
        if (texto) mapa.set(texto.toLowerCase(), texto);
      };
      lista.forEach(adicionar);
      for (const c of existentes) adicionar(c[campo]);
      return [...mapa.values()].sort((a, b) => a.localeCompare(b, "pt"));
    };
    // Os municípios sugeridos seguem a província escolhida.
    const municipiosDaProvincia = form.provincia
      ? MUNICIPIOS_POR_PROVINCIA[form.provincia] || []
      : MUNICIPIOS_TODOS;
    return {
      tipos: fundir(TIPOS_CLIENTE, "tipo_cliente"),
      unidades: fundir(UNIDADES_NEGOCIO, "unidade_negocio"),
      provincias: fundir(PROVINCIAS, "provincia"),
      municipios: fundir(municipiosDaProvincia, "municipio"),
      categorias: fundir(CATEGORIAS, "categoria"),
      setores: fundir(SETORES, "setor_atividade"),
    };
  }, [existentes, form.provincia]);

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Secções do cliente" className="flex gap-2 flex-wrap bg-muted/60 border border-border p-1.5 rounded-full">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`${formId}-painel-${t.key}`}
            id={id(`tab-${t.key}`)}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${tab === t.key ? "nav-pill text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name={t.icon} className="text-lg" />
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Altura fixa para o modal não mudar de tamanho ao trocar de secção. */}
      <div role="tabpanel" id={`${formId}-painel-${tab}`} aria-labelledby={id(`tab-${tab}`)} className="animate-fade-up h-[400px] overflow-y-auto pr-1 custom-scrollbar">
        {tab === "identificacao" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Código do Cliente">
              <input
                value={form.codigo || ""}
                readOnly
                disabled
                className={`${inputCls} bg-muted/60 cursor-not-allowed`}
                placeholder="Gerado automaticamente (KCLI-0001)"
              />
            </Campo>
            <Campo label="Tipo de Cliente">
              <SugestaoSelect
                id={id("tipo-cliente")}
                value={form.tipo_cliente || ""}
                opcoes={sugestoesTodas.tipos}
                onChange={(valor) => onChange("tipo_cliente", valor)}
                placeholder="Selecionar ou escrever..."
                icon="person"
              />
            </Campo>
            <Campo label="Nome / Designação Social" obrigatorio>
              <input required aria-required="true" value={form.nome || ""} onChange={(e) => onChange("nome", e.target.value)} className={inputCls} placeholder="Ex.: Gráfica Esperança, Lda." />
            </Campo>
            <Campo label="NIF" obrigatorio>
              <input required aria-required="true" value={form.nif || ""} onChange={(e) => onChange("nif", e.target.value)} className={inputCls} placeholder="Ex.: 541236987" />
            </Campo>
          </div>
        )}

        {tab === "contactos" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Telefone Principal" obrigatorio>
              <input required aria-required="true" value={form.telefone || ""} onChange={(e) => onChange("telefone", e.target.value)} className={inputCls} placeholder="Ex.: +244 923 456 789" />
            </Campo>
            <Campo label="Correio Electrónico">
              <input type="email" value={form.email || ""} onChange={(e) => onChange("email", e.target.value)} className={inputCls} placeholder="Ex.: contato@empresa.ao" />
            </Campo>
            <Campo label="Província">
              <SugestaoSelect
                id={id("provincia")}
                value={form.provincia || ""}
                opcoes={sugestoesTodas.provincias}
                onChange={(valor) => onChange("provincia", valor)}
                placeholder="Selecionar ou escrever..."
                icon="pin_drop"
              />
            </Campo>
            <div className="flex flex-col gap-3">
              <Campo label="Município">
                <SugestaoSelect
                  id={id("municipio")}
                  value={form.municipio || ""}
                  opcoes={sugestoesTodas.municipios}
                  onChange={(valor) => onChange("municipio", valor)}
                  placeholder="Selecionar ou escrever..."
                  icon="pin_drop"
                />
              </Campo>
              <Campo label="Morada">
                <input value={form.endereco || ""} onChange={(e) => onChange("endereco", e.target.value)} className={inputCls} placeholder="Ex.: Rua Major Kanhangulo, 145" />
              </Campo>
            </div>
          </div>
        )}

        {tab === "classificacao" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-3">
              <Campo label="Sector de Actividade">
                <SugestaoSelect
                  id={id("setor")}
                  value={form.setor_atividade || ""}
                  opcoes={sugestoesTodas.setores}
                  onChange={(valor) => onChange("setor_atividade", valor)}
                  placeholder="Selecionar ou escrever..."
                  icon="factory"
                />
              </Campo>
              <Campo label="Categoria">
                <SugestaoSelect
                  id={id("categoria")}
                  value={form.categoria || ""}
                  opcoes={sugestoesTodas.categorias}
                  onChange={(valor) => onChange("categoria", valor)}
                  placeholder="Selecionar ou escrever..."
                  icon="label"
                />
              </Campo>
            </div>
            <Campo label="Unidade de Negócio">
              <SugestaoSelect
                id={id("unidade-negocio")}
                value={form.unidade_negocio || ""}
                opcoes={sugestoesTodas.unidades}
                onChange={(valor) => onChange("unidade_negocio", valor)}
                placeholder="Selecionar ou escrever..."
                icon="factory"
              />
            </Campo>
            <div className="flex flex-col gap-1.5">
              <span className="cyber-label">Estado do Cadastro</span>
              <div className="flex gap-4 pt-2">
                {[
                  { valor: true, rotulo: "Activo" },
                  { valor: false, rotulo: "Inactivo" },
                ].map((o) => (
                  <label key={o.rotulo} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={`${formId}-estado`}
                      checked={o.valor ? form.ativo !== false : form.ativo === false}
                      onChange={() => onChange("ativo", o.valor)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className={o.valor ? "text-foreground font-medium" : "text-muted-foreground"}>{o.rotulo}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "observacoes" && (
          <div className="grid grid-cols-1 gap-4">
            <Campo label="Observações" full>
              <textarea
                rows={4}
                value={form.observacoes || ""}
                onChange={(e) => onChange("observacoes", e.target.value)}
                className={`${inputCls} resize-y`}
                placeholder="Notas internas sobre o cliente..."
              />
            </Campo>
            <Campo label="Documentos" full>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  const novos = Array.from(e.target.files || []);
                  if (novos.length) onFicheiros?.([...ficheiros, ...novos]);
                  e.target.value = "";
                }}
                className={inputCls}
              />
              {ficheiros.length > 0 && (
                <ul className="mt-1 space-y-1">
                  {ficheiros.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
                      <span className="min-w-0 truncate text-foreground">
                        <Icon name="attach_file" className="mr-1.5 text-sm align-[-2px] text-muted-foreground" />
                        {f.name}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-muted-foreground">{formatBytes(f.size)}</span>
                        <button
                          type="button"
                          onClick={() => onFicheiros?.(ficheiros.filter((_, j) => j !== i))}
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                          title="Remover ficheiro"
                        >
                          <Icon name="close" className="text-sm" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                PDF ou imagem, até 10 MB cada. Os documentos são anexados ao guardar o cliente.
              </p>
            </Campo>
          </div>
        )}
      </div>

      <p className="text-[11px] text-destructive">* Campos de preenchimento obrigatório</p>
    </div>
  );
}
