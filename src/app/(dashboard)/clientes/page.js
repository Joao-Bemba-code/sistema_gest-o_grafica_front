"use client";

import CadastrosTab from "@/components/vendas/CadastrosTab";

export default function CadastrosPage() {
  return (
    <div className="space-y-5">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cadastros</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestão de clientes e fornecedores // CLT</p>
      </div>

      <CadastrosTab />

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}