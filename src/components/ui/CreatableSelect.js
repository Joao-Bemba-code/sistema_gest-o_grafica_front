"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

export default function CreatableSelect({
  value,
  options,
  placeholder,
  createLabel = "Criar nova família",
  onChange,
  className,
}) {
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(-1);
  const rootRef = useRef(null);

  const itens = options.map((o) => (typeof o === "string" ? { id: o, label: o } : o));
  const termo = value.trim();
  const termoL = termo.toLowerCase();
  const filtrados = termoL
    ? itens.filter((o) => (o.label || "").toLowerCase().includes(termoL))
    : itens;
  const eNovo = termo !== "" && !itens.some((o) => o.label.toLowerCase() === termoL);
  const mostrarLista = aberto && (filtrados.length > 0 || eNovo);
  const totalOpts = filtrados.length;

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  useEffect(() => {
    setIndice(-1);
  }, [value]);

  const teclaDown = (e) => {
    if (e.key === "ArrowDown") {
      if (!aberto) { setAberto(true); return; }
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, totalOpts - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (eNovo && indice === -1) {
        e.preventDefault();
        setAberto(false);
      } else if (indice >= 0 && filtrados[indice]) {
        e.preventDefault();
        onChange(filtrados[indice].label);
        setAberto(false);
      }
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setAberto(true); }}
          onFocus={() => setAberto(true)}
          onKeyDown={teclaDown}
          placeholder={placeholder}
          className={`${className} pr-9`}
        />
        <Icon name="arrow_drop_down" className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground pointer-events-none" />
      </div>

      {mostrarLista && (
        <ul className="absolute z-50 mt-1 w-full obsidian-glass cyber-border rounded-xl shadow-xl overflow-hidden py-1 custom-scrollbar max-h-52 overflow-y-auto animate-scale-in" role="listbox">
          {filtrados.map((opt, i) => (
            <li key={opt.id}>
              <button
                type="button"
                role="option"
                aria-selected={String(opt.id) === String(value)}
                onMouseEnter={() => setIndice(i)}
                onClick={() => { onChange(opt.label); setAberto(false); }}
                className={`w-full flex items-center px-4 py-2.5 text-xs text-left transition-colors ${
                  String(opt.id) === String(value)
                    ? "bg-primary/10 text-primary font-semibold"
                    : i === indice ? "bg-accent text-foreground" : "text-foreground hover:bg-accent"
                }`}
              >
                <span className="flex-1 truncate">{opt.label}</span>
              </button>
            </li>
          ))}
          {eNovo && (
            <li>
              <button
                type="button"
                role="option"
                onMouseEnter={() => setIndice(-1)}
                onClick={() => { onChange(termo); setAberto(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left text-primary hover:bg-accent border-t border-border/60"
              >
                <Icon name="add_circle" className="text-base shrink-0" />
                <span className="truncate">{createLabel}: <span className="font-semibold">{termo}</span></span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
