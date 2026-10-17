"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/services/auth";
import { getInitials, cn } from "@/lib/utils";
import { podeAtual } from "@/lib/permissoes";
import { useTheme } from "@/contexts/ThemeContext";
import useNotificacoes from "@/hooks/useNotificacoes";
import CommandPalette from "@/components/CommandPalette";
import {
  LuMenu,
  LuPanelLeftClose,
  LuPanelLeft,
  LuSearch,
  LuBell,
  LuChevronDown,
  LuSettings,
  LuLogOut,
  LuSun,
  LuMoon,
  LuCheckCheck,
  LuBellOff,
  LuOctagonAlert,
  LuTriangleAlert,
  LuInfo,
  LuMessageCircle,
} from "react-icons/lu";

const ICONE_NIVEL = {
  error: LuOctagonAlert,
  warning: LuTriangleAlert,
  success: LuCheckCheck,
  info: LuInfo,
};

const COR_NIVEL = {
  error: "text-error",
  warning: "text-warning",
  success: "text-success",
  info: "text-primary",
};

const iconBtn =
  "relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

function Marca() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
      <path d="M8 8 L18 8 L18 40 L8 40 Z" fill="#0066cc" />
      <path d="M8 8 L18 8 L18 24 L8 24 Z" fill="#ef4444" />
      <path d="M18 26 L38 8 L30 8 L18 20 Z" fill="#38bdf8" />
      <path d="M30 8 L38 8 L34 12 L26 12 Z" fill="#eab308" />
      <path d="M22 22 L38 40 L28 40 L18 28 Z" fill="#ef4444" />
    </svg>
  );
}

