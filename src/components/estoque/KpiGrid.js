"use client";

import { memo } from "react";
import Icon from "@/components/Icon";
import { toNum } from "@/lib/estoque";

const cards = [
  { key: "artigos", icon: "inventory_2", label: "Total de Artigos", tom: "border-primary/20 bg-primary/10 text-primary" },
  { key: "valor", icon: "attach_money", label: "Stock em Valor", tom: "border-info/20 bg-info/10 text-info" },
  { key: "emStock", icon: "task_alt", label: "Em Stock", tom: "border-success/20 bg-success/10 text-success" },
  { key: "emFalta", icon: "warning", label: "Em Falta", tom: "border-error/20 bg-error/10 text-error", alerta: true },
];

function KpiCard({ card, valor }) {
  return (
    <div
      className={`flex items-center gap-3.5 rounded-xl border p-4 shadow-sm ${
        card.alerta ? "border-error/25 bg-error/5" : "border-border bg-card"
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${card.tom}`}>
        <Icon name={card.icon} className="text-xl" />
      </span>
      <div className="min-w-0">
        <p className={`text-xs font-medium ${card.alerta ? "text-error" : "text-muted-foreground"}`}>
          {card.label}
        </p>
        <p className={`mt-0.5 text-2xl font-bold leading-none tracking-tight tabular-nums ${card.alerta ? "text-error" : "text-foreground"}`}>
          {valor}
        </p>
      </div>
    </div>
  );
}

function KpiGrid({ totais, alertas, materiais }) {
  const valorTotal = (materiais || []).reduce(
    (s, i) => s + toNum(i.custo_unit) * toNum(i.quantidade),
    0
  );
  const itens = totais.itens || 0;
  const emStock = (materiais || []).filter((i) => toNum(i.estoque_disponivel) > 0).length;
  const emFalta = (alertas || []).length;

  const data = {
    artigos: itens.toLocaleString("pt-AO"),
    valor: `${Math.round(valorTotal).toLocaleString("pt-AO")} Kz`,
    emStock: emStock.toLocaleString("pt-AO"),
    emFalta: emFalta.toLocaleString("pt-AO"),
  };

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" aria-label="Indicadores do stock">
      {cards.map((card) => (
        <KpiCard key={card.key} card={card} valor={data[card.key]} />
      ))}
    </section>
  );
}

export default memo(KpiGrid);
