"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";

// Eventos da proposta -> ícone, cor e descrição curta.
const ROTULO_EVENTO = {
  rascunho: { icone: "person_add", tom: "success", texto: "criou a proposta" },
  enviada: { icone: "send", tom: "info", texto: "enviou ao cliente" },
  recebida: { icone: "email", tom: "primary", texto: "registou a recepção pelo cliente" },
  avaliada: { icone: "hourglass_top", tom: "warning", texto: "registou a avaliação" },
  aprovada: { icone: "verified", tom: "success", texto: "aprovou a proposta" },
  rejeitada: { icone: "block", tom: "error", texto: "rejeitou a proposta" },
  anulada: { icone: "block", tom: "error", texto: "anulou a proposta" },
  alteracao: { icone: "edit", tom: "primary", texto: "alterou a proposta" },
  anexo: { icone: "attach_file", tom: "info", texto: "anexou documentos" },
  doc_anulado: { icone: "attach_file", tom: "error", texto: "anulou um documento" },
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

// Grupos para o filtro de tipo.
const GRUPOS = [
  { value: "", rotulo: "Todos os tipos" },
  { value: "criacao", rotulo: "Criação" },
  { value: "movimento", rotulo: "Movimentos de estado" },
  { value: "alteracao", rotulo: "Alterações" },
  { value: "documentos", rotulo: "Documentos" },
  { value: "anulacao", rotulo: "Anulações" },
];

const GRUPO_DE = {
  rascunho: "criacao",
  enviada: "movimento",
  recebida: "movimento",
  avaliada: "movimento",
  aprovada: "movimento",
  rejeitada: "movimento",
  alteracao: "alteracao",
  anexo: "documentos",
  doc_anulado: "documentos",
  anulada: "anulacao",
};

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

function classificarEvento(ev) {
  // Eventos de edição ficam registados com o estado "rascunho", mas com a
  // observação "Alterou: …" — distinguem-se da criação por esse prefixo.
  // Os eventos de anexos são identificados pela observação, qualquer que
  // seja o estado em que a proposta estava.
  const obs = String(ev.observacao || "");
  if (ev.id !== 0 && ev.estado === "rascunho" && /^(Alterou|Guardou)/.test(obs)) {
    return { ...ev, chave: "alteracao" };
  }
  if (/^Anexou /.test(obs)) return { ...ev, chave: "anexo" };
  if (/^Anulou o documento/.test(obs)) return { ...ev, chave: "doc_anulado" };
  return { ...ev, chave: ev.estado };
}

export default function PropostaHistoricoModal({ proposta, eventos = [], carregando = false, onClose }) {
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [termoFiltro, setTermoFiltro] = useState("");

  const lista = useMemo(() => {
    const normalizados = eventos.map(classificarEvento);
    // Um cliente registado implica que alguém o criou: se não existir evento
    // de criação (registos antigos), acrescenta-se um com a data do cadastro.
    if (!normalizados.some((e) => e.chave === "rascunho")) {
      normalizados.push({
        id: 0,
        chave: "rascunho",
        observacao: "Cadastro criado antes do registo automático de eventos",
        usuario: proposta?.responsavel || null,
        data: proposta?.criada_em || null,
      });
    }
    return normalizados.sort(
      (a, b) => new Date(b.data || 0) - new Date(a.data || 0)
    );
  }, [eventos, proposta]);

  const visiveis = useMemo(() => {
    let res = lista;
    if (tipoFiltro) res = res.filter((e) => GRUPO_DE[e.chave] === tipoFiltro);
    const termo = termoFiltro.trim().toLowerCase();
    if (termo) {
      res = res.filter((e) =>
        `${e.usuario || ""} ${e.observacao || ""}`.toLowerCase().includes(termo)
      );
    }
    return res;
  }, [lista, tipoFiltro, termoFiltro]);

  return (
    <Modal
      open={Boolean(proposta)}
      onClose={onClose}
      title={`Históricos — Proposta ${proposta?.numero || ""}`}
      icon="history"
      size="2xl"
    >
      {proposta && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SubTitulo>
              <Icon name="manage_accounts" className="text-base" /> Quem fez o quê ({visiveis.length}
              {visiveis.length !== lista.length ? ` de ${lista.length}` : ""})
            </SubTitulo>
            {lista.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  value={tipoFiltro}
                  onChange={(e) => setTipoFiltro(e.target.value)}
                  aria-label="Tipo de registo"
                  className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                >
                  {GRUPOS.map((g) => (
                    <option key={g.value} value={g.value}>{g.rotulo}</option>
                  ))}
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
          ) : lista.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              Sem registos de histórico para esta proposta.
            </p>
          ) : visiveis.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              Nenhum registo corresponde aos filtros.
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-0.5">
              {visiveis.map((e) => {
                const info = ROTULO_EVENTO[e.chave] || { icone: "info", tom: "info", texto: e.chave };
                return (
                  <div key={`${e.chave}-${e.id}-${e.data || ""}`} className="flex items-start gap-2.5 rounded-lg border border-border/60 p-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TOM_FUNDO[info.tom]}`}>
                      <Icon name={info.icone} className={`text-[16px] ${TOM_TEXTO[info.tom]}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">
                        <span className={TOM_TEXTO[info.tom]}>{e.usuario || "Utilizador não registado"}</span>{" "}
                        {info.texto}
                      </p>
                      {e.observacao && (
                        <p className="mt-0.5 break-words text-[10px] text-muted-foreground">{e.observacao}</p>
                      )}
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                      {formatDataHora(e.data)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
