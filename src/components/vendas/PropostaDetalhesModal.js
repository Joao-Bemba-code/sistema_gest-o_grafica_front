"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Ledger";
import { useToast } from "@/components/Toast";
import { mudarEstado, META_ESTADO } from "@/services/propostas";
import { buscarPorId as buscarOrcamento } from "@/services/orcamentos";
import gerarPropostaPdf from "@/lib/propostaPdf";

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

function formatarDataHora(valor) {
  if (!valor) return "";
  const d = new Date(valor);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Campo({ rotulo, valor, className }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold text-muted-foreground">{rotulo}</p>
      <p className="mt-0.5 text-sm text-foreground break-words">{valor || "—"}</p>
    </div>
  );
}

export default function PropostaDetalhesModal({
  proposta,
  empresa = {},
  onClose,
  onEditar,
  onAnular,
  onAtualizada,
  onCriarOrcamento,
  onVerOrcamento,
}) {
  const { addToast } = useToast();
  const [aProcessar, setAProcessar] = useState("");
  const [modoRejeicao, setModoRejeicao] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [modoAvaliacao, setModoAvaliacao] = useState(false);
  const [avaliacao, setAvaliacao] = useState("");
  const [aGerarPdf, setAGerarPdf] = useState(false);

  const p = proposta;
  const meta = META_ESTADO[p?.estado] || META_ESTADO.rascunho;

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

  if (!p) return null;

  const eventoPorEstado = {};
  for (const ev of p.eventos || []) {
    if (!eventoPorEstado[ev.estado]) eventoPorEstado[ev.estado] = ev;
  }
  const rejeicao = eventoPorEstado.rejeitada;

  const podeEditar = p.estado === "rascunho";
  const podeAnular = p.estado !== "anulada";

  const acoes = [];
  if (p.estado === "rascunho") {
    acoes.push(
      <Button key="editar" type="button" variant="outline" onClick={() => onEditar?.(p)}>
        <Icon name="edit" className="text-base" /> Editar
      </Button>,
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

  return (
    <Modal
      open={Boolean(p)}
      onClose={onClose}
      title={`Proposta ${p.numero}`}
      icon="description"
      size="lg"
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

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo rotulo="Cliente" valor={p.cliente?.empresa || p.cliente?.nome} />
          <Campo rotulo="Contacto" valor={[p.cliente?.telefone, p.cliente?.email].filter(Boolean).join(" · ")} />
          <Campo rotulo="Prazo de execução" valor={p.prazo_execucao} />
          <Campo
            rotulo="Validade"
            valor={p.validade ? `${p.validade} dias${p.validade_data ? ` · até ${formatarData(p.validade_data)}` : ""}` : "—"}
          />
        </div>

        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Descrição</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {p.descricao || "Sem descrição."}
          </p>
        </div>

        {p.avaliacao && (
          <div className="rounded-xl border border-border bg-muted/30 p-3">
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

        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Histórico</p>
          <ol className="mt-2 space-y-0">
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
        </div>

        <p className="text-xs text-muted-foreground">
          Responsável: {p.responsavel || "—"} · Criada em {formatarData(p.criada_em)}
        </p>
      </div>
    </Modal>
  );
}
