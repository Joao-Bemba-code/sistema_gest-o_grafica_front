"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import SugestaoSelect from "@/components/ui/SugestaoSelect";
import { inputCls } from "@/lib/estoque";

const TABS = [
  { key: "identidade", label: "Identidade", icon: "person" },
  { key: "contactos", label: "Contactos & Endereço", icon: "phone" },
  { key: "pessoas", label: "Pessoas & Classificação", icon: "groups" },
  { key: "documentos", label: "Observações & Documentos", icon: "attach_file" },
];

const TIPOS_CLIENTE = [
  "Pessoa singular", "Empresa privada", "Instituição pública", "ONG",
  "Associação/Fundação", "Organismo internacional", "Outro",
];
const SEGMENTOS = ["Grande empresa", "PME", "Microempresa", "Governo", "ONG"];
const UNIDADES_NEGOCIO = [
  "UN-01 Artes Gráficas",
  "UN-02 Formação Profissional",
  "UN-03 Soluções Digitais",
];
const UNIDADES_SECUNDARIAS = [
  "UN-01 Artes Gráficas",
  "UN-02 Formação Profissional",
  "UN-03 Soluções Digitais",
];
const PROVINCIAS = [
  "Luanda", "Benguela", "Huambo", "Huíla", "Namibe", "Cabinda", "Uíge", "Malanje",
  "Bié", "Moxico", "Cuando Cubango", "Cunene", "Lunda Norte", "Lunda Sul", "Zaire",
  "Bengo", "Cuanza Norte", "Cuanza Sul",
];
const MUNICIPIOS = [
  "Luanda", "Cazenga", "Viana", "Cacuaco", "Talatona", "Belas", "Kilamba Kiaxi",
  "Benguela", "Lobito", "Huambo", "Lubango", "Malanje", "Soyo", "Cabinda",
];
const CATEGORIAS = ["Estratégico", "Recorrente", "Regular", "Ocasional", "Potencial"];
const SETORES = [
  "Administração Pública", "Saúde", "Educação e Formação", "Comércio", "Indústria",
  "Construção", "Serviços Profissionais", "Tecnologia e Comunicação",
  "Agricultura e Ambiente", "Outros",
];
const FONTES_ORIGEM = [
  "Indicação", "Visita comercial", "Redes sociais", "Website", "Concurso público",
  "Contacto telefónico", "Parceria institucional", "Outros",
];
const FUNCOES_CONTACTO = [
  "Gerente", "Director-geral", "Director financeiro", "Responsável de compras",
  "Responsável administrativo", "Técnico responsável", "Secretário/Assistente", "Outro",
];

