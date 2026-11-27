"use client";

import { useEffect, useMemo, useState } from "react";
import { listarFaturas } from "@/services/faturacao";
import { alertasDividas } from "@/services/tesouraria";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import KpiCard from "@/components/ui/KpiCard";
import { StatusBadge } from "@/components/ui/Ledger";
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

function hojeStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function diasAtraso(vencimento) {
  if (!vencimento) return 0;
  const hoje = hojeStr();
  if (vencimento >= hoje) return 0;
  return Math.floor((Date.parse(`${hoje}T00:00:00`) - Date.parse(`${vencimento}T00:00:00`)) / 86400000);
}

const estadoCfg = {
  em_analise: { label: "Em análise", tom: "info" },
  emitida: { label: "Emitida", tom: "warning" },
  paga: { label: "Paga", tom: "success" },
  parcial: { label: "Parcial", tom: "info" },
  vencida: { label: "Vencida", tom: "error" },
  cancelada: { label: "Anulada", tom: "neutral" },
};

const nivelCfg = {
  bloqueado: { label: "Limite atingido", tom: "error" },
  atencao: { label: "Perto do limite", tom: "warning" },
  vencido: { label: "Vencido", tom: "error" },
  normal: { label: "Normal", tom: "neutral" },
};

export default function AcompanhamentoTab() {
  const { addToast } = useToast();
  const [faturas, setFaturas] = useState([]);
  const [alertas, setAlertas] = useState({ resumo: {}, clientes: [] });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    Promise.all([listarFaturas().catch(() => []), alertasDividas().catch(() => ({}))])
      .then(([f, a]) => {
        if (!ativo) return;
        setFaturas(Array.isArray(f) ? f : f?.data || []);
        setAlertas(a || {});
      })
      .catch((e) => addToast?.(e?.response?.data?.erro || "Erro ao carregar acompanhamento", "error"))
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumo = alertas.resumo || {};
  const clientesAlerta = (alertas.clientes || []).filter((c) => c.alerta);

  const metricas = useMemo(() => {
    const ativas = faturas.filter((f) => f.estado !== "cancelada");
    const total = ativas.reduce((s, f) => s + (Number(f.total) || Number(f.valor) || 0), 0);
    const pago = ativas.reduce((s, f) => s + (Number(f.valor_pago) || 0), 0);
    const emAnalise = faturas.filter((f) => f.estado === "em_analise").length;
    const vencidas = ativas.filter((f) => diasAtraso(f.data_vencimento) > 0 && (Number(f.total) || 0) - (Number(f.valor_pago) || 0) > 0.005);
    return {
      total,
      pago,
      aReceber: Math.max(0, total - pago),
      emAnalise,
      vencidas: vencidas.length,
      valorVencido: vencidas.reduce((s, f) => s + ((Number(f.total) || 0) - (Number(f.valor_pago) || 0)), 0),
    };
  }, [faturas]);

  if (carregando) return <ListSkeleton count={6} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon="receipt_long" iconVariant="primary" label="Total facturado" value={kz(metricas.total)} />
        <KpiCard icon="account_balance_wallet" iconVariant="warning" label="A receber" value={kz(metricas.aReceber)} />
        <KpiCard icon="schedule" iconVariant="error" label="Faturas vencidas" value={String(metricas.vencidas)} badge={kz(metricas.valorVencido)} />
        <KpiCard icon="pending" iconVariant="info" label="Em análise" value={String(metricas.emAnalise)} />
      </div>

      {clientesAlerta.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Icon name="warning" className="text-warning" />
              Alertas de dívidas e prazos
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Clientes com dívida vencida ou a atingir o limite de crédito.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {clientesAlerta.map((c) => {
              const nivel = nivelCfg[c.nivel] || nivelCfg.normal;
              return (
                <div key={c.clienteId || c.nome} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Dívida {kz(c.saldoFinal)}
                      {c.diasAtrasoMax > 0 ? ` · ${c.diasAtrasoMax} dia(s) em atraso` : ""}
                      {Number(c.juro) > 0 ? ` · juro ${kz(c.juro)}` : ""}
                    </p>
                  </div>
                  <StatusBadge tom={nivel.tom}>{nivel.label}</StatusBadge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Todas as facturas</CardTitle>
          <p className="text-xs text-muted-foreground">Facturas e dívidas dos clientes, com estado e atraso.</p>
        </CardHeader>
        <CardContent>
          {faturas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              Não existem facturas registadas.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Factura</th>
                    <th className="px-3 py-2 text-left font-medium">Cliente</th>
                    <th className="px-3 py-2 text-left font-medium">Emissão</th>
                    <th className="px-3 py-2 text-left font-medium">Vencimento</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo</th>
                    <th className="px-3 py-2 text-left font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {faturas.map((f) => {
                    const saldo = Math.max(0, (Number(f.total) || Number(f.valor) || 0) - (Number(f.valor_pago) || 0));
                    const atraso = diasAtraso(f.data_vencimento);
                    const cfg = estadoCfg[f.estado] || { label: f.estado, tom: "neutral" };
                    return (
                      <tr key={f.id} className="border-t border-border/70">
                        <td className="px-3 py-2 font-medium text-foreground">{f.numero || `#${f.id}`}</td>
                        <td className="px-3 py-2 text-muted-foreground max-w-40 truncate">{f.cliente?.nome || f.cliente?.empresa || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{dataCurta(f.data_emissao)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="block">{dataCurta(f.data_vencimento)}</span>
                          {atraso > 0 && saldo > 0.005 && <span className="block text-[10px] text-error">{atraso} dia(s) em atraso</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{kz(f.total || f.valor)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-primary">{kz(saldo)}</td>
                        <td className="px-3 py-2">
                          <StatusBadge tom={cfg.tom}>{cfg.label}</StatusBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}