"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/services/auth";
import { getInitials } from "@/lib/utils";
import Icon from "./Icon";

const breadcrumbs = {
  "/": ["Painel"],
  "/orcamentos": ["Orçamentos", "Todos"],
  "/producao/ordens": ["Produção", "Ordens"],
  "/producao": ["Produção"],
  "/pre-impressao": ["Pré-Impressão"],
  "/impressao": ["Impressão"],
  "/acabamento": ["Acabamento"],
  "/clientes": ["Cadastros"],
  "/estoque": ["Estoque"],
  "/faturacao": ["Faturação"],
  "/qualidade": ["Qualidade"],
  "/relatorios": ["Relatórios"],
  "/configuracoes": ["Configurações"],
  "/login": ["Login"],
};

export default function TopBar() {
  const { usuario } = useAuth();
  const [notifAberto, setNotifAberto] = useState(false);
  const hoje = new Date();
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dataStr = `${dias[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

  const notificacoes = [
    { icon: "check_circle", titulo: "Ordem #742 concluída", desc: "Impressão digital finalizada", cor: "text-success" },
    { icon: "warning", titulo: "Estoque baixo: Papel 150g", desc: "Apenas 5 resmas disponíveis", cor: "text-warning" },
    { icon: "info", titulo: "Manutenção agendada", desc: "HP Indigo — 09 Mai", cor: "text-primary" },
  ];

  return (
    <header className="w-full sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b flex justify-between items-center px-3 sm:px-6 h-14 sm:h-16">
      <div className="flex items-center gap-5 flex-1 max-w-xl">
        <h2 className="font-headline-md text-headline-md font-extrabold text-foreground tracking-tight hidden sm:block">Console de Pedidos</h2>
        <div className="relative w-full group">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors text-sm" />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground"
            placeholder="Pesquisar console..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-5">
        <nav className="hidden md:flex gap-5">
          <Link href="/orcamentos" className="text-primary font-bold border-b-2 border-primary pb-1 text-xs uppercase tracking-widest transition-all">Orçamentos</Link>
          <Link href="/producao" className="text-muted-foreground hover:text-primary transition-all text-xs font-bold uppercase tracking-widest">Produção</Link>
        </nav>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setNotifAberto(!notifAberto)}
              className="p-2 hover:text-primary hover:bg-accent rounded-full transition-all duration-200 relative hover-scale"
            >
              <Icon name="notifications" className="text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border border-background animate-badge-pulse" />
            </button>
            {notifAberto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifAberto(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 z-50 bg-card border rounded-2xl shadow-xl overflow-hidden animate-scale-in">
                  <div className="p-4 border-b">
                    <p className="text-xs font-bold text-foreground">Notificações</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notificacoes.map((n, i) => (
                      <button key={i} className="w-full flex items-start gap-3 p-4 hover:bg-accent transition-all text-left border-b last:border-0">
                        <Icon name={n.icon} className={`${n.cor} mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground">{n.titulo}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{n.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-3 border-t bg-muted/30">
                    <p className="text-[10px] text-center text-muted-foreground">Últimas notificações</p>
                  </div>
                </div>
              </>
            )}
          </div>
          <Link
            href="/configuracoes"
            className="p-2 hover:text-primary hover:bg-accent rounded-full transition-all hidden sm:block hover-scale"
          >
            <Icon name="settings" className="text-muted-foreground" />
          </Link>
          <button onClick={logout} className="p-2 hover:text-destructive hover:bg-destructive/10 rounded-full transition-all duration-200 hover-scale" title="Sair">
            <Icon name="logout" className="text-muted-foreground" />
          </button>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xs">
              {getInitials(usuario?.nome)}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-foreground leading-tight">{usuario?.nome || "Utilizador"}</p>
              <p className="text-[10px] text-primary uppercase font-bold tracking-widest">{usuario?.funcao || "Online"}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = breadcrumbs[pathname] || ["Painel"];

  return (
    <nav className="flex items-center gap-2 text-xs text-muted-foreground">
      <Link href="/" className="hover:text-primary transition-colors font-bold uppercase tracking-widest">Início</Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <Icon name="chevron_right" className="text-[12px]" />
          <span className={`font-bold uppercase tracking-widest ${i === crumbs.length - 1 ? "text-primary" : ""}`}>{crumb}</span>
        </span>
      ))}
    </nav>
  );
}
