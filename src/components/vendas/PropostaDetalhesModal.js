"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Ledger";
import { useToast } from "@/components/Toast";
import {
  mudarEstado,
  buscarPorId,
  listarDocumentos,
  anexarDocumentos,
  abrirDocumento,
  anularDocumento,
  META_ESTADO,
} from "@/services/propostas";
import { buscarPorId as buscarOrcamento } from "@/services/orcamentos";
import gerarPropostaPdf from "@/lib/propostaPdf";

const TABS = [
  { key: "identificacao", label: "01 Identificação", icon: "description" },
  { key: "especificacao", label: "02 Especificação", icon: "segment" },
  { key: "condicoes", label: "03 Condições", icon: "payments" },
  { key: "documentos", label: "04 Documentos & Acessos", icon: "attach_file" },
  { key: "ciclo", label: "05 Ciclo", icon: "history" },
];

const PASSOS = ["rascunho", "enviada", "recebida", "avaliada", "aprovada"];

const ROTULO_EVENTO = {
  rascunho: "Proposta criada",
  enviada: "Enviada ao cliente",
  recebida: "Recepção confirmada",
  avaliada: "Avaliação registada",
  aprovada: "Aprovada pelo cliente",
  rejeitada: "Rejeitada pelo cliente",
};

function formatarData(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT");
}

function produtosDaProposta(p) {
  if (Array.isArray(p?.produtos) && p.produtos.length) {
    return p.produtos.filter((pr) => pr && String(pr.nome || "").trim());
  }
  if (p?.produto) return [{ nome: p.produto, quantidade: p.quantidade || "" }];
  return [];
}

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

