"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { listarOrdens } from "@/services/producao";
import { listar } from "@/services/clientes";
import { listar as listarFaturas } from "@/services/faturacao";

const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getUltimos6Meses() {
  const hoje = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    result.push({
      mes: d.getMonth(),
      label: nomesMeses[d.getMonth()],
      labelCurto: nomesMeses[d.getMonth()].slice(0, 3).toLowerCase(),
    });
  }
  return result;
}

function fmtKz(v) {
  return "Kz " + Math.round(Number(v) || 0).toLocaleString("pt-PT");
}

function compactKz(v) {
  const n = Number(v) || 0;
  if (n >= 1000000) return (n / 1000000).toLocaleString("pt-PT", { maximumFractionDigits: 1 }) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "k";
  return String(Math.round(n));
}

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [periodo, setPeriodo] = useState(getUltimos6Meses()[5].labelCurto);
  const [aba, setAba] = useState("vendas");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const { addToast } = useToast();

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [ords, clis, fats] = await Promise.all([listarOrdens(), listar(), listarFaturas()]);
      setOrdens(Array.isArray(ords) ? ords : ords?.ordens || []);
      setClientes(Array.isArray(clis) ? clis : clis?.data || []);
      setFaturas(Array.isArray(fats) ? fats : fats?.data || []);
    } catch (err) {
      setError(err.message);
      addToast(err.response?.data?.erro || "Erro ao carregar relatórios", "error");
    } finally { setLoading(false); }
  }, [addToast]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { carregarDados(); }, [carregarDados]);
