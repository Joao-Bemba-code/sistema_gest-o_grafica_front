"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Icon from "./Icon";

const breadcrumbs = {
  "/": ["Painel"],
  "/orcamentos": ["Pedidos", "Todos"],
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
  "/login": ["Login"],
};

export default function TopBar() {
  const hoje = new Date();
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dataStr = `${dias[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

  return (
    <header className="w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant flex justify-between items-center px-3 sm:px-6 h-14 sm:h-16">
      <div className="flex items-center gap-5 flex-1 max-w-xl">
        <h2 className="font-headline-md text-headline-md font-extrabold text-on-surface tracking-tight hidden sm:block">Console de Pedidos</h2>
        <div className="relative w-full group">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-sm" />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-label-md focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/50"
            placeholder="Pesquisar console..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-5">        <nav className="hidden md:flex gap-5">
          <a className="text-primary font-bold border-b-2 border-primary pb-1 text-xs uppercase tracking-widest transition-all">Pedidos</a>
          <a className="text-on-surface-variant hover:text-primary transition-all text-xs font-bold uppercase tracking-widest">Produção</a>
        </nav>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:text-primary hover:bg-surface-variant rounded-full transition-all relative">
            <Icon name="notifications" className="text-on-surface-variant" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border border-surface" />
          </button>
          <button className="p-2 hover:text-primary hover:bg-surface-variant rounded-full transition-all hidden sm:block">            <Icon name="settings" className="text-on-surface-variant" />
          </button>
          <div className="h-6 w-[1px] bg-outline-variant hidden sm:block" />          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black text-xs border border-primary/30">SP</div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-on-surface leading-tight">Gestor de Produção</p>
              <p className="text-[10px] text-primary uppercase font-bold tracking-widest">Online</p>
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
    <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
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