"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/Icon";
import { GRUPOS } from "./blocos";

export default function PainelVista({ aberto, onFechar, itens = [], visiveis, onToggle, onMostrarTudo, onRestaurar }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => {
      if (e.target.closest?.("[data-vista-toggle]")) return;
      if (ref.current && !ref.current.contains(e.target)) onFechar();
    };
    const tecla = (e) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-md"
      role="dialog"
      aria-label="Escolher blocos visíveis"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-sm font-semibold text-foreground">Blocos visíveis</p>
        <button
          type="button"
          onClick={onFechar}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Fechar"
        >
          <Icon name="close" className="text-base" />
        </button>
      </div>

      <div className="custom-scrollbar max-h-[360px] space-y-3 overflow-y-auto p-3">
        {GRUPOS.map((grupo) => {
          const doGrupo = itens.filter((i) => i.grupo === grupo.id);
          if (doGrupo.length === 0) return null;
          return (
            <div key={grupo.id}>
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{grupo.label}</p>
              <div className="space-y-0.5">
                {doGrupo.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm text-foreground hover:bg-muted/60"
                  >
                    <input
                      type="checkbox"
                      checked={visiveis.has(item.id)}
                      onChange={() => onToggle(item.id)}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 flex-1 truncate">{item.titulo}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <button
          type="button"
          onClick={onRestaurar}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Restaurar sugestão
        </button>
        <button
          type="button"
          onClick={onMostrarTudo}
          className="text-xs font-semibold text-primary transition-colors hover:underline"
        >
          Mostrar tudo
        </button>
      </div>
    </div>
  );
}
