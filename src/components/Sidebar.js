"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "./Icon";
import { cn, getInitials } from "@/lib/utils";
import { podeAtual } from "@/lib/permissoes";

const rotas = [
  { icone: "dashboard", nome: "Painel", para: "/", perm: ["comercial", "ver"] },
  { icone: "storefront", nome: "Área Comercial", para: "/vendas", perm: ["comercial", "ver"] },
  { icone: "factory", nome: "Produção", para: "/producao", perm: ["producao", "ver"] },
  { icone: "inventory_2", nome: "Provisionamento", para: "/estoque", perm: ["estoque", "ver"] },
  { icone: "category", nome: "Recursos", para: "/categorias", perm: ["categorias", "ver"] },
  { icone: "analytics", nome: "Relatórios", para: "/relatorios", perm: ["relatorios", "ver"] },
  { icone: "settings", nome: "Configurações", para: "/configuracoes", perm: ["configuracao", "ver"] },
  { icone: "manage_accounts", nome: "Utilizadores", para: "/utilizadores", perm: ["utilizadores", "ver"] },
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
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Icon name="precision_manufacturing" className="text-xl ms-fill" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-none tracking-tight">
                <span className="text-gradient">SIGRAF</span>
              </h1>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">Gestão de Gráfica</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto custom-scrollbar space-y-0.5">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Menu</p>
          {rotas.filter((rota) => podeAtual(...rota.perm)).map((rota) => {
            const ativa = rota.para === "/" ? caminho === "/" : caminho.startsWith(rota.para);
            return (
              <Link
                key={rota.para}
                href={rota.para}
                onClick={() => setAberto(false)}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm",
                  ativa
                    ? "nav-pill font-semibold"
                    : "font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon name={rota.icone} className={cn("text-lg shrink-0", ativa && "ms-fill")} />
                <span className="font-medium">{rota.nome}</span>
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
                <p className="text-[11px] text-muted-foreground truncate">
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
