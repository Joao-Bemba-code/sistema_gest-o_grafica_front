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

// Linha de informação só de leitura: rótulo à esquerda, valor à direita.
function Info({ label, value, full, badge }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2.5", full && "sm:col-span-2")}>
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm font-medium text-foreground">
        {badge || (value ? <span className="block truncate">{value}</span> : <span className="text-muted-foreground">—</span>)}
      </span>
    </div>
  );
}

// Ficha do cliente (só de leitura). Para alterar dados usa-se a acção
// "Editar" — aqui o "Ver detalhes" mostra apenas informação.
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

      <div role="tabpanel" id={`${id("painel")}-${tab}`} aria-labelledby={id(`tab-${tab}`)} className="animate-fade-up h-[400px] overflow-y-auto pr-1 custom-scrollbar">
        {tab === "identidade" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Info label="Código do cliente" value={cliente.codigo} />
            <Info label="Tipo de cliente" value={cliente.tipo_cliente} />
            <Info label="Nome / Razão social" value={cliente.nome} />
            <Info label="NIF" value={cliente.nif} />
            <Info label="Segmento" value={cliente.segmento} />
            <Info label="Unidade de negócio" value={cliente.unidade_negocio} />
            <Info label="Categoria" value={cliente.categoria} />
            <Info label="Sector de actividade" value={cliente.setor_atividade} />
            <Info
              label="Estado"
              badge={
                <StatusBadge tom={cliente.anulado ? "error" : ativo ? "success" : "neutral"}>
                  {cliente.anulado ? "Anulado" : ativo ? "Activo" : "Inactivo"}
                </StatusBadge>
              }
            />
            <Info
              label="Unidades secundárias"
              full
              value={unidades.length ? unidades.join(", ") : ""}
            />
            {cliente.anulado && (
              <>
                <Info label="Anulado por" value={cliente.anulado_por} />
                <Info label="Data da anulação" value={formatData(cliente.data_anulacao)} />
                <Info label="Motivo da anulação" value={cliente.motivo_anulacao} full />
              </>
            )}
          </div>
        )}

        {tab === "contactos" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Info label="Telefone" value={cliente.telefone} />
            <Info label="WhatsApp" value={cliente.whatsapp} />
            <Info label="E-mail" value={cliente.email} />
            <Info label="País" value={cliente.pais} />
            <Info label="Província" value={cliente.provincia} />
            <Info label="Município" value={cliente.municipio} />
            <Info label="Bairro" value={cliente.bairro} />
            <Info label="Rua / Avenida" value={cliente.rua} />
            <Info label="N.º / Porta" value={cliente.numero_porta} />
            <Info label="Morada completa" value={cliente.endereco} full />
          </div>
        )}

        {tab === "documentos" && (
          <div className="grid grid-cols-1 gap-2.5">
            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Observações
              </span>
              <p className={cn("mt-1 whitespace-pre-wrap text-sm font-medium", cliente.observacoes ? "text-foreground" : "text-muted-foreground")}>
                {cliente.observacoes || "—"}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Documentos
                </span>
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
        {" · "}Cadastrado em {formatData(cliente.dataCadastro)}
      </p>
    </div>
  );
}
