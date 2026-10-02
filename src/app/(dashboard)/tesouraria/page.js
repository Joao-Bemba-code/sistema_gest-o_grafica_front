"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import PageHeader from "@/components/ui/PageHeader";
import TesourariaTab from "@/components/vendas/TesourariaTab";
import ContasBancariasTab from "@/components/tesouraria/ContasBancariasTab";
import ComprovativosTab from "@/components/tesouraria/ComprovativosTab";
import DividasTab from "@/components/tesouraria/DividasTab";
import { podeAtual } from "@/lib/permissoes";

export default function TesourariaPage() {
  const [tab, setTab] = useState("movimentos");

  const abas = [
    { id: "movimentos", label: "Movimentos", icon: "swap_horiz" },
    { id: "contas", label: "Contas e Caixa", icon: "account_balance" },
    { id: "comprovativos", label: "Comprovativos", icon: "receipt_long" },
    { id: "dividas", label: "Dívidas", icon: "money_off" },
  ].filter((t) => (t.id === "dividas" ? podeAtual("dividas", "ver") : true));

  // Se o utilizador perder o acesso às dívidas, não pode ficar preso numa aba
  // que já não vê.
  const abaVisivel = abas.some((t) => t.id === tab) ? tab : abas[0].id;

  return (
    <div className="space-y-6">
      <PageHeader title="Tesouraria" description="Movimentos financeiros, contas e caixa" />

      <div className="seg-track">
        {abas.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`seg-tab ${abaVisivel === t.id ? "is-active" : ""}`}
          >
            <Icon name={t.icon} className="text-lg" />
            {t.label}
          </button>
        ))}
      </div>

      {abaVisivel === "movimentos" && <TesourariaTab />}

      {abaVisivel === "contas" && <ContasBancariasTab />}

      {abaVisivel === "comprovativos" && <ComprovativosTab />}

      {abaVisivel === "dividas" && <DividasTab />}
    </div>
  );
}