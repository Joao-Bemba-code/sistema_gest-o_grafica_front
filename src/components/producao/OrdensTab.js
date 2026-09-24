"use client";

import { useEffect, useState, useMemo } from "react";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import FilterBar, { useFilter } from "@/components/ui/FilterBar";
import { listarOrdens, requisitarMateriais, aprovarMateriais, finalizarProducao, removerOrdem } from "@/services/producao";
import { getUsuario } from "@/services/auth";
import { descricaoErroApi } from "@/services/api";
import { podeAtual } from "@/lib/permissoes";
import SaidaMateriaisModal from "@/components/producao/SaidaMateriaisModal";
import { listar as listarMateriais } from "@/services/materiais";

const statusConfig = {
  aguardando: { label: "Aguardando", variant: "warning" },
  em_producao: { label: "Em Produção", variant: "info" },
  finalizado: { label: "Finalizado", variant: "success" },
  entregue: { label: "Entregue", variant: "secondary" },
};

const processoLabels = { pre_impressao: "Pré-Impressão", impressao: "Impressão", acabamento: "Acabamento", qualidade: "Qualidade", entrega: "Entrega" };

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

const reservaEstado = {
  ativa: { label: "Ativa", variant: "warning" },
  parcial: { label: "Parcial", variant: "info" },
  consumida: { label: "Consumida", variant: "success" },
  cancelada: { label: "Cancelada", variant: "secondary" },
};

function derivarProcesso(op) {
  if (op.estado === "entregue" || op.entrega_ok) return "entrega";
  if (op.qualidade_ok) return "qualidade";
  if (op.acabamento_ok) return "acabamento";
  if (op.impressao_ok) return "impressao";
  if (op.pre_impressao_ok) return "pre_impressao";
  return "pre_impressao";
}

function normalizar(op) {
  const orcamentoDados = op.orcamento && typeof op.orcamento === "object" ? op.orcamento : null;
  return {
    ...op,
    status: op.estado || op.status || "aguardando",
    cliente: op.cliente?.nome || op.cliente || "—",
    orcamento: orcamentoDados?.numero || op.orcamento || "—",
    orcamentoDados,
    dataEntrada: op.data_entrada || op.dataEntrada || "",
    dataEntrega: op.data_entrega || op.dataEntrega || "",
    processoAtual: op.etapa_atual || op.etapaAtual || derivarProcesso(op),
    maquina: Array.isArray(op.impressaos) ? op.impressaos[0]?.maquina || "" : op.impressao?.maquina || "",
  };
}

