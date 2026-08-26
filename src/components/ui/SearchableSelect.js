"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

export default function SearchableSelect({ value, options, placeholder, required, onSelect, renderItem, className }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [indice, setIndice] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listaRef = useRef(null);

  const selecionado = options.find((o) => String(o.id) === String(value));

  const filtrados = options.filter((o) => {
    const termo = busca.toLowerCase();
    if (!termo) return true;
    const label = (o.label || o.nome || o.id || "").toLowerCase();
    return label.includes(termo);
  });

  useEffect(() => {
    setIndice(-1);
  }, [busca]);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  const fechar = useCallback(() => {
    setAberto(false);
    setBusca("");
  }, []);

  const selecionar = useCallback((opt) => {
    onSelect(opt.id);
    fechar();
  }, [onSelect, fechar]);

  const teclaDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && indice >= 0 && filtrados[indice]) {
      e.preventDefault();
      selecionar(filtrados[indice]);
    } else if (e.key === "Escape") {
      fechar();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => { setAberto(!aberto); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={`flex items-center justify-between w-full text-left ${className}`}
      >
        <span className={selecionado ? "text-foreground" : "text-muted-foreground"}>
          {selecionado ? (renderItem ? renderItem(selecionado) : selecionado.label || selecionado.nome) : (placeholder || "Seleccionar...")}
        </span>
        <Icon name={aberto ? "expand_less" : "expand_more"} className="text-lg text-muted-foreground shrink-0" />
      </button>

      {aberto && (
        <div className="absolute z-50 mt-1 w-full obsidian-glass cyber-border rounded-xl shadow-xl overflow-hidden animate-scale-in">
          <div className="p-2 border-b border-border/60">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <Icon name="search" className="text-sm text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={teclaDown}
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

          <ul ref={listaRef} className="max-h-56 overflow-y-auto py-1 custom-scrollbar" role="listbox">
            {filtrados.length === 0 && (
              <li className="px-4 py-3 text-xs text-muted-foreground text-center">Nenhuma opção encontrada</li>
            )}
            {filtrados.map((opt, i) => (
              <li key={opt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={String(opt.id) === String(value)}
                  onMouseEnter={() => setIndice(i)}
                  onClick={() => selecionar(opt)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left transition-colors ${
                    String(opt.id) === String(value) ? "bg-primary/10 text-primary font-semibold" : i === indice ? "bg-accent text-foreground" : "text-foreground hover:bg-accent"
                  }`}
                >
                  {renderItem ? renderItem(opt) : (
                    <>
                      <span className="flex-1 truncate">{opt.label || opt.nome || opt.id}</span>
                      {opt.badge && <span className="text-[9px] font-mono text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">{opt.badge}</span>}
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
