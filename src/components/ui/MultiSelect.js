"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

export default function MultiSelect({ value = [], options = [], onChange, placeholder = "Seleccionar...", icon = "filter_list", maxLabel = 3 }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const filtrados = options.filter((o) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return String(o.label || o.value || "").toLowerCase().includes(termo);
  });

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) setBusca("");
  }, [aberto]);

  const alternar = (v) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  const resumo = value.length === 0
    ? placeholder
    : value.length <= maxLabel
      ? value.join(", ")
      : `${value.length} seleccionados`;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => { setAberto(!aberto); setTimeout(() => inputRef.current?.focus(), 50); }}
        aria-expanded={aberto}
        className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl border text-xs shadow-card transition-colors ${
          aberto ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card text-foreground hover:border-primary/40"
        }`}
      >
        <Icon name={icon} className="text-base text-primary shrink-0" />
        <span className="flex-1 min-w-0 truncate text-left">{resumo}</span>
        {value.length > 0 && (
          <span className="shrink-0 rounded-full bg-primary/10 text-primary font-mono text-[10px] px-1.5 py-0.5">{value.length}</span>
        )}
        <Icon name={aberto ? "expand_less" : "expand_more"} className="text-base text-muted-foreground shrink-0" />
      </button>

      {aberto && (
        <div className="absolute z-50 mt-2 w-72 left-0 obsidian-glass cyber-border rounded-2xl shadow-lg overflow-hidden animate-scale-in">
          <div className="p-2 border-b border-border/60">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <Icon name="search" className="text-sm text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar..."
                className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              {busca && (
                <button type="button" onClick={() => setBusca("")} className="text-muted-foreground hover:text-foreground">
                  <Icon name="close" className="text-sm" />
                </button>
              )}
            </div>
          </div>

          <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {filtrados.length === 0 && (
              <li className="px-4 py-3 text-xs text-muted-foreground text-center">Nenhuma opção encontrada</li>
            )}
            {filtrados.map((o) => {
              const ativo = value.includes(o.value);
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => alternar(o.value)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-colors ${
                      ativo ? "text-primary font-medium" : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <span className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${ativo ? "bg-primary border-primary text-white" : "border-border bg-card"}`}>
                      {ativo && <Icon name="check" className="text-[12px]" />}
                    </span>
                    <span className="flex-1 min-w-0 truncate">{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-2 p-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => onChange(options.map((o) => o.value))}
              className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
            >
              Seleccionar tudo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}