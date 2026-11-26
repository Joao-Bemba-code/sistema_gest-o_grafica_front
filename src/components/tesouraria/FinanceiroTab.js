"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listarFaturas } from "@/services/faturacao";
import { listarMovimentos, resumoTesouraria } from "@/services/tesouraria";
import Icon from "@/components/Icon";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import KpiCard from "@/components/ui/KpiCard";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";

function kz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

function dataCurta(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

const estadoFatura = {
  paga: "text-success",
  parcial: "text-info",
  emitida: "text-warning",
  vencida: "text-error",
  cancelada: "text-muted-foreground",
};

export default function FinanceiroTab() {
  const { addToast } = useToast();
  const [faturas, setFaturas] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [resumo, setResumo] = useState({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      listarFaturas().catch(() => []),
      listarMovimentos().catch(() => []),
      resumoTesouraria().catch(() => ({})),
    ])
      .then(([f, m, r]) => {
        if (!ativo) return;
        setFaturas(Array.isArray(f) ? f : f?.data || []);
        setMovimentos(Array.isArray(m) ? m : []);
        setResumo(r || {});
      })
      .catch((e) => {
        addToast?.(e?.response?.data?.erro || "Erro ao carregar resumo financeiro", "error");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ativas = faturas.filter((f) => f.estado !== "cancelada");
  const faturado = ativas.reduce((s, f) => s + (Number(f.total) || Number(f.valor) || 0), 0);
  const recebido = ativas.reduce((s, f) => s + (Number(f.valor_pago) || 0), 0);
  const aReceber = ativas
    .filter((f) => !["paga", "cancelada"].includes(f.estado))
    .reduce((s, f) => s + Math.max(0, (Number(f.total) || Number(f.valor) || 0) - (Number(f.valor_pago) || 0)), 0);

  if (carregando) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Financeiro</h2>
          <p className="text-xs text-muted-foreground">Facturação, entradas, saídas e resultado do mês.</p>
        </div>
        <Link href="/faturacao">
          <Button variant="outline">
            <Icon name="receipt_long" className="text-sm" /> Gestão completa da facturação
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon="receipt_long" iconVariant="primary" label="Facturado" value={kz(faturado)} />
        <KpiCard icon="payments" iconVariant="success" label="Recebido" value={kz(recebido)} />
        <KpiCard icon="money_off" iconVariant="warning" label="A receber" value={kz(aReceber)} />
        <KpiCard
          icon="trending_up"
          iconVariant={Number(resumo.saldoMes) >= 0 ? "success" : "error"}
          label="Saldo do mês"
          value={kz(resumo.saldoMes)}
          badge={`Entradas ${kz(resumo.entradasMes)} · Saídas ${kz(resumo.saidasMes)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Últimas facturas</CardTitle>
          </CardHeader>
          <CardContent>
            {faturas.length === 0 ? (
              <p className="py-5 text-center text-xs text-muted-foreground">Sem facturas registadas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-2 text-left font-medium">Factura</th>
                      <th className="py-2 text-left font-medium">Data</th>
                      <th className="py-2 text-right font-medium">Total</th>
                      <th className="py-2 text-right font-medium">Pago</th>
                      <th className="py-2 text-left font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faturas.slice(0, 6).map((f) => (
                      <tr key={f.id} className="border-t border-border/70">
                        <td className="py-2 font-medium">{f.numero || `#${f.id}`}</td>
                        <td className="py-2 text-muted-foreground">{dataCurta(f.data_emissao)}</td>
                        <td className="py-2 text-right tabular-nums">{kz(f.total || f.valor)}</td>
                        <td className="py-2 text-right tabular-nums text-success">{kz(f.valor_pago)}</td>
                        <td className={`py-2 font-medium ${estadoFatura[f.estado] || ""}`}>{f.estado || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Últimos movimentos</CardTitle>
          </CardHeader>
          <CardContent>
            {movimentos.length === 0 ? (
              <p className="py-5 text-center text-xs text-muted-foreground">Sem movimentos registados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-2 text-left font-medium">Data</th>
                      <th className="py-2 text-left font-medium">Descrição</th>
                      <th className="py-2 text-left font-medium">Tipo</th>
                      <th className="py-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentos.slice(0, 6).map((m) => (
                      <tr key={m.id} className="border-t border-border/70">
                        <td className="py-2 text-muted-foreground">{dataCurta(m.data_movimento)}</td>
                        <td className="py-2 font-medium">{m.descricao}</td>
                        <td className="py-2 text-muted-foreground">{m.tipo}</td>
                        <td className={`py-2 text-right tabular-nums ${m.tipo === "entrada" ? "text-success" : "text-error"}`}>
                          {m.tipo === "saida" ? "-" : ""}{kz(m.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
