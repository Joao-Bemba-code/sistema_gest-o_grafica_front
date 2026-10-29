"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { StatusBadge } from "@/components/ui/Ledger";
import { Button } from "@/components/ui/Button";
import SugestaoSelect from "@/components/ui/SugestaoSelect";
import { inputCls } from "@/lib/estoque";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS,
  SETORES,
  PROVINCIAS,
  MUNICIPIOS_POR_PROVINCIA,
  MUNICIPIOS_TODOS,
} from "@/lib/clienteReferencias";

const TABS = [
  { key: "identidade", label: "Identidade", icon: "person" },
  { key: "contactos", label: "Contactos & Endereço", icon: "phone" },
  { key: "documentos", label: "Observações & Documentos", icon: "attach_file" },
  { key: "historico", label: "Histórico", icon: "history" },
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

const UNIDADES_SECUNDARIAS = [
  "UN-01 Artes Gráficas",
  "UN-02 Formação Profissional",
  "UN-03 Soluções Digitais",
];

const ESTADO_ORCAMENTO = {
  calculo: { rotulo: "Em cálculo", tom: "primary" },
  aprovado: { rotulo: "Aprovado", tom: "success" },
  expirado: { rotulo: "Expirado", tom: "warning" },
  cancelado: { rotulo: "Cancelado", tom: "neutral" },
  rejeitado: { rotulo: "Rejeitado", tom: "error" },
  anulado: { rotulo: "Anulado", tom: "error" },
};

const ESTADO_PROPOSTA = {
  rascunho: { rotulo: "Rascunho", tom: "warning" },
  recebida: { rotulo: "Recebida", tom: "neutral" },
  enviada: { rotulo: "Enviada", tom: "info" },
  aprovada: { rotulo: "Aprovada", tom: "success" },
  rejeitada: { rotulo: "Rejeitada", tom: "error" },
  expirada: { rotulo: "Expirada", tom: "neutral" },
};

const ESTADO_FATURA = {
  emitida: { rotulo: "Emitida", tom: "info" },
  paga: { rotulo: "Paga", tom: "success" },
  parcial: { rotulo: "Parcial", tom: "warning" },
  vencida: { rotulo: "Vencida", tom: "error" },
  cancelada: { rotulo: "Anulada", tom: "neutral" },
};

const TIPOS_DOCUMENTO = {
  fatura: "Factura",
  recibo: "Recibo",
  proforma: "Pró-forma",
  nota_credito: "Nota de crédito",
};

const ESTADO_ENTREGA = {
  preparar: { rotulo: "Por preparar", tom: "warning" },
  transito: { rotulo: "Em trânsito", tom: "info" },
  entregue: { rotulo: "Entregue", tom: "success" },
};

function estadoEntregaCliente(o) {
  if (o.estado === "entregue" || o.entrega_ok) return "entregue";
  if (o.estado === "finalizado") return "transito";
  return "preparar";
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

function ordenarPorData(lista, campo) {
  const valor = typeof campo === "function" ? campo : (x) => x[campo];
  return [...lista].sort((a, b) =>
    String(valor(b) || "").slice(0, 10).localeCompare(String(valor(a) || "").slice(0, 10))
  );
}

function formatBytes(n) {
  const v = Number(n || 0);
  if (!v) return "—";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-AO");
}

function iconeDocumento(doc) {
  const mime = String(doc.mime || "").toLowerCase();
  return mime.includes("pdf") ? "picture_as_pdf" : "image";
}

function formInicial(c) {
  return {
    tipo_cliente: c.tipo_cliente || "",
    nome: c.nome || "",
    nif: c.nif || "",
    segmento: c.segmento || "",
    unidade_negocio: c.unidade_negocio || "",
    categoria: c.categoria || "",
    setor_atividade: c.setor_atividade || "",
    responsavel_comercial: c.responsavel_comercial || "",
    ativo: c.ativo !== false,
    telefone: c.telefone || "",
    whatsapp: c.whatsapp || "",
    email: c.email || "",
    pais: c.pais || "",
    provincia: c.provincia || "",
    municipio: c.municipio || "",
    bairro: c.bairro || "",
    rua: c.rua || "",
    numero_porta: c.numero_porta || "",
    observacoes: c.observacoes || "",
  };
}

function Campo({ label, full, children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="cyber-label">{label}</span>
      {children}
    </div>
  );
}

function SubTitulo({ children }) {
  return (
    <p className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
      {children}
    </p>
  );
}

function GrupoHistorico({ titulo, icone, itens, children }) {
  return (
    <div className="sm:col-span-2 flex flex-col gap-2">
      <SubTitulo>
        <Icon name={icone} className="text-base" /> {titulo} ({itens.length})
      </SubTitulo>
      {itens.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">Sem {titulo.toLowerCase()}.</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">{children}</div>
      )}
    </div>
  );
}

function LinhaHistorico({ icone, numero, meta, data, badge, extra }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 p-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon name={icone} className="text-[16px] text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{numero}</p>
        {meta && <p className="truncate text-[10px] text-muted-foreground">{meta}</p>}
      </div>
      {extra && (
        <span className="shrink-0 text-xs font-bold text-foreground tabular-nums">{extra}</span>
      )}
      <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">{data}</span>
      <StatusBadge tom={badge.tom}>{badge.rotulo}</StatusBadge>
    </div>
  );
}

