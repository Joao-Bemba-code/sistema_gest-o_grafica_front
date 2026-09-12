"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "./Icon";
import { cn, getInitials } from "@/lib/utils";
import { podeAtual } from "@/lib/permissoes";

const grupos = [
  {
    rotulo: "Principal",
    itens: [{ icone: "dashboard", nome: "Painel", para: "/", perm: ["comercial", "ver"] }],
  },
  {
    rotulo: "Gestão",
    itens: [
      { icone: "storefront", nome: "Área Comercial", para: "/vendas", perm: ["comercial", "ver"] },
      { icone: "analytics", nome: "Relatórios", para: "/relatorios", perm: ["relatorios", "ver"] },
    ],
  },
  {
    rotulo: "Operação",
    itens: [
      { icone: "factory", nome: "Produção", para: "/producao", perm: ["producao", "ver"] },
      { icone: "inventory_2", nome: "Provisionamento", para: "/estoque", perm: ["estoque", "ver"] },
      { icone: "category", nome: "Recursos", para: "/categorias", perm: ["categorias", "ver"] },
    ],
  },
  {
    rotulo: "Sistema",
    itens: [
      { icone: "settings", nome: "Configurações", para: "/configuracoes", perm: ["configuracao", "ver"] },
      { icone: "manage_accounts", nome: "Utilizadores", para: "/utilizadores", perm: ["utilizadores", "ver"] },
    ],
  },
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
        className="fixed top-2.5 left-3 z-50 md:hidden h-11 w-11 rounded-xl bg-card border shadow-md flex items-center justify-center hover:bg-accent transition-all duration-200 ease-in-out ring-focus-soft"
      >
        <Icon name={aberto ? "close" : "menu"} className="text-muted-foreground text-xl" />
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] z-40 md:hidden" onClick={() => setAberto(false)} />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 z-50",
        "obsidian-glass border-r border-border/60 flex flex-col",
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

        <nav className="flex-1 px-3 py-2 overflow-y-auto custom-scrollbar">
          {grupos.map((g) => {
            const visiveis = g.itens.filter((rota) => podeAtual(...rota.perm));
            if (visiveis.length === 0) return null;
            return (
              <div key={g.rotulo} className="mt-1 first:mt-0">
                <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {g.rotulo}
                </p>
                <div className="space-y-0.5">
                  {visiveis.map((rota) => {
                    const ativa = rota.para === "/" ? caminho === "/" : caminho.startsWith(rota.para);
                    return (
                      <Link
                        key={rota.para}
                        href={rota.para}
                        onClick={() => setAberto(false)}
                        className={cn(
                          "relative flex items-center gap-3 pl-3 pr-3 py-2 rounded-lg transition-all duration-200 ease-in-out text-sm",
                          ativa
                            ? "bg-primary/10 text-primary font-semibold"
                            : "font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        {ativa && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" aria-hidden="true" />
                        )}
                        <Icon name={rota.icone} className={cn("text-lg shrink-0", ativa && "text-primary ms-fill")} />
                        <span>{rota.nome}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="px-3 pb-3">
          <div className="p-3 rounded-xl border border-border bg-muted/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold border border-primary/20 shrink-0">
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
              className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 ease-in-out"
            >
              <Icon name={dark ? "light_mode" : "dark_mode"} className="text-lg" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
