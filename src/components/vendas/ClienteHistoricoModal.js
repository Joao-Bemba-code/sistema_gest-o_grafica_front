"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { StatusBadge } from "@/components/ui/Ledger";

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

// Acções de auditoria -> ícone, cor e descrição curta.
const ROTULO_ACAO = {
  "cliente.criar": { icone: "person_add", tom: "success", texto: "criou o cadastro" },
  "cliente.atualizar": { icone: "edit", tom: "primary", texto: "alterou o cadastro" },
  "cliente.anular": { icone: "block", tom: "error", texto: "anulou o cadastro" },
  "cliente.documento.anexar": { icone: "upload", tom: "info", texto: "anexou documentos" },
  "cliente.documento.anular": { icone: "block", tom: "error", texto: "anulou um documento" },
};

const TOM_TEXTO = {
  success: "text-success",
  primary: "text-primary",
  error: "text-error",
  info: "text-info",
  warning: "text-warning",
};

const TOM_FUNDO = {
  success: "bg-success/10",
  primary: "bg-primary/10",
  error: "bg-error/10",
  info: "bg-info/10",
  warning: "bg-warning/10",
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

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-AO");
}

function formatDataHora(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("pt-AO")} ${d.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}`;
}

function SubTitulo({ children }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
      {children}
    </p>
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

// Modal de histórico do cliente (acção "Históricos" no menu de cada linha):
// mostra quem criou, alterou ou anulou o cadastro e os movimentos comerciais.
export default function ClienteHistoricoModal({ cliente, registos = [], carregando = false, actividade = {}, onClose }) {
  // Filtros do registo de actividade, para facilitar quando há muitos registos.
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [termoFiltro, setTermoFiltro] = useState("");

  const registosVisiveis = useMemo(() => {
    let res = [...registos];
    if (tipoFiltro) res = res.filter((r) => r.acao?.startsWith(tipoFiltro));
    const termo = termoFiltro.trim().toLowerCase();
    if (termo) {
      res = res.filter((r) =>
        `${r.usuario || ""} ${r.detalhe || ""}`.toLowerCase().includes(termo)
      );
    }
    return res;
  }, [registos, tipoFiltro, termoFiltro]);

  const ord = {
    orcamentos: ordenarPorData(actividade.orcamentos || [], "data"),
    propostas: ordenarPorData(actividade.propostas || [], "criada_em"),
    faturas: ordenarPorData(actividade.faturas || [], (f) => f.data_emissao || f.data || f.createdAt),
    entregas: ordenarPorData(actividade.entregas || [], (o) => o.data_entrega || o.createdAt),
  };
  const temMovimentos = ["orcamentos", "propostas", "faturas", "entregas"].some(
    (k) => ord[k].length > 0
  );
  const ehFornecedor = cliente?.tipo === "fornecedor";

  return (
    <Modal
      open={Boolean(cliente)}
      onClose={onClose}
      title={`Históricos — ${cliente?.nome || ""}`}
      icon="history"
      size="2xl"
    >
      {cliente && (
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SubTitulo>
                <Icon name="manage_accounts" className="text-base" /> Quem fez o quê ({registosVisiveis.length}{registosVisiveis.length !== registos.length ? ` de ${registos.length}` : ""})
              </SubTitulo>
              {registos.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value)}
                    aria-label="Tipo de registo"
                    className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  >
                    <option value="">Todos os tipos</option>
                    <option value="cliente.criar">Criações</option>
                    <option value="cliente.atualizar">Alterações</option>
                    <option value="cliente.anular">Anulações</option>
                    <option value="cliente.documento">Documentos</option>
                  </select>
                  <input
                    value={termoFiltro}
                    onChange={(e) => setTermoFiltro(e.target.value)}
                    placeholder="Pesquisar…"
                    aria-label="Pesquisar no histórico"
                    className="h-8 w-36 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  />
                </div>
              )}
            </div>
            {carregando ? (
              <p className="text-xs italic text-muted-foreground">A carregar…</p>
            ) : registos.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                Sem registos de auditoria. Cadastrado em {formatData(cliente.dataCadastro)}.
                {cliente.anulado && cliente.anulado_por
                  ? ` Anulado por ${cliente.anulado_por} em ${formatData(cliente.data_anulacao)}.`
                  : ""}
              </p>
            ) : registosVisiveis.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                Nenhum registo corresponde aos filtros.
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-0.5">
                {registosVisiveis.map((r) => {
                  const info = ROTULO_ACAO[r.acao] || { icone: "info", tom: "info", texto: r.acao };
                  return (
                    <div key={r.id} className="flex items-start gap-2.5 rounded-lg border border-border/60 p-2.5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TOM_FUNDO[info.tom]}`}>
                        <Icon name={info.icone} className={`text-[16px] ${TOM_TEXTO[info.tom]}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground">
                          <span className={TOM_TEXTO[info.tom]}>{r.usuario || "Utilizador não registado"}</span>{" "}
                          {info.texto}
                        </p>
                        {r.detalhe && (
                          <p className="mt-0.5 break-words text-[10px] text-muted-foreground">{r.detalhe}</p>
                        )}
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                        {formatDataHora(r.criado_em)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!ehFornecedor && (
            <div className="flex flex-col gap-2">
              <SubTitulo>
                <Icon name="receipt_long" className="text-base" /> Movimentos comerciais
              </SubTitulo>
              {!temMovimentos ? (
                <p className="text-xs italic text-muted-foreground">
                  Ainda não há movimentos registados para este cliente.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <SubTitulo>Orçamentos ({ord.orcamentos.length})</SubTitulo>
                    {ord.orcamentos.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">Sem orçamentos.</p>
                    ) : (
                      <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                        {ord.orcamentos.map((o) => {
                          const estado = o.anulado
                            ? ESTADO_ORCAMENTO.anulado
                            : ESTADO_ORCAMENTO[o.estado] || { rotulo: o.estado || "—", tom: "neutral" };
                          return (
                            <LinhaHistorico
                              key={`orc-${o.id}`}
                              icone="request_quote"
                              numero={o.numero || `#${o.id}`}
                              data={formatData(o.data)}
                              badge={estado}
                              extra={Number(o.total) > 0 ? formatKz(o.total) : ""}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <SubTitulo>Propostas ({ord.propostas.length})</SubTitulo>
                    {ord.propostas.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">Sem propostas.</p>
                    ) : (
                      <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                        {ord.propostas.map((p) => {
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
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <SubTitulo>Facturas ({ord.faturas.length})</SubTitulo>
                    {ord.faturas.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">Sem facturas.</p>
                    ) : (
                      <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                        {ord.faturas.map((f) => {
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
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <SubTitulo>Entregas ({ord.entregas.length})</SubTitulo>
                    {ord.entregas.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">Sem entregas.</p>
                    ) : (
                      <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                        {ord.entregas.map((o) => {
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
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
