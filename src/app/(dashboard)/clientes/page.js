"use client";

import CadastrosTab from "@/components/vendas/CadastrosTab";

export default function CadastrosPage() {
  return (
    <div className="space-y-6">
      <CadastrosTab />

      <footer className="border-t pt-6 pb-2 text-center">
        <p className="text-[11px] text-muted-foreground">SIGRAF · Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}