"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import { entradasEspecificacao } from "@/lib/estoque";
import { listar, remover, mudarEstado } from "@/services/orcamentos";
import { buscarOrganizacao } from "@/services/configuracoes";

const estadoColors = {
  aprovado: "success",
  pendente: "warning",
  cancelado: "secondary",
  rejeitado: "destructive",
};

const ESTADOS = ["pendente", "aprovado", "cancelado", "rejeitado"];

function formatKz(v) { return `Kz ${Number(v).toLocaleString("pt-AO")}`; }

function BarChart({ dados }) {
  const max = Math.max(...dados.map((b) => b.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-44 px-1">
      {dados.map((b, i) => (
        <div key={i} className="flex flex-col items-center justify-end flex-1 h-full gap-1.5" title={`${b.label}: ${b.value}`}>
          <span className="text-[9px] font-bold text-foreground">{b.value || ""}</span>
          <div
            className="w-full max-w-[30px] rounded-t-lg bg-gradient-to-t from-primary/60 to-primary transition-all duration-500"
            style={{ height: `${Math.max((b.value / max) * 100, 3)}%` }}
          />
          <span className="text-[9px] font-semibold text-muted-foreground uppercase">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

const estadoCor = {
  aprovado: "#10b981",
  pendente: "#f59e0b",
  cancelado: "#94a3b8",
  rejeitado: "#ef4444",
};

function parseDataOrc(o) {
  const [y, m, d] = String(o.data || "").split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, d || 1);
}

function normalizarOrcamento(o) {
  if (!o) return o;
  return {
    ...o,
    cliente: {
      nome: o.cliente?.nome || "",
      empresa: o.cliente?.empresa || "",
      nif: o.cliente?.nif || "",
      telefone: o.cliente?.telefone || "",
      email: o.cliente?.email || "",
    },
    especificacao: (o.especificacao && typeof o.especificacao === "object" && !Array.isArray(o.especificacao)) ? o.especificacao : {},
    itens: Array.isArray(o.itens) ? o.itens : [],
    subtotal: Number(o.subtotal) || 0,
    iva: Number(o.iva) || 0,
    valorIva: Number(o.valorIva) || 0,
    total: Number(o.total) || 0,
    prazoExecucao: o.prazoExecucao || "",
    condicoesPagamento: o.condicoesPagamento || "",
  };
}

export default function OrcamentosPage() {
  const router = useRouter();
  const [orcamentos, setOrcamentos] = useState([]);
  const [empresa, setEmpresa] = useState({ nome: "", nif: "", endereco: "", telefone: "", email: "" });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [filter, setFilter] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const { addToast } = useToast();

  async function carregarDados() {
    setCarregando(true);
    setErro(null);
    try {
      const [orcData, empData] = await Promise.all([listar(), buscarOrganizacao().catch(() => null)]);
      setOrcamentos((Array.isArray(orcData) ? orcData : orcData?.data ?? []).map(normalizarOrcamento));
      if (empData) setEmpresa(empData);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, [addToast]);

  const irParaEdicao = (o) => router.push(`/orcamentos/novo?id=${o.id}`);

  const handleMudarEstado = async (o, novoEstado) => {
    if (!novoEstado || novoEstado === o.estado) return;
    const antigo = o.estado;
    try {
      const atualizado = await mudarEstado(o.id, novoEstado);
      setOrcamentos((prev) => prev.map((x) => (x.id === o.id ? normalizarOrcamento({ ...x, ...atualizado }) : x)));
      addToast(`Orçamento ${o.numero || o.id} marcado como ${novoEstado}`, "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao mudar o estado", "error");
      if (selected === o.id) setOrcamentos((prev) => prev.map((x) => (x.id === o.id ? { ...x, estado: antigo } : x)));
    }
  };

  const handleWhatsApp = (o) => {
    const tel = String(o.cliente?.telefone || o.cliente?.whatsapp || "").replace(/\D/g, "");
    if (!tel) {
      addToast("Cliente sem telefone registado", "error");
      return;
    }
    const msg = encodeURIComponent(`Olá ${o.cliente?.nome || ""}! Segue o seu orçamento ${o.numero || o.id} da ${empresa.nome || "SIGRAF"}.`);
    window.open(`https://wa.me/${tel}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const confirmarEliminacao = async () => {
    if (!eliminarItem) return;
    setDeletando(true);
    try {
      await remover(eliminarItem.id);
      setOrcamentos((prev) => prev.filter((o) => o.id !== eliminarItem.id));
      addToast("Orçamento removido com sucesso", "success");
      setEliminarItem(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    } finally {
      setDeletando(false);
    }
  };

  const filtered = filter === "todos" ? orcamentos : orcamentos.filter((o) => o.estado === filter);
  const totalValor = orcamentos.reduce((s, o) => s + (o.total || o.subtotal + o.valorIva), 0);
  const pendentes = orcamentos.filter((o) => o.estado === "pendente").length;
  const aprovadosCount = orcamentos.filter((o) => o.estado === "aprovado").length;

  const agora = new Date();
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const dadosPorMes = meses.map((m, i) => ({
    label: m,
    value: orcamentos.filter((o) => {
      const d = parseDataOrc(o);
      return d && d.getFullYear() === agora.getFullYear() && d.getMonth() === i;
    }).length,
  }));
  const valorPorMes = meses.map((m, i) => ({
    label: m,
    value: Math.round(orcamentos
      .filter((o) => {
        const d = parseDataOrc(o);
        return d && d.getFullYear() === agora.getFullYear() && d.getMonth() === i;
      })
      .reduce((s, o) => s + (o.total || o.subtotal + o.valorIva), 0)),
  }));
  const porEstado = ESTADOS.map((s) => ({
    estado: s,
    qtd: orcamentos.filter((o) => o.estado === s).length,
  }));

  return (
    <div className="space-y-5">
      {carregando && <ListSkeleton count={5} />}

      {!carregando && (
        <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
          <div>
            <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Orçamentos</h1>
            <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">{orcamentos.length} orçamentos registados // ORC</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/orcamentos/novo">
              <button className="bg-primary/20 text-primary border border-primary/50 px-5 py-2 rounded font-mono flex items-center gap-2 hover:bg-primary/30 transition-all text-[11px] uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(128,213,203,0.2)] hover:shadow-[0_0_25px_rgba(128,213,203,0.4)]">
                <Icon name="add" className="text-[16px]" /> Novo Orçamento
              </button>
            </Link>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[
          { label: "Total Orçamentos", value: orcamentos.length, icon: "request_quote", iconVariant: "primary" },
          { label: "Valor Total", value: formatKz(totalValor), icon: "paid", iconVariant: "success" },
          { label: "Pendentes", value: pendentes, icon: "pending", iconVariant: "warning" },
          { label: "Aprovados", value: aprovadosCount, icon: "check_circle", iconVariant: "success" },
        ].map((kpi) => (
          <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} iconVariant={kpi.iconVariant} />
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Orçamentos por Mês</CardTitle>
            <CardDescription>Quantidade emitida em {agora.getFullYear()} (dados reais)</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart dados={dadosPorMes} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valor por Mês</CardTitle>
            <CardDescription>Total em Kz emitido em {agora.getFullYear()}</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart dados={valorPorMes} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Por Estado</CardTitle>
            <CardDescription>Distribuição real dos orçamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {porEstado.map(({ estado, qtd }) => {
              const pct = orcamentos.length ? Math.round((qtd / orcamentos.length) * 100) : 0;
              return (
                <div key={estado} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-muted-foreground capitalize flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: estadoCor[estado] }} />
                      {estado}
                    </span>
                    <span className="font-bold text-foreground">{qtd} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: estadoCor[estado] }} />
                  </div>
                </div>
              );
            })}
            {orcamentos.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sem dados ainda</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["todos", ...ESTADOS].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nº</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Produto</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Total</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelected(selected === o.id ? null : o.id)}>
                  <td className="px-4 py-3"><span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded text-xs">{o.numero || o.id}</span></td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{new Date(o.data).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{o.cliente?.nome || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{o.especificacao?.produto || "—"}</td>
                  <td className="px-4 py-3 font-bold hidden lg:table-cell text-foreground text-right">{formatKz(o.total || o.subtotal + o.valorIva)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={estadoColors[o.estado] || "secondary"} className="text-[10px]">{o.estado}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <select
                        value={o.estado}
                        onChange={(e) => handleMudarEstado(o, e.target.value)}
                        title="Mudar estado"
                        className="px-2 py-1.5 bg-background border border-input rounded-lg text-[11px] font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                      >
                        {ESTADOS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                      <Button variant="ghost" size="icon" onClick={() => irParaEdicao(o)} title="Editar"><Icon name="edit" className="text-[16px]" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setEliminarItem(o)} title="Remover" className="text-error hover:text-error"><Icon name="delete" className="text-[16px]" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleWhatsApp(o)} title="Enviar WhatsApp"><Icon name="chat" className="text-[16px]" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden space-y-3 p-3">
            {filtered.map((o) => (
              <Card key={o.id} className="cursor-pointer hover-lift" onClick={() => setSelected(selected === o.id ? null : o.id)}>
                <CardContent className="p-5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">{o.numero || o.id}</p>
                      <p className="text-[10px] text-muted-foreground">{o.cliente?.nome || "—"} · {o.especificacao?.produto || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(o.data).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={estadoColors[o.estado] || "secondary"} className="text-[10px]">{o.estado}</Badge>
                      <p className="text-xs font-bold text-foreground mt-1">{formatKz(o.total || o.subtotal + o.valorIva)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={o.estado}
                      onChange={(e) => handleMudarEstado(o, e.target.value)}
                      title="Mudar estado"
                      className="px-2 py-1.5 bg-background border border-input rounded-lg text-[11px] font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                    >
                      {ESTADOS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <Button variant="ghost" size="sm" onClick={() => irParaEdicao(o)}><Icon name="edit" className="text-sm" /> Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEliminarItem(o)} className="text-error"><Icon name="delete" className="text-sm" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Card>

      {selected && (() => {
        const o = orcamentos.find((x) => x.id === selected);
        if (!o) return null;
        return (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2"><Icon name="description" className="text-primary" /> Detalhes — {o.numero || o.id}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleWhatsApp(o)}><Icon name="chat" className="text-[16px]" /> WhatsApp</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dados do Cliente</h3>
                  <div className="space-y-1.5 text-sm">
                    {["Nome", "Empresa", "NIF", "Telefone", "Email"].map((campo) => (
                      <div key={campo} className="flex justify-between">
                        <span className="text-muted-foreground">{campo}:</span>
                        <span className="font-medium text-foreground">{o.cliente?.[campo.toLowerCase()] || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Especificação Técnica</h3>
                  {entradasEspecificacao(o.especificacao).length > 0 ? (
                    <div className="space-y-1.5 text-sm">
                      {entradasEspecificacao(o.especificacao).map((e) => (
                        <div key={e.rotulo} className="flex justify-between gap-4">
                          <span className="text-muted-foreground shrink-0">{e.rotulo}:</span>
                          <span className="font-medium text-foreground text-right break-words">{e.valor}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem especificação técnica.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Descrição dos Serviços</h3>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2 font-bold text-muted-foreground uppercase">Descrição</th>
                        <th className="text-center px-3 py-2 font-bold text-muted-foreground uppercase">Qtd</th>
                        <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Valor Unit.</th>
                        <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(o.itens || []).map((it, i) => (
                        <tr key={i} className="border-b border-border/20">
                          <td className="px-3 py-2 text-foreground">{it.descricao}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{it.quantidade}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{formatKz(it.valorUnitario)}</td>
                          <td className="px-3 py-2 text-right font-bold text-foreground">{formatKz(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-3">
                  <div className="w-64 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{formatKz(o.subtotal)}</span></div>
                    {o.valorIva > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IVA ({o.iva}%):</span><span className="font-medium">{formatKz(o.valorIva)}</span></div>}
                    <div className="flex justify-between border-t pt-1 font-bold text-sm"><span>Total:</span><span className="text-primary">{formatKz(o.total || o.subtotal + o.valorIva)}</span></div>
                  </div>
                </div>

                {(o.itens || []).filter((it) => (it.materiais || []).length).length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Materiais por item</h4>
                    {(o.itens || []).filter((it) => (it.materiais || []).length).map((it) => {
                      const custoUn = (it.materiais || []).reduce((s, m) => s + (Number(m.quantidade) || 0) * (Number(m.custo_unit) || 0), 0);
                      return (
                        <div key={it.id || it.descricao} className="rounded-xl border p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <p className="text-xs font-bold text-foreground">{it.descricao}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Custo materiais/un.: <span className="font-bold text-foreground">{formatKz(custoUn)}</span>
                            </p>
                          </div>
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="text-left px-2 py-1.5 font-bold text-muted-foreground uppercase">Material</th>
                                  <th className="text-center px-2 py-1.5 font-bold text-muted-foreground uppercase">Qtd/un.</th>
                                  <th className="text-right px-2 py-1.5 font-bold text-muted-foreground uppercase">Preço Venda</th>
                                  <th className="text-right px-2 py-1.5 font-bold text-muted-foreground uppercase">Total</th>
                                  <th className="text-center px-2 py-1.5 font-bold text-muted-foreground uppercase">Estoque</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(it.materiais || []).map((m, mi) => (
                                  <tr key={mi} className="border-b border-border/20">
                                    <td className="px-2 py-1.5 text-foreground">{m.descricao}</td>
                                    <td className="px-2 py-1.5 text-center text-muted-foreground">{m.quantidade} {m.unidade}</td>
                                    <td className="px-2 py-1.5 text-right text-muted-foreground">{formatKz(m.custo_unit)}</td>
                                    <td className="px-2 py-1.5 text-right font-semibold text-foreground">{formatKz(m.custo_total || (Number(m.quantidade) * Number(m.custo_unit)))}</td>
                                    <td className="px-2 py-1.5 text-center">
                                      {m.mover_estoque
                                        ? <Badge variant="success" className="text-[9px]">Move estoque</Badge>
                                        : <Badge variant="outline" className="text-[9px]">Não move</Badge>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Prazo de Execução", value: o.prazoExecucao },
                  { label: "Condições de Pagamento", value: o.condicoesPagamento },
                ].map((item) => (
                  <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{item.label}</p>
                    <p className="font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Estado</p>
                  <select
                    value={o.estado}
                    onChange={(e) => handleMudarEstado(o, e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    {ESTADOS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {o.observacoes && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Observações</p>
                  <p className="text-foreground text-sm">{o.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}


      <ConfirmDialog
        open={Boolean(eliminarItem)}
        onClose={() => setEliminarItem(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title="Remover orçamento"
        description={
          eliminarItem
            ? `Tem a certeza que deseja remover o orçamento #${eliminarItem.numero || eliminarItem.id}? Esta ação não pode ser desfeita.`
            : ""
        }
      />

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
