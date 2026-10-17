"use client";

import { useEffect, useState, useMemo } from "react";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import RowMenu from "@/components/ui/RowMenu";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import {
  Ledger,
  LedgerHeader,
  FilterRow,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
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
  aguardando: { label: "Em preparação", badge: "border-transparent bg-warning/15 text-warning" },
  em_producao: { label: "Em produção", badge: "border-transparent bg-info/15 text-info" },
  finalizado: { label: "Concluída", badge: "border-transparent bg-success/15 text-success" },
  entregue: { label: "Entregue", badge: "border-transparent bg-muted text-muted-foreground" },
};

const reservaEstado = {
  ativa: { label: "Ativa", tom: "warning" },
  parcial: { label: "Parcial", tom: "info" },
  consumida: { label: "Consumida", tom: "success" },
  cancelada: { label: "Cancelada", tom: "neutral" },
};

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

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
    clienteDados: op.cliente && typeof op.cliente === "object" ? op.cliente : null,
    orcamento: orcamentoDados?.numero || op.orcamento || "—",
    orcamentoDados,
    dataEntrada: op.data_entrada || op.dataEntrada || "",
    dataEntrega: op.data_entrega || op.dataEntrega || "",
    processoAtual: op.etapa_atual || op.etapaAtual || derivarProcesso(op),
    maquina: Array.isArray(op.impressaos) ? op.impressaos[0]?.maquina || "" : op.impressao?.maquina || "",
  };
}

const CAMPOS = [
  { value: "cliente", label: "Cliente", obter: (o) => o.cliente || "" },
  { value: "numero", label: "Número", obter: (o) => `${o.numero || ""} ${o.id || ""}` },
  { value: "produto", label: "Artigo", obter: (o) => o.produto || "" },
  { value: "orcamento", label: "Orçamento", obter: (o) => o.orcamento || "" },
  { value: "estado", label: "Estado", obter: (o) => `${o.status || ""}${situacaoMaterial(o)?.bloqueia ? " bloqueada" : ""}` },
];

const STATUS_TABS = [
  { value: "todas", label: "Todas" },
  { value: "aguardando", label: "Em preparação" },
  { value: "em_producao", label: "Em produção" },
  { value: "concluidas", label: "Concluídas" },
  { value: "atrasadas", label: "Atrasadas" },
];

function parseData(v) {
  if (!v) return null;
  const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, d || 1);
}

function estaAtrasada(op, ref) {
  if (!op.dataEntrega || op.status === "finalizado" || op.status === "entregue") return false;
  const d = parseData(op.dataEntrega);
  return d && d < ref;
}

function contarEstado(ops, chave) {
  if (chave === "aguardando") return ops.filter((o) => o.status === "aguardando").length;
  if (chave === "em_producao") return ops.filter((o) => o.status === "em_producao").length;
  if (chave === "concluidas") return ops.filter((o) => o.status === "finalizado" || o.status === "entregue").length;
  return 0;
}

