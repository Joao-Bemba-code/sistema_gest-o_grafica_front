"use client";

import { useState } from "react";
import TesourariaTab from "@/components/vendas/TesourariaTab";
import ContasBancariasTab from "@/components/tesouraria/ContasBancariasTab";
import ComprovativosTab from "@/components/tesouraria/ComprovativosTab";
import DividasTab from "@/components/tesouraria/DividasTab";
import ConciliacaoTab from "@/components/tesouraria/ConciliacaoTab";
import CaixaTab from "@/components/tesouraria/CaixaTab";
import { podeAtual } from "@/lib/permissoes";

export default function TesourariaPage() {
  const [tab, setTab] = useState("movimentos");

  const abas = [
    { id: "movimentos", label: "Movimentos", icon: "swap_horiz" },
    { id: "contas", label: "Contas e Caixa", icon: "account_balance" },
    { id: "conciliacao", label: "Reconciliação", icon: "fact_check" },
    { id: "caixa", label: "Abertura e fecho", icon: "lock_open" },
    { id: "comprovativos", label: "Comprovativos", icon: "receipt_long" },
    { id: "dividas", label: "Dívidas", icon: "money_off" },
  ].filter((t) => (t.id === "dividas" ? podeAtual("dividas", "ver") : true));

  // Se o utilizador perder o acesso às dívidas, não pode ficar preso numa aba
  // que já não vê.
  const abaVisivel = abas.some((t) => t.id === tab) ? tab : abas[0].id;

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Gestão de Tesouraria</h1>
        <p className="mt-1 text-xs font-medium text-muted-foreground">Caixa, bancos e pagamentos.</p>
      </div>

      <TesourariaTab aba={abaVisivel} setAba={setTab} abas={abas}>
        {abaVisivel === "contas" && <ContasBancariasTab />}
        {abaVisivel === "conciliacao" && <ConciliacaoTab />}
        {abaVisivel === "caixa" && <CaixaTab />}
        {abaVisivel === "comprovativos" && <ComprovativosTab />}
        {abaVisivel === "dividas" && <DividasTab />}
      </TesourariaTab>
    </div>
  );
}
