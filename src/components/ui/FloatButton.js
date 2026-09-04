"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";

/**
 * Botão de Ação Flutuante (FAB).
 * Fica fixo no canto inferior direito, visível mesmo ao rolar longas listas,
 * para o utilizador criar rapidamente um novo registo (material, orçamento,
 * fatura, cadastro, etc.) sem ter de voltar ao topo da página.
 *
 * Uso:
 *   <FloatButton href="/estoque/novo" label="Novo Material" icon="add" />
 *   <FloatButton onClick={abrirModal} label="Novo Cadastro" icon="person_add" />
 */
export default function FloatButton({ href, onClick, icon = "add", label, className }) {
  const classes = cn(
    "fixed bottom-6 right-6 z-50",
    "inline-flex items-center gap-2 h-14 rounded-full px-5",
    "bg-primary text-on-primary shadow-lg",
    "hover:bg-primary/90 hover:-translate-y-0.5",
    "transition-all duration-200 active:scale-95",
    "font-semibold text-sm",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    className
  );

  const inner = (
    <>
      <span className="h-8 w-8 rounded-full bg-white/20 inline-flex items-center justify-center shrink-0">
        <Icon name={icon} className="text-lg" />
      </span>
      {label && <span>{label}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={label || "Criar novo"}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} aria-label={label || "Criar novo"}>
      {inner}
    </button>
  );
}
