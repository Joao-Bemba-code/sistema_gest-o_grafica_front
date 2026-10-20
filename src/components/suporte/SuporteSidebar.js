"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout, getSuporte } from "@/services/suporte";
import {
  LuLayoutDashboard,
  LuBuilding2,
  LuScrollText,
  LuSettings,
  LuLogOut,
  LuShield,
  LuEllipsisVertical,
  LuChevronRight,
} from "react-icons/lu";

const GRUPOS = [
  {
    rotulo: "Workspace",
    itens: [
      { nome: "Resumo", para: "/suporte", icone: LuLayoutDashboard },
      {
        nome: "Organizações",
        para: "/suporte/organizacoes",
        icone: LuBuilding2,
        sub: [{ nome: "Todas", para: "/suporte/organizacoes" }],
      },
      { nome: "Acessos", para: "/suporte/acessos", icone: LuScrollText },
    ],
  },
];

const RODAPE = [{ nome: "Configurações", para: "/suporte/configuracoes", icone: LuSettings }];

function itemAtivo(caminho, para) {
  if (para === "/suporte") return caminho === "/suporte";
  if (para === "/suporte/organizacoes") return caminho.startsWith("/suporte/organizacoes");
  return caminho === para;
}

export default function SuporteSidebar({ className, onFechar, recolhida }) {
  const caminho = usePathname();
  const utilizador = getSuporte();
  const [abertos, setAbertos] = useState({ "Workspace": true, "Organizações": true });

  const alternar = (chave) => setAbertos((v) => ({ ...v, [chave]: !v[chave] }));

  return (
    <aside
      className={cn(
        "shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 ease-linear md:flex",
        recolhida ? "w-[52px]" : "w-[250px]",
        className
      )}
    >
      {/* Workspace header */}
      <div className="relative flex flex-col gap-2 border-b border-border p-2">
        <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md p-1">
          <span className="relative flex size-6 shrink-0 items-center justify-center">
            <span
              className={cn(
                "absolute flex items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all duration-200",
                recolhida ? "size-7 scale-100" : "size-8 scale-90"
              )}
            >
              <LuShield className="size-4" />
            </span>
          </span>
          {!recolhida && (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">KAMGEST</span>
              <LuEllipsisVertical className="size-3.5 shrink-0 text-muted-foreground opacity-60" />
            </>
          )}
        </div>
        {onFechar && (
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar menu"
            className="absolute right-2 top-2 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            <LuShield className="size-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <nav className="no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto">
        {GRUPOS.map((grupo) => (
          <div key={grupo.rotulo} className="relative flex w-full min-w-0 flex-col p-2">
            {!recolhida && (
              <div className="flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground/70">
                {grupo.rotulo}
              </div>
            )}
            <ul className="flex w-full min-w-0 flex-col gap-0.5">
              {grupo.itens.map(({ nome, para, icone: Icone, sub }) => {
                const activo = itemAtivo(caminho, para);
                const temSub = !!sub?.length;
                const aberto = !!abertos[nome];
                return (
                  <li key={para} className="relative">
                    {temSub && !recolhida ? (
                      <>
                        <button
                          type="button"
                          onClick={() => alternar(nome)}
                          aria-expanded={aberto}
                          className={cn(
                            "flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-colors",
                            activo
                              ? "bg-primary/5 font-medium text-primary"
                              : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                          )}
                        >
                          <Icone className="size-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{nome}</span>
                          <LuChevronRight
                            className={cn(
                              "size-3.5 shrink-0 opacity-60 transition-transform duration-200",
                              aberto && "rotate-90"
                            )}
                          />
                        </button>
                        {aberto && (
                          <ul className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-border px-2.5 py-0.5">
                            {sub.map((s) => (
                              <li key={s.para}>
                                <Link
                                  href={s.para}
                                  onClick={onFechar}
                                  aria-current={caminho === s.para ? "page" : undefined}
                                  className={cn(
                                    "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sm transition-colors",
                                    itemAtivo(caminho, s.para)
                                      ? "bg-primary/5 font-medium text-primary"
                                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                  )}
                                >
                                  <span className="min-w-0 truncate">{s.nome}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link
                        href={para}
                        onClick={onFechar}
                        aria-current={activo ? "page" : undefined}
                        title={recolhida ? nome : undefined}
                        className={cn(
                          "flex h-8 w-full items-center justify-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-colors",
                          activo
                            ? "bg-primary/5 font-medium text-primary"
                            : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                          recolhida && "px-0"
                        )}
                      >
                        <Icone className="size-4 shrink-0" />
                        {!recolhida && <span className="min-w-0 truncate">{nome}</span>}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Rodapé: ligações pequenas + utilizador */}
      <div className="mt-auto flex flex-col gap-2 p-2 pb-3">
        <ul className="flex w-full min-w-0 flex-col gap-0">
          {RODAPE.map(({ nome, para, icone: Icone }) => {
            const activo = itemAtivo(caminho, para);
            return (
              <li key={para}>
                <Link
                  href={para}
                  onClick={onFechar}
                  title={recolhida ? nome : undefined}
                  className={cn(
                    "flex h-7 w-full items-center justify-center gap-2 overflow-hidden rounded-md p-2 text-left text-xs transition-colors",
                    activo
                      ? "bg-primary/5 font-medium text-primary"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                    recolhida && "px-0"
                  )}
                >
                  <Icone className="size-4 shrink-0" />
                  {!recolhida && <span className="min-w-0 truncate">{nome}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <div
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-border bg-background text-sm shadow-sm",
            recolhida ? "flex-col justify-center p-1.5" : "p-1.5"
          )}
        >
          <span className="relative flex size-6 shrink-0 select-none items-center justify-center rounded-full bg-muted text-xs text-muted-foreground after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten">
            {(utilizador?.nome || "??").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
          </span>
          {!recolhida ? (
            <>
              <div className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-semibold text-foreground">{utilizador?.nome || "Suporte"}</span>
                <span className="truncate text-[11px] text-muted-foreground">{utilizador?.email || ""}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Terminar sessão"
                aria-label="Terminar sessão"
                className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-50 transition-opacity hover:bg-muted hover:text-foreground hover:opacity-100"
              >
                <LuLogOut className="size-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={logout}
              title="Terminar sessão"
              aria-label="Terminar sessão"
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LuLogOut className="size-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
