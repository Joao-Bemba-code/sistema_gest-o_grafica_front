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
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import { listarOrdens, requisitarMateriais, aprovarMateriais, removerOrdem } from "@/services/producao";
import { getUsuario } from "@/services/auth";
import { descricaoErroApi } from "@/services/api";
import { podeAtual } from "@/lib/permissoes";
import { situacaoOP, situacaoMaterial, SITUACAO_MATERIAL, temReservas } from "@/lib/producaoStatus";
import SaidaMateriaisModal from "@/components/producao/SaidaMateriaisModal";
import { listar as listarMateriais } from "@/services/materiais";
import { buscarOrganizacao } from "@/services/configuracoes";
import gerarOrdemProducaoPdf from "@/lib/producaoPdf";

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
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const [pdfGerandoId, setPdfGerandoId] = useState(null);
  const [empresa, setEmpresa] = useState({});
  const { addToast } = useToast();
  const podeAprovar = podeAtual("producao", "aprovar");
  const podeEditar = podeAtual("producao", "editar");

  const carregarDados = () => {
    Promise.allSettled([listarOrdens(), listarMateriais(), buscarOrganizacao().catch(() => null)]).then(([ordensRes, materiaisRes, orgRes]) => {
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
      if (orgRes.status === "fulfilled" && orgRes.value) {
        setEmpresa(orgRes.value?.organizacao || orgRes.value || {});
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
    {
      value: "mat_requisicao",
      label: "Por requisitar",
      icon: "inventory_2",
      predicate: (o) => situacaoMaterial(o) === SITUACAO_MATERIAL.aguardando_requisicao,
      count: ops.filter((o) => situacaoMaterial(o) === SITUACAO_MATERIAL.aguardando_requisicao).length,
    },
    {
      value: "mat_liberacao",
      label: "A libertar",
      icon: "lock_clock",
      predicate: (o) => situacaoMaterial(o) === SITUACAO_MATERIAL.aguardando_liberacao,
      count: ops.filter((o) => situacaoMaterial(o) === SITUACAO_MATERIAL.aguardando_liberacao).length,
    },
  ], [ops]);

  const sortOptions = useMemo(() => [
    { value: "", label: "Ordem de entrada" },
    { value: "entrada_desc", label: "Entrada (mais recente)", compare: (a, b) => new Date(b.dataEntrada || 0) - new Date(a.dataEntrada || 0) },
    { value: "entrada_asc", label: "Entrada (mais antiga)", compare: (a, b) => new Date(a.dataEntrada || 0) - new Date(b.dataEntrada || 0) },
    { value: "entrega_asc", label: "Entrega (mais próxima)", compare: (a, b) => new Date(a.dataEntrega || 0) - new Date(b.dataEntrega || 0) },
  ], []);

  const { search, setSearch, activeFilter, setActiveFilter, filtered, total, sortBy, setSortBy } = useFilter({
    items: ops,
    searchFields: ["cliente", "produto", "orcamento", "empresa", "numero"],
    filterConfig,
    sortOptions,
  });

  const bloqueadas = useMemo(() => ops.filter((o) => situacaoMaterial(o)?.bloqueia).length, [ops]);

  const { visiveis, ...pag } = usePaginacao({ items: filtered });

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

  const handlePdf = async (op) => {
    setPdfGerandoId(op.id);
    try {
      await gerarOrdemProducaoPdf(op, empresa, matPorId);
    } catch {
      addToast("Erro ao gerar o PDF da ordem de produção", "error");
    } finally {
      setPdfGerandoId(null);
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

      <section className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
        {[
          ["aguardando", "schedule", "warning"],
          ["em_producao", "construction", "info"],
          ["finalizado", "check_circle", "success"],
          ["entregue", "local_shipping", "secondary"],
        ].map(([key, icon, iconVariant]) => (
          <KpiCard key={key} icon={icon} iconVariant={iconVariant} label={statusConfig[key].label} value={ops.filter((o) => o.status === key).length} />
        ))}
        <KpiCard
          icon="lock_clock"
          iconVariant="warning"
          label="Bloqueadas"
          value={bloqueadas}
          onClick={() => setActiveFilter("mat_liberacao")}
          active={activeFilter === "mat_liberacao"}
        />
      </section>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Pesquisar por cliente, produto, orçamento..."
        filters={filterConfig}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOptions={sortOptions}
        count={total}
        countLabel="OPs"
      />

      {loading ? <CardSkeleton lines={6} /> : (
        <div className="space-y-3">
          {visiveis.map((op) => {
            const sc = situacaoOP(op);
            const matSit = situacaoMaterial(op);
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
                          <span className="font-bold text-sm text-foreground">{op.numero || op.id}</span>
                          <Badge variant={sc.variant || "info"} className="text-[10px]">{sc.label}</Badge>
                          {matSit && matSit !== SITUACAO_MATERIAL.sem_material && matSit !== SITUACAO_MATERIAL.material_liberado && (
                            <Badge variant="destructive" className="text-[10px] animate-msg-in">
                              <Icon name="inventory_2" className="text-[12px]" /> Material por libertar
                            </Badge>
                          )}
                          {op.maquina && (
                            <Badge variant="outline" className="text-[10px]"><Icon name="print" className="text-[12px]" /> {op.maquina}</Badge>
                          )}
                          <button
                            type="button"
                            title="Descarregar a folha de trabalho em PDF"
                            onClick={(e) => { e.stopPropagation(); handlePdf(op); }}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded border border-border/60 hover:border-primary/40"
                          >
                            <Icon name={pdfGerandoId === op.id ? "hourglass_top" : "picture_as_pdf"} className="text-[13px]" />
                            PDF
                          </button>
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
                    {matSit === SITUACAO_MATERIAL.aguardando_requisicao && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            {temReservas(op)
                              ? "Requisição de material pendente — só depois de libertada a OP pode avançar para produção."
                              : "Nenhum material reservado ainda — submeta a requisição para o estoque autorizar a saída."}
                          </p>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); setLibertarOp(op); }}>
                            <Icon name="inventory" className="text-lg" /> Requisição material
                          </Button>
                        </div>
                      </div>
                    )}
                    {matSit === SITUACAO_MATERIAL.aguardando_liberacao && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              <strong>Aguardando libertação de material.</strong> Requisição submetida por{" "}
                              <strong>{op.solicitado_por || "—"}</strong> — a saída de stock só é registada após aprovação no estoque.
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
                    {matSit === SITUACAO_MATERIAL.material_liberado && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            Materiais libertados — saída de stock registada{op.permitido_por ? <> por <strong>{op.permitido_por}</strong></> : ""}. A atribuição da máquina é feita na aba <strong>Processos</strong> (Impressão ou Acabamento).
                          </p>
                          <Badge variant="success" className="text-[10px]">Pronto para produção</Badge>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t flex-wrap">
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handlePdf(op); }}>
                        <Icon name="picture_as_pdf" className="text-[16px]" /> Folha de trabalho (PDF)
                      </Button>
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

      {!loading && ops.length > 0 && filtered.length === 0 && (
        <div className="text-center p-12 text-muted-foreground">
          <Icon name="search_off" className="text-4xl block mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhuma OP corresponde ao filtro</p>
          <p className="text-xs mt-1">Ajuste a pesquisa ou volte ao filtro &quot;Todos&quot;.</p>
        </div>
      )}

      {filtered.length > 0 && <Paginacao {...pag} label="OPs" />}

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