"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { inputCls } from "@/lib/estoque";
import NumeroInput from "@/components/ui/NumeroInput";
import { listarOrdens, criarOrdem, libertarMateriais } from "@/services/producao";
import { getUsuario } from "@/services/auth";
import SaidaMateriaisModal from "@/components/producao/SaidaMateriaisModal";
import { listar as listarClientes } from "@/services/clientes";
import { listar as listarOrcamentos, buscarPorId as buscarOrcamento } from "@/services/orcamentos";
import { listar as listarMateriais } from "@/services/materiais";
import { useSyncRefresh } from "@/contexts/SyncContext";

const statusConfig = {
  aguardando: { label: "Aguardando", variant: "warning" },
  em_producao: { label: "Em Produção", variant: "info" },
  finalizado: { label: "Finalizado", variant: "success" },
  entregue: { label: "Entregue", variant: "secondary" },
};

const etapaLabels = { pre_impressao: "Pré-Impressão", impressao: "Impressão", acabamento: "Acabamento", qualidade: "Qualidade", entrega: "Entrega" };

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

const initialForm = { cliente: "", empresa: "", produto: "", quantidade: "", dataEntrega: "", orcamento: "" };

const reservaEstado = {
  ativa: { label: "Ativa", variant: "warning" },
  parcial: { label: "Parcial", variant: "info" },
  consumida: { label: "Consumida", variant: "success" },
  cancelada: { label: "Cancelada", variant: "secondary" },
};

function derivarEtapa(op) {
  if (op.estado === "entregue" || op.entrega_ok) return "entrega";
  if (op.qualidade_ok) return "qualidade";
  if (op.acabamento_ok) return "acabamento";
  if (op.impressao_ok) return "impressao";
  if (op.pre_impressao_ok) return "pre_impressao";
  return "pre_impressao";
}

function normalizar(op) {
  return {
    ...op,
    status: op.estado || op.status || "aguardando",
    cliente: op.cliente?.nome || op.cliente || "—",
    orcamento: op.orcamento?.numero || op.orcamento || "—",
    dataEntrada: op.data_entrada || op.dataEntrada || "",
    dataEntrega: op.data_entrega || op.dataEntrega || "",
    etapaAtual: op.etapa_atual || op.etapaAtual || derivarEtapa(op),
  };
}

