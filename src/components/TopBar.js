"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/services/auth";
import { getInitials } from "@/lib/utils";
import { podeAtual } from "@/lib/permissoes";
import useNotificacoes from "@/hooks/useNotificacoes";
import Icon from "./Icon";

const breadcrumbs = {
  "/": ["Painel"],
  "/vendas": ["Área Comercial"],
  "/tesouraria": ["Tesouraria"],
  "/orcamentos": ["Área Comercial", "Orçamentos"],
  "/producao/ordens": ["Produção", "Ordens"],
  "/producao": ["Produção"],
  "/pre-impressao": ["Pré-Impressão"],
  "/impressao": ["Impressão"],
  "/acabamento": ["Acabamento"],
  "/clientes": ["Área Comercial", "Cadastros"],
  "/estoque": ["Provisionamento"],
  "/estoque/novo": ["Provisionamento", "Novo Material"],
  "/faturacao": ["Área Comercial", "Facturas"],
  "/qualidade": ["Qualidade"],
  "/relatorios": ["Relatórios"],
  "/configuracoes": ["Configurações"],
  "/login": ["Login"],
  "/categorias": ["Recursos"],
  "/maquinas": ["Maquinária"],
  "/maquinas/novo": ["Maquinária", "Nova Máquina"],
};

const COR_NIVEL = {
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-primary",
};

export default function TopBar() {
  const { usuario } = useAuth();
  const [notifAberto, setNotifAberto] = useState(false);
  const { notificacoes, carregando, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();
  const naoLidasIds = new Set(naoLidas.map((n) => n.id));
  const sinoRef = useRef(null);

  useEffect(() => {
    if (!notifAberto) return;
    const fecharFora = (e) => {
      if (sinoRef.current && !sinoRef.current.contains(e.target)) setNotifAberto(false);
    };
    const fecharTecla = (e) => {
      if (e.key === "Escape") setNotifAberto(false);
    };
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharTecla);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharTecla);
    };
  }, [notifAberto]);

  return (
    <header className="w-full sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/60 flex items-center gap-4 pl-14 pr-3 sm:pr-6 md:pl-6 h-14 sm:h-16">
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="relative" ref={sinoRef}>
            <button
              onClick={() => setNotifAberto(!notifAberto)}
              aria-label={naoLidas.length > 0 ? `Notificações (${naoLidas.length} por ler)` : "Notificações"}
              aria-expanded={notifAberto}
              className="relative p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent"
            >
              <Icon name="notifications" className="text-muted-foreground" />
              {naoLidas.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center border-2 border-background">
                  {naoLidas.length > 9 ? "9+" : naoLidas.length}
                </span>
              )}
            </button>
            {notifAberto && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-modal">
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Notificações</p>
                  {naoLidas.length > 0 && (
                    <button
                      onClick={marcarTodasLidas}
                      className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80"
                    >
                      <Icon name="mark_email_read" className="text-sm" /> Marcar como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  {carregando && notificacoes.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">A carregar...</p>
                  ) : notificacoes.length === 0 ? (
                    <div className="py-8 text-center">
                      <Icon name="notifications_off" className="text-2xl text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Sem notificações</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {notificacoes.map((n) => {
                        const unread = naoLidasIds.has(n.id);
                        return (
                          <Link
                            key={n.id}
                            href={n.link}
                            onClick={() => { marcarLida(n.id); setNotifAberto(false); }}
                            className={`flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-accent ${unread ? "" : "opacity-60"}`}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <Icon name={n.icon} className={`${COR_NIVEL[n.nivel] || "text-primary"} text-base`} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`truncate text-xs font-bold ${unread ? "text-foreground" : "text-muted-foreground"}`}>{n.titulo}</p>
                                {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
                              </div>
                              <p className="truncate text-[10px] text-muted-foreground">{n.desc}</p>
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
          {podeAtual("configuracao", "ver") && (
            <Link
              href="/configuracoes"
              title="Configurações"
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-all duration-200 ease-in-out hidden sm:block"
            >
              <Icon name="settings" />
            </Link>
          )}
          <button onClick={logout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 ease-in-out" title="Sair">
            <Icon name="logout" />
          </button>
          <div className="h-6 w-px bg-border hidden sm:block mx-1" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-semibold text-xs">
              {getInitials(usuario?.nome)}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-foreground leading-tight">{usuario?.nome || "Utilizador"}</p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[10rem]">
                {usuario?.organizacao?.nome || usuario?.funcao || "Online"}
              </p>
            </div>
          </div>
        </div>
    </header>
  );
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs =
    breadcrumbs[pathname] ||
    (pathname.startsWith("/maquinas/") && !pathname.endsWith("/novo")
      ? ["Maquinária", "Editar Máquina"]
      : ["Painel"]);

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
      <Link href="/" className="font-medium hover:text-primary transition-all duration-200 ease-in-out shrink-0">Início</Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5 min-w-0">
          <Icon name="chevron_right" className="text-[12px] shrink-0" />
          <span className={`truncate font-medium ${i === crumbs.length - 1 ? "text-foreground font-semibold" : ""}`}>{crumb}</span>
        </span>
      ))}
    </nav>
  );
}