/* eslint-enable react-hooks/set-state-in-effect */

  const ultimosMeses = useMemo(() => getUltimos6Meses(), []);

  const vendasPorMes = useMemo(() => {
    const hoje = new Date();
    const mesesIndices = ultimosMeses.map((m) => m.mes);
    const counts = ultimosMeses.map((m) => ({ mes: m.mes, label: m.label, valor: 0, quantidade: 0 }));
    faturas.forEach((f) => {
      const d = f.data_emissao ? new Date(f.data_emissao) : null;
      if (d && !isNaN(d.getTime()) && d.getFullYear() === hoje.getFullYear() && mesesIndices.includes(d.getMonth())) {
        const idx = ultimosMeses.findIndex((m) => m.mes === d.getMonth());
        counts[idx].valor += Number(f.total || f.valor) || 0;
        counts[idx].quantidade += 1;
      }
    });
    return counts;
  }, [faturas, ultimosMeses]);

  const maxValor = useMemo(() => Math.max(...vendasPorMes.map(v => v.valor), 1), [vendasPorMes]);

  const recebidoPorMes = useMemo(() => {
    const hoje = new Date();
    const mesesIndices = ultimosMeses.map((m) => m.mes);
    const counts = ultimosMeses.map((m) => ({ mes: m.mes, label: m.label, valor: 0, quantidade: 0 }));
    faturas.forEach((f) => {
      if (f.estado !== "paga") return;
      const d = f.data_pagamento || f.data_emissao;
      const dt = d ? new Date(d) : null;
      if (dt && !isNaN(dt.getTime()) && dt.getFullYear() === hoje.getFullYear() && mesesIndices.includes(dt.getMonth())) {
        const idx = ultimosMeses.findIndex((m) => m.mes === dt.getMonth());
        counts[idx].valor += Number(f.valor_pago || f.total || f.valor) || 0;
        counts[idx].quantidade += 1;
      }
    });
    return counts;
  }, [faturas, ultimosMeses]);

  const maxRecebido = useMemo(() => Math.max(...recebidoPorMes.map(v => v.valor), 1), [recebidoPorMes]);

  const recebidoHoje = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    return faturas
      .filter((f) => f.estado === "paga" && (f.data_pagamento || f.data_emissao) === hoje)
      .reduce((s, f) => s + (Number(f.valor_pago || f.total || f.valor) || 0), 0);
  }, [faturas]);

  const recebidoMes = useMemo(() => {
    const hoje = new Date();
    return faturas
      .filter((f) => {
        if (f.estado !== "paga") return false;
        const d = new Date(f.data_pagamento || f.data_emissao);
        return !isNaN(d.getTime()) && d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
      })
      .reduce((s, f) => s + (Number(f.valor_pago || f.total || f.valor) || 0), 0);
  }, [faturas]);

  const clientesTop = useMemo(() => {
    const map = {};
    faturas.forEach((f) => {
      const nome = f.cliente?.nome || f.cliente || "Cliente";
      map[nome] = (map[nome] || 0) + (Number(f.total || f.valor) || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, total], i) => ({
        nome,
        total,
        cor: ["bg-primary", "bg-secondary", "bg-amber-500", "bg-purple-500", "bg-emerald-500"][i],
      }));
  }, [faturas]);

  const clientesTotal = useMemo(() => clientesTop.reduce((s, c) => s + c.total, 0), [clientesTop]);

  const producaoPorMes = useMemo(() => {
    const hoje = new Date();
    const mesesIndices = ultimosMeses.map((m) => m.mes);
    const result = {};
    mesesIndices.forEach((mesIdx) => {
      const ordensMes = ordens.filter((o) => {
        const d = o.data_entrada ? new Date(o.data_entrada) : null;
        return d && !isNaN(d.getTime()) && d.getFullYear() === hoje.getFullYear() && d.getMonth() === mesIdx;
      });
      const produzidas = ordensMes.length;
      const entregues = ordensMes.filter((o) => (o.estado || o.status) === "entregue").length;
      result[mesIdx] = { produzidas, entregues, pct: produzidas > 0 ? Math.round((entregues / produzidas) * 100) : 0 };
    });
    return result;
  }, [ordens, ultimosMeses]);

  const opsPorStatus = useMemo(() => ["aguardando", "em_producao", "finalizado", "entregue"].map((s) => ({
    status: s, label: s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    quantidade: ordens.filter(o => (o.estado || o.status) === s).length,
  })), [ordens]);

  const cadastrosFiltrados = useMemo(() => {
    let lista = clientes;
    if (filtroTipo !== "todos") lista = lista.filter((c) => c.tipo === filtroTipo);
    if (busca.trim()) {
      const b = busca.trim().toLowerCase();
      lista = lista.filter((c) =>
        [c.nome, c.empresa, c.nif, c.codigo, c.telefone, c.email].some((v) =>
          String(v || "").toLowerCase().includes(b)
        )
      );
    }
    return lista;
  }, [clientes, filtroTipo, busca]);

  const totalClientes = useMemo(() => clientes.filter((c) => c.tipo === "cliente").length, [clientes]);
  const totalFornecedores = useMemo(() => clientes.filter((c) => c.tipo === "fornecedor").length, [clientes]);

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Relatórios</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Análise de desempenho da produção // REL</p>
        </div>
      </div>

      <div className="flex gap-2">
        {["vendas", "producao", "clientes"].map((a) => (
          <Button key={a} variant={aba === a ? "default" : "outline"} size="sm" onClick={() => setAba(a)}>
            <Icon name={a === "vendas" ? "trending_up" : a === "producao" ? "precision_manufacturing" : "groups"} className="text-sm" />
            {a === "vendas" ? "Vendas" : a === "producao" ? "Produção" : "Clientes"}
          </Button>
        ))}
      </div>

      {aba === "vendas" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { label: "Recebido Hoje", value: `Kz ${recebidoHoje.toLocaleString("pt-AO")}`, icon: "today", iconVariant: "primary" },
              { label: "Recebido este Mês", value: `Kz ${recebidoMes.toLocaleString("pt-AO")}`, icon: "payments", iconVariant: "success" },
              { label: "A Receber", value: `Kz ${faturas.filter((f) => !["paga", "cancelada"].includes(f.estado)).reduce((s, f) => s + (Number(f.total || f.valor) || 0), 0).toLocaleString("pt-AO")}`, icon: "paid", iconVariant: "warning" },
              { label: "Documentos", value: faturas.length, icon: "receipt_long", iconVariant: "info" },
            ].map((kpi) => (
              <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} iconVariant={kpi.iconVariant} />
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {ultimosMeses.map((m) => (
              <Button key={m.labelCurto} variant={periodo === m.labelCurto ? "default" : "outline"} size="sm" onClick={() => setPeriodo(m.labelCurto)}>
                {m.label}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Faturação Emitida por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48">
                {vendasPorMes.map((v) => (
                  <div key={v.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${v.label}: ${fmtKz(v.valor)}`}>
                    <span className="text-[10px] font-bold text-foreground whitespace-nowrap">{v.valor > 0 ? compactKz(v.valor) : "0"}</span>
                    <div className="w-full rounded-lg bg-primary/20 relative overflow-hidden" style={{ height: `${(v.valor / maxValor) * 100}%` }}>
                      <div className="absolute bottom-0 w-full bg-primary rounded-lg transition-all duration-500" style={{ height: `${(v.valor / maxValor) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{v.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recebido por Mês (faturas pagas)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48">
                {recebidoPorMes.map((v) => (
                  <div key={v.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${v.label}: ${fmtKz(v.valor)}`}>
                    <span className="text-[10px] font-bold text-foreground whitespace-nowrap">{v.valor > 0 ? compactKz(v.valor) : "0"}</span>
                    <div className="w-full rounded-lg bg-emerald-500/20 relative overflow-hidden" style={{ height: `${(v.valor / maxRecebido) * 100}%` }}>
                      <div className="absolute bottom-0 w-full bg-emerald-500 rounded-lg transition-all duration-500" style={{ height: `${(v.valor / maxRecebido) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{v.label} <span className="text-muted-foreground/60">({v.quantidade})</span></span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientesTop.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-foreground">{c.nome}</span>
                        <span className="font-bold text-foreground">Kz {c.total.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.cor}`} style={{ width: `${(c.total / clientesTotal) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {aba === "producao" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Ordens de Produção por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-5 mb-6">
                {opsPorStatus.map((s) => (
                  <Card key={s.status} className="hover-lift">
                    <CardContent className="p-5 text-center">
                      <p className="text-3xl font-extrabold text-foreground tracking-tight">{s.quantidade}</p>
                      <p className="text-[11px] font-medium text-muted-foreground mt-1">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="w-full h-4 bg-muted rounded-full overflow-hidden flex">
                {opsPorStatus.map((s) => {
                  const total = opsPorStatus.reduce((t, x) => t + x.quantidade, 0) || 1;
                  const pct = (s.quantidade / total) * 100;
                  const cores = { aguardando: "bg-amber-500", em_producao: "bg-primary", finalizado: "bg-green-500", entregue: "bg-purple-500" };
                  return pct > 0 ? <div key={s.status} className={`h-full ${cores[s.status]} transition-all`} style={{ width: `${pct}%` }} title={`${s.label}: ${s.quantidade}`} /> : null;
                })}
              </div>
              <div className="flex gap-4 mt-3 flex-wrap">
                {opsPorStatus.map((s) => {
                  const cores = { aguardando: "bg-amber-500", em_producao: "bg-primary", finalizado: "bg-green-500", entregue: "bg-purple-500" };
                  return (
                    <div key={s.status} className="flex items-center gap-2 text-xs">
                      <span className={`w-3 h-3 rounded-full ${cores[s.status]}`} />
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-bold text-foreground">{Math.round((s.quantidade / (opsPorStatus.reduce((t, x) => t + x.quantidade, 0) || 1)) * 100)}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ultimosMeses.map((m) => {
                  const { produzidas, entregues, pct } = producaoPorMes[m.mes] || { produzidas: 0, entregues: 0, pct: 0 };
                  return (
                    <div key={m.labelCurto} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-8">{m.label}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{produzidas} ordens</span>
                          <span className="font-bold text-foreground">{entregues} entregues ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {aba === "clientes" && (
        <Card>
          <CardHeader>
            <CardTitle>Cadastros (Clientes e Fornecedores)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex gap-2">
                {[
                  { v: "todos", label: `Todos (${clientes.length})`, icon: "badge" },
                  { v: "cliente", label: `Clientes (${totalClientes})`, icon: "person" },
                  { v: "fornecedor", label: `Fornecedores (${totalFornecedores})`, icon: "local_shipping" },
                ].map((f) => (
                  <Button key={f.v} variant={filtroTipo === f.v ? "default" : "outline"} size="sm" onClick={() => setFiltroTipo(f.v)}>
                    <Icon name={f.icon} className="text-sm" />
                    {f.label}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]" />
                <input
                  className="pl-10 pr-4 py-2 bg-background border border-input rounded-full text-xs w-full focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                  placeholder="Buscar por nome, empresa, NIF, código..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">Tipo</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase hidden sm:table-cell">Empresa</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">NIF</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase hidden lg:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">Telefone</th>
                  </tr>
                </thead>
                <tbody>
                  {cadastrosFiltrados.map((c, i) => (
                    <tr key={c.id || c.codigo || i} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant={c.tipo === "cliente" ? "info" : "secondary"} className="text-[10px]">
                          <Icon name={c.tipo === "cliente" ? "person" : "local_shipping"} className="text-[10px] mr-0.5" />
                          {c.tipo === "cliente" ? "Cliente" : "Fornecedor"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{c.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.empresa || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c.nif || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{c.email || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.telefone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {cadastrosFiltrados.length === 0 && (
                <p className="text-center p-8 text-muted-foreground">
                  {clientes.length === 0 ? "Nenhum cadastro encontrado" : "Nenhum resultado para os filtros escolhidos"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
