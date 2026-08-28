"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { listarOrdens } from "@/services/producao";
import { listar } from "@/services/clientes";
import { listar as listarFaturas } from "@/services/faturacao";
import { listar as listarMateriais } from "@/services/materiais";
import { listar as listarCategorias } from "@/services/categorias";
import { gerarRelatorioStockPDF, gerarRelatorioCadastrosPDF, gerarRelatorioCategoriasPDF } from "@/lib/estoquePdf";
import { toNum, familias, normalizarFamilia, tiposItem, normalizarTipoItem } from "@/lib/estoque";
import { buscarOrganizacao } from "@/services/configuracoes";

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
  const [materiais, setMateriais] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [org, setOrg] = useState({});
  const [periodo, setPeriodo] = useState(getUltimos6Meses()[5].labelCurto);
  const [aba, setAba] = useState("comercial");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const { addToast } = useToast();

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [ords, clis, fats, mats, cats, o] = await Promise.all([
        listarOrdens(),
        listar(),
        listarFaturas(),
        listarMateriais(),
        listarCategorias(),
        buscarOrganizacao()
      ]);
      setOrdens(Array.isArray(ords) ? ords : ords?.ordens || []);
      setClientes(Array.isArray(clis) ? clis : clis?.data || []);
      setFaturas(Array.isArray(fats) ? fats : fats?.data || []);
      setMateriais(Array.isArray(mats) ? mats : []);
      setCategorias(Array.isArray(cats) ? cats : []);
      setOrg(o || {});
    } catch (err) {
      setError(err.message);
      addToast(err.response?.data?.erro || "Erro ao carregar relatórios", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

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
        cor: ["bg-primary", "bg-primary/70", "bg-primary/50", "bg-primary/30", "bg-primary/15"][i],
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
    status: s,
    label: s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
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

  const abas = [
    { key: "comercial", label: "Área Comercial", icon: "trending_up" },
    { key: "producao", label: "Produção", icon: "precision_manufacturing" },
    { key: "provisionamento", label: "Provisionamento", icon: "inventory_2" },
    { key: "recursos", label: "Recursos", icon: "category" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Visão geral do desempenho da produção</p>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap bg-muted/30 p-1 rounded-lg">
        {abas.map((a) => (
          <Button
            key={a.key}
            variant={aba === a.key ? "default" : "ghost"}
            size="sm"
            onClick={() => setAba(a.key)}
            className={`gap-2 ${aba === a.key ? "" : "hover:bg-muted/50"}`}
          >
            <Icon name={a.icon} className="text-base" />
            {a.label}
          </Button>
        ))}
      </div>

      {aba === "comercial" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Recebido Hoje", value: `Kz ${recebidoHoje.toLocaleString("pt-AO")}`, icon: "today" },
              { label: "Recebido este Mês", value: `Kz ${recebidoMes.toLocaleString("pt-AO")}`, icon: "payments" },
              { label: "A Receber", value: `Kz ${faturas.filter((f) => !["paga", "cancelada"].includes(f.estado)).reduce((s, f) => s + (Number(f.total || f.valor) || 0), 0).toLocaleString("pt-AO")}`, icon: "paid" },
              { label: "Documentos", value: faturas.length, icon: "receipt_long" },
            ].map((kpi) => (
              <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} />
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {ultimosMeses.map((m) => (
              <Button
                key={m.labelCurto}
                variant={periodo === m.labelCurto ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodo(m.labelCurto)}
              >
                {m.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Faturação Emitida</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-40">
                  {vendasPorMes.map((v) => (
                    <div key={v.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-xs font-medium">{v.valor > 0 ? compactKz(v.valor) : "0"}</span>
                      <div className="w-full bg-muted rounded-sm overflow-hidden" style={{ height: `${(v.valor / maxValor) * 100}%` }}>
                        <div className="w-full h-full bg-primary rounded-sm" style={{ height: `${(v.valor / maxValor) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{v.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Recebido (Faturas Pagas)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-40">
                  {recebidoPorMes.map((v) => (
                    <div key={v.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-xs font-medium">{v.valor > 0 ? compactKz(v.valor) : "0"}</span>
                      <div className="w-full bg-muted rounded-sm overflow-hidden" style={{ height: `${(v.valor / maxRecebido) * 100}%` }}>
                        <div className="w-full h-full bg-primary/70 rounded-sm" style={{ height: `${(v.valor / maxRecebido) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{v.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Top 5 Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientesTop.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{c.nome}</span>
                        <span className="font-medium">Kz {c.total.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.cor}`} style={{ width: `${(c.total / clientesTotal) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Cadastros</CardTitle>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => gerarRelatorioCadastrosPDF(clientes, org, "todos")}>
                  <Icon name="picture_as_pdf" className="text-sm" />
                  Todos
                </Button>
                <Button size="sm" variant="outline" onClick={() => gerarRelatorioCadastrosPDF(clientes, org, "cliente")}>
                  <Icon name="picture_as_pdf" className="text-sm" />
                  Clientes
                </Button>
                <Button size="sm" variant="outline" onClick={() => gerarRelatorioCadastrosPDF(clientes, org, "fornecedor")}>
                  <Icon name="picture_as_pdf" className="text-sm" />
                  Fornecedores
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex gap-1.5">
                  {[
                    { v: "todos", label: `Todos (${clientes.length})`, icon: "badge" },
                    { v: "cliente", label: `Clientes (${totalClientes})`, icon: "person" },
                    { v: "fornecedor", label: `Fornecedores (${totalFornecedores})`, icon: "local_shipping" },
                  ].map((f) => (
                    <Button
                      key={f.v}
                      variant={filtroTipo === f.v ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltroTipo(f.v)}
                    >
                      <Icon name={f.icon} className="text-sm" />
                      {f.label}
                    </Button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base" />
                  <input
                    className="pl-9 pr-4 py-1.5 bg-background border rounded text-sm w-full outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Buscar..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Nome</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Empresa</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">NIF</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Email</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Telefone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cadastrosFiltrados.map((c, i) => (
                      <tr key={c.id || c.codigo || i} className="border-b">
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-xs">
                            <Icon name={c.tipo === "cliente" ? "person" : "local_shipping"} className="text-xs mr-1" />
                            {c.tipo === "cliente" ? "Cliente" : "Fornecedor"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 font-medium">{c.nome}</td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{c.empresa || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{c.nif || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">{c.email || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{c.telefone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cadastrosFiltrados.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    {clientes.length === 0 ? "Nenhum cadastro encontrado" : "Nenhum resultado para os filtros escolhidos"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {aba === "producao" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {opsPorStatus.map((s) => (
              <Card key={s.status}>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-semibold">{s.quantidade}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
            {opsPorStatus.map((s) => {
              const total = opsPorStatus.reduce((t, x) => t + x.quantidade, 0) || 1;
              const pct = (s.quantidade / total) * 100;
              const cores = { aguardando: "bg-amber-400", em_producao: "bg-primary", finalizado: "bg-emerald-400", entregue: "bg-purple-400" };
              return pct > 0 ? <div key={s.status} className={`h-full ${cores[s.status]}`} style={{ width: `${pct}%` }} /> : null;
            })}
          </div>

          <div className="flex gap-4 flex-wrap text-xs">
            {opsPorStatus.map((s) => {
              const cores = { aguardando: "bg-amber-400", em_producao: "bg-primary", finalizado: "bg-emerald-400", entregue: "bg-purple-400" };
              return (
                <div key={s.status} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${cores[s.status]}`} />
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium">
                    {Math.round((s.quantidade / (opsPorStatus.reduce((t, x) => t + x.quantidade, 0) || 1)) * 100)}%
                  </span>
                </div>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Desempenho por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ultimosMeses.map((m) => {
                  const { produzidas, entregues, pct } = producaoPorMes[m.mes] || { produzidas: 0, entregues: 0, pct: 0 };
                  return (
                    <div key={m.labelCurto} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-8">{m.label}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{produzidas} ordens</span>
                          <span className="font-medium">{entregues} entregues ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
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

      {aba === "provisionamento" && (() => {
        const catMap = {};
        materiais.forEach((m) => {
          const cat = m.categoria?.nome || "Sem categoria";
          const fam = normalizarFamilia(m.categoria?.familia);
          if (!catMap[cat]) catMap[cat] = { qtd: 0, valorTotal: 0, disponivel: 0, itens: 0, familia: fam };
          catMap[cat].itens += 1;
          catMap[cat].qtd += toNum(m.quantidade);
          catMap[cat].disponivel += toNum(m.estoque_disponivel);
          catMap[cat].valorTotal += toNum(m.quantidade) * toNum(m.custo_unit);
        });
        const catSorted = Object.entries(catMap).sort((a, b) => b[1].valorTotal - a[1].valorTotal);
        const totalItens = materiais.length;
        const totalQtd = materiais.reduce((s, m) => s + toNum(m.quantidade), 0);
        const totalValor = materiais.reduce((s, m) => s + toNum(m.quantidade) * toNum(m.custo_unit), 0);
        const esgotados = materiais.filter((m) => m.status === "esgotado").length;
        const abaixoMin = materiais.filter((m) => m.status === "repor").length;
        const criticos = esgotados + abaixoMin;

        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon="inventory_2" label="Total Materiais" value={totalItens} />
              <KpiCard icon="scale" label="Qtd. em Stock" value={totalQtd.toLocaleString("pt-AO")} />
              <KpiCard icon="payments" label="Valor Estoque" value={`Kz ${totalValor.toLocaleString("pt-AO")}`} />
              <KpiCard icon="warning" label="Críticos" value={`${criticos}`} />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Resumo por Categoria</CardTitle>
                <Button size="sm" variant="outline" onClick={() => gerarRelatorioStockPDF(materiais, categorias, org)}>
                  <Icon name="picture_as_pdf" className="text-sm" />
                  PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Categoria</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Itens</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Qtd.</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Disponível</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catSorted.map(([nome, d]) => {
                        const famCfg = familias[d.familia];
                        return (
                          <tr key={nome} className="border-b">
                            <td className="px-3 py-2.5 flex items-center gap-2">
                              {famCfg && <Icon name={famCfg.icon} className="text-sm text-muted-foreground" />}
                              <span className="font-medium">{nome}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs">{d.itens}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs">{d.qtd.toLocaleString("pt-AO")}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs">{d.disponivel.toLocaleString("pt-AO")}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs hidden sm:table-cell">Kz {d.valorTotal.toLocaleString("pt-AO")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-medium">
                        <td className="px-3 py-2.5 text-xs">TOTAL</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs">{totalItens}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs">{totalQtd.toLocaleString("pt-AO")}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs">{totalQtd.toLocaleString("pt-AO")}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs hidden sm:table-cell">Kz {totalValor.toLocaleString("pt-AO")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-semibold text-emerald-500">{materiais.filter((m) => m.status === "ok").length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Saudáveis</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-semibold text-amber-500">{abaixoMin}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Abaixo do Mínimo</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-semibold text-red-500">{esgotados}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Esgotados</p>
                </CardContent>
              </Card>
            </div>

            {criticos > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Itens Críticos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {materiais.filter((m) => m.status === "esgotado" || m.status === "repor").map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded border">
                        <div className="flex items-center gap-2">
                          <Icon name={m.status === "esgotado" ? "error" : "warning"} className={`text-sm ${m.status === "esgotado" ? "text-red-500" : "text-amber-500"}`} />
                          <span className="text-sm font-medium">{m.nome}</span>
                          <span className="text-xs text-muted-foreground">{m.categoria?.nome || ""}</span>
                        </div>
                        <span className={`text-xs font-mono font-medium ${m.status === "esgotado" ? "text-red-500" : "text-amber-500"}`}>
                          {toNum(m.estoque_disponivel).toLocaleString("pt-AO")} / {toNum(m.ponto_ressuprimento || m.estoque_min).toLocaleString("pt-AO")} {m.unidade}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        );
      })()}

      {aba === "recursos" && (() => {
        const materiaisPorCat = {};
        materiais.forEach((m) => {
          const catNome = m.categoria?.nome || m.categoria_nome || "Sem categoria";
          materiaisPorCat[catNome] = (materiaisPorCat[catNome] || 0) + 1;
        });
        const catMap = {};
        categorias.forEach((c) => {
          const fam = normalizarFamilia(c.familia);
          if (!catMap[fam]) catMap[fam] = [];
          catMap[fam].push(c);
        });
        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard icon="category" label="Categorias" value={categorias.length} />
              <KpiCard icon="folder_open" label="Famílias" value={Object.keys(catMap).length} />
              <KpiCard icon="inventory_2" label="Materiais" value={materiais.length} />
              <KpiCard icon="people" label="Cadastros" value={clientes.length} />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Categorias por Família</CardTitle>
                <Button size="sm" variant="outline" onClick={() => gerarRelatorioCategoriasPDF(categorias, materiais, org)}>
                  <Icon name="picture_as_pdf" className="text-sm" />
                  PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(catMap).sort((a, b) => a[0].localeCompare(b[0])).map(([fam, cats]) => {
                    const famCfg = familias[fam];
                    return (
                      <div key={fam}>
                        <div className="flex items-center gap-2 mb-3">
                          {famCfg && <Icon name={famCfg.icon} className="text-sm text-muted-foreground" />}
                          <h3 className="text-sm font-medium uppercase tracking-wider">{famCfg?.label || fam}</h3>
                          <span className="text-xs text-muted-foreground">({cats.length})</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Categoria</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Tipo</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Descrição</th>
                                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase">Itens</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cats.sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => (
                                <tr key={c.id} className="border-b">
                                  <td className="px-3 py-2.5 font-medium">{c.nome}</td>
                                  <td className="px-3 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">{tiposItem[normalizarTipoItem(c.tipo)]?.label || "—"}</td>
                                  <td className="px-3 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">{c.descricao || "—"}</td>
                                  <td className="px-3 py-2.5 text-right font-mono text-xs">{materiaisPorCat[c.nome] || 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                  {categorias.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma categoria cadastrada</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        );
      })()}

      <footer className="pt-4 text-center border-t">
        <p className="text-xs text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}