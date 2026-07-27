"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import Icon from "./Icon";

const rotas = [
  { icone: "dashboard", nome: "Dashboard", para: "/" },
  { icone: "receipt_long", nome: "Pedidos", para: "/orcamentos" },
  { icone: "precision_manufacturing", nome: "Ordens de Produção", para: "/producao/ordens" },
  { icone: "settings_suggest", nome: "Produção", para: "/producao" },
  { icone: "preview", nome: "Pré-Impressão", para: "/pre-impressao" },
  { icone: "print", nome: "Impressão", para: "/impressao" },
  { icone: "handyman", nome: "Acabamento", para: "/acabamento" },
  { icone: "groups", nome: "Clientes", para: "/clientes" },
  { icone: "inventory_2", nome: "Estoque", para: "/estoque" },
  { icone: "analytics", nome: "Relatórios", para: "/relatorios" },
  { icone: "verified", nome: "Controlo Qualidade", para: "/qualidade" },
  { icone: "settings", nome: "Configurações", para: "#" },
];

export default function Sidebar() {
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();
  const { dark, toggleTheme } = useTheme();

  return (
    <>
      <button
        onClick={() => setAberto(!aberto)}
        className="fixed top-3 left-3 z-50 md:hidden w-9 h-9 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center hover:bg-surface-container-higher transition-colors"
      >
        <Icon name="menu" className="text-on-surface-variant text-xl" />
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setAberto(false)} />
      )}

      <aside className={`
        fixed left-0 top-0 h-full w-64 z-50
        bg-surface-container-high border-r border-outline-variant
        flex flex-col
        transition-transform duration-300 ease-in-out
        md:translate-x-0
        ${aberto ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="px-5 py-5 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
              <Icon name="precision_manufacturing" className="text-lg" style={{ fontVariationSettings: "'FILL' 1" }} />
            </div>
            <div>
              <h1 className="text-lg font-black text-primary leading-none tracking-tight">SIGRAF</h1>
              <p className="text-[10px] text-primary/60 uppercase tracking-[0.2em] font-mono">Precision Emerald</p>
            </div>
          </div>
        </div>

        <button className="mx-4 my-3 px-4 py-3 bg-primary-container text-on-primary-container font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all border border-primary/30">
          <Icon name="add" />
          New Print Job
        </button>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {rotas.map((rota) => {
            const ativa = rota.para === "/" ? caminho === "/" : caminho.startsWith(rota.para);
            return (
              <Link
                key={rota.para}
                href={rota.para}
                onClick={() => setAberto(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-xs font-medium
                  ${ativa
                    ? "text-primary bg-surface-variant/50 border-l-4 border-primary shadow-sm shadow-primary/10"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
                  }
                `}
              >
                <Icon name={rota.icone} className={`text-lg ${ativa ? "text-primary" : ""}`} />
                <span className="font-semibold uppercase tracking-wider text-[11px]">{rota.nome}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-outline-variant flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center border-2 border-primary/30">
            <Icon name="person" className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">Gestor de Produção</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] text-primary uppercase font-bold tracking-widest">Online</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}