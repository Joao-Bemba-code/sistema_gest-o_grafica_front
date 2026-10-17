"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";

/**
 * Menu de ações da linha (botão ⋯ + dropdown) no modelo da referência.
 */
export default function RowMenu({ itens = [], ariaLabel = "Ações" }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fecharFora = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    const fecharTecla = (e) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharTecla);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharTecla);
    };
  }, [aberto]);

  if (!itens.length) return null;

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={aberto}
        onClick={(e) => {
          e.stopPropagation();
          setAberto((v) => !v);
        }}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
          aberto && "bg-muted/60 text-foreground"
        )}
      >
        <Icon name="more_horiz" className="text-base" />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 min-w-40 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-card"
        >
          {itens.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setAberto(false);
                it.onClick?.();
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted/60",
                it.danger ? "text-error" : "text-foreground"
              )}
            >
              {it.icone && <Icon name={it.icone} className="text-sm" />}
              {it.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
