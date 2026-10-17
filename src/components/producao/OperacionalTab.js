"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import Modal from "@/components/Modal";
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
import { listarOrdens, salvarImpressao, libertarParaMaquina } from "@/services/producao";
import { listar as listarMaquinas } from "@/services/maquinas";
import { descricaoErroApi } from "@/services/api";
import LibertarMaquinaModal from "@/components/producao/LibertarMaquinaModal";
import MaquinasTab from "@/components/producao/MaquinasTab";
import { getUsuario } from "@/services/auth";

const statusConfig = {
  aguardando: { label: "Aguardando", tom: "warning" },
  em_producao: { label: "Em Produção", tom: "info" },
  finalizado: { label: "Finalizado", tom: "success" },
  entregue: { label: "Entregue", tom: "neutral" },
};

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function normalizar(op) {
  const impRow = Array.isArray(op.impressaos) ? op.impressaos[0] : op.impressao;
  return {
    ...op,
    id: op.id,
    numero: op.numero || op.id,
    status: op.estado || op.status || "aguardando",
    cliente: op.cliente?.nome || op.cliente || "—",
    operacional: impRow?.maquina || "",
    operador: impRow?.operador || "",
    dataInicio: impRow?.data_inicio || "",
    dataFim: impRow?.data_fim || "",
    quantidadeProduzida: impRow?.quantidade_produzida ?? "",
    quantidadeRejeitada: impRow?.quantidade_rejeitada ?? "",
    observacoes: impRow?.observacoes || "",
  };
}

const camposRegisto = [
  { key: "operador", label: "Operador", tipo: "text" },
  { key: "dataInicio", label: "Início", tipo: "datetime-local" },
  { key: "dataFim", label: "Fim", tipo: "datetime-local" },
  { key: "quantidadeProduzida", label: "Produzido", tipo: "number" },
  { key: "quantidadeRejeitada", label: "Rejeitado", tipo: "number" },
];

const CAMPOS = [
  { value: "numero", label: "Nº da OP", obter: (o) => `${o.numero || ""} ${o.id || ""}` },
  { value: "cliente", label: "Cliente", obter: (o) => o.cliente || "" },
  { value: "produto", label: "Produto", obter: (o) => o.produto || "" },
  { value: "operacional", label: "Operacional", obter: (o) => o.operacional || "" },
  { value: "operador", label: "Operador", obter: (o) => o.operador || "" },
];

const inputCls = "h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25 transition-colors";

