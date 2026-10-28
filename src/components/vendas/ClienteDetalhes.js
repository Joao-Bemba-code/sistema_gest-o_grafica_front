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
  { key: "pessoas", label: "Pessoas & Classificação", icon: "groups" },
  { key: "documentos", label: "Observações & Documentos", icon: "attach_file" },
];

const UNIDADES_SECUNDARIAS = [
  "UN-01 Artes Gráficas",
  "UN-02 Formação Profissional",
  "UN-03 Soluções Digitais",
];

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

export default function ClienteDetalhes({
  cliente,
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

        {tab === "pessoas" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SubTitulo>
              <Icon name="person" className="text-base" /> Pessoa de Contacto
            </SubTitulo>
            <Campo label="Nome" valor={cliente.pessoa_contacto} />
            <Campo label="Função / Cargo" valor={cliente.pessoa_funcao} />
            <Campo label="Telefone Direto" valor={cliente.pessoa_telefone} />
            <Campo label="E-mail" valor={cliente.pessoa_email} />

            <SubTitulo>
              <Icon name="label" className="text-base" /> Classificação Comercial
            </SubTitulo>
            <Campo label="Categoria" valor={cliente.categoria} />
            <Campo label="Setor de Actividade" valor={cliente.setor_atividade} />
            <Campo label="Fonte de Origem" valor={cliente.fonte_origem} />
            <Campo label="Estado">
              <div className="min-h-9 w-full rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 flex items-center">
                <StatusBadge tom={ativo ? "success" : "neutral"}>
                  {ativo ? "Activo" : "Inactivo"}
                </StatusBadge>
              </div>
            </Campo>
            <Campo label="Referência Interna" valor={cliente.referencia_interna} />
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
      </div>
    </div>
  );
}