export default function TopBar({ onOpenMenu = () => {}, onToggleColapso = () => {}, colapsado = false }) {
  const { usuario } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const [notifAberto, setNotifAberto] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const { notificacoes, carregando, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();
  const naoLidasIds = new Set(naoLidas.map((n) => n.id));
  const sinoRef = useRef(null);
  const perfilRef = useRef(null);

  useEffect(() => {
    if (!notifAberto && !perfilAberto) return undefined;
    const fecharFora = (e) => {
      if (notifAberto && sinoRef.current && !sinoRef.current.contains(e.target)) setNotifAberto(false);
      if (perfilAberto && perfilRef.current && !perfilRef.current.contains(e.target)) setPerfilAberto(false);
    };
    const fecharTecla = (e) => {
      if (e.key === "Escape") {
        setNotifAberto(false);
        setPerfilAberto(false);
      }
    };
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharTecla);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharTecla);
    };
  }, [notifAberto, perfilAberto]);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 sm:px-4">
      <CommandPalette />

      {/* Esquerda: toggle da sidebar + marca KAMGEST + título central */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onOpenMenu}
          aria-label="Abrir menu"
          className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
        >
          <LuMenu className="h-5 w-5" />
        </button>
        <button
          onClick={onToggleColapso}
          aria-label={colapsado ? "Expandir menu" : "Recolher menu"}
          title={colapsado ? "Expandir menu" : "Recolher menu"}
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
        >
          {colapsado ? <LuPanelLeft className="h-[18px] w-[18px]" /> : <LuPanelLeftClose className="h-[18px] w-[18px]" />}
        </button>

        <Link href="/" className="flex min-w-0 items-center gap-2.5 border-r border-border pr-4" title="KAMGEST">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center sm:flex">
            <Marca />
          </span>
          <span className="hidden leading-none sm:block">
            <span className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-foreground">KAMGEST</span>
              <span className="text-xl font-bold text-muted-foreground">1.0</span>
            </span>
            <span className="mt-1 block text-[10px] font-semibold tracking-tight text-muted-foreground">
              Gestão simples. Resultados reais.
            </span>
          </span>
        </Link>

        <div className="hidden flex-col pl-4 lg:flex">
          <h1 className="text-[13px] font-bold leading-tight text-foreground">Sistema de gestão para artes gráficas</h1>
          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            Comercial • Produção • Stocks • Financeiro • Pessoas • Resultados
          </p>
        </div>
      </div>

      {/* Direita: busca, mensagens, notificações, perfil */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          onClick={() => document.dispatchEvent(new CustomEvent("sigraf:abrir-busca"))}
          className="relative hidden h-9 w-64 items-center rounded-lg border border-border bg-muted/50 pl-9 pr-3 text-left text-xs text-muted-foreground transition-colors hover:border-outline-variant hover:bg-card md:flex"
        >
          <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          Pesquisar no sistema...
        </button>
        <button
          onClick={() => document.dispatchEvent(new CustomEvent("sigraf:abrir-busca"))}
          aria-label="Pesquisar"
          className={cn(iconBtn, "md:hidden")}
        >
          <LuSearch className="h-[18px] w-[18px]" />
        </button>

        <button aria-label="Mensagens" className="hidden p-1 text-muted-foreground transition-colors hover:text-foreground sm:block">
          <LuMessageCircle className="h-5 w-5" />
        </button>

        {/* Notificações */}
        <div className="relative" ref={sinoRef}>
          <button
            onClick={() => setNotifAberto((v) => !v)}
            aria-label={naoLidas.length > 0 ? `Notificações (${naoLidas.length} por ler)` : "Notificações"}
            aria-expanded={notifAberto}
            title="Notificações"
            className={iconBtn}
          >
            <LuBell className="h-[18px] w-[18px]" />
            {naoLidas.length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-error text-[9px] font-bold text-white">
                {naoLidas.length > 9 ? "9+" : naoLidas.length}
              </span>
            )}
          </button>
          {notifAberto && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover shadow-dropdown">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Notificações</p>
                {naoLidas.length > 0 && (
                  <button
                    onClick={marcarTodasLidas}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                  >
                    <LuCheckCheck className="h-3.5 w-3.5" /> Marcar como lidas
                  </button>
                )}
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-1.5 custom-scrollbar">
                {carregando && notificacoes.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">A carregar...</p>
                ) : notificacoes.length === 0 ? (
                  <div className="py-10 text-center">
                    <LuBellOff className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">Sem notificações</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {notificacoes.map((n) => {
                      const unread = naoLidasIds.has(n.id);
                      const Icone = ICONE_NIVEL[n.nivel] || LuInfo;
                      return (
                        <Link
                          key={n.id}
                          href={n.link}
                          onClick={() => {
                            marcarLida(n.id);
                            setNotifAberto(false);
                          }}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-muted",
                            !unread && "opacity-55"
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icone className={cn("h-4 w-4", COR_NIVEL[n.nivel] || "text-primary")} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={cn("truncate text-sm font-medium", unread ? "text-foreground" : "text-muted-foreground")}>
                                {n.titulo}
                              </p>
                              {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.desc}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden h-6 w-px bg-border sm:block" />

        {/* Perfil */}
        <div className="relative" ref={perfilRef}>
          <button
            onClick={() => setPerfilAberto((v) => !v)}
            aria-expanded={perfilAberto}
            aria-haspopup="menu"
            className="flex select-none items-center gap-2 rounded-lg border-l border-border py-1 pl-2 pr-1.5 transition-colors hover:bg-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b2447] text-xs font-bold tracking-wide text-white">
              {getInitials(usuario?.nome)}
            </span>
            <span className="hidden flex-col text-left leading-tight xl:flex">
              <span className="text-xs font-bold leading-tight text-foreground">{usuario?.nome || "Utilizador"}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">
                {usuario?.funcao || usuario?.organizacao?.nome || "Online"}
              </span>
            </span>
            <LuChevronDown className="ml-0.5 h-4 w-4 text-muted-foreground" />
          </button>

          {perfilAberto && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-dropdown">
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-semibold text-foreground">{usuario?.nome || "Utilizador"}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {usuario?.email || usuario?.funcao || "Sessão ativa"}
                </p>
              </div>
              <div className="p-1.5">
                {podeAtual("configuracao", "ver") && (
                  <Link
                    href="/configuracoes"
                    onClick={() => setPerfilAberto(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <LuSettings className="h-4 w-4" /> Configurações
                  </Link>
                )}
                <button
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {dark ? <LuSun className="h-4 w-4" /> : <LuMoon className="h-4 w-4" />}
                  {dark ? "Tema claro" : "Tema escuro"}
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error/10"
                >
                  <LuLogOut className="h-4 w-4" /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
