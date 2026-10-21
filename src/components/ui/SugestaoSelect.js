"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { inputCls } from "@/lib/estoque";

function semAcentos(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function SugestaoSelect({
  id,
  value = "",
  opcoes = [],
  onChange,
  placeholder = "Pesquisar ou escrever...",
  icon = "label",
  required = false,
}) {
  const [aberto, setAberto] = useState(false);
  const [filtrar, setFiltrar] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const ref = useRef(null);

  const itens = useMemo(
    () => (opcoes || [])
      .map((o) => {
        if (typeof o === "string") return { valor: o, label: o };
        return { valor: o.valor ?? o.label ?? "", label: o.label ?? o.valor ?? "", icon: o.icon };
      })
      .filter((o) => String(o.label || "").trim()),
    [opcoes]
  );

  const filtrados = useMemo(() => {
    if (!filtrar) return itens;
    const termo = semAcentos(value).trim();
    if (!termo) return itens;
    return itens.filter((o) => semAcentos(o.label).includes(termo));
  }, [itens, filtrar, value]);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  const listaId = `${id || "sugestao"}-lista`;

  const escolher = (item) => {
    onChange?.(item.label);
    setFiltrar(false);
    setAberto(false);
  };

  const tecla = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!aberto) { setAberto(true); setFiltrar(false); return; }
      setAtivo((a) => Math.min(a + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && aberto && filtrados[ativo]) {
      e.preventDefault();
      escolher(filtrados[ativo]);
    } else if (e.key === "Escape") {
      setAberto(false);
      setFiltrar(false);
    }
  };

  const selecionado = (item) => semAcentos(String(value).trim()) === semAcentos(item.label);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          id={id}
          required={required}
          aria-required={required || undefined}
          value={value}
          onChange={(e) => {
            onChange?.(e.target.value);
            setAberto(true);
            setFiltrar(true);
            setAtivo(0);
          }}
          onFocus={() => { setAberto(true); setFiltrar(false); setAtivo(0); }}
          onKeyDown={tecla}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listaId}
          aria-autocomplete="list"
          autoComplete="off"
          className={`${inputCls} pr-9`}
        />
        <Icon name={aberto ? "expand_less" : "arrow_drop_down"} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none" />
      </div>
      {aberto && (
        <ul
          id={listaId}
          role="listbox"
          aria-label="Sugestões registadas"
          className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto custom-scrollbar bg-card border border-border rounded-xl shadow-lg py-1"
        >
          {filtrados.length === 0 && (
            <li className="px-3 py-3 text-xs text-muted-foreground text-center">
              Nenhuma sugestão encontrada.
              <span className="block mt-1 text-[10px]">Podes escrever à mão.</span>
            </li>
          )}
          {filtrados.map((item, i) => {
            const marcado = selecionado(item);
            return (
              <li key={`${item.label}-${i}`} role="option" aria-selected={marcado}>
                <button
                  type="button"
                  onClick={() => escolher(item)}
                  onMouseEnter={() => setAtivo(i)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${marcado ? "bg-primary/10 text-primary font-semibold" : ativo === i ? "bg-accent" : ""}`}
                >
                  <Icon name={item.icon || icon} className="text-sm text-primary shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{item.label}</span>
                  {marcado && <Icon name="check" className="text-sm text-primary shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
