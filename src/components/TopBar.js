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

function crumbsFor(pathname) {
  return (
    breadcrumbs[pathname] ||
    (pathname.startsWith("/maquinas/") && !pathname.endsWith("/novo")
      ? ["Maquinária", "Editar Máquina"]
      : ["Painel"])
  );
}

const iconBtn =
  "inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors";

export default function TopBar() {
  const { usuario } = useAuth();
  const pathname = usePathname();
  const titulo = crumbsFor(pathname).at(-1);
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
    <header className="w-full sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border flex items-center gap-4 pl-14 pr-3 sm:pr-6 md:pl-8 h-16">
      <div className="min-w-0 flex-1">
        <p className="hidden sm:block text-[13px] font-semibold text-foreground truncate">{titulo}</p>
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1">
        <div className="relative" ref={sinoRef}>
          <button
            onClick={() => setNotifAberto(!notifAberto)}
            aria-label={naoLidas.length > 0 ? `Notificações (${naoLidas.length} por ler)` : "Notificações"}
            aria-expanded={notifAberto}
            className={iconBtn}
          >
            <Icon name="notifications" />
            {naoLidas.length > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[1.05rem] h-[1.05rem] px-0.5 rounded-full bg-destructive text-white text-[9px] font-semibold flex items-center justify-center">
                {naoLidas.length > 9 ? "9+" : naoLidas.length}
              </span>
            )}
          </button>
          {notifAberto && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-dropdown overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Notificações</p>
                {naoLidas.length > 0 && (
                  <button
                    onClick={marcarTodasLidas}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                  >
                    <Icon name="mark_email_read" className="text-sm" /> Marcar como lidas
                  </button>
                )}
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-1.5">
                {carregando && notificacoes.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">A carregar...</p>
                ) : notificacoes.length === 0 ? (
                  <div className="py-10 text-center">
                    <Icon name="notifications_off" className="text-2xl text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Sem notificações</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {notificacoes.map((n) => {
                      const unread = naoLidasIds.has(n.id);
                      return (
                        <Link
                          key={n.id}
                          href={n.link}
                          onClick={() => { marcarLida(n.id); setNotifAberto(false); }}
                          className={`flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-muted ${unread ? "" : "opacity-55"}`}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icon name={n.icon} className={`${COR_NIVEL[n.nivel] || "text-primary"} text-base`} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`truncate text-sm font-medium ${unread ? "text-foreground" : "text-muted-foreground"}`}>{n.titulo}</p>
                              {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
                            </div>
                            <p className="truncate text-xs text-muted-foreground mt-0.5">{n.desc}</p>
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
            className={`${iconBtn} hidden sm:inline-flex`}
          >
            <Icon name="settings" />
          </Link>
        )}
        <button onClick={logout} className={`${iconBtn} hover:text-destructive hover:bg-destructive/10`} title="Sair">
          <Icon name="logout" />
        </button>
        <div className="h-6 w-px bg-border hidden sm:block mx-2" />
        <div className="flex items-center gap-2.5 pl-0.5">
          <div className="w-8 h-8 rounded-full bg-muted text-foreground flex items-center justify-center font-medium text-xs">
            {getInitials(usuario?.nome)}
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-medium text-foreground leading-tight truncate max-w-[10rem]">{usuario?.nome || "Utilizador"}</p>
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
  const crumbs = crumbsFor(pathname);

  return (
    <nav className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0 sm:mt-0.5">
      <Link href="/" className="font-medium hover:text-foreground transition-colors shrink-0">Início</Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1 min-w-0">
          <Icon name="chevron_right" className="text-[12px] shrink-0 opacity-60" />
          <span className={`truncate ${i === crumbs.length - 1 ? "text-foreground/80 sm:hidden" : ""}`}>{crumb}</span>
        </span>
      ))}
    </nav>
  );
}
