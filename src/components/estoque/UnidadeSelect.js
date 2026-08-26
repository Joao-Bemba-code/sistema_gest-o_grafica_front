"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { inputCls } from "@/lib/estoque";

export default function UnidadeSelect({ value, unidades = [], onChange, placeholder = "Pesquisar unidade..." }) {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [busca, setBusca] = useState("");
  const ref = useRef(null);

  const textoInicial = value || "";

  const filtrados = unidades.filter((u) => {
    const t = busca.toLowerCase();
    if (!t) return true;
    return u.toLowerCase().includes(t);
  });

  const total = filtrados.length;

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  const escolher = (u) => {
    onChange(u);
    setBusca("");
    setAberto(false);
  };

  const tecla = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!aberto) { setAberto(true); return; }
      setAtivo((a) => Math.min(a + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && aberto && total > 0 && filtrados[ativo]) {
      e.preventDefault();
      escolher(filtrados[ativo]);
    } else if (e.key === "Escape") {
      setAberto(false);
      setBusca("");
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          value={aberto ? busca : textoInicial}
          onChange={(e) => { setBusca(e.target.value); setAtivo(0); setAberto(true); }}
          onFocus={() => { setAberto(true); setBusca(""); }}
          onKeyDown={tecla}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={aberto}
          aria-autocomplete="list"
          autoComplete="off"
          className={`${inputCls} pr-9`}
        />
        <Icon name={aberto ? "expand_less" : "arrow_drop_down"} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none" />
      </div>
      {aberto && (
        <ul
          role="listbox"
          aria-label="Unidades"
          className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto custom-scrollbar obsidian-glass cyber-border rounded-xl shadow-xl py-1"
        >
          {filtrados.length === 0 && (
            <li className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhuma unidade encontrada</li>
          )}
          {filtrados.map((u, i) => (
            <li key={u} role="option" aria-selected={u === value}>
              <button
                type="button"
                onClick={() => escolher(u)}
                onMouseEnter={() => setAtivo(i)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${u === value ? "bg-primary/10 text-primary font-semibold" : ativo === i ? "bg-accent" : ""}`}
              >
                <Icon name="straighten" className="text-sm text-primary shrink-0" />
                <span className="flex-1 truncate">{u}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
