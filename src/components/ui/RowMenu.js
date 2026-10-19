"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";

const ALTURA_ITEM = 32;
const LARGURA_MENU = 160;
const MARGEM = 8;

/**
 * Menu de ações da linha (botão ⋯ + dropdown) no modelo da referência.
 * Renderizado num portal com posição fixa para não ser cortado por
 * contentores com overflow; abre para cima quando falta espaço em baixo.
 */
export default function RowMenu({ itens = [], ariaLabel = "Ações" }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fecharFora = (e) => {
      const dentroBotao = ref.current && ref.current.contains(e.target);
      const dentroMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!dentroBotao && !dentroMenu) setAberto(false);
    };
    const fecharTecla = (e) => {
      if (e.key === "Escape") setAberto(false);
    };
    const fecharAoRolar = (e) => {
      if (e.target && menuRef.current && menuRef.current.contains(e.target)) return;
      setAberto(false);
    };
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharTecla);
    window.addEventListener("scroll", fecharAoRolar, true);
    window.addEventListener("resize", fecharAoRolar);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharTecla);
      window.removeEventListener("scroll", fecharAoRolar, true);
      window.removeEventListener("resize", fecharAoRolar);
    };
  }, [aberto]);

  useLayoutEffect(() => {
    if (!aberto || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const altura = Math.min(itens.length * ALTURA_ITEM + 10, 264);
    const espacoAbaixo = window.innerHeight - rect.bottom - MARGEM;
    const paraCima = espacoAbaixo < altura && rect.top > altura + MARGEM;
    let left = rect.right - LARGURA_MENU;
    left = Math.max(MARGEM, Math.min(left, window.innerWidth - LARGURA_MENU - MARGEM));
    const top = paraCima ? rect.top - altura - 4 : rect.bottom + 4;
    setPos({ top: Math.max(MARGEM, top), left });
  }, [aberto, itens.length]);

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

      {aberto &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 60, width: LARGURA_MENU }}
            className="max-h-64 overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-card"
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
                <span className="flex-1 truncate">{it.rotulo}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