export default function ClienteDetalhes({
  cliente,
  historico = {},
  documentos = [],
  carregandoDocs = false,
  ficheirosNovos = [],
  onFicheirosNovos,
  enviandoDocs = false,
  onAnexar,
  onAbrirDocumento,
  onAnularDocumento,
  onAtualizar,
  responsaveis = [],
}) {
  const [tab, setTab] = useState("identidade");
  const [form, setForm] = useState(() => formInicial(cliente));
  const [salvando, setSalvando] = useState(false);
  const ativo = cliente.ativo !== false;
  const unidades = Array.isArray(cliente.unidades_secundarias) ? cliente.unidades_secundarias : [];
  const id = (sufixo) => `detalhes-cliente-${sufixo}`;

  const setCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const sugestoes = useMemo(() => {
    const municipios = form.provincia
      ? MUNICIPIOS_POR_PROVINCIA[form.provincia] || []
      : MUNICIPIOS_TODOS;
    return {
      tipos: TIPOS_CLIENTE,
      unidades: UNIDADES_NEGOCIO,
      categorias: CATEGORIAS,
      setores: SETORES,
      provincias: PROVINCIAS,
      municipios,
      responsaveis: responsaveis.filter((v) => String(v || "").trim()),
    };
  }, [form.provincia, responsaveis]);

  const guardar = async () => {
    if (!onAtualizar) return;
    setSalvando(true);
    try {
      const atualizado = await onAtualizar(form);
      if (atualizado) setForm(formInicial(atualizado));
    } catch {
      // o erro já é mostrado pelo ecrã que abre os detalhes
    } finally {
      setSalvando(false);
    }
  };

  const historicoOrd = {
    orcamentos: ordenarPorData(historico.orcamentos || [], "data"),
    propostas: ordenarPorData(historico.propostas || [], "criada_em"),
    faturas: ordenarPorData(historico.faturas || [], (f) => f.data_emissao || f.data || f.createdAt),
    entregas: ordenarPorData(historico.entregas || [], (o) => o.data_entrega || o.createdAt),
  };
  const temAtividade = ["orcamentos", "propostas", "faturas", "entregas"].some(
    (k) => historicoOrd[k].length > 0
  );

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Secções do cliente" className="flex gap-2 flex-wrap bg-muted/60 border border-border p-1.5 rounded-full">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`${id("painel")}-${t.key}`}
            id={id(`tab-${t.key}`)}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${tab === t.key ? "nav-pill text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name={t.icon} className="text-lg" />
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${id("painel")}-${tab}`} aria-labelledby={id(`tab-${tab}`)} className="animate-fade-up">
        {tab === "identidade" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Código do Cliente">
              <input
                value={cliente.codigo || "—"}
                readOnly
                disabled
                className={`${inputCls} bg-muted/60 cursor-not-allowed`}
              />
            </Campo>
            <Campo label="Tipo de Cliente">
              <SugestaoSelect
                id={id("tipo-cliente")}
                value={form.tipo_cliente}
                opcoes={sugestoes.tipos}
                onChange={(valor) => setCampo("tipo_cliente", valor)}
                placeholder="Selecionar ou escrever..."
                icon="person"
              />
            </Campo>
            <Campo label="Nome / Razão Social">
              <input value={form.nome} onChange={(e) => setCampo("nome", e.target.value)} className={inputCls} />
            </Campo>
            <Campo label="NIF">
              <input value={form.nif} onChange={(e) => setCampo("nif", e.target.value)} className={inputCls} />
            </Campo>
            <Campo label="Segmento">
              <input value={form.segmento} onChange={(e) => setCampo("segmento", e.target.value)} className={inputCls} placeholder="Ex.: Grande conta, PME..." />
            </Campo>
            <Campo label="Unidade de Negócio Principal">
              <SugestaoSelect
                id={id("unidade-negocio")}
                value={form.unidade_negocio}
                opcoes={sugestoes.unidades}
                onChange={(valor) => setCampo("unidade_negocio", valor)}
                placeholder="Selecionar ou escrever..."
                icon="factory"
              />
            </Campo>
            <Campo label="Categoria">
              <SugestaoSelect
                id={id("categoria")}
                value={form.categoria}
                opcoes={sugestoes.categorias}
                onChange={(valor) => setCampo("categoria", valor)}
                placeholder="Selecionar ou escrever..."
                icon="label"
              />
            </Campo>
            <Campo label="Setor de Actividade">
              <SugestaoSelect
                id={id("setor-atividade")}
                value={form.setor_atividade}
                opcoes={sugestoes.setores}
                onChange={(valor) => setCampo("setor_atividade", valor)}
                placeholder="Selecionar ou escrever..."
                icon="factory"
              />
            </Campo>
            <Campo label="Responsável Comercial">
              <SugestaoSelect
                id={id("responsavel")}
                value={form.responsavel_comercial}
                opcoes={sugestoes.responsaveis}
                onChange={(valor) => setCampo("responsavel_comercial", valor)}
                placeholder="Selecionar ou escrever..."
                icon="badge"
              />
            </Campo>
            <Campo label="Estado">
              <div className="flex gap-4 pt-1.5">
                {[
                  { valor: true, rotulo: "Activo" },
                  { valor: false, rotulo: "Inactivo" },
                ].map((o) => (
                  <label key={o.rotulo} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={`${id("estado")}-${cliente.id || "x"}`}
                      checked={o.valor ? form.ativo !== false : form.ativo === false}
                      onChange={() => setCampo("ativo", o.valor)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className={o.valor ? "text-foreground font-medium" : "text-muted-foreground"}>{o.rotulo}</span>
                  </label>
                ))}
              </div>
            </Campo>
            <div className="sm:col-span-2 flex flex-col gap-2">
              <span className="cyber-label">Unidades de Negócio Secundárias</span>
              <div className="flex flex-wrap gap-2">
                {UNIDADES_SECUNDARIAS.map((u) => {
                  const marcada = unidades.includes(u);
                  return (
                    <span
                      key={u}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold ${
                        marcada
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {marcada ? <Icon name="check_circle" className="mr-1.5 text-sm align-[-2px]" /> : null}
                      {u}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "contactos" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Telefone">
              <input value={form.telefone} onChange={(e) => setCampo("telefone", e.target.value)} className={inputCls} placeholder="Ex.: +244 923 456 789" />
            </Campo>
            <Campo label="WhatsApp">
              <input value={form.whatsapp} onChange={(e) => setCampo("whatsapp", e.target.value)} className={inputCls} placeholder="Ex.: +244 923 456 789" />
            </Campo>
            <Campo label="E-mail" full>
              <input type="email" value={form.email} onChange={(e) => setCampo("email", e.target.value)} className={inputCls} placeholder="Ex.: contato@empresa.ao" />
            </Campo>
            <Campo label="País">
              <input value={form.pais} onChange={(e) => setCampo("pais", e.target.value)} className={inputCls} />
            </Campo>
            <Campo label="Província">
              <SugestaoSelect
                id={id("provincia")}
                value={form.provincia}
                opcoes={sugestoes.provincias}
                onChange={(valor) => setCampo("provincia", valor)}
                placeholder="Selecionar ou escrever..."
                icon="pin_drop"
              />
            </Campo>
            <Campo label="Município">
              <SugestaoSelect
                id={id("municipio")}
                value={form.municipio}
                opcoes={sugestoes.municipios}
                onChange={(valor) => setCampo("municipio", valor)}
                placeholder="Selecionar ou escrever..."
                icon="pin_drop"
              />
            </Campo>
            <Campo label="Bairro">
              <input value={form.bairro} onChange={(e) => setCampo("bairro", e.target.value)} className={inputCls} />
            </Campo>
            <Campo label="Rua / Avenida">
              <input value={form.rua} onChange={(e) => setCampo("rua", e.target.value)} className={inputCls} />
            </Campo>
            <Campo label="N.º / Porta">
              <input value={form.numero_porta} onChange={(e) => setCampo("numero_porta", e.target.value)} className={inputCls} />
            </Campo>
          </div>
        )}

        {tab === "documentos" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Observações" full>
              <textarea
                rows={4}
                value={form.observacoes}
                onChange={(e) => setCampo("observacoes", e.target.value)}
                className={`${inputCls} resize-y`}
                placeholder="Notas internas sobre o cliente..."
              />
            </Campo>

            <div className="sm:col-span-2 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="cyber-label">Documentos</span>
                {carregandoDocs && (
                  <span className="text-[10px] text-muted-foreground">a carregar…</span>
                )}
              </div>
              <div className="rounded-xl border border-dashed border-outline-variant p-4">
                {documentos.length === 0 && !carregandoDocs ? (
                  <p className="text-xs italic text-muted-foreground">
                    Ainda não há documentos anexados a este cadastro.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documentos.map((doc) => (
                      <div
                        key={doc.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border border-border/60 p-2.5",
                          doc.anulado && "bg-muted/40"
                        )}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon name={iconeDocumento(doc)} className="text-[16px] text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "truncate text-xs font-semibold",
                            doc.anulado ? "text-muted-foreground line-through" : "text-foreground"
                          )}>
                            {doc.nome_original}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatBytes(doc.tamanho)} · {formatData(doc.createdAt)}
                            {doc.anulado
                              ? ` · Anulado em ${formatData(doc.anulado_em)}${doc.anulado_por ? ` por ${doc.anulado_por}` : ""}`
                              : doc.anexado_por ? ` · Anexado por ${doc.anexado_por}` : ""}
                          </p>
                        </div>
                        {doc.anulado && <StatusBadge tom="neutral">Anulado</StatusBadge>}
                        <button
                          type="button"
                          onClick={() => onAbrirDocumento?.(doc)}
                          className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                          title="Abrir documento"
                        >
                          <Icon name="open_in_new" className="text-[16px]" />
                        </button>
                        {!doc.anulado && (
                          <button
                            type="button"
                            onClick={() => onAnularDocumento?.(doc)}
                            className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                            title="Anular documento"
                          >
                            <Icon name="block" className="text-[16px]" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => onFicheirosNovos?.(Array.from(e.target.files || []))}
                    className={inputCls}
                  />
                  {ficheirosNovos.length > 0 && (
                    <Button size="sm" onClick={onAnexar} loading={enviandoDocs} className="mt-2">
                      <Icon name="upload" className="text-[14px]" />
                      Anexar {ficheirosNovos.length > 1 ? `${ficheirosNovos.length} ficheiros` : "ficheiro"}
                    </Button>
                  )}
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    PDF ou imagem, até 10 MB cada. Os documentos não podem ser eliminados; podem ser anulados e ficam no histórico.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "historico" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!temAtividade ? (
              <p className="sm:col-span-2 text-xs italic text-muted-foreground">
                Ainda não há atividade registada para este cliente.
              </p>
            ) : (
              <>
                <GrupoHistorico titulo="Orçamentos" icone="request_quote" itens={historicoOrd.orcamentos}>
                  {historicoOrd.orcamentos.map((o) => {
                    const estado = o.anulado
                      ? ESTADO_ORCAMENTO.anulado
                      : ESTADO_ORCAMENTO[o.estado] || { rotulo: o.estado || "—", tom: "neutral" };
                    return (
                      <LinhaHistorico
                        key={`orc-${o.id}`}
                        icone="request_quote"
                        numero={o.numero || `#${o.id}`}
                        meta={o.ordem_producao ? `OP ${o.ordem_producao.numero || ""}`.trim() : ""}
                        data={formatData(o.data)}
                        badge={estado}
                        extra={Number(o.total) > 0 ? formatKz(o.total) : ""}
                      />
                    );
                  })}
                </GrupoHistorico>

                <GrupoHistorico titulo="Propostas" icone="description" itens={historicoOrd.propostas}>
                  {historicoOrd.propostas.map((p) => {
                    const estado = p.anulado
                      ? { rotulo: "Anulada", tom: "error" }
                      : ESTADO_PROPOSTA[p.estado] || { rotulo: p.estado || "—", tom: "neutral" };
                    return (
                      <LinhaHistorico
                        key={`prop-${p.id}`}
                        icone="description"
                        numero={p.numero || `#${p.id}`}
                        meta={p.objecto}
                        data={formatData(p.criada_em)}
                        badge={estado}
                      />
                    );
                  })}
                </GrupoHistorico>

                <GrupoHistorico titulo="Facturas" icone="receipt_long" itens={historicoOrd.faturas}>
                  {historicoOrd.faturas.map((f) => {
                    const estado = ESTADO_FATURA[f.estado] || { rotulo: f.estado || "—", tom: "neutral" };
                    return (
                      <LinhaHistorico
                        key={`fat-${f.id}`}
                        icone="receipt_long"
                        numero={f.numero || `#${f.id}`}
                        meta={TIPOS_DOCUMENTO[f.tipo] || f.tipo || ""}
                        data={formatData(f.data_emissao || f.data)}
                        badge={estado}
                        extra={Number(f.total ?? f.valor) > 0 ? formatKz(f.total ?? f.valor) : ""}
                      />
                    );
                  })}
                </GrupoHistorico>

                <GrupoHistorico titulo="Entregas" icone="local_shipping" itens={historicoOrd.entregas}>
                  {historicoOrd.entregas.map((o) => {
                    const estado = ESTADO_ENTREGA[estadoEntregaCliente(o)];
                    return (
                      <LinhaHistorico
                        key={`ent-${o.id}`}
                        icone="local_shipping"
                        numero={o.numero || `OP #${o.id}`}
                        meta={o.orcamento?.numero || ""}
                        data={formatData(o.data_entrega || o.createdAt)}
                        badge={estado}
                      />
                    );
                  })}
                </GrupoHistorico>
              </>
            )}
          </div>
        )}
      </div>

      {tab !== "historico" && (
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" loading={salvando} onClick={guardar}>
            <Icon name="save" className="text-base" /> Guardar alterações
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {ativo ? (
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge tom="success">Activo</StatusBadge> Cliente activo no sistema
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge tom="neutral">Inactivo</StatusBadge> Cadastro inactivo
          </span>
        )}
      </p>
    </div>
  );
}
