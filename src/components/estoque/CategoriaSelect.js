"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { inputCls, familias, normalizarFamilia, tiposItem, normalizarTipoItem } from "@/lib/estoque";

export default function CategoriaSelect({ value, categorias = [], onChange, placeholder = "Pesquisar categoria..." }) {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [busca, setBusca] = useState("");
  const ref = useRef(null);

  const rotuloDe = (c) => {
    const famCfg = familias[normalizarFamilia(c.familia)];
    const tipoCfg = tiposItem[normalizarTipoItem(c.tipo)];
    return [tipoCfg?.label || c.tipo, c.subfamilia, famCfg?.label || c.familia].filter(Boolean).join(" > ");
  };

  const selecionada = categorias.find((c) => String(c.id) === String(value));
  const textoInicial = selecionada
    ? [tiposItem[normalizarTipoItem(selecionada.tipo)]?.label || "", selecionada.subfamilia]
        .filter(Boolean)
        .join(" > ") || selecionada.nome || selecionada.familia || ""
    : "";

  const filtrados = categorias.filter((c) => {
    const t = busca.toLowerCase();
    if (!t) return true;
    return rotuloDe(c).toLowerCase().includes(t) || String(c.nome || "").toLowerCase().includes(t);
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

  const escolher = (cat) => {
    onChange(cat.id);
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
          aria-label="Categorias"
          className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto custom-scrollbar obsidian-glass cyber-border rounded-xl shadow-lg py-1"
        >
          {filtrados.length === 0 && (
            <li className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhuma categoria encontrada</li>
          )}
          {filtrados.map((cat, i) => {
            const fam = normalizarFamilia(cat.familia);
            const famCfg = familias[fam];
            const tipoCfg = tiposItem[normalizarTipoItem(cat.tipo)];
            const tipoLabel = tipoCfg?.label || String(cat.tipo || "");
            return (
              <li key={cat.id} role="option" aria-selected={String(cat.id) === String(value)}>
                <button
                  type="button"
                  onClick={() => escolher(cat)}
                  onMouseEnter={() => setAtivo(i)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${String(cat.id) === String(value) ? "bg-primary/10 text-primary font-semibold" : ativo === i ? "bg-accent" : ""}`}
                >
                  {<Icon name={famCfg?.icon || (tipoCfg?.label === "Maquinaria" ? "precision_manufacturing" : "category")} className="text-sm text-primary shrink-0" />}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{tipoLabel || famCfg?.label || cat.familia || cat.nome}</span>
                    {(cat.subfamilia || famCfg) && (
                      <span className="block text-[9px] text-muted-foreground truncate">
                        {[cat.subfamilia, famCfg?.label || cat.familia].filter(Boolean).join(" > ")}
                      </span>
                    )}
                  </span>
                  {famCfg && famCfg.label !== tipoLabel && (
                    <span className="text-[9px] font-mono text-primary border border-primary/30 rounded px-1.5 py-0.5 shrink-0 bg-primary/5">{famCfg.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}