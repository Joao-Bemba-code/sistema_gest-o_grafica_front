"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PAGINAS_BUSCA } from "@/lib/navegacao";
import { podeAtual } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import { LuSearch, LuCornerDownLeft } from "react-icons/lu";

// Paleta de comandos (estilo "Search" da referência) — Ctrl+K para abrir
export default function CommandPalette() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [indice, setIndice] = useState(0);
  const inputRef = useRef(null);

  const resultados = useMemo(() => {
    const q = termo.trim().toLowerCase();
    return PAGINAS_BUSCA.filter((p) => {
      if (!podeAtual(...p.perm)) return false;
      if (!q) return true;
      return p.nome.toLowerCase().includes(q) || p.para.toLowerCase().includes(q);
    });
  }, [termo]);

  useEffect(() => {
    const tecla = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto((v) => !v);
      }
      if (e.key === "Escape") setAberto(false);
    };
    const abrirEvento = () => setAberto(true);
    document.addEventListener("keydown", tecla);
    document.addEventListener("sigraf:abrir-busca", abrirEvento);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("sigraf:abrir-busca", abrirEvento);
    };
  }, []);

  useEffect(() => {
    if (aberto) {
      setTermo("");
      setIndice(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [aberto]);

  useEffect(() => setIndice(0), [termo]);

  const navegar = (para) => {
    setAberto(false);
    router.push(para);
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-[12vh] animate-modal-fade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setAberto(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-modal animate-modal-in"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <LuSearch className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndice((i) => Math.min(resultados.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndice((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && resultados[indice]) {
                navegar(resultados[indice].para);
              }
            }}
            placeholder="Pesquisar ou saltar para qualquer área do sistema…"
            className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5 custom-scrollbar">
          {resultados.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Sem resultados para “{termo}”.</p>
          ) : (
            resultados.map((p, i) => {
              const Icone = p.icone;
              return (
                <button
                  key={p.para + p.nome}
                  type="button"
                  onClick={() => navegar(p.para)}
                  onMouseEnter={() => setIndice(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    i === indice ? "bg-muted text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                    <Icone className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">{p.nome}</span>
                  {i === indice && <LuCornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
