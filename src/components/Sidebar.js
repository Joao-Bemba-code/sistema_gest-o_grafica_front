"use client";

import { useEffect, useState } from "react";
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
      { icone: "account_balance", nome: "Tesouraria", para: "/tesouraria", perm: ["tesouraria", "ver"] },
    ],
  },
  {
    rotulo: "Operação",
    itens: [
      { icone: "factory", nome: "Produção", para: "/producao", perm: ["producao", "ver"] },
      { icone: "inventory_2", nome: "Provisionamento", para: "/estoque", perm: ["estoque", "ver"] },
      { icone: "category", nome: "Recursos", para: "/categorias", perm: ["categorias", "ver"] },
      { icone: "analytics", nome: "Relatórios", para: "/relatorios", perm: ["relatorios", "ver"] },
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

  // No telemóvel, o menu deslizante bloqueia o scroll do fundo e fecha com Escape.
  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = "hidden";
    const fecharTecla = (e) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("keydown", fecharTecla);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", fecharTecla);
    };
  }, [aberto]);

  return (
    <>
      <button
        onClick={() => setAberto(!aberto)}
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        aria-expanded={aberto}
        className="fixed top-2.5 left-3 z-50 md:hidden h-11 w-11 rounded-xl bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors ring-focus-soft"
      >
        <Icon name={aberto ? "close" : "menu"} className="text-muted-foreground text-xl" />
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-40 md:hidden" onClick={() => setAberto(false)} />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 z-50",
        "flex flex-col bg-card border-r border-border",
        "transition-[transform] duration-300 ease-out",
        "md:translate-x-0",
        aberto ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
              <Icon name="precision_manufacturing" className="text-lg ms-fill" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
                SIGRAF
              </h1>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">Gestão de Gráfica</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 pb-2 overflow-y-auto custom-scrollbar">
          {grupos.map((g) => {
            const visiveis = g.itens.filter((rota) => podeAtual(...rota.perm));
            if (visiveis.length === 0) return null;
            return (
              <div key={g.rotulo} className="mt-4 first:mt-0">
                <p className="px-3 pb-1.5 text-[11px] font-medium text-muted-foreground">
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
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          ativa
                            ? "bg-primary/10 text-primary font-medium"
                            : "font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon name={rota.icone} className={cn("text-[18px] shrink-0", ativa && "text-primary ms-fill")} />
                        <span>{rota.nome}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="w-9 h-9 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-semibold shrink-0">
              {getInitials(usuario?.nome)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{usuario?.nome || "Utilizador"}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {usuario?.funcao || "Online"}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
              title={dark ? "Tema claro" : "Tema escuro"}
              className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon name={dark ? "light_mode" : "dark_mode"} className="text-lg" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
