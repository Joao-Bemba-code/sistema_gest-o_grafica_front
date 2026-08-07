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
    cor: "text-primary",
    barra: "bg-primary",
    spark: "telemetry-sparkline",
  },
  {
    key: "alertas",
    icon: "warning",
    label: "Alertas Críticos",
    unit: "req",
    cor: "text-error",
    barra: "bg-error",
    spark: "telemetry-sparkline-error",
    critico: true,
  },
  {
    key: "valor",
    icon: "attach_money",
    label: "Valor em Stock",
    unit: "",
    cor: "text-secondary",
    barra: "bg-secondary",
    spark: "telemetry-sparkline-secondary",
    prefixo: true,
  },
  {
    key: "reservado",
    icon: "pending_actions",
    label: "Reservado (OPs)",
    unit: "un",
    cor: "text-tertiary",
    barra: "bg-tertiary",
    spark: "telemetry-sparkline-tertiary",
  },
];

function KpiCard({ card, valor, barra }) {
  return (
    <div className={`obsidian-glass rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden ${card.critico ? "border border-error/30 bg-error/5" : "cyber-border"}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <Icon name={card.icon} className={`${card.cor} text-[18px]`} />
          <p className={`text-[10px] font-mono uppercase tracking-widest ${card.critico ? "text-error" : "text-on-surface-variant"}`}>{card.label}</p>
        </div>
        <div className={card.spark} aria-hidden="true" />
      </div>
      <div>
        <p className={`font-mono text-3xl font-bold tracking-tight ${card.critico ? "text-error" : "text-on-surface"}`}>
          {card.prefixo && <span className={`text-sm mr-1 ${card.cor}`}>{valor.moeda}</span>}
          {valor.numero}
          {card.unit && (
            <span className={`text-xs ml-1 font-normal ${card.critico ? "text-error/60" : "text-on-surface-variant"}`}>{card.unit}</span>
          )}
        </p>
      </div>
      <div className={`w-full h-1 mt-1 rounded-full overflow-hidden ${card.critico ? "bg-error/20" : "bg-surface-variant"}`}>
        <div className={`${card.barra} h-full ${card.critico ? "animate-pulse" : ""}`} style={{ width: `${barra}%` }} />
      </div>
    </div>
  );
}

function KpiGrid({ totais, alertas, materiais }) {
  const stock = totais.stock || 1;
  const valorTotal = (materiais || []).reduce((s, i) => s + toNum(i.custo_unit) * toNum(i.quantidade), 0);
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
