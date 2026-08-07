"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { inputCls } from "@/lib/estoque";
import { criar as criarFornecedor } from "@/services/fornecedores";
import { useToast } from "@/components/Toast";

export default function FornecedorSelect({ value = "", onChange, fornecedores = [], placeholder = "Procurar fornecedor...", required = false }) {
  const { addToast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [extras, setExtras] = useState([]);
  const ref = useRef(null);
  const termo = String(value || "").trim().toLowerCase();

  const nomes = [...new Set([...(fornecedores || []), ...extras].map((f) => f.nome || f.razao_social || "").filter(Boolean))];
  const filtrados = termo ? nomes.filter((n) => n.toLowerCase().includes(termo)) : nomes;
  const ehNovo = termo && !nomes.some((n) => n.toLowerCase() === termo);
  const visiveis = filtrados.slice(0, 8);
  const total = visiveis.length + (ehNovo ? 1 : 0);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  const escolher = (nome) => {
    onChange(nome);
    setAberto(false);
  };

  const escolherNovo = async () => {
    const nome = String(value || "").trim();
    if (!nome) return;
    try {
      const novo = await criarFornecedor({ nome });
      setExtras((prev) =>
        prev.some((x) => (x.nome || x.razao_social || "").toLowerCase() === nome.toLowerCase()) ? prev : [...prev, novo]
      );
      addToast(`Fornecedor "${nome}" registado`, "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao registar fornecedor", "error");
    } finally {
      onChange(nome);
      setAberto(false);
    }
  };

  const tecla = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!aberto) { setAberto(true); return; }
      setAtivo((a) => Math.min(a + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (aberto && total > 0) {
        e.preventDefault();
        if (ativo < visiveis.length) escolher(visiveis[ativo]);
        else escolherNovo();
      }
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { setAtivo(0); onChange(e.target.value); setAberto(true); }}
          onFocus={() => setAberto(true)}
          onKeyDown={tecla}
          required={required}
          aria-required={required}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={aberto}
          aria-autocomplete="list"
          aria-controls="fornecedor-opcoes"
          autoComplete="off"
          className={`${inputCls} pr-9`}
        />
        <Icon name="arrow_drop_down" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none" />
      </div>
      {aberto && total > 0 && (
        <ul
          id="fornecedor-opcoes"
          role="listbox"
          aria-label="Fornecedores"
          className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto custom-scrollbar obsidian-glass cyber-border rounded-xl shadow-xl py-1"
        >
          {visiveis.map((nome, i) => (
            <li key={nome} role="option" aria-selected={ativo === i}>
              <button
                type="button"
                onClick={() => escolher(nome)}
                onMouseEnter={() => setAtivo(i)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${ativo === i ? "bg-accent" : ""}`}
              >
                <Icon name="local_shipping" className="text-sm text-primary shrink-0" />
                <span className="truncate">{nome}</span>
              </button>
            </li>
          ))}
          {ehNovo && (
            <li role="option" aria-selected={ativo === visiveis.length}>
              <button
                type="button"
                onClick={escolherNovo}
                onMouseEnter={() => setAtivo(visiveis.length)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 border-t border-outline-variant/20 transition-colors ${ativo === visiveis.length ? "bg-accent" : ""}`}
              >
                <Icon name="add_circle" className="text-sm text-primary shrink-0" />
                <span className="truncate font-semibold text-primary">Usar &quot;{String(value || "").trim()}&quot; como novo fornecedor</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
