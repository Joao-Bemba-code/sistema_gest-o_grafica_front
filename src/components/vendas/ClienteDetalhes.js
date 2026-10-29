"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { StatusBadge } from "@/components/ui/Ledger";
import { Button } from "@/components/ui/Button";
import { inputCls } from "@/lib/estoque";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "identidade", label: "Identidade", icon: "person" },
  { key: "contactos", label: "Contactos & Endereço", icon: "phone" },
  { key: "documentos", label: "Observações & Documentos", icon: "attach_file" },
  { key: "historico", label: "Histórico", icon: "history" },
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

function Campo({ label, valor, full, mono, children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="cyber-label">{label}</span>
      {children ?? (
        <div className={cn(
          "min-h-9 w-full rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-sm",
          mono ? "font-mono text-xs text-muted-foreground" : "text-foreground"
        )}>
          {String(valor || "").trim()
            ? valor
            : <span className="text-xs italic text-muted-foreground">—</span>}
        </div>
      )}
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
}) {
  const [tab, setTab] = useState("identidade");
  const ativo = cliente.ativo !== false;
  const unidades = Array.isArray(cliente.unidades_secundarias) ? cliente.unidades_secundarias : [];
  const id = (sufixo) => `detalhes-cliente-${sufixo}`;

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
            <Campo label="Código do Cliente" valor={cliente.codigo || "—"} mono />
            <Campo label="Tipo de Cliente" valor={cliente.tipo_cliente} />
            <Campo label="Nome / Razão Social" valor={cliente.nome} />
            <Campo label="NIF" valor={cliente.nif} mono />
            <Campo label="Nome Comercial" valor={cliente.nome_comercial} />
            <Campo label="Segmento" valor={cliente.segmento} />
            <Campo label="Unidade de Negócio Principal" valor={cliente.unidade_negocio} />
            <Campo label="Categoria" valor={cliente.categoria} />
            <Campo label="Setor de Actividade" valor={cliente.setor_atividade} />
            <Campo label="Responsável Comercial" valor={cliente.responsavel_comercial} />
            <Campo label="Estado">
              <div className="min-h-9 w-full rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 flex items-center">
                <StatusBadge tom={ativo ? "success" : "neutral"}>
                  {ativo ? "Activo" : "Inactivo"}
                </StatusBadge>
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
            <Campo label="Telefone" valor={cliente.telefone} />
            <Campo label="WhatsApp" valor={cliente.whatsapp} />
            <Campo label="E-mail" valor={cliente.email} full />
            <Campo label="País" valor={cliente.pais} />
            <Campo label="Província" valor={cliente.provincia} />
            <Campo label="Município" valor={cliente.municipio} />
            <Campo label="Bairro" valor={cliente.bairro} />
            <Campo label="Rua / Avenida" valor={cliente.rua} />
            <Campo label="N.º / Porta" valor={cliente.numero_porta} />
          </div>
        )}

        {tab === "documentos" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Observações" full>
              <div className="min-h-[96px] w-full rounded-lg border border-border bg-muted/40 px-2.5 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {String(cliente.observacoes || "").trim()
                  ? cliente.observacoes
                  : <span className="text-xs italic text-muted-foreground">Sem observações.</span>}
              </div>
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
    </div>
  );
}
