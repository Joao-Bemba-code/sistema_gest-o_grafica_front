"use client";

import { memo } from "react";
import Icon from "@/components/Icon";
import { toNum } from "@/lib/estoque";

const cards = [
  {
    key: "itens",
    icon: "inventory_2",
    label: "Total de Itens",
    unit: "itens",
    barra: "bg-primary",
  },
  {
    key: "alertas",
    icon: "warning",
    label: "Alertas Críticos",
    unit: "req",
    barra: "bg-error",
    critico: true,
  },
  {
    key: "valor",
    icon: "attach_money",
    label: "Valor em Stock",
    unit: "",
    barra: "bg-secondary",
    prefixo: true,
  },
  {
    key: "reservado",
    icon: "pending_actions",
    label: "Reservado (OPs)",
    unit: "un",
    barra: "bg-tertiary",
  },
];

function KpiCard({ card, valor, barra }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-card border p-5 flex flex-col gap-3 transition-shadow ${
        card.critico ? "border-error/30 bg-error/5" : "border-border shadow-card hover:shadow-card-hover"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${
            card.critico ? "bg-error/10 text-error border border-error/25" : "bg-muted text-primary border border-border"
          }`}
        >
          <Icon name={card.icon} className="text-lg" />
        </span>
        <p className={`text-[11px] font-semibold uppercase tracking-wider truncate ${card.critico ? "text-error" : "text-muted-foreground"}`}>
          {card.label}
        </p>
      </div>
      <div>
        <p className={`font-mono text-3xl font-bold tracking-tight ${card.critico ? "text-error" : "text-foreground"}`}>
          {card.prefixo && <span className={`text-sm mr-1 ${card.critico ? "text-error/70" : "text-muted-foreground"}`}>{valor.moeda}</span>}
          {valor.numero}
          {card.unit && (
            <span className={`text-xs ml-1 font-normal ${card.critico ? "text-error/70" : "text-muted-foreground"}`}>{card.unit}</span>
          )}
        </p>
      </div>
      <div className="w-full h-1.5 mt-auto rounded-full overflow-hidden bg-muted">
        <div
          className={`h-full rounded-full ${card.critico ? "bg-error animate-pulse" : card.barra}`}
          style={{ width: `${barra}%` }}
        />
      </div>
    </div>
  );
}

function KpiGrid({ totais, alertas, materiais }) {
  const stock = totais.stock || 1;
  const valorTotal = (materiais || []).reduce(
    (s, i) => s + toNum(i.custo_unit) * toNum(i.quantidade),
    0
  );
  const itens = totais.itens || 0;

  const data = {
    itens: {
      numero: itens.toLocaleString("pt-AO"),
      moeda: "",
    },
    alertas: {
      numero: String((alertas || []).length),
      moeda: "",
    },
    valor: {
      numero: Math.round(valorTotal).toLocaleString("pt-AO"),
      moeda: "Kz",
    },
    reservado: {
      numero: totais.reservado.toLocaleString("pt-AO"),
      moeda: "",
    },
  };

  const barras = {
    itens: itens > 0 ? Math.min(100, Math.round((totais.disponivel / stock) * 100)) : 0,
    alertas: (alertas || []).length > 0 ? 100 : 0,
    valor: valorTotal > 0 ? Math.min(100, Math.max(15, Math.round((totais.reservado / stock) * 100))) : 0,
    reservado: Math.min(100, Math.round((totais.reservado / stock) * 100)),
  };

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Indicadores do estoque">
      {cards.map((card) => (
        <KpiCard key={card.key} card={card} valor={data[card.key]} barra={barras[card.key]} />
      ))}
    </section>
  );
}

export default memo(KpiGrid);