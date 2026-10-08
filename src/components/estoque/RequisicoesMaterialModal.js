"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { inputCls } from "@/lib/estoque";

const estados = {
  pendente: { label: "Pendente", variant: "warning" },
  aprovada: { label: "Aprovada", variant: "success" },
  rejeitada: { label: "Rejeitada", variant: "destructive" },
  cancelada: { label: "Cancelada", variant: "info" },
  consumida: { label: "Concluída", variant: "info" },
};

const FILTROS = [
  { value: "pendentes", label: "Pendentes" },
  { value: "todas", label: "Todas" },
  { value: "aprovadas", label: "Aprovadas" },
  { value: "rejeitadas", label: "Rejeitadas" },
];

const ORDEM_ESTADOS = { pendente: 0, aprovada: 1, rejeitada: 2, cancelada: 3, consumida: 4 };

export default function RequisicoesMaterialModal({
  open,
  onClose,
  requisicoes,
  carregando,
  materiaisPorId,
  podeAprovar = false,
  onAprovar,
  onRejeitar,
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("pendentes");
  const [rejeitar, setRejeitar] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [processando, setProcessando] = useState(null);

  const termo = busca.trim().toLowerCase();
  const filtrados = useMemo(() => {
    const base = requisicoes.filter((r) => {
      if (filtro === "pendentes" && r.estado !== "pendente") return false;
      if (filtro === "aprovadas" && r.estado !== "aprovada") return false;
      if (filtro === "rejeitadas" && r.estado !== "rejeitada") return false;
      if (!termo) return true;
      return (
        String(r.numero || "").toLowerCase().includes(termo) ||
        String(r.cliente_nome || "").toLowerCase().includes(termo) ||
        String(r.solicitado_por || "").toLowerCase().includes(termo)
      );
    });
    // O que está pendente aparece sempre primeiro: é o trabalho à espera.
    return [...base].sort(
      (a, b) => (ORDEM_ESTADOS[a.estado] ?? 9) - (ORDEM_ESTADOS[b.estado] ?? 9)
    );
  }, [requisicoes, termo, filtro]);

  const contagens = useMemo(
    () => ({
      pendentes: requisicoes.filter((r) => r.estado === "pendente").length,
      todas: requisicoes.length,
      aprovadas: requisicoes.filter((r) => r.estado === "aprovada").length,
      rejeitadas: requisicoes.filter((r) => r.estado === "rejeitada").length,
    }),
    [requisicoes]
  );

  const pendentes = contagens.pendentes;

  // O `try/finally` é obrigatório: sem ele, um erro inesperado do pai deixa o
  // botão em "a processar" para sempre e o utilizador não sabe o que aconteceu.
  const aprovar = async (r) => {
    setProcessando(r.id);
    try {
      await onAprovar(r);
    } finally {
      setProcessando(null);
    }
  };

  const confirmarRejeicao = async () => {
    if (!rejeitar) return;
    if (!motivo.trim()) return;
    setProcessando(rejeitar.id);
    try {
      const ok = await onRejeitar(rejeitar, motivo);
      if (ok) {
        setRejeitar(null);
        setMotivo("");
      }
    } finally {
      setProcessando(null);
    }
  };

  // Materiais sem stock suficiente são o motivo número um de a aprovação
  // falhar no servidor. Avisar aqui evita a tentativa inútil.
  const semStock = (r) =>
    (r.itens || []).some((i) => {
      const mat = materiaisPorId?.[i.material_id];
      if (!mat) return false;
      const disp = Number(mat.quantidade || 0) - Number(mat.estoque_reservado || 0);
      return disp < Number(i.quantidade || 0);
    });

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Requisições de Material da Produção"
        icon="inventory_2"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex gap-1.5 flex-wrap">
              {FILTROS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFiltro(f.value)}
                  aria-pressed={filtro === f.value}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ease-in-out border ${
                    filtro === f.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline-variant/30 bg-background/40 text-muted-foreground hover:border-outline-variant hover:text-foreground"
                  }`}
                >
                  {f.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] ${filtro === f.value ? "bg-primary/20" : "bg-muted"}`}>
                    {contagens[f.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base" />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nº, cliente ou solicitante..."
                className={`${inputCls} pl-9 h-9 text-xs`}
                aria-label="Pesquisar requisições"
              />
            </div>
          </div>

          {pendentes > 0 && filtro === "pendentes" && (
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <Icon name="hourglass_top" className="text-base shrink-0" />
              {pendentes} requisição{pendentes === 1 ? "" : "ões"} pendente{pendentes === 1 ? "" : "s"}.
              Ao aprovar, o material sai do stock de imediato.
            </p>
          )}

          {carregando ? (
            <p className="text-sm text-muted-foreground text-center py-8">A carregar requisições...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {requisicoes.length === 0
                ? "Não há requisições de material registadas. A produção cria-as na aba Produção → Requisições."
                : "Nenhuma requisição corresponde a este filtro."}
            </p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {filtrados.map((r) => {
                const meta = estados[r.estado] || estados.pendente;
                const bloqueada = r.estado === "pendente" && semStock(r);
                return (
                  <div key={r.id} className="rounded-xl border border-border/60 p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-primary">{r.numero}</span>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                          {!r.cliente_id && (
                            <span className="pill pill-muted text-[9px]">
                              <Icon name="factory" className="text-[11px]" /> Consumo interno
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground mt-1">{r.cliente_nome}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Pedido por {r.solicitado_por || "—"}
                          {r.data_requisicao
                            ? ` em ${new Date(r.data_requisicao).toLocaleDateString("pt-AO")}`
                            : ""}
                        </p>
                      </div>
                      {r.estado === "pendente" && podeAprovar && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            loading={processando === r.id}
                            disabled={bloqueada}
                            title={bloqueada ? "Há materiais sem stock suficiente" : undefined}
                            onClick={() => aprovar(r)}
                          >
                            <Icon name="check" className="text-base" /> Aprovar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejeitar(r)}>
                            <Icon name="close" className="text-base" /> Rejeitar
                          </Button>
                        </div>
                      )}
                      {r.estado === "pendente" && !podeAprovar && (
                        <p className="text-[11px] text-muted-foreground">Aguarda aprovação por um responsável do stock.</p>
                      )}
                    </div>

                    {bloqueada && (
                      <p className="text-[11px] text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2 flex items-start gap-2">
                        <Icon name="warning" className="text-sm shrink-0 mt-px" />
                        Há materiais com stock insuficiente. Aprovar seria recusado pelo servidor — reponha o stock ou
                        peça ao solicitante para ajustar as quantidades.
                      </p>
                    )}

                    <div className="rounded-lg border border-border/60 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr className="text-left text-[10px] tracking-wider text-muted-foreground">
                            <th className="px-3 py-1.5 font-semibold">Material</th>
                            <th className="px-3 py-1.5 font-semibold text-right">Pedido</th>
                            <th className="px-3 py-1.5 font-semibold text-right">Disponível</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {(r.itens || []).map((i) => {
                            const mat = materiaisPorId?.[i.material_id];
                            const disp = mat
                              ? Number(mat.quantidade || 0) - Number(mat.estoque_reservado || 0)
                              : null;
                            const insuficiente = disp != null && disp < Number(i.quantidade || 0);
                            return (
                              <tr key={i.id}>
                                <td className="px-3 py-1.5 text-foreground">
                                  <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{i.codigo}</span>
                                  {i.nome}
                                </td>
                                <td className="px-3 py-1.5 text-right font-mono">
                                  {i.quantidade} {i.unidade}
                                </td>
                                <td
                                  className={`px-3 py-1.5 text-right font-mono ${
                                    insuficiente ? "text-error font-bold" : "text-muted-foreground"
                                  }`}
                                >
                                  {disp == null ? "—" : `${disp} ${i.unidade}`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {r.observacoes && <p className="text-[11px] text-muted-foreground">Obs: {r.observacoes}</p>}
                    {r.motivo_rejeicao && (
                      <p className="text-[11px] text-error font-semibold">Motivo: {r.motivo_rejeicao}</p>
                    )}
                    {r.aprovado_por && r.estado !== "pendente" && (
                      <p className="text-[11px] text-muted-foreground">Processada por {r.aprovado_por}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(rejeitar)}
        onClose={() => { setRejeitar(null); setMotivo(""); }}
        onConfirm={confirmarRejeicao}
        title="Rejeitar requisição"
        description={rejeitar ? `Indique o motivo da rejeição da requisição ${rejeitar.numero}.` : ""}
        confirmLabel="Rejeitar"
        cancelLabel="Voltar"
        icon="cancel"
        tone="destructive"
      >
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className={inputCls}
          placeholder="Motivo da rejeição"
        />
      </ConfirmDialog>
    </>
  );
}
