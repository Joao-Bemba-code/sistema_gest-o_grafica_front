"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/services/auth";
import { getInitials } from "@/lib/utils";
import { podeAtual } from "@/lib/permissoes";
import useNotificacoes from "@/hooks/useNotificacoes";
import Icon from "./Icon";
import Modal from "./Modal";

const breadcrumbs = {
  "/": ["Painel"],
  "/vendas": ["Área Comercial"],
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
  const bellRef = useRef(null);

  return (
    <header className="w-full sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-primary/10 flex justify-between items-center pl-14 pr-3 sm:pr-6 md:pl-6 h-14 sm:h-16">
      <div className="flex items-center gap-5 flex-1 max-w-xl">
        <h2 className="text-lg font-bold tracking-tight hidden sm:block">
          <span className="text-foreground">SIGRAF</span>
        </h2>
        <div className="relative w-full group hidden sm:block">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors text-sm" />
          <input
            className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus-visible:outline-none transition-all placeholder:text-muted-foreground"
            placeholder="Pesquisar console..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-5">
        <nav className="hidden md:flex gap-5">
          {podeAtual("comercial", "ver") && (
            <Link href="/vendas" className="text-primary font-semibold border-b-2 border-primary pb-1 text-sm transition-all">Área Comercial</Link>
          )}
          {podeAtual("producao", "ver") && (
            <Link href="/producao" className="text-muted-foreground hover:text-primary transition-all text-sm font-medium">Produção</Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => setNotifAberto(!notifAberto)}
              aria-label={naoLidas.length > 0 ? `Notificações (${naoLidas.length} por ler)` : "Notificações"}
              className="relative p-2 rounded-full hover:text-primary hover:bg-accent transition-all duration-200 hover-scale"
            >
              <Icon name="notifications" className="text-muted-foreground" />
              {naoLidas.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center border-2 border-background">
                  {naoLidas.length > 9 ? "9+" : naoLidas.length}
                </span>
              )}
            </button>
            <Modal
              open={notifAberto}
              onClose={() => setNotifAberto(false)}
              title="Notificações"
              icon="notifications"
              size="sm"
            >
              {naoLidas.length > 0 && (
                <button
                  onClick={marcarTodasLidas}
                  className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors mb-3 ml-auto"
                >
                  <Icon name="mark_email_read" className="text-sm" /> Marcar como lidas
                </button>
              )}
              {carregando && notificacoes.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                  <span className="spinner" aria-hidden="true" /> A carregar...
                </div>
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
                        className={`w-full flex items-start gap-3 p-3.5 transition-all text-left border-b last:border-0 group ${unread ? "hover:bg-accent" : "opacity-55 hover:opacity-100 hover:bg-accent"}`}
                      >
                        <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon name={n.icon} className={`${COR_NIVEL[n.nivel] || "text-primary"} text-base`} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs font-bold truncate ${unread ? "text-foreground" : "text-muted-foreground"}`}>{n.titulo}</p>
                            {unread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-label="Não lida" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{n.desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                  <p className="text-[10px] text-center text-muted-foreground pt-3">
                    Alerta em tempo real a partir dos dados
                  </p>
                </div>
              )}
            </Modal>
          </div>
          {podeAtual("configuracao", "ver") && (
            <Link
              href="/configuracoes"
              className="p-2 hover:text-primary hover:bg-accent rounded-full transition-all hidden sm:block hover-scale"
            >
              <Icon name="settings" className="text-muted-foreground" />
            </Link>
          )}
          <button onClick={logout} className="p-2 hover:text-destructive hover:bg-destructive/10 rounded-full transition-all duration-200 hover-scale" title="Sair">
            <Icon name="logout" className="text-muted-foreground" />
          </button>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              {getInitials(usuario?.nome)}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-foreground leading-tight">{usuario?.nome || "Utilizador"}</p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[10rem]">
                {usuario?.organizacao?.nome || usuario?.funcao || "Online"}
              </p>
            </div>
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
    <nav className="flex items-center gap-2 text-xs text-muted-foreground">
      <Link href="/" className="hover:text-primary transition-colors font-medium uppercase tracking-wide">Início</Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <Icon name="chevron_right" className="text-[12px]" />
          <span className={`font-medium uppercase tracking-wide ${i === crumbs.length - 1 ? "text-primary" : ""}`}>{crumb}</span>
        </span>
      ))}
    </nav>
  );
}
