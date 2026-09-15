"use client";

import Icon from "@/components/Icon";

export default function FiltroChips({ titulo, icon, opcoes = [], valor = [], onChange, limparLabel = "Todas" }) {
  const alternar = (v) => onChange(valor.includes(v) ? valor.filter((x) => x !== v) : [...valor, v]);

  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        <Icon name={icon} className="text-sm" />
        {titulo}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-colors ${
            valor.length === 0
              ? "border-foreground/40 bg-foreground/5 text-foreground"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          <Icon name="close" className="text-xs" />
          {limparLabel}
        </button>
        {opcoes.map((o) => {
          const ativo = valor.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => alternar(o.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-colors ${
                ativo
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Icon name={o.icon || "circle"} className="text-[13px] shrink-0" />
              {o.label}
              {typeof o.count === "number" && <span className="font-mono text-[10px]">{o.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}