function formatarDataHora(valor) {
  if (!valor) return "";
  const d = new Date(valor);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatBytes(n) {
  const v = Number(n || 0);
  if (!v) return "0 B";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

// Linha de informação só de leitura: rótulo à esquerda, valor à direita.
function Info({ label, value, full, badge }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm font-medium text-foreground">
        {badge || (value ? <span className="block truncate">{value}</span> : <span className="text-muted-foreground">—</span>)}
      </span>
    </div>
  );
}

export default function PropostaDetalhesModal({
  proposta,
  empresa = {},
  onClose,
  onAnular,
  onAtualizada,
  onCriarOrcamento,
  onVerOrcamento,
}) {
  const { addToast } = useToast();
  const [tab, setTab] = useState("identificacao");
  const [aProcessar, setAProcessar] = useState("");
  const [modoRejeicao, setModoRejeicao] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [modoAvaliacao, setModoAvaliacao] = useState(false);
  const [avaliacao, setAvaliacao] = useState("");
  const [aGerarPdf, setAGerarPdf] = useState(false);
  const [documentos, setDocumentos] = useState([]);
  const [carregandoDocs, setCarregandoDocs] = useState(false);
  const [aEnviarDocs, setAEnviarDocs] = useState(false);
  const [anulandoDoc, setAnulandoDoc] = useState("");

  const p = proposta;
  const meta = META_ESTADO[p?.estado] || META_ESTADO.rascunho;

  useEffect(() => {
    if (tab !== "documentos" || !p?.id) return;
    let ativo = true;
    (async () => {
      setCarregandoDocs(true);
      try {
        const docs = await listarDocumentos(p.id);
        if (ativo) setDocumentos(Array.isArray(docs) ? docs : []);
      } catch {
        if (ativo) addToast("Erro ao carregar os documentos", "error");
      } finally {
        if (ativo) setCarregandoDocs(false);
      }
    })();
    return () => { ativo = false; };
  }, [tab, p?.id, addToast]);

  const avancar = async (estado, extra) => {
    setAProcessar(estado);
    try {
      const atual = await mudarEstado(p.id, estado, extra);
      onAtualizada?.(atual);
      addToast(`Proposta ${p.numero} marcada como ${META_ESTADO[estado]?.rotulo?.toLowerCase() || estado}`, "success");
      setModoRejeicao(false);
      setMotivo("");
      setModoAvaliacao(false);
      setAvaliacao("");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao mudar o estado da proposta", "error");
    } finally {
      setAProcessar("");
    }
  };

  const verOrcamento = async () => {
    if (!p.orcamento?.id) return;
    setAProcessar("orcamento");
    try {
      const orc = await buscarOrcamento(p.orcamento.id);
      onVerOrcamento?.(orc);
    } catch {
      addToast("Orçamento não encontrado", "error");
    } finally {
      setAProcessar("");
    }
  };

  const baixarPdf = async () => {
    setAGerarPdf(true);
    try {
      await gerarPropostaPdf(p, empresa || {});
    } catch {
      addToast("Erro ao gerar o PDF da proposta", "error");
    } finally {
      setAGerarPdf(false);
    }
  };

  const refrescarDocumentos = async () => {
    const docs = await listarDocumentos(p.id);
    setDocumentos(Array.isArray(docs) ? docs : []);
    const fresca = await buscarPorId(p.id);
    onAtualizada?.(fresca);
  };

  const escolherAnexos = async (e) => {
    const ficheiros = Array.from(e.target.files || []);
    e.target.value = "";
    if (!ficheiros.length || !p?.id) return;
    setAEnviarDocs(true);
    try {
      await anexarDocumentos(p.id, ficheiros);
      addToast(`${ficheiros.length} documento(s) anexado(s)`, "success");
      await refrescarDocumentos();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao anexar os documentos", "error");
    } finally {
      setAEnviarDocs(false);
    }
  };

  const abrirDoc = async (doc) => {
    try {
      await abrirDocumento(doc.id);
    } catch {
      addToast("Erro ao abrir o documento", "error");
    }
  };

  const anularDoc = async (doc) => {
    setAnulandoDoc(String(doc.id));
    try {
      await anularDocumento(doc.id);
      addToast("Documento anulado", "success");
      await refrescarDocumentos();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao anular o documento", "error");
    } finally {
      setAnulandoDoc("");
    }
  };

  if (!p) return null;

  const eventoPorEstado = {};
  for (const ev of p.eventos || []) {
    if (!eventoPorEstado[ev.estado]) eventoPorEstado[ev.estado] = ev;
  }
  const rejeicao = eventoPorEstado.rejeitada;

  const podeAnular = p.estado !== "anulada";

  const acoes = [];
  if (p.estado === "rascunho") {
    acoes.push(
      <Button key="enviar" type="button" loading={aProcessar === "enviada"} onClick={() => avancar("enviada")}>
        <Icon name="send" className="text-base" /> Enviar ao cliente
      </Button>
    );
  }
  if (p.estado === "enviada") {
    acoes.push(
      <Button key="recebida" type="button" loading={aProcessar === "recebida"} onClick={() => avancar("recebida")}>
        <Icon name="email" className="text-base" /> Marcar recebida
      </Button>
    );
  }
  if (p.estado === "recebida") {
    acoes.push(
      <Button key="avaliar" type="button" onClick={() => setModoAvaliacao(true)}>
        <Icon name="hourglass_top" className="text-base" /> Registar avaliação
      </Button>
    );
  }
  if (p.estado === "avaliada") {
    acoes.push(
      <Button key="aprovar" type="button" variant="success" loading={aProcessar === "aprovada"} onClick={() => avancar("aprovada")}>
        <Icon name="verified" className="text-base" /> Aprovar
      </Button>
    );
  }
  if (p.estado === "aprovada" && !p.orcamento_id) {
    acoes.push(
      <Button key="orcamento" type="button" onClick={() => onCriarOrcamento?.(p)}>
        <Icon name="request_quote" className="text-base" /> Criar orçamento desta proposta
      </Button>
    );
  }
  if (p.estado === "aprovada" && p.orcamento_id) {
    acoes.push(
      <Button key="ver-orcamento" type="button" variant="outline" loading={aProcessar === "orcamento"} onClick={verOrcamento}>
        <Icon name="request_quote" className="text-base" /> Ver orçamento {p.orcamento?.numero || ""}
      </Button>
    );
  }
  if (["enviada", "recebida", "avaliada"].includes(p.estado)) {
    acoes.push(
      <Button key="rejeitar" type="button" variant="destructive" onClick={() => setModoRejeicao(true)}>
        <Icon name="block" className="text-base" /> Rejeitar
      </Button>
    );
  }

  const id = (sufixo) => `detalhes-proposta-${sufixo}`;

  return (
    <Modal
      open={Boolean(p)}
      onClose={onClose}
      title={`Proposta ${p.numero}`}
      icon="description"
      size="2xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={baixarPdf} loading={aGerarPdf}>
              <Icon name="picture_as_pdf" className="text-base" /> PDF
            </Button>
            {podeAnular && (
              <Button type="button" variant="destructive" onClick={() => onAnular?.(p)}>
                <Icon name="block" className="text-base" /> Anular
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
            {acoes}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground break-words">{p.objecto}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {p.unidade_rotulo || p.unidade} · {p.cliente?.empresa || p.cliente?.nome || "Cliente não indicado"}
            </p>
          </div>
          <StatusBadge tom={meta.tom}>{meta.rotulo}</StatusBadge>
        </div>

        {modoAvaliacao && (
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Avaliação do cliente (opcional)</span>
              <textarea
                value={avaliacao}
                onChange={(e) => setAvaliacao(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                placeholder="Ex.: Pediu ajuste no prazo; proposta considerada competitiva…"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setModoAvaliacao(false); setAvaliacao(""); }}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                loading={aProcessar === "avaliada"}
                onClick={() => avancar("avaliada", { avaliacao })}
              >
                Registar avaliação
              </Button>
            </div>
          </div>
        )}

        {modoRejeicao && (
          <div className="rounded-xl border border-error/30 bg-error/5 p-3 space-y-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-error">Motivo da rejeição (opcional)</span>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-error/30"
                placeholder="Ex.: Preço acima do orçamento do cliente"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setModoRejeicao(false); setMotivo(""); }}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                loading={aProcessar === "rejeitada"}
                onClick={() => avancar("rejeitada", { motivo })}
              >
                Confirmar rejeição
              </Button>
            </div>
          </div>
        )}

        <div role="tablist" aria-label="Secções da proposta" className="flex gap-2 flex-wrap bg-muted/60 border border-border p-1.5 rounded-full">
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
          {tab === "identificacao" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Info label="Referência" value={p.numero} />
              <Info label="Versão" value={p.versao} />
              <Info
                label="Estado"
                badge={<StatusBadge tom={meta.tom}>{meta.rotulo}</StatusBadge>}
              />
              <Info label="Tipo de Proposta" value={p.tipo} />
              <Info label="Cliente / Entidade" value={p.cliente?.empresa || p.cliente?.nome} />
              <Info label="Contacto" value={[p.cliente?.telefone, p.cliente?.email].filter(Boolean).join(" · ")} />
              <Info label="Objecto" value={p.objecto} full />
              <Info label="Responsável Comercial" value={p.responsavel_comercial} />
              <Info label="Origem" value={p.origem} />
              <Info label="Unidade de Negócio" value={p.unidade_rotulo || p.unidade} />
              <Info label="Data de Emissão" value={formatarData(p.data_emissao || p.criada_em)} />
              <Info label="Criada por" value={p.responsavel} />
              <Info label="Criada em" value={formatarData(p.criada_em)} />
            </div>
          )}

          {tab === "especificacao" && (
            <div className="grid grid-cols-1 gap-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Info label="Família de Produto" value={p.familia} />
                <Info label="Formato" value={p.formato} />
                <Info label="Cores" value={p.cores} />
                <Info label="Acabamento" value={p.acabamento} full />
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Produtos</span>
                {produtosDaProposta(p).length ? (
                  <ul className="mt-1.5 space-y-1">
                    {produtosDaProposta(p).map((pr, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-foreground">{pr.nome}</span>
                        {pr.quantidade ? <span className="font-mono text-muted-foreground">{pr.quantidade}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Sem produtos indicados.</p>
                )}
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição</span>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{p.descricao || "Sem descrição."}</p>
              </div>
            </div>
          )}

          {tab === "condicoes" && (
            <div className="grid grid-cols-1 gap-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Info label="Validade da Proposta" value={formatarData(p.validade_data)} />
                <Info label="Valor Proposto (KZ)" value={Number(p.valor) ? formatKz(p.valor) : ""} />
                <Info label="Prazo de Execução" value={p.prazo_execucao} />
                <Info label="Prazo de Entrega" value={p.prazo_entrega} />
                <Info label="Local de Entrega" value={p.local_entrega} />
                <Info label="Condições de Entrega" value={p.condicoes_entrega} />
                <Info label="Condições de Pagamento" value={p.condicoes_pagamento} full />
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observações</span>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{p.observacoes || "Sem observações."}</p>
              </div>

              {p.avaliacao && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">Avaliação do cliente</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{p.avaliacao}</p>
                </div>
              )}

              {p.estado === "rejeitada" && (
                <div className="rounded-xl border border-error/30 bg-error/10 p-3">
                  <p className="text-[11px] font-semibold text-error">Motivo da rejeição</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{p.motivo_rejeicao || "Não indicado."}</p>
                </div>
              )}

              {p.estado === "anulada" && (
                <div className="rounded-xl border border-error/30 bg-error/10 p-3">
                  <p className="text-[11px] font-semibold text-error">Motivo da anulação</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{p.motivo_anulacao || "Não indicado."}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[p.anulado_por ? `Anulada por ${p.anulado_por}` : "", formatarData(p.data_anulacao)].filter(Boolean).join(" · ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "documentos" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Info label="Estado Documental" value={p.estado_documental} />
                <Info label="Modelo Documental" value={p.modelo_documental} />
              </div>

              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Anexar documentos</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    disabled={aEnviarDocs}
                    onChange={escolherAnexos}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
                <p className="text-[10px] text-muted-foreground">
                  PDF ou imagem, até 10 MB cada. {aEnviarDocs && "A enviar…"}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Documentos anexados ({documentos.length})
                </p>
                {carregandoDocs ? (
                  <div className="space-y-2" aria-label="A carregar documentos">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : documentos.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Nenhum documento anexado a esta proposta.
                  </p>
                ) : (
                  documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between gap-3 rounded-lg border border-border px-2.5 py-2 ${doc.anulado ? "bg-muted/40 opacity-60" : "bg-muted/40"}`}
                    >
                      <span className="min-w-0 truncate text-xs text-foreground">
                        <Icon name="attach_file" className="mr-1.5 text-sm align-[-2px] text-muted-foreground" />
                        {doc.nome_original}
                        <span className="ml-2 text-muted-foreground">
                          {formatBytes(doc.tamanho)} · {doc.anexado_por || "—"} · {formatarData(doc.createdAt)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {doc.anulado ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-error">
                            Anulado{doc.anulado_por ? ` por ${doc.anulado_por}` : ""}
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => abrirDoc(doc)}
                              className="rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                              title="Abrir documento"
                            >
                              <Icon name="visibility" className="text-base" />
                            </button>
                            <button
                              type="button"
                              onClick={() => anularDoc(doc)}
                              disabled={anulandoDoc === String(doc.id)}
                              className="rounded p-1 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                              title="Anular documento"
                            >
                              <Icon name={anulandoDoc === String(doc.id) ? "spinner" : "block"} className={`text-base ${anulandoDoc === String(doc.id) ? "animate-spin" : ""}`} />
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "ciclo" && (
            <div>
              <ol className="space-y-0">
                {PASSOS.map((estado) => {
                  const ev = eventoPorEstado[estado];
                  const atual = p.estado === estado;
                  return (
                    <li key={estado} className="relative flex gap-3 pb-4 last:pb-0">
                      <span className="relative flex flex-col items-center">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            ev
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          <Icon name={ev ? "check" : META_ESTADO[estado].icone} className="text-sm" />
                        </span>
                        {estado !== PASSOS[PASSOS.length - 1] && (
                          <span className={`mt-1 w-px flex-1 ${ev ? "bg-primary/40" : "bg-border"}`} />
                        )}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className={`text-sm font-medium ${atual ? "text-primary" : ev ? "text-foreground" : "text-muted-foreground"}`}>
                          {ROTULO_EVENTO[estado]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ev ? [formatarDataHora(ev.data), ev.usuario].filter(Boolean).join(" · ") : "Por registar"}
                        </p>
                        {ev?.observacao && ev.estado === "avaliada" && (
                          <p className="mt-0.5 whitespace-pre-wrap text-xs text-foreground">{ev.observacao}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
                {rejeicao && (
                  <li className="relative flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-error bg-error/15 text-error">
                      <Icon name="block" className="text-sm" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-error">{ROTULO_EVENTO.rejeitada}</p>
                      <p className="text-xs text-muted-foreground">
                        {[formatarDataHora(rejeicao.data), rejeicao.usuario].filter(Boolean).join(" · ")}
                      </p>
                      {p.motivo_rejeicao && <p className="mt-0.5 text-xs text-foreground">{p.motivo_rejeicao}</p>}
                    </div>
                  </li>
                )}
              </ol>

              <p className="mt-4 text-xs text-muted-foreground">
                Responsável: {p.responsavel || "—"} · Criada em {formatarData(p.criada_em)}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
