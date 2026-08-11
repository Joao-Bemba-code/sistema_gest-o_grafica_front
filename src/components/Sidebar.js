"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "./Icon";
import { cn, getInitials } from "@/lib/utils";

const rotas = [
  { icone: "dashboard", nome: "Painel", para: "/" },
  { icone: "request_quote", nome: "Orçamentos", para: "/orcamentos" },
  { icone: "precision_manufacturing", nome: "Ordens de Produção", para: "/producao/ordens" },
  { icone: "factory", nome: "Produção", para: "/producao" },
  { icone: "groups", nome: "Cadastros", para: "/clientes" },
  { icone: "inventory_2", nome: "Estoque", para: "/estoque" },
  { icone: "category", nome: "Categorias", para: "/categorias" },
  { icone: "analytics", nome: "Relatórios", para: "/relatorios" },
  { icone: "paid", nome: "Faturação", para: "/faturacao" },
  { icone: "settings", nome: "Configurações", para: "/configuracoes" },
];

export default function Sidebar() {
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();
  const { dark, toggleTheme } = useTheme();
  const { usuario } = useAuth();

  return (
    <>
      <button
        onClick={() => setAberto(!aberto)}
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        aria-expanded={aberto}
        className="fixed top-2.5 left-3 z-50 md:hidden h-11 w-11 rounded-xl bg-card border shadow-md flex items-center justify-center hover:bg-accent transition-colors ring-focus-soft"
      >
        <Icon name={aberto ? "close" : "menu"} className="text-muted-foreground text-xl" />
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setAberto(false)} />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 z-50",
        "obsidian-glass border-r border-primary/10 flex flex-col",
        "transition-[transform] duration-300 ease-out",
        "md:translate-x-0",
        aberto ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-5 pt-6 pb-5 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl obsidian-glass cyber-border flex items-center justify-center text-primary shrink-0">
              <Icon name="precision_manufacturing" className="text-xl ms-fill" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black leading-none tracking-tight">
                <span className="text-gradient">SIGRAF</span>
              </h1>
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.22em] font-mono mt-1 truncate">Gestão de Gráfica</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto custom-scrollbar space-y-0.5">
          <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">Menu</p>
          {rotas.map((rota) => {
            const ativa = rota.para === "/" ? caminho === "/" : caminho.startsWith(rota.para);
            return (
              <Link
                key={rota.para}
                href={rota.para}
                onClick={() => setAberto(false)}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-xs",
                  ativa
                    ? "nav-pill font-semibold"
                    : "font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {ativa && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-primary to-secondary" aria-hidden="true" />
                )}
                <Icon name={rota.icone} className={cn("text-lg shrink-0", ativa && "ms-fill")} />
                <span className="font-semibold uppercase tracking-wider text-[11px]">{rota.nome}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-3">
          <div className="p-3 rounded-2xl border border-border/70 bg-gradient-to-br from-muted/60 via-muted/20 to-transparent flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-black border-2 border-white/40 dark:border-white/20 shadow-md shrink-0">
              {getInitials(usuario?.nome)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{usuario?.nome || "Utilizador"}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest truncate">
                  {usuario?.funcao || "Online"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
              title={dark ? "Tema claro" : "Tema escuro"}
              className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Icon name={dark ? "light_mode" : "dark_mode"} className="text-lg" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
