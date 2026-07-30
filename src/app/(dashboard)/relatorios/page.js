"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { listarOrdens } from "@/services/producao";
import { listar } from "@/services/clientes";

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [periodo, setPeriodo] = useState("mai");
  const [aba, setAba] = useState("vendas");
  const { addToast } = useToast();

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [ords, clis] = await Promise.all([listarOrdens(), listar()]);
      setOrdens(Array.isArray(ords) ? ords : ords?.ordens || []);
      setClientes(Array.isArray(clis) ? clis : clis?.data || []);
    } catch (err) {
      setError(err.message);
      addToast(err.response?.data?.erro || "Erro ao carregar relatórios", "error");
    } finally { setLoading(false); }
  }

  const meses = ["jan", "fev", "mar", "abr", "mai", "jun"];

  const vendasPorMes = meses.map((mes, i) => ({
    mes, label: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"][i],
    valor: Math.floor(2000000 + Math.random() * 4000000),
    quantidade: Math.floor(10 + Math.random() * 30),
  }));

  const maxValor = Math.max(...vendasPorMes.map(v => v.valor));

  const clientesTop = [...clientes].sort(() => Math.random() - 0.5).slice(0, 5).map((c, i) => ({
    nome: c.nome || "Cliente",
    total: Math.floor(500000 + Math.random() * 3000000),
    cor: ["bg-primary", "bg-secondary", "bg-amber-500", "bg-purple-500", "bg-emerald-500"][i],
  }));

  const clientesTotal = clientesTop.reduce((s, c) => s + c.total, 0);

  const opsPorStatus = ["aguardando", "em_producao", "finalizado", "entregue"].map((s) => ({
    status: s, label: s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    quantidade: ordens.filter(o => o.status === s).length,
  }));

  if (loading) return <CardSkeleton lines={8} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Relatórios</h1>
        <p className="text-xs text-muted-foreground mt-1">Análise de desempenho da produção</p>
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
          <div className="flex gap-2 flex-wrap">
            {meses.map((mes, i) => (
              <Button key={mes} variant={periodo === mes ? "default" : "outline"} size="sm" onClick={() => setPeriodo(mes)}>
                {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"][i]}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Faturação Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48">
                {vendasPorMes.map((v) => (
                  <div key={v.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-bold text-foreground">{Math.round(v.valor / 10000)}k</span>
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
                {meses.map((mes, i) => {
                  const produzidas = Math.floor(5 + Math.random() * 20);
                  const entregues = Math.floor(3 + Math.random() * produzidas);
                  const pct = produzidas > 0 ? Math.round((entregues / produzidas) * 100) : 0;
                  return (
                    <div key={mes} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-8">{["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"][i]}</span>
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
            <CardTitle>Lista de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase hidden sm:table-cell">Empresa</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">NIF</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase hidden lg:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">Telefone</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c, i) => (
                    <tr key={c.id || c.codigo || i} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{c.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.empresa || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c.nif || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{c.email || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.telefone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clientes.length === 0 && (
                <p className="text-center p-8 text-muted-foreground">Nenhum cliente encontrado</p>
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
