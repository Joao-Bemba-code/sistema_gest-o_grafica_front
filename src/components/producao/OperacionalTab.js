"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Icon from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import KpiCard from "@/components/ui/KpiCard";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { listarOrdens, salvarImpressao, libertarParaMaquina } from "@/services/producao";
import { listar as listarMaquinas } from "@/services/maquinas";
import LibertarMaquinaModal from "@/components/producao/LibertarMaquinaModal";
import MaquinasTab from "@/components/producao/MaquinasTab";
import { getUsuario } from "@/services/auth";

const statusConfig = {
  aguardando: { label: "Aguardando", variant: "warning" },
  em_producao: { label: "Em Produção", variant: "info" },
  finalizado: { label: "Finalizado", variant: "success" },
  entregue: { label: "Entregue", variant: "secondary" },
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

export default function OperacionalTab() {
  const { addToast } = useToast();
  const [ops, setOps] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [registo, setRegisto] = useState({});
  const [expandidoId, setExpandidoId] = useState(null);
  const [libertarOp, setLibertarOp] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [subTab, setSubTab] = useState("maquinas");

  const carregarDados = useCallback(() => {
    Promise.all([listarOrdens(), listarMaquinas()])
      .then(([ordensData, maquinasData]) => {
        const arr = (Array.isArray(ordensData) ? ordensData : ordensData?.ordens || []).map(normalizar);
        setOps(arr);
        setMaquinas(Array.isArray(maquinasData) ? maquinasData : maquinasData?.data || []);
        setRegisto(Object.fromEntries(arr.map((o) => [o.id, {
          operador: o.operador || "",
          dataInicio: o.dataInicio || "",
          dataFim: o.dataFim || "",
          quantidadeProduzida: o.quantidadeProduzida ?? "",
          quantidadeRejeitada: o.quantidadeRejeitada ?? "",
          observacoes: o.observacoes || "",
        }])));
      })
      .catch(() => addToast("Erro ao carregar o operacional", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const filtrados = useMemo(() => {
    if (!search.trim()) return ops;
    const q = search.toLowerCase();
    return ops.filter((o) =>
      o.cliente?.toLowerCase().includes(q) ||
      o.produto?.toLowerCase().includes(q) ||
      o.operacional?.toLowerCase().includes(q) ||
      o.operador?.toLowerCase().includes(q) ||
      String(o.id).includes(q)
    );
  }, [ops, search]);

  const totalEmProducao = ops.filter((o) => o.status === "em_producao").length;
  const semOperacional = ops.filter((o) => o.requisicao_estado === "libertada" && !o.operacional).length;
  const operacionaisAtivos = useMemo(
    () => new Set(ops.map((o) => o.operacional).filter(Boolean).map((n) => n.trim().toLowerCase())).size,
    [ops]
  );

  const abrirEdicao = (o) => {
    setExpandidoId(expandidoId === o.id ? null : o.id);
  };

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

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-primary">
        <div className="flex items-center gap-3">
          <Icon name="precision_manufacturing" className="text-[22px] text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Registo Operacional</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestão completa das máquinas e registo das máquinas usadas em cada ordem de produção.
            </p>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border/30 w-fit">
          {[
            { id: "maquinas", label: "Máquinas", icon: "precision_manufacturing" },
            { id: "por_op", label: "Registo por OP", icon: "assignment" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                subTab === t.id ? "bg-primary/20 text-primary shadow" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon name={t.icon} className="text-[15px]" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === "maquinas" ? (
        <MaquinasTab registarEstado />
      ) : (
        <>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard icon="construction" label="Em Produção" value={totalEmProducao} iconVariant="info" />
        <KpiCard icon="pending_actions" label="Sem Operacional" value={semOperacional} iconVariant="warning" />
        <KpiCard icon="precision_manufacturing" label="Operacionais Ativos" value={operacionaisAtivos} iconVariant="success" />
      </section>

      <div className="relative">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nº OP, cliente, produto, operacional, operador..."
          className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <Icon name="close" className="text-[16px]" />
          </button>
        )}
      </div>

      {loading ? (
        <CardSkeleton lines={5} />
      ) : filtrados.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground">
          <Icon name="precision_manufacturing" className="text-4xl block mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhum registo operacional</p>
          <p className="text-xs mt-1">Atribua um operacional a uma ordem de produção para iniciar o registo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((o) => {
            const sc = statusConfig[o.status] || {};
            const r = registo[o.id] || {};
            const temOperacional = !!o.operacional;
            return (
              <Card key={o.id}>
                <div className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => abrirEdicao(o)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon name="construction" className="text-primary text-[20px]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">OP {o.id}</span>
                        <Badge variant={sc.variant || "outline"} className="text-[10px]">{sc.label || o.status}</Badge>
                        {temOperacional ? (
                          <Badge variant="success" className="text-[10px]"><Icon name="precision_manufacturing" className="text-[12px]" /> {o.operacional}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Sem operacional</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{o.cliente} — {o.produto} ({o.quantidade})</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {temOperacional && (
                      <>
                        <span>Operador: <strong className="text-foreground">{o.operador || "—"}</strong></span>
                        <span>Início: <strong className="text-foreground">{formatData(o.dataInicio)}</strong></span>
                        <span>Produzido: <strong className="text-foreground">{o.quantidadeProduzida ?? "—"}</strong></span>
                      </>
                    )}
                    {o.requisicao_estado === "libertada" && !temOperacional && (
                      <span className="text-amber-600 font-semibold">Aguardando atribuição</span>
                    )}
                  </div>
                </div>

                {expandidoId === o.id && (
                  <div className="border-t p-5 space-y-4">
                    {o.requisicao_estado === "pendente" && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <Icon name="inventory" className="text-[20px] text-amber-600 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Aguardando requisição de materiais</p>
                          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                            Primeiro faça a saída de materiais na aba &quot;Ordens&quot; para poder atribuir o operacional.
                          </p>
                        </div>
                      </div>
                    )}

                    {o.requisicao_estado === "libertada" && !temOperacional && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">
                          Materiais libertados. Atribua o operacional para iniciar a produção.
                        </p>
                        <Button size="sm" onClick={() => setLibertarOp(o)}>
                          <Icon name="precision_manufacturing" className="text-lg" /> Atribuir operacional
                        </Button>
                      </div>
                    )}

                    {temOperacional && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Icon name="precision_manufacturing" className="text-[18px] text-primary" /> Registo do operacional — {o.operacional}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                          {camposRegisto.map((f) => (
                            <div key={f.key} className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">{f.label}</label>
                              <input
                                type={f.tipo}
                                value={r[f.key] ?? ""}
                                onChange={(e) => atualizarCampo(o.id, f.key, f.tipo === "number" ? Number(e.target.value) : e.target.value)}
                                className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                          ))}
                          <div className="flex flex-col gap-1 lg:col-span-5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Observações</label>
                            <textarea
                              rows={2}
                              value={r.observacoes || ""}
                              onChange={(e) => atualizarCampo(o.id, "observacoes", e.target.value)}
                              className="px-3.5 py-2 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                              placeholder="Notas sobre a utilização do operacional..."
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" loading={guardando} onClick={() => guardarRegisto(o)}>
                            <Icon name="save" className="text-lg" /> Guardar registo
                          </Button>
                        </div>
                      </div>
                    )}

                    {o.requisicao_estado !== "libertada" && !temOperacional && o.status !== "aguardando" && (
                      <p className="text-xs text-muted-foreground">
                        Sem registo associado a este operacional.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <LibertarMaquinaModal
        key={libertarOp?.id ?? "nenhum-operacional"}
        open={!!libertarOp}
        op={libertarOp}
        maquinas={maquinas}
        onClose={() => setLibertarOp(null)}
        onConfirm={handleAtribuir}
        nomeUsuario={getUsuario()?.nome || ""}
      />
        </>
      )}
    </div>
  );
}