export default function OperacionalTab() {
  const { addToast } = useToast();
  const [ops, setOps] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registo, setRegisto] = useState({});
  const [detalhe, setDetalhe] = useState(null);
  const [libertarOp, setLibertarOp] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [subTab, setSubTab] = useState("maquinas");
  const [filtro, setFiltro] = useState({ campo: "numero", operador: "contem", termo: "" });
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);

  const carregarDados = useCallback(() => {
    Promise.allSettled([listarOrdens(), listarMaquinas()])
      .then(([ordensRes, maquinasRes]) => {
        if (ordensRes.status === "rejected") {
          addToast(`Erro ao carregar o operacional — ${descricaoErroApi(ordensRes.reason, "ordens")}`, "error");
          return;
        }
        const ordensData = ordensRes.value;
        const arr = (Array.isArray(ordensData) ? ordensData : ordensData?.ordens || []).map(normalizar);
        setOps(arr);
        setRegisto(Object.fromEntries(arr.map((o) => [o.id, {
          operador: o.operador || "",
          dataInicio: o.dataInicio || "",
          dataFim: o.dataFim || "",
          quantidadeProduzida: o.quantidadeProduzida ?? "",
          quantidadeRejeitada: o.quantidadeRejeitada ?? "",
          observacoes: o.observacoes || "",
        }])));
        if (maquinasRes.status === "rejected") {
          setMaquinas([]);
          addToast(`Aviso: máquinas indisponíveis — ${descricaoErroApi(maquinasRes.reason, "máquinas")}`, "warning");
        } else {
          const maquinasData = maquinasRes.value;
          setMaquinas(Array.isArray(maquinasData) ? maquinasData : maquinasData?.data || []);
        }
      })
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const resultado = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...ops];
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
    if (ordem.chave === "dataInicio") res.sort((a, b) => (new Date(a.dataInicio || 0) - new Date(b.dataInicio || 0)) * ordem.dir);
    return res;
  }, [ops, filtro, ordem]);

  const { visiveis, ...pag } = usePaginacao({ items: resultado });

  const totalEmProducao = ops.filter((o) => o.status === "em_producao").length;
  const semOperacional = ops.filter((o) => o.requisicao_estado === "libertada" && !o.operacional).length;
  const operacionaisAtivos = useMemo(
    () => new Set(ops.map((o) => o.operacional).filter(Boolean).map((n) => n.trim().toLowerCase())).size,
    [ops]
  );

  const atualizarCampo = (opId, key, value) => {
    setRegisto((prev) => ({ ...prev, [opId]: { ...(prev[opId] || {}), [key]: value } }));
  };

  const guardarRegisto = async (o) => {
    const r = registo[o.id] || {};
    setGuardando(true);
    try {
      await salvarImpressao(o.id, {
        maquina: o.operacional || "",
        operador: r.operador,
        horaInicio: r.dataInicio,
        horaFim: r.dataFim,
        quantidadeProduzida: Number(r.quantidadeProduzida) || 0,
        quantidadeRejeitada: Number(r.quantidadeRejeitada) || 0,
        observacoes: r.observacoes || "",
      });
      await carregarDados();
      addToast(`Registo do operacional da OP ${o.id} guardado`, "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar o registo", "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleAtribuir = async (dados = {}) => {
    if (!libertarOp) return false;
    try {
      const atualizada = await libertarParaMaquina(libertarOp.id, dados);
      const n = normalizar(atualizada);
      setOps((prev) => prev.map((o) => (o.id === n.id ? n : o)));
      setRegisto((prev) => ({ ...prev, [n.id]: {
        operador: n.operador, dataInicio: n.dataInicio, dataFim: n.dataFim,
        quantidadeProduzida: n.quantidadeProduzida ?? "", quantidadeRejeitada: n.quantidadeRejeitada ?? "",
        observacoes: n.observacoes || "",
      } }));
      addToast(`OP ${libertarOp.id} libertada para o operacional ${n.operacional}`, "success");
      return true;
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao atribuir operacional", "error");
      return false;
    }
  };

  const opDetalhe = detalhe ? ops.find((o) => o.id === detalhe) || null : null;

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
        {[
          { id: "maquinas", label: "Máquinas", icon: "precision_manufacturing" },
          { id: "por_op", label: "Registo por OP", icon: "assignment" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              subTab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} className="text-base" /> {t.label}
          </button>
        ))}
      </div>

      {subTab === "maquinas" ? (
        <MaquinasTab registarEstado />
      ) : (
        <Ledger rotulo="Registo operacional ledger">
          <LedgerHeader
            titulo="Registo operacional"
            subtitulo={`${ops.length} OPs · ${totalEmProducao} em produção · ${semOperacional} sem operacional · ${operacionaisAtivos} operacionais ativos`}
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
              placeholder="Pesquisar por nº OP, cliente, produto, operacional, operador..."
            />
          )}
          {loading ? (
            <div className="p-4"><CardSkeleton lines={5} /></div>
          ) : (
            <>
              <LedgerTable>
                <thead>
                  <tr className="border-b border-border">
                    <LedgerTh onSort={() => setOrdem((p) => (p.chave === "numero" ? { chave: "numero", dir: -p.dir } : { chave: "numero", dir: 1 }))} ativo={ordem.chave === "numero"}>OP</LedgerTh>
                    <LedgerTh>Cliente</LedgerTh>
                    <LedgerTh>Produto</LedgerTh>
                    <LedgerTh>Operacional</LedgerTh>
                    <LedgerTh onSort={() => setOrdem((p) => (p.chave === "dataInicio" ? { chave: "dataInicio", dir: -p.dir } : { chave: "dataInicio", dir: 1 }))} ativo={ordem.chave === "dataInicio"}>Início</LedgerTh>
                    <LedgerTh>Produzido</LedgerTh>
                    <LedgerTh>Estado</LedgerTh>
                    <LedgerTh className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((o) => {
                    const sc = statusConfig[o.status] || { label: o.status, tom: "neutral" };
                    const temOperacional = !!o.operacional;
                    return (
                      <LedgerTr key={o.id} onClick={() => setDetalhe(o.id)}>
                        <LedgerTd className="max-w-36">
                          <IdCell id={o.numero || `OP #${o.id}`} meta={`Qtd ${o.quantidade ?? "—"}`} aoAbrir={() => setDetalhe(o.id)} />
                        </LedgerTd>
                        <LedgerTd className="max-w-44"><span className="block truncate">{o.cliente}</span></LedgerTd>
                        <LedgerTd className="max-w-44"><span className="block truncate">{o.produto || "—"}</span></LedgerTd>
                        <LedgerTd className="max-w-44">
                          {temOperacional ? (
                            <>
                              <span className="block truncate">{o.operacional}</span>
                              <span className="block truncate text-xs text-muted-foreground">{o.operador || "Sem operador"}</span>
                            </>
                          ) : (
                            <StatusBadge tom="neutral">Sem operacional</StatusBadge>
                          )}
                        </LedgerTd>
                        <LedgerTd className="text-muted-foreground whitespace-nowrap">{temOperacional ? formatData(o.dataInicio) : "—"}</LedgerTd>
                        <LedgerTd className="tabular-nums">{o.quantidadeProduzida ?? "—"}</LedgerTd>
                        <LedgerTd>
                          <span className="flex flex-wrap items-center gap-1">
                            <StatusBadge tom={sc.tom}>{sc.label}</StatusBadge>
                            {o.requisicao_estado === "libertada" && !temOperacional && (
                              <StatusBadge tom="warning">Aguardando atribuição</StatusBadge>
                            )}
                          </span>
                        </LedgerTd>
                        <LedgerTd>
                          <RowMenu
                            ariaLabel="Ações do registo"
                            itens={[
                              ...(o.requisicao_estado === "libertada" && !temOperacional
                                ? [{ icone: "precision_manufacturing", rotulo: "Atribuir operacional", onClick: () => setLibertarOp(o) }]
                                : [{ icone: "edit", rotulo: "Editar registo", onClick: () => setDetalhe(o.id) }]),
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
                  ? <LedgerEmpty icone="precision_manufacturing">Nenhum registo operacional — atribua um operacional a uma OP para iniciar o registo</LedgerEmpty>
                  : <LedgerEmpty icone="search_off">Nenhuma OP corresponde ao filtro</LedgerEmpty>
              )}
              <Paginacao {...pag} label="OPs" />
            </>
          )}
        </Ledger>
      )}

      <Modal
        open={Boolean(opDetalhe)}
        onClose={() => setDetalhe(null)}
        title={`OP ${opDetalhe?.numero || opDetalhe?.id || ""} — Registo operacional`}
        icon="assignment"
        size="lg"
      >
        {opDetalhe && (() => {
          const r = registo[opDetalhe.id] || {};
          const temOperacional = !!opDetalhe.operacional;
          const sc = statusConfig[opDetalhe.status] || { label: opDetalhe.status, tom: "neutral" };
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tom={sc.tom}>{sc.label}</StatusBadge>
                {temOperacional ? (
                  <StatusBadge tom="success">{opDetalhe.operacional}</StatusBadge>
                ) : (
                  <StatusBadge tom="neutral">Sem operacional</StatusBadge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{opDetalhe.cliente} — {opDetalhe.produto} ({opDetalhe.quantidade})</p>

              {opDetalhe.requisicao_estado === "pendente" && (
                <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
                  <Icon name="inventory" className="text-[20px] text-warning shrink-0" />
                  <p className="text-xs text-foreground">
                    Aguardando requisição de materiais. Primeiro faça a saída de materiais na aba <strong>Ordens</strong> para poder atribuir o operacional.
                  </p>
                </div>
              )}

              {opDetalhe.requisicao_estado === "libertada" && !temOperacional && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
                  <p className="text-xs text-foreground">Materiais libertados. Atribua o operacional para iniciar a produção.</p>
                  <Button size="sm" onClick={() => { setDetalhe(null); setLibertarOp(opDetalhe); }}>
                    <Icon name="precision_manufacturing" className="text-lg" /> Atribuir operacional
                  </Button>
                </div>
              )}

              {temOperacional && (
                <div className="space-y-4">
                  <h3 className="text-sm font-normal text-foreground flex items-center gap-2">
                    <Icon name="precision_manufacturing" className="text-[18px] text-primary" /> Registo do operacional — {opDetalhe.operacional}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {camposRegisto.map((f) => (
                      <div key={f.key} className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{f.label}</label>
                        <input
                          type={f.tipo}
                          value={r[f.key] ?? ""}
                          onChange={(e) => atualizarCampo(opDetalhe.id, f.key, f.tipo === "number" ? Number(e.target.value) : e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    ))}
                    <div className="flex flex-col gap-1.5 lg:col-span-5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</label>
                      <textarea
                        rows={2}
                        value={r.observacoes || ""}
                        onChange={(e) => atualizarCampo(opDetalhe.id, "observacoes", e.target.value)}
                        className={`${inputCls} resize-none`}
                        placeholder="Notas sobre a utilização do operacional..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" loading={guardando} onClick={() => guardarRegisto(opDetalhe)}>
                      <Icon name="save" className="text-lg" /> Guardar registo
                    </Button>
                  </div>
                </div>
              )}

              {opDetalhe.requisicao_estado !== "libertada" && !temOperacional && opDetalhe.status !== "aguardando" && (
                <p className="text-xs text-muted-foreground">Sem registo associado a este operacional.</p>
              )}
            </div>
          );
        })()}
      </Modal>

      <LibertarMaquinaModal
        key={libertarOp?.id ?? "nenhum-operacional"}
        open={!!libertarOp}
        op={libertarOp}
        maquinas={maquinas}
        onClose={() => setLibertarOp(null)}
        onConfirm={handleAtribuir}
        nomeUsuario={getUsuario()?.nome || ""}
      />
    </div>
  );
}
