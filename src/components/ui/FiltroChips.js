"use client";

import Icon from "@/components/Icon";

export default function FiltroChips({ titulo, icon, opcoes = [], valor = [], onChange, limparLabel = "Todas" }) {
  const alternar = (v) => onChange(valor.includes(v) ? valor.filter((x) => x !== v) : [...valor, v]);

  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        <Icon name={icon} className="text-sm text-primary" />
        {titulo}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors ${
            valor.length === 0
              ? "border-foreground/40 bg-foreground/5 text-foreground"
              : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all ${
                ativo
                  ? "shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
              style={
                ativo
                  ? { borderColor: o.cor, background: `${o.cor}1f`, color: o.cor }
                  : undefined
              }
            >
              <Icon name={o.icon || "circle"} className="text-[13px] shrink-0" style={{ color: o.cor }} />
              {o.label}
              {typeof o.count === "number" && (
                <span className={`font-mono text-[10px] px-1 rounded ${ativo ? "bg-white/40" : "bg-muted/70"}`}>{o.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}