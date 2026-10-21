"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { inputCls, familias, familiasServico, tiposItem, normalizarFamilia, normalizarTipoItem } from "@/lib/estoque";

const todosFamilias = { ...familias, ...familiasServico };

function semAcentos(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function rotuloCategoria(categoria) {
  if (!categoria) return "";
  const famCfg = todosFamilias[normalizarFamilia(categoria.familia)];
  const tipoCfg = tiposItem[normalizarTipoItem(categoria.tipo)];
  return [
    famCfg?.label || categoria.familia,
    String(categoria.subfamilia || "").trim(),
    tipoCfg?.label || categoria.tipo,
  ].filter(Boolean).join(" › ");
}

export default function CategoriaMaterialSelect({
  id,
  value = "",
  categorias = [],
  onChangeTexto,
  onSelecionar,
  placeholder = "Pesquisar categoria...",
  required = false,
}) {
  const [aberto, setAberto] = useState(false);
  const [filtrar, setFiltrar] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const ref = useRef(null);

  const opcoes = useMemo(
    () => categorias.map((c) => ({ categoria: c, rotulo: rotuloCategoria(c) })).filter((o) => o.rotulo),
    [categorias]
  );

  const filtrados = useMemo(() => {
    if (!filtrar) return opcoes;
    const termo = semAcentos(value).trim();
    if (!termo) return opcoes;
    return opcoes.filter(
      (o) => semAcentos(o.rotulo).includes(termo) || semAcentos(o.categoria.nome || "").includes(termo)
    );
  }, [opcoes, filtrar, value]);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  const listaId = `${id || "categoria-material"}-lista`;

  const escolher = (opcao) => {
    onSelecionar?.(opcao.categoria);
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

  const selecionado = (opcao) => {
    const atual = semAcentos(String(value).trim());
    return atual === semAcentos(opcao.rotulo) || atual === semAcentos(opcao.categoria.nome || "");
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          id={id}
          required={required}
          aria-required={required || undefined}
          value={value}
          onChange={(e) => {
            onChangeTexto?.(e.target.value);
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
          aria-label="Categorias registadas"
          className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto custom-scrollbar bg-card border border-border rounded-xl shadow-lg py-1"
        >
          {filtrados.length === 0 && (
            <li className="px-3 py-3 text-xs text-muted-foreground text-center">
              Nenhuma categoria encontrada.
              <span className="block mt-1 text-[10px]">Podes escrever a categoria à mão.</span>
            </li>
          )}
          {filtrados.map((opcao, i) => {
            const cat = opcao.categoria;
            const famCfg = todosFamilias[normalizarFamilia(cat.familia)];
            const marcado = selecionado(opcao);
            return (
              <li key={cat.id} role="option" aria-selected={marcado}>
                <button
                  type="button"
                  onClick={() => escolher(opcao)}
                  onMouseEnter={() => setAtivo(i)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${marcado ? "bg-primary/10 text-primary font-semibold" : ativo === i ? "bg-accent" : ""}`}
                >
                  <Icon name={famCfg?.icon || "label"} className="text-sm text-primary shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{opcao.rotulo}</span>
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