export default function OrdensProducaoPage() {
  const [ops, setOps] = useState([]);
  const [filter, setFilter] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [itens, setItens] = useState([]);
  const [materialSel, setMaterialSel] = useState("");
  const [qtdSel, setQtdSel] = useState("");
  const [loteSel, setLoteSel] = useState("");
  const [libertarOp, setLibertarOp] = useState(null);
  const [libertando, setLibertando] = useState(false);
  const { addToast } = useToast();

  const carregarDados = () => {
    Promise.all([listarOrdens(), listarClientes({ tipo: "cliente" }), listarOrcamentos(), listarMateriais()]).then(([ordensData, clientesData, orcamentosData, materiaisData]) => {
      setOps((Array.isArray(ordensData) ? ordensData : ordensData?.ordens || []).map(normalizar));
      setClientes(Array.isArray(clientesData) ? clientesData : clientesData?.clientes || []);
      setOrcamentos(Array.isArray(orcamentosData) ? orcamentosData : orcamentosData?.orcamentos || []);
      setMateriais(Array.isArray(materiaisData) ? materiaisData : materiaisData?.materiais || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarDados();
  }, []);

  useSyncRefresh(carregarDados, [carregarDados]);

  const matPorId = Object.fromEntries(materiais.map((m) => [m.id, m]));

  const adicionarItem = () => {
    const qtd = Number(qtdSel);
    if (!materialSel || !qtd || qtd <= 0) return;
    const jahExiste = itens.some((i) => i.material_id === Number(materialSel));
    if (jahExiste) {
      addToast("Material já adicionado — edite a quantidade se necessário", "error");
      return;
    }
    setItens([...itens, { material_id: Number(materialSel), quantidade: qtd, lote: loteSel.trim() || null }]);
    setMaterialSel(""); setQtdSel(""); setLoteSel("");
  };

  const removerItem = (idx) => setItens(itens.filter((_, i) => i !== idx));

  const filtered = filter === "todos" ? ops : ops.filter((o) => o.status === filter);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleOrcamentoSelect = async (e) => {
    const id = e.target.value;
    setForm((p) => ({ ...p, orcamento: id }));
    if (!id) return;
    try {
      const orc = await buscarOrcamento(id);
      const clienteId = orc.cliente_id || orc.cliente?.id || "";
      const empresa = orc.cliente?.empresa || "";
      const produto = orc.especificacao?.produto || orc.itens?.[0]?.descricao || "";
      const quantidade = orc.itens?.[0]?.quantidade || "";
      const materiaisMap = {};
      for (const item of (orc.itens || [])) {
        const qtdItem = Number(item.quantidade) || 1;
        for (const mat of (item.materiais || [])) {
          const mid = Number(mat.material_id);
          if (!mid) continue;
          const qtdTotal = (Number(mat.quantidade) || 0) * qtdItem;
          if (materiaisMap[mid]) {
            materiaisMap[mid].quantidade += qtdTotal;
          } else {
            materiaisMap[mid] = { material_id: mid, quantidade: qtdTotal, lote: null };
          }
        }
      }
      setItens(Object.values(materiaisMap));
      setForm((p) => ({
        ...p,
        orcamento: id,
        cliente: String(clienteId),
        empresa,
        produto,
        quantidade: String(quantidade),
      }));
    } catch {
      addToast("Erro ao buscar orçamento", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const nova = await criarOrdem({
        cliente_id: Number(form.cliente) || null,
        orcamento_id: Number(form.orcamento) || null,
        produto: form.produto,
        quantidade: Number(form.quantidade),
        dataEntrega: form.dataEntrega,
        dataEntrada: new Date().toISOString().split("T")[0],
        status: "aguardando",
        itens_materiais: itens,
      });
      setOps([normalizar(nova), ...ops]);
      setForm(initialForm); setItens([]); setModalOpen(false);
      addToast("Operação realizada com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  const handleLibertar = async (dados = {}) => {
    if (!libertarOp) return false;
    setLibertando(true);
    try {
      const atualizada = await libertarMateriais(libertarOp.id, {
        solicitado_por: dados.solicitado_por,
        permitido_por: dados.permitido_por,
        observacoes: dados.observacoes,
        itens_materiais: dados.itens_materiais,
      });
      setOps((prev) => prev.map((o) => (o.id === libertarOp.id ? normalizar(atualizada) : o)));
      addToast(`Materiais da OP ${libertarOp.id} libertados — saída de stock registada`, "success");
      return true;
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao libertar materiais", "error");
      return false;
    } finally {
      setLibertando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Ordens de Produção</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">{ops.length} OPs registadas // ORD</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { setForm(initialForm); setItens([]); setModalOpen(true); }} className="bg-primary/20 text-primary border border-primary/50 px-5 py-2 rounded font-mono flex items-center gap-2 hover:bg-primary/30 transition-all text-[11px] uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(128,213,203,0.2)] hover:shadow-[0_0_25px_rgba(128,213,203,0.4)]">
            <Icon name="add" className="text-[16px]" /> Nova OP
          </button>
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

      <div className="flex gap-2 flex-wrap">
        {["todos", ...Object.keys(statusConfig)].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "todos" ? "Todos" : statusConfig[f]?.label || f}
          </Button>
        ))}
      </div>

      {loading ? <CardSkeleton lines={6} /> : (
        <div className="space-y-3">
          {filtered.map((op) => {
            const sc = statusConfig[op.status];
            const etapas = Object.keys(etapaLabels);
            const etapaIdx = etapas.indexOf(op.etapaAtual);
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
                          {op.requisicao_estado === "pendente" && (
                            <Badge variant="destructive" className="text-[10px]">Aguardando saída de materiais</Badge>
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
                    {etapas.map((et, i) => (
                      <div key={et} className="flex-1 flex items-center gap-1">
                        <div className={`h-2 flex-1 rounded-full ${i <= etapaIdx ? "bg-primary" : "bg-muted"}`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {etapas.map((et) => (
                      <span key={et} className={`text-[9px] ${et === op.etapaAtual ? "text-primary font-bold" : "text-muted-foreground"}`}>{etapaLabels[et]}</span>
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
                    {op.requisicao_estado === "pendente" && op.status === "aguardando" && (
                      <div className="mt-4 pt-4 border-t">
                        {(!Array.isArray(op.reserva_estoques) || op.reserva_estoques.length === 0) && (
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Nenhum material reservado — adicione os materiais na saída
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            Saída de materiais pendente — só depois de libertada a OP pode avançar para produção.
                          </p>
                          <Button size="sm" onClick={() => setLibertarOp(op)} disabled={libertando}>
                            <Icon name="inventory" className="text-lg" /> Dar saída de materiais
                          </Button>
                        </div>
                      </div>
                    )}
                    {op.requisicao_estado === "libertada" && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            Materiais libertados — saída de stock registada. A OP pode avançar para produção.
                          </p>
                          <Badge variant="success" className="text-[10px]">Libertada</Badge>
                        </div>
                      </div>
                    )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setForm(initialForm); setItens([]); setModalOpen(false); }} title="Nova Ordem de Produção" icon="add" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => { setForm(initialForm); setItens([]); setModalOpen(false); }}>Cancelar</Button><Button type="submit" form="form-ordem">Criar OP</Button></>}>
        <form id="form-ordem" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente *</label>
              <select required name="cliente" value={form.cliente} onChange={handleChange} className={inputCls}>
                <option value="">Seleccionar...</option>
                {clientes.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Empresa</label>
              <input name="empresa" value={form.empresa} onChange={handleChange} className={inputCls} placeholder="Ex: Gráfica Expresso" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Produto *</label>
              <input required name="produto" value={form.produto} onChange={handleChange} className={inputCls} placeholder="Ex: Catálogos Institucionais" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quantidade *</label>
              <input required name="quantidade" value={form.quantidade} onChange={handleChange} className={inputCls} placeholder="Ex: 500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data de Entrega *</label>
              <input required type="date" name="dataEntrega" value={form.dataEntrega} onChange={handleChange} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Materiais (Reserva Automática)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select name="materialSel" value={materialSel} onChange={(e) => setMaterialSel(e.target.value)} className={`${inputCls} flex-1`}>
                  <option value="">Seleccionar material...</option>
                  {materiais.map((m) => (
                    <option key={m.id} value={m.id} disabled={m.estoque_disponivel <= 0}>
                      {m.nome} — {m.estoque_disponivel} {m.unidade || "un"} disponível
                    </option>
                  ))}
                </select>
                <NumeroInput name="qtdSel" value={qtdSel} onChange={(e) => setQtdSel(e.target.value)} className={`${inputCls} sm:w-32`} placeholder="Qtd." />
                <input name="loteSel" value={loteSel} onChange={(e) => setLoteSel(e.target.value)} className={`${inputCls} sm:w-40`} placeholder="Lote (opcional)" />
                <Button type="button" size="sm" onClick={adicionarItem}><Icon name="add" className="text-lg" /> Adicionar</Button>
              </div>
              {materialSel && matPorId[Number(materialSel)]?.percentual_quebra > 0 && (
                <p className="text-[10px] text-amber-600">
                  Quebra técnica de {matPorId[Number(materialSel)].percentual_quebra}% será adicionada à quantidade reservada.
                </p>
              )}
              {itens.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {itens.map((item, i) => {
                    const m = matPorId[item.material_id];
                    return (
                      <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 text-xs">
                        <span className="font-medium text-foreground truncate min-w-0 flex-1">{m?.nome || `Material #${item.material_id}`}</span>
                        <NumeroInput value={String(item.quantidade)} onChange={(e) => {
                          const v = Number(e.target.value) || 0;
                          setItens((prev) => prev.map((x, j) => j === i ? { ...x, quantidade: v } : x));
                        }} className="px-2 py-1 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 w-24 text-right" placeholder="Qtd." />
                        <span className="text-muted-foreground shrink-0">{m?.unidade || "un"}{m?.percentual_quebra > 0 ? ` (+${m.percentual_quebra}% quebra)` : ""}</span>
                        <input value={item.lote || ""} onChange={(e) => {
                          setItens((prev) => prev.map((x, j) => j === i ? { ...x, lote: e.target.value || null } : x));
                        }} className="px-2 py-1 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 w-24" placeholder="Lote" />
                        <button type="button" onClick={() => removerItem(i)} className="shrink-0 text-red-500 hover:text-red-700 transition-colors" title="Remover"><Icon name="delete" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Orçamento de Referência</label>
              <select name="orcamento" value={form.orcamento} onChange={handleOrcamentoSelect} className={inputCls}>
                <option value="">Nenhum</option>
                {orcamentos.map((o) => <option key={o.id} value={o.id}>{o.numero}{o.cliente?.nome ? ` — ${o.cliente.nome}` : ""}</option>)}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <SaidaMateriaisModal
        key={libertarOp?.id ?? "nenhum"}
        open={!!libertarOp}
        op={libertarOp}
        matPorId={matPorId}
        materiais={materiais}
        onClose={() => setLibertarOp(null)}
        onConfirm={handleLibertar}
        nomeUsuario={getUsuario()?.nome || ""}
      />

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