export default function OrdensTab() {
  const [ops, setOps] = useState([]);
  const [detalhe, setDetalhe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [materiais, setMateriais] = useState([]);
  const [libertarOp, setLibertarOp] = useState(null);
  const [aprovarOp, setAprovarOp] = useState(null);
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const [pdfGerandoId, setPdfGerandoId] = useState(null);
  const [empresa, setEmpresa] = useState({});
  const [filtro, setFiltro] = useState({ campo: "cliente", operador: "contem", termo: "" });
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [statusFiltro, setStatusFiltro] = useState("todas");
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const { addToast } = useToast();
  const podeAprovar = podeAtual("producao", "aprovar");

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

  const hojeRef = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const resultado = useMemo(() => {
    let res = [...ops];
    if (statusFiltro === "concluidas") res = res.filter((o) => o.status === "finalizado" || o.status === "entregue");
    else if (statusFiltro === "atrasadas") res = res.filter((o) => estaAtrasada(o, hojeRef));
    else if (statusFiltro !== "todas") res = res.filter((o) => o.status === statusFiltro);
    const termo = filtro.termo.trim().toLowerCase();
    if (termo) {
      const cfg = CAMPOS.find((c) => c.value === filtro.campo) || CAMPOS[0];
      res = res.filter((o) => {
        const alvo = String(cfg.obter(o) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (ordem.chave === "numero") res.sort((a, b) => String(a.numero || "").localeCompare(String(b.numero || ""), "pt", { numeric: true }) * ordem.dir);
    if (ordem.chave === "quantidade") res.sort((a, b) => (Number(a.quantidade || 0) - Number(b.quantidade || 0)) * ordem.dir);
    if (ordem.chave === "dataEntrada") res.sort((a, b) => (new Date(a.dataEntrada || 0) - new Date(b.dataEntrada || 0)) * ordem.dir);
    if (ordem.chave === "dataEntrega") res.sort((a, b) => (new Date(a.dataEntrega || 0) - new Date(b.dataEntrega || 0)) * ordem.dir);
    return res;
  }, [ops, filtro, ordem, statusFiltro, hojeRef]);

  const bloqueadas = useMemo(() => ops.filter((o) => situacaoMaterial(o)?.bloqueia).length, [ops]);
  const { visiveis, ...pag } = usePaginacao({ items: resultado });

  const kpis = [
    { chave: "aguardando", label: "Em preparação", icone: "schedule", tom: "bg-primary/10 text-primary", alerta: false },
    { chave: "em_producao", label: "Em produção", icone: "precision_manufacturing", tom: "bg-info/10 text-info", alerta: false },
    { chave: "concluidas", label: "Concluídas", icone: "task_alt", tom: "bg-success/10 text-success", alerta: false },
    { chave: "atrasadas", label: "Atrasadas", icone: "error", tom: "bg-error/10 text-error", alerta: true },
  ].map((k) => ({
    ...k,
    valor: k.chave === "atrasadas" ? ops.filter((o) => estaAtrasada(o, hojeRef)).length : contarEstado(ops, k.chave),
  }));

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
      setDetalhe(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao remover ordem", "error");
    } finally {
      setDeletando(false);
    }
  };

  const opDetalhe = detalhe ? ops.find((o) => o.id === detalhe) || null : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border bg-card p-3.5 shadow-xs",
              k.alerta && "border-error/25"
            )}
          >
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", k.tom)}>
              <Icon name={k.icone} className="text-lg" />
            </span>
            <div className="min-w-0">
              <p className={cn("block text-[11px] font-medium leading-tight", k.alerta ? "text-error" : "text-muted-foreground")}>{k.label}</p>
              <p className={cn("text-xl font-bold leading-tight tabular-nums", k.alerta ? "text-error" : "text-foreground")}>{k.valor}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border">
        {STATUS_TABS.map((s) => {
          const ativo = statusFiltro === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusFiltro(s.value)}
              className={cn(
                "-mb-px border-b-2 pb-2 text-xs font-semibold transition-colors",
                ativo ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <Ledger rotulo="Ordens de produção ledger">
        <LedgerHeader
          titulo="Ordens de produção"
          subtitulo={`${ops.length} OPs · criadas manualmente na Produção${bloqueadas > 0 ? ` · ${bloqueadas} bloqueadas` : ""}`}
          onToggleFiltros={() => setFiltrosAbertos((v) => !v)}
          filtrosAbertos={filtrosAbertos}
        />
        {filtrosAbertos && (
          <FilterRow
            campo={filtro.campo}
            setCampo={(v) => setFiltro((f) => ({ ...f, campo: v }))}
            campos={CAMPOS.map(({ value, label }) => ({ value, label }))}
            operador={filtro.operador}
            setOperador={(v) => setFiltro((f) => ({ ...f, operador: v }))}
            termo={filtro.termo}
            setTermo={(v) => setFiltro((f) => ({ ...f, termo: v }))}
            aoLimpar={() => setFiltro((f) => ({ ...f, termo: "" }))}
            placeholder="Pesquisar..."
          />
        )}
        {loading ? (
          <div className="p-4"><CardSkeleton lines={6} /></div>
        ) : (
          <>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "numero" ? { chave: "numero", dir: -p.dir } : { chave: "numero", dir: 1 }))} ativo={ordem.chave === "numero"}>Nº OP</LedgerTh>
                  <LedgerTh>Cliente</LedgerTh>
                  <LedgerTh>Artigo</LedgerTh>
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "quantidade" ? { chave: "quantidade", dir: -p.dir } : { chave: "quantidade", dir: 1 }))} ativo={ordem.chave === "quantidade"}>Tiragem</LedgerTh>
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "dataEntrega" ? { chave: "dataEntrega", dir: -p.dir } : { chave: "dataEntrega", dir: 1 }))} ativo={ordem.chave === "dataEntrega"}>Entrega</LedgerTh>
                  <LedgerTh>Estado</LedgerTh>
                  <LedgerTh className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visiveis.map((op) => {
                  const sc = statusConfig[op.status] || { label: op.status, badge: "border-transparent bg-muted text-muted-foreground" };
                  const matSit = situacaoMaterial(op);
                  const atrasada = estaAtrasada(op, hojeRef);
                  return (
                    <LedgerTr key={op.id} onClick={() => setDetalhe(op.id)}>
                      <LedgerTd className="max-w-44">
                        <IdCell id={op.numero || `OP #${op.id}`} meta={`Entrada: ${formatData(op.dataEntrada)}`} aoAbrir={() => setDetalhe(op.id)} />
                      </LedgerTd>
                      <LedgerTd className="max-w-48"><span className="block truncate text-sm">{op.cliente}</span></LedgerTd>
                      <LedgerTd className="max-w-48">
                        <span className="block truncate">{op.produto || "—"}</span>
                      </LedgerTd>
                      <LedgerTd className="tabular-nums">{op.quantidade ?? "—"}</LedgerTd>
                      <LedgerTd className="text-muted-foreground">{formatData(op.dataEntrega)}</LedgerTd>
                      <LedgerTd>
                        <span className="flex flex-wrap items-center gap-1">
                          {atrasada ? (
                            <StatusBadge tom="neutral" className="border-transparent bg-error/15 px-2.5 py-0.5 text-[11px] font-semibold text-error">
                              Atrasada
                            </StatusBadge>
                          ) : (
                            <StatusBadge tom="neutral" className={cn("px-2.5 py-0.5 text-[11px] font-semibold", sc.badge)}>{sc.label}</StatusBadge>
                          )}
                          {matSit && matSit !== SITUACAO_MATERIAL.sem_material && matSit !== SITUACAO_MATERIAL.material_liberado && (
                            <StatusBadge tom="neutral" className="border-transparent bg-error/15 px-2.5 py-0.5 text-[11px] font-semibold text-error">
                              Material por libertar
                            </StatusBadge>
                          )}
                        </span>
                      </LedgerTd>
                      <LedgerTd>
                        <RowMenu
                          ariaLabel="Ações da ordem"
                          itens={[
                            { icone: "visibility", rotulo: "Ver detalhes", onClick: () => setDetalhe(op.id) },
                            { icone: "picture_as_pdf", rotulo: "Folha de trabalho (PDF)", onClick: () => handlePdf(op) },
                            ...(matSit === SITUACAO_MATERIAL.aguardando_requisicao ? [{ icone: "inventory", rotulo: "Requisição de material", onClick: () => setLibertarOp(op) }] : []),
                            ...(matSit === SITUACAO_MATERIAL.aguardando_liberacao && podeAprovar ? [{ icone: "check_circle", rotulo: "Aprovar requisição", onClick: () => setAprovarOp(op) }] : []),
                            { icone: "delete", rotulo: "Remover OP", danger: true, onClick: () => setEliminarItem(op) },
                          ]}
                        />
                      </LedgerTd>
                    </LedgerTr>
                  );
                })}
              </tbody>
            </LedgerTable>
            {pag.total === 0 && (
              ops.length === 0
                ? <LedgerEmpty icone="construction">Nenhuma ordem de produção — crie uma nova OP</LedgerEmpty>
                : <LedgerEmpty icone="search_off">Nenhuma OP corresponde ao filtro</LedgerEmpty>
            )}
            <Paginacao {...pag} label="OPs" />
          </>
        )}
      </Ledger>

      <Modal
        open={Boolean(opDetalhe)}
        onClose={() => setDetalhe(null)}
        title={`OP ${opDetalhe?.numero || opDetalhe?.id || ""}`}
        icon="construction"
        size="lg"
      >
        {opDetalhe && (() => {
          const matSit = situacaoMaterial(opDetalhe);
          const sc = situacaoOP(opDetalhe);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge tom="neutral" className={cn("px-2.5 py-0.5 text-[11px] font-semibold", statusConfig[opDetalhe.status]?.badge || "border-transparent bg-muted text-muted-foreground")}>
                  {sc?.label || opDetalhe.status}
                </StatusBadge>
                {matSit && matSit !== SITUACAO_MATERIAL.sem_material && matSit !== SITUACAO_MATERIAL.material_liberado && (
                  <StatusBadge tom="neutral" className="border-transparent bg-error/15 px-2.5 py-0.5 text-[11px] font-semibold text-error">Material por libertar</StatusBadge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[
                  { label: "Cliente", value: opDetalhe.cliente },
                  { label: "Produto", value: opDetalhe.produto },
                  { label: "Quantidade", value: opDetalhe.quantidade },
                  { label: "Orçamento", value: opDetalhe.orcamento },
                  { label: "Data Entrada", value: formatData(opDetalhe.dataEntrada) },
                  { label: "Data Entrega", value: formatData(opDetalhe.dataEntrega) },
                  { label: "Empresa", value: opDetalhe.empresa || "—" },
                  { label: "Máquina", value: opDetalhe.maquina || "—" },
                ].map((f) => (
                  <div key={f.label}>
                    <span className="text-muted-foreground text-xs block">{f.label}</span>
                    <span className="font-medium text-foreground">{f.value || "—"}</span>
                  </div>
                ))}
              </div>

              {Array.isArray(opDetalhe.reserva_estoques) && opDetalhe.reserva_estoques.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold text-muted-foreground">Materiais reservados</p>
                  <div className="space-y-1.5">
                    {opDetalhe.reserva_estoques.map((r) => {
                      const rc = reservaEstado[r.estado] || { label: r.estado, tom: "neutral" };
                      return (
                        <div key={r.id} className="flex items-center justify-between gap-2 bg-muted/40 rounded-lg px-3 py-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-foreground truncate">{matPorId[r.material_id]?.nome || `Material #${r.material_id}`}</span>
                            <span className="text-muted-foreground shrink-0">{r.lote ? `Lote ${r.lote}` : ""}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-muted-foreground">{r.quantidade_reservada} reservado{r.quantidade_consumida > 0 ? ` · ${r.quantidade_consumida} consumido` : ""}</span>
                            <StatusBadge tom={rc.tom}>{rc.label}</StatusBadge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {matSit === SITUACAO_MATERIAL.aguardando_requisicao && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
                  <p className="text-xs text-foreground">
                    {temReservas(opDetalhe)
                      ? "Requisição de material pendente — só depois de libertada a OP pode avançar para produção."
                      : "Nenhum material reservado ainda — submeta a requisição para o estoque autorizar a saída."}
                  </p>
                  <Button size="sm" onClick={() => { setDetalhe(null); setLibertarOp(opDetalhe); }}>
                    <Icon name="inventory" className="text-lg" /> Requisição material
                  </Button>
                </div>
              )}
              {matSit === SITUACAO_MATERIAL.aguardando_liberacao && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-foreground">
                      <strong>Aguardando libertação de material.</strong> Requisição submetida por{" "}
                      <strong>{opDetalhe.solicitado_por || "—"}</strong> — a saída de stock só é registada após aprovação no estoque.
                    </p>
                    {podeAprovar && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Tem permissão para aprovar esta requisição.</p>
                    )}
                  </div>
                  {podeAprovar && (
                    <Button size="sm" variant="success" onClick={() => { setDetalhe(null); setAprovarOp(opDetalhe); }}>
                      <Icon name="check_circle" className="text-lg" /> Aprovar requisição
                    </Button>
                  )}
                </div>
              )}
              {matSit === SITUACAO_MATERIAL.material_liberado && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
                  <p className="text-xs text-foreground">
                    Materiais libertados — saída de stock registada{opDetalhe.permitido_por ? <> por <strong>{opDetalhe.permitido_por}</strong></> : ""}. A atribuição da máquina é feita na aba <strong>Processos</strong> (Impressão ou Acabamento).
                  </p>
                  <StatusBadge tom="success">Pronto para produção</StatusBadge>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="secondary" size="sm" onClick={() => handlePdf(opDetalhe)}>
                  <Icon name="picture_as_pdf" className="text-[16px]" /> Folha de trabalho (PDF)
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setEliminarItem(opDetalhe)}>
                  <Icon name="delete" className="text-[16px]" /> Remover OP
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

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
