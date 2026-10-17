"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { podeAtual } from "@/lib/permissoes";
import { ITENS_NAVEGACAO, itemAtivo } from "@/lib/navegacao";
import { LuChevronRight, LuX } from "react-icons/lu";

function Navegacao({ itens, ativo, onNavegar, colapsado = false }) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3 custom-scrollbar">
      {itens.map(({ icone: Icone, nome, para }) => {
        const activo = para === ativo;
        return (
          <Link
            key={para + nome}
            href={para}
            onClick={onNavegar}
            title={colapsado ? nome : undefined}
            aria-label={nome}
            className={cn(
              "group flex items-center rounded-lg text-[13px] transition-colors",
              colapsado ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2.5",
              activo
                ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className={cn("flex items-center", colapsado ? "" : "gap-2.5")}>
              <Icone className={cn("shrink-0", colapsado ? "h-[18px] w-[18px]" : "h-4 w-4")} />
              {!colapsado && <span>{nome}</span>}
            </span>
            {!colapsado && !activo && (
              <LuChevronRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Marca() {
  return (
    <svg className="h-full w-full" fill="none" viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0H20V32H0V0Z" fill="#EE2A24" />
      <path d="M20 0H40V32H20V0Z" fill="#0066FF" />
      <path d="M0 16L20 0V32L0 16Z" fill="#FFB800" />
      <path d="M20 0C25 10 35 15 40 16C35 20 25 22 20 32V0Z" fill="#0047AB" opacity="0.75" />
    </svg>
  );
}

function CabecalhoMarca({ colapsado = false }) {
  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center border-b border-border",
        colapsado ? "justify-center px-2" : "gap-2.5 px-4"
      )}
    >
      <div className="flex h-8 w-10 shrink-0 items-center justify-center overflow-hidden rounded">
        <Marca />
      </div>
      {!colapsado && (
        <span className="flex items-baseline gap-1.5 leading-none">
          <span className="text-lg font-black tracking-tight text-foreground">KAMGEST</span>
          <span className="text-sm font-bold text-muted-foreground">1.0</span>
        </span>
      )}
    </div>
  );
}

function Rodape({ colapsado = false }) {
  if (colapsado) {
    return (
      <div className="flex justify-center border-t border-border p-2.5">
        <div className="flex h-8 w-10 items-center justify-center overflow-hidden rounded" title="KAMGEST">
          <Marca />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 border-t border-border p-3">
      <div className="flex h-8 w-10 shrink-0 items-center justify-center overflow-hidden rounded">
        <Marca />
      </div>
      <div className="text-[10px] font-semibold leading-snug tracking-tight text-muted-foreground">
        Da gestão à produção
        <br />
        <span className="text-primary">em resultados.</span>
      </div>
    </div>
  );
}

export default function Sidebar({
  aberto = false,
  onFechar = () => {},
  colapsado = false,
}) {
  const caminho = usePathname();
  const itens = ITENS_NAVEGACAO.filter((it) => podeAtual(...it.perm));
  const ativo = itemAtivo(caminho, itens)?.para || null;

  useEffect(() => {
    if (!aberto) return undefined;
    document.body.style.overflow = "hidden";
    const fecharTecla = (e) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", fecharTecla);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", fecharTecla);
    };
  }, [aberto, onFechar]);

  return (
    <>
      {/* Menu lateral fixo (desktop) */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col justify-between border-r border-border bg-background transition-[width] duration-200 ease-out md:flex",
          colapsado ? "w-[60px]" : "w-60"
        )}
      >
        <CabecalhoMarca colapsado={colapsado} />
        <Navegacao itens={itens} ativo={ativo} colapsado={colapsado} />
        <Rodape colapsado={colapsado} />
      </aside>

      {/* Menu deslizante (telemóvel) */}
      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] md:hidden"
          onClick={onFechar}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-56 flex-col justify-between border-r border-border bg-background transition-transform duration-300 ease-out md:hidden",
          aberto ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-black tracking-tight text-foreground">KAMGEST</span>
          <button
            onClick={onFechar}
            aria-label="Fechar menu"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <Navegacao itens={itens} ativo={ativo} onNavegar={onFechar} />
        <Rodape />
      </aside>
    </>
  );
}