function formatBytes(n) {
  const v = Number(n || 0);
  if (!v) return "—";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
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

function SubTitulo({ children }) {
  return (
    <p className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
      {children}
    </p>
  );
}

export default function ClienteForm({
  formId = "form-cliente",
  form,
  onChange,
  ficheiros = [],
  onFicheiros,
  existentes = [],
}) {
  const [tab, setTab] = useState("identidade");
  const id = (sufixo) => `${formId}-${sufixo}`;

  const unidades = Array.isArray(form.unidades_secundarias) ? form.unidades_secundarias : [];
  const alternarUnidade = (rotulo) => {
    const nova = unidades.includes(rotulo)
      ? unidades.filter((u) => u !== rotulo)
      : [...unidades, rotulo];
    onChange("unidades_secundarias", nova);
  };

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
    return {
      tipos: fundir(TIPOS_CLIENTE, "tipo_cliente"),
      segmentos: fundir(SEGMENTOS, "segmento"),
      unidades: fundir(UNIDADES_NEGOCIO, "unidade_negocio"),
      provincias: fundir(PROVINCIAS, "provincia"),
      municipios: fundir(MUNICIPIOS, "municipio"),
      categorias: fundir(CATEGORIAS, "categoria"),
      setores: fundir(SETORES, "setor_atividade"),
      fontes: fundir(FONTES_ORIGEM, "fonte_origem"),
      funcoes: fundir(FUNCOES_CONTACTO, "pessoa_funcao"),
    };
  }, [existentes]);

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

      <div role="tabpanel" id={`${formId}-painel-${tab}`} aria-labelledby={id(`tab-${tab}`)} className="animate-fade-up">
        {tab === "identidade" && (
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
            <Campo label="Nome / Razão Social" obrigatorio>
              <input required aria-required="true" value={form.nome || ""} onChange={(e) => onChange("nome", e.target.value)} className={inputCls} placeholder="Ex.: Gráfica Esperança, Lda." />
            </Campo>
            <Campo label="NIF" obrigatorio>
              <input required aria-required="true" value={form.nif || ""} onChange={(e) => onChange("nif", e.target.value)} className={inputCls} placeholder="Ex.: 541236987" />
            </Campo>
            <Campo label="Nome Comercial">
              <input value={form.nome_comercial || ""} onChange={(e) => onChange("nome_comercial", e.target.value)} className={inputCls} placeholder="Ex.: Gráfica Esperança" />
            </Campo>
            <Campo label="Segmento">
              <SugestaoSelect
                id={id("segmento")}
                value={form.segmento || ""}
                opcoes={sugestoesTodas.segmentos}
                onChange={(valor) => onChange("segmento", valor)}
                placeholder="Selecionar ou escrever..."
                icon="category"
              />
            </Campo>
            <Campo label="Unidade de Negócio Principal">
              <SugestaoSelect
                id={id("unidade-negocio")}
                value={form.unidade_negocio || ""}
                opcoes={sugestoesTodas.unidades}
                onChange={(valor) => onChange("unidade_negocio", valor)}
                placeholder="Selecionar ou escrever..."
                icon="factory"
              />
            </Campo>
            <div className="sm:col-span-2 flex flex-col gap-2">
              <span className="cyber-label">Unidades de Negócio Secundárias</span>
              <div className="flex flex-wrap gap-2">
                {UNIDADES_SECUNDARIAS.map((u) => {
                  const marcada = unidades.includes(u);
                  return (
                    <label
                      key={u}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-xs font-semibold ${
                        marcada
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={() => alternarUnidade(u)}
                        className="w-3.5 h-3.5 rounded accent-primary"
                      />
                      {u}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "contactos" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Telefone" obrigatorio>
              <input required aria-required="true" value={form.telefone || ""} onChange={(e) => onChange("telefone", e.target.value)} className={inputCls} placeholder="Ex.: +244 923 456 789" />
            </Campo>
            <Campo label="WhatsApp">
              <input value={form.whatsapp || ""} onChange={(e) => onChange("whatsapp", e.target.value)} className={inputCls} placeholder="Ex.: +244 923 456 789" />
            </Campo>
            <Campo label="E-mail" full>
              <input type="email" value={form.email || ""} onChange={(e) => onChange("email", e.target.value)} className={inputCls} placeholder="Ex.: contato@empresa.ao" />
            </Campo>
            <Campo label="País">
              <input value={form.pais || ""} onChange={(e) => onChange("pais", e.target.value)} className={inputCls} placeholder="Ex.: Angola" />
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
            <Campo label="Bairro">
              <input value={form.bairro || ""} onChange={(e) => onChange("bairro", e.target.value)} className={inputCls} placeholder="Ex.: Maianga" />
            </Campo>
            <Campo label="Rua / Avenida">
              <input value={form.rua || ""} onChange={(e) => onChange("rua", e.target.value)} className={inputCls} placeholder="Ex.: Rua Major Kanhangulo" />
            </Campo>
            <Campo label="N.º / Porta">
              <input value={form.numero_porta || ""} onChange={(e) => onChange("numero_porta", e.target.value)} className={inputCls} placeholder="Ex.: 145" />
            </Campo>
          </div>
        )}

        {tab === "pessoas" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SubTitulo>
              <Icon name="person" className="text-base" /> Pessoa de Contacto
            </SubTitulo>
            <Campo label="Nome">
              <input value={form.pessoa_contacto || ""} onChange={(e) => onChange("pessoa_contacto", e.target.value)} className={inputCls} placeholder="Ex.: Ana Domingos" />
            </Campo>
            <Campo label="Função / Cargo">
              <SugestaoSelect
                id={id("funcao")}
                value={form.pessoa_funcao || ""}
                opcoes={sugestoesTodas.funcoes}
                onChange={(valor) => onChange("pessoa_funcao", valor)}
                placeholder="Selecionar ou escrever..."
                icon="person"
              />
            </Campo>
            <Campo label="Telefone Direto">
              <input value={form.pessoa_telefone || ""} onChange={(e) => onChange("pessoa_telefone", e.target.value)} className={inputCls} placeholder="Ex.: +244 923 456 789" />
            </Campo>
            <Campo label="E-mail">
              <input type="email" value={form.pessoa_email || ""} onChange={(e) => onChange("pessoa_email", e.target.value)} className={inputCls} placeholder="Ex.: ana@empresa.ao" />
            </Campo>

            <SubTitulo>
              <Icon name="label" className="text-base" /> Classificação Comercial
            </SubTitulo>
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
            <Campo label="Setor de Actividade">
              <SugestaoSelect
                id={id("setor")}
                value={form.setor_atividade || ""}
                opcoes={sugestoesTodas.setores}
                onChange={(valor) => onChange("setor_atividade", valor)}
                placeholder="Selecionar ou escrever..."
                icon="factory"
              />
            </Campo>
            <Campo label="Fonte de Origem">
              <SugestaoSelect
                id={id("fonte")}
                value={form.fonte_origem || ""}
                opcoes={sugestoesTodas.fontes}
                onChange={(valor) => onChange("fonte_origem", valor)}
                placeholder="Selecionar ou escrever..."
                icon="handshake"
              />
            </Campo>
            <div className="flex flex-col gap-1.5">
              <span className="cyber-label">Estado</span>
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
            <Campo label="Referência Interna">
              <input value={form.referencia_interna || ""} onChange={(e) => onChange("referencia_interna", e.target.value)} className={inputCls} placeholder="Indicação, Concurso, Cliente actual..." />
            </Campo>
          </div>
        )}

        {tab === "documentos" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Observações" full>
              <textarea rows={4} value={form.observacoes || ""} onChange={(e) => onChange("observacoes", e.target.value)} className={`${inputCls} resize-none h-auto py-2.5`} placeholder="Notas adicionais sobre o cliente..." />
            </Campo>

            <div className="sm:col-span-2 flex flex-col gap-2">
              <span className="cyber-label">Documentos</span>
              <div className="rounded-xl border border-dashed border-outline-variant p-4">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-xs font-semibold text-foreground cursor-pointer transition-colors hover:border-primary hover:text-primary">
                  <Icon name="attach_file" className="text-base" />
                  Anexar ficheiros
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => onFicheiros?.(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                </label>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  PDF ou imagem (JPG, PNG, WEBP), até 10 MB cada.
                </p>

                {ficheiros.length === 0 ? (
                  <p className="mt-3 text-xs italic text-muted-foreground">Nenhum documento anexado.</p>
                ) : (
                  <div className="mt-3 divide-y divide-border/50">
                    {ficheiros.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center gap-2.5 py-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon name={String(f.name || "").toLowerCase().includes(".pdf") ? "picture_as_pdf" : "image"} className="text-[16px] text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">{f.name}</p>
                          <p className="text-[10px] text-muted-foreground">{formatBytes(f.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onFicheiros?.(ficheiros.filter((_, fi) => fi !== i))}
                          className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                          title="Remover ficheiro"
                        >
                          <Icon name="close" className="text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-destructive">* Campos de preenchimento obrigatório</p>
    </div>
  );
}
