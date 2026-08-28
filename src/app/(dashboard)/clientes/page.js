"use client";

import CadastrosTab from "@/components/vendas/CadastrosTab";

export default function CadastrosPage() {
  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-8 border-l-4 border-l-primary">
        <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Cadastros</h1>
        <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Gestão de clientes e fornecedores // CLT</p>
      </div>

      <CadastrosTab />

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}