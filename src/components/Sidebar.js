"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "./Icon";
import { cn } from "@/lib/utils";

const rotas = [
  { icone: "dashboard", nome: "Painel", para: "/" },
  { icone: "request_quote", nome: "Orçamentos", para: "/orcamentos" },
  { icone: "precision_manufacturing", nome: "Ordens de Produção", para: "/producao/ordens" },
  { icone: "factory", nome: "Produção", para: "/producao" },
  { icone: "preview", nome: "Pré-Impressão", para: "/pre-impressao" },
  { icone: "print", nome: "Impressão", para: "/impressao" },
  { icone: "handyman", nome: "Acabamento", para: "/acabamento" },
  { icone: "groups", nome: "Cadastros", para: "/clientes" },
  { icone: "inventory_2", nome: "Estoque", para: "/estoque" },
  { icone: "analytics", nome: "Relatórios", para: "/relatorios" },
  { icone: "verified", nome: "Controlo Qualidade", para: "/qualidade" },
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
        className="fixed top-3 left-3 z-50 md:hidden w-9 h-9 rounded-xl bg-card border flex items-center justify-center hover:bg-accent transition-colors"
      >
        <Icon name="menu" className="text-muted-foreground text-xl" />
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm" onClick={() => setAberto(false)} />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 z-50",
        "bg-card border-r flex flex-col",
        "transition-[transform] duration-300 ease-out",
        "md:translate-x-0",
        aberto ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-5 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Icon name="precision_manufacturing" className="text-lg" style={{ fontVariationSettings: "'FILL' 1" }} />
            </div>
            <div>
              <h1 className="text-lg font-black text-primary leading-none tracking-tight">SIGRAF</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-mono">Precisão Esmeralda</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {rotas.map((rota) => {
            const ativa = rota.para === "/" ? caminho === "/" : caminho.startsWith(rota.para);
            return (
              <Link
                key={rota.para}
                href={rota.para}
                onClick={() => setAberto(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-xs font-medium",
                  "hover-lift",
                  ativa
                    ? "text-primary bg-primary/5 border-l-4 border-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent hover:translate-x-0.5"
                )}
              >
                <Icon name={rota.icone} className={cn("text-lg", ativa && "text-primary")} />
                <span className="font-semibold uppercase tracking-wider text-[11px]">{rota.nome}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-primary/30">
            <Icon name="person" className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{usuario?.nome || "Utilizador"}</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] text-primary uppercase font-bold tracking-widest">{usuario?.funcao || "Online"}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