export default function OrdensTab() {
  const [ops, setOps] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [materiais, setMateriais] = useState([]);
  const [libertarOp, setLibertarOp] = useState(null);
  const [aprovarOp, setAprovarOp] = useState(null);
  const [finalizarOp, setFinalizarOp] = useState(null);
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const { addToast } = useToast();
  const podeAprovar = podeAtual("producao", "aprovar");
  const podeEditar = podeAtual("producao", "editar");

  const carregarDados = () => {
    Promise.allSettled([listarOrdens(), listarMateriais()]).then(([ordensRes, materiaisRes]) => {
      if (ordensRes.status === "rejected") {
        addToast(`Erro ao carregar ordens — ${descricaoErroApi(ordensRes.reason, "ordens")}`, "error");
        return;
      }
      const ordensData = ordensRes.value;
      setOps((Array.isArray(ordensData) ? ordensData : ordensData?.ordens || []).map(normalizar));
      if (materiaisRes.status === "rejected") {
        setMateriais([]);
        addToast(`Aviso: materiais indisponíveis — ${descricaoErroApi(materiaisRes.reason, "materiais")}`, "warning");
      } else {
        const materiaisData = materiaisRes.value;
        setMateriais(Array.isArray(materiaisData) ? materiaisData : materiaisData?.materiais || []);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matPorId = Object.fromEntries(materiais.map((m) => [m.id, m]));

  const filterConfig = useMemo(() => [
    { value: "todos", label: "Todos", icon: "filter_list", count: ops.length },
    ...Object.entries(statusConfig).map(([k, v]) => ({
      value: k, label: v.label,
      icon: k === "aguardando" ? "schedule" : k === "em_producao" ? "construction" : k === "finalizado" ? "check_circle" : "local_shipping",
      field: "status",
      count: ops.filter((o) => o.status === k).length,
    })),
  ], [ops]);

  const { search, setSearch, activeFilter, setActiveFilter, filtered, total } = useFilter({
    items: ops,
    searchFields: ["cliente", "produto", "orcamento", "empresa"],
    filterConfig,
  });

  const handleLibertar = async (dados = {}) => {
    if (!libertarOp) return false;
    try {
      const todosItens = Array.isArray(dados.itens_materiais) && dados.itens_materiais.length > 0
        ? dados.itens_materiais
        : undefined;
      let atualizada = await requisitarMateriais(libertarOp.id, {
        solicitado_por: dados.solicitado_por,
        observacoes: dados.observacoes,
        itens_materiais: todosItens,
      });
      if (podeAprovar) {
        atualizada = await aprovarMateriais(libertarOp.id, {
          permitido_por: dados.permitido_por || getUsuario()?.nome,
          observacoes: dados.observacoes,
        });
        setOps((prev) => prev.map((o) => (o.id === libertarOp.id ? normalizar(atualizada) : o)));
        addToast(`Requisição da OP ${libertarOp.id} submetida e aprovada — saída de stock registada`, "success");
      } else {
        setOps((prev) => prev.map((o) => (o.id === libertarOp.id ? normalizar(atualizada) : o)));
        addToast(`Requisição da OP ${libertarOp.id} submetida — aguarda aprovação no estoque`, "success");
      }
      return true;
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao submeter a requisição de materiais", "error");
      return false;
    }
  };

  const handleAprovar = async (dados = {}) => {
    if (!aprovarOp) return false;
    try {
      const atualizada = await aprovarMateriais(aprovarOp.id, {
        permitido_por: dados.permitido_por || getUsuario()?.nome,
        observacoes: dados.observacoes,
      });
      setOps((prev) => prev.map((o) => (o.id === aprovarOp.id ? normalizar(atualizada) : o)));
      addToast(`Requisição da OP ${aprovarOp.id} aprovada — saída de stock registada`, "success");
      return true;
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao aprovar materiais", "error");
      return false;
    }
  };

  const confirmarFinalizacao = async () => {
    if (!finalizarOp) return;
    try {
      const atualizada = await finalizarProducao(finalizarOp.id);
      setOps((prev) => prev.map((o) => (o.id === finalizarOp.id ? normalizar(atualizada) : o)));
      addToast(`OP ${finalizarOp.id} finalizada com sucesso — estado atualizado para Finalizado`, "success");
      setFinalizarOp(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao finalizar produção", "error");
    }
  };

  const confirmarEliminacao = async () => {
    if (!eliminarItem) return;
    setDeletando(true);
    try {
      await removerOrdem(eliminarItem.id);
      setOps((prev) => prev.filter((o) => o.id !== eliminarItem.id));
      addToast("Ordem de produção removida com sucesso", "success");
      setEliminarItem(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao remover ordem", "error");
    } finally {
      setDeletando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30">
        <Icon name="auto_awesome" className="text-[20px] text-primary shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Ordens geradas automaticamente</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            As OPs são criadas ao aprovar um orçamento na Área Comercial. Aqui apenas faz a saída de materiais e atribui o operacional de produção.
          </p>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          ["aguardando", "schedule", "warning"],
          ["em_producao", "construction", "info"],
          ["finalizado", "check_circle", "success"],
          ["entregue", "local_shipping", "secondary"],
        ].map(([key, icon, iconVariant]) => (
          <KpiCard key={key} icon={icon} iconVariant={iconVariant} label={statusConfig[key].label} value={ops.filter((o) => o.status === key).length} />
        ))}
      </section>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Pesquisar por cliente, produto, orçamento..."
        filters={filterConfig}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        count={total}
        countLabel="OPs"
      />

      {loading ? <CardSkeleton lines={6} /> : (
        <div className="space-y-3">
          {filtered.map((op) => {
            const sc = statusConfig[op.status];
            const processos = Object.keys(processoLabels);
            const processoIdx = processos.indexOf(op.processoAtual);
            return (
              <Card key={op.id} className="cursor-pointer hover-lift" onClick={() => setSelected(selected === op.id ? null : op.id)}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon name="construction" className="text-primary text-[20px]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{op.id}</span>
                          <Badge variant={sc.variant || "info"} className="text-[10px]">{sc.label}</Badge>
                          {["aguardando", "em_producao"].includes(op.status) && Array.isArray(op.reserva_estoques) && op.reserva_estoques.length > 0 && op.requisicao_estado === "pendente" && (
                            <Badge variant="destructive" className="text-[10px]">Aguardando requisição material</Badge>
                          )}
                          {["aguardando", "em_producao"].includes(op.status) && op.requisicao_estado === "requisitada" && (
                            <Badge variant="warning" className="text-[10px]">Aguardando aprovação</Badge>
                          )}
                          {op.maquina && (
                            <Badge variant="outline" className="text-[10px]"><Icon name="print" className="text-[12px]" /> {op.maquina}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{op.cliente} — {op.produto} ({op.quantidade})</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Entrada: {formatData(op.dataEntrada)}</span>
                      <span>Entrega: {formatData(op.dataEntrega)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1">
                    {processos.map((et, i) => (
                      <div key={et} className="flex-1 flex items-center gap-1">
                        <div className={`h-2 flex-1 rounded-full ${i <= processoIdx ? "bg-primary" : "bg-muted"}`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {processos.map((et) => (
                      <span key={et} className={`text-[9px] ${et === op.processoAtual ? "text-primary font-bold" : "text-muted-foreground"}`}>{processoLabels[et]}</span>
                    ))}
                  </div>

                  {selected === op.id && (
                    <>
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {[
                        { label: "OP", value: op.id },
                        { label: "Cliente", value: op.cliente },
                        { label: "Produto", value: op.produto },
                        { label: "Quantidade", value: op.quantidade },
                        { label: "Orçamento", value: op.orcamento, highlight: "text-primary" },
                        { label: "Data Entrada", value: formatData(op.dataEntrada) },
                        { label: "Data Entrega", value: formatData(op.dataEntrega) },
                        { label: "Empresa", value: op.empresa },
                      ].map((f) => (
                        <div key={f.label}>
                          <span className="text-muted-foreground text-xs block">{f.label}</span>
                          <span className={`font-medium ${f.highlight || "text-foreground"}`}>{f.value || "—"}</span>
                        </div>
                      ))}
                    </div>
                    {Array.isArray(op.reserva_estoques) && op.reserva_estoques.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Materiais Reservados</p>
                        <div className="space-y-1.5">
                          {op.reserva_estoques.map((r) => {
                            const rc = reservaEstado[r.estado] || { label: r.estado, variant: "secondary" };
                            return (
                              <div key={r.id} className="flex items-center justify-between gap-2 bg-muted/40 rounded-lg px-3 py-2 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-medium text-foreground truncate">{matPorId[r.material_id]?.nome || `Material #${r.material_id}`}</span>
                                  <span className="text-muted-foreground shrink-0">{r.lote ? `Lote ${r.lote}` : ""}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-muted-foreground">{r.quantidade_reservada} reservado{r.quantidade_consumida > 0 ? ` · ${r.quantidade_consumida} consumido` : ""}</span>
                                  <Badge variant={rc.variant || "secondary"} className="text-[9px]">{rc.label}</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {["aguardando", "em_producao"].includes(op.status) && op.requisicao_estado === "pendente" && (
                      <div className="mt-4 pt-4 border-t">
                        {Array.isArray(op.reserva_estoques) && op.reserva_estoques.length > 0 ? (
                          <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              Requisição de material pendente — só depois de libertada a OP pode avançar para produção.
                            </p>
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); setLibertarOp(op); }}>
                              <Icon name="inventory" className="text-lg" /> Requisição material
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground bg-muted/40 border border-border/60 rounded-lg px-4 py-3">
                            Esta OP utiliza apenas produto acabado, sem materiais de estoque — pode finalizar diretamente com o botão <strong>Finalizar produção</strong>.
                          </p>
                        )}
                      </div>
                    )}
                    {["aguardando", "em_producao"].includes(op.status) && op.requisicao_estado === "requisitada" && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              Requisição submetida por <strong>{op.solicitado_por || "—"}</strong> — aguarda aprovação no estoque. A saída de stock só é registada após aprovação.
                            </p>
                            {podeAprovar && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Tem permissão para aprovar esta requisição.
                              </p>
                            )}
                          </div>
                          {podeAprovar && (
                            <Button size="sm" variant="success" onClick={(e) => { e.stopPropagation(); setAprovarOp(op); }}>
                              <Icon name="check_circle" className="text-lg" /> Aprovar requisição
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {["aguardando", "em_producao"].includes(op.status) && op.requisicao_estado === "libertada" && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            Materiais libertados — saída de stock registada{op.permitido_por ? <> por <strong>{op.permitido_por}</strong></> : ""}. A atribuição da máquina é feita na aba <strong>Processos</strong> (Impressão ou Acabamento).
                          </p>
                          <Badge variant="success" className="text-[10px]">Pronto para produção</Badge>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      {!["finalizado", "entregue"].includes(op.status) && podeEditar && (!Array.isArray(op.reserva_estoques) || op.reserva_estoques.length === 0) && (
                        <Button variant="success" size="sm" onClick={(e) => { e.stopPropagation(); setFinalizarOp(op); }}>
                          <Icon name="check_circle" className="text-[16px]" /> Finalizar produção
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); setEliminarItem(op); }}>
                        <Icon name="delete" className="text-[16px]" /> Remover OP
                      </Button>
                    </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && ops.length === 0 && (
        <div className="text-center p-12 text-muted-foreground">
          <Icon name="construction" className="text-4xl block mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhuma ordem de produção</p>
          <p className="text-xs mt-1">Aprove um orçamento na Área Comercial e a OP será criada automaticamente.</p>
        </div>
      )}

      <SaidaMateriaisModal
        key={libertarOp?.id ?? "nenhum-saida"}
        open={!!libertarOp}
        op={libertarOp}
        matPorId={matPorId}
        materiais={materiais}
        onClose={() => setLibertarOp(null)}
        onConfirm={handleLibertar}
        nomeUsuario={getUsuario()?.nome || ""}
      />

      <SaidaMateriaisModal
        key={aprovarOp?.id ?? "nenhum-aprovacao"}
        modo="aprovacao"
        open={!!aprovarOp}
        op={aprovarOp}
        matPorId={matPorId}
        materiais={materiais}
        onClose={() => setAprovarOp(null)}
        onConfirm={handleAprovar}
        nomeUsuario={getUsuario()?.nome || ""}
      />

      <ConfirmDialog
        open={Boolean(finalizarOp)}
        onClose={() => setFinalizarOp(null)}
        onConfirm={confirmarFinalizacao}
        title="Finalizar produção"
        description={finalizarOp ? `Confirmar que a OP #${finalizarOp.id} (${finalizarOp.produto || "produção"}) foi concluída? O estado passará diretamente para Finalizado${Array.isArray(finalizarOp.reserva_estoques) && finalizarOp.reserva_estoques.length ? " e as reservas de material serão baixadas do estoque" : ""}.` : ""}
        confirmLabel="Finalizar"
        cancelLabel="Cancelar"
        icon="check_circle"
        tone="success"
      />

      <ConfirmDialog
        open={Boolean(eliminarItem)}
        onClose={() => setEliminarItem(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title="Remover ordem de produção"
        description={eliminarItem ? `Tem a certeza que deseja remover a OP #${eliminarItem.id}? Esta ação não pode ser desfeita.` : ""}
      />
    </div>
  );
}