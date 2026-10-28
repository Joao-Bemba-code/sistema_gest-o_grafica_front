"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, getInitials } from "@/lib/utils";
import { logout, getSuporte } from "@/services/suporte";
import {
  LuLayoutDashboard,
  LuBuilding2,
  LuScrollText,
  LuClipboardList,
  LuSettings,
  LuLogOut,
  LuChevronRight,
  LuX,
} from "react-icons/lu";

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
      { nome: "Auditoria", para: "/suporte/auditoria", icone: LuClipboardList },
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
  const [abertos, setAbertos] = useState({ "Organizações": true });

  const alternar = (chave) => setAbertos((v) => ({ ...v, [chave]: !v[chave] }));

  return (
    <aside
      className={cn(
        "shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 ease-linear md:flex",
        recolhida ? "w-[60px]" : "w-60",
        className
      )}
    >
      {/* Cabeçalho da marca */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-border",
          recolhida ? "justify-center px-2" : "gap-2.5 px-4"
        )}
      >
        <div className="flex h-8 w-10 shrink-0 items-center justify-center overflow-hidden rounded">
          <Marca />
        </div>
        {!recolhida && (
          <span className="flex min-w-0 flex-col leading-none">
            <span className="flex items-baseline gap-1.5">
              <span className="truncate text-lg font-black tracking-tight text-foreground">KAMGEST</span>
              <span className="text-sm font-bold text-muted-foreground">1.0</span>
            </span>
            <span className="mt-0.5 truncate text-[10px] font-semibold tracking-tight text-muted-foreground">
              Consola de suporte
            </span>
          </span>
        )}
        {onFechar && (
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar menu"
            className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            <LuX className="size-4" />
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-3">
        {GRUPOS.map((grupo) => (
          <div key={grupo.rotulo} className="flex w-full min-w-0 flex-col gap-1">
            {!recolhida && (
              <div className="flex h-7 shrink-0 items-center rounded-md px-3 text-[10px] font-bold tracking-[0.08em] text-muted-foreground/70 uppercase">
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
                            "group flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13px] transition-colors",
                            activo
                              ? "bg-primary/10 font-semibold text-primary"
                              : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icone className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{nome}</span>
                          <LuChevronRight
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200",
                              aberto && "rotate-90"
                            )}
                          />
                        </button>
                        {aberto && (
                          <ul className="mx-3.5 flex min-w-0 flex-col gap-0.5 border-l border-border py-0.5 pl-2.5">
                            {sub.map((s) => (
                              <li key={s.para}>
                                <Link
                                  href={s.para}
                                  onClick={onFechar}
                                  aria-current={caminho === s.para ? "page" : undefined}
                                  className={cn(
                                    "flex h-8 min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-[13px] transition-colors",
                                    itemAtivo(caminho, s.para)
                                      ? "bg-primary/10 font-semibold text-primary"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
                        aria-label={nome}
                        className={cn(
                          "flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-lg px-3 text-left text-[13px] transition-colors",
                          activo
                            ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                            : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                          recolhida && "justify-center px-0"
                        )}
                      >
                        <Icone className="h-4 w-4 shrink-0" />
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

      {/* Rodapé */}
      <div className="flex flex-col border-t border-border">
        <ul className="flex w-full min-w-0 flex-col gap-0.5 px-2.5 py-2">
          {RODAPE.map(({ nome, para, icone: Icone }) => {
            const activo = itemAtivo(caminho, para);
            return (
              <li key={para}>
                <Link
                  href={para}
                  onClick={onFechar}
                  title={recolhida ? nome : undefined}
                  aria-label={nome}
                  className={cn(
                    "flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-lg px-3 text-left text-[13px] transition-colors",
                    activo
                      ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                      : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                    recolhida && "justify-center px-0"
                  )}
                >
                  <Icone className="h-4 w-4 shrink-0" />
                  {!recolhida && <span className="min-w-0 truncate">{nome}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2 border-t border-border p-2.5">
          <span className="flex size-8 shrink-0 select-none items-center justify-center rounded-full bg-[#0b2447] text-xs font-bold tracking-wide text-white">
            {getInitials(utilizador?.nome)}
          </span>
          {!recolhida ? (
            <>
              <div className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-xs font-bold text-foreground">{utilizador?.nome || "Suporte"}</span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {utilizador?.email || "Sessão ativa"}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Terminar sessão"
                aria-label="Terminar sessão"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LuLogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={logout}
              title="Terminar sessão"
              aria-label="Terminar sessão"
              className="mx-auto flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LuLogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
