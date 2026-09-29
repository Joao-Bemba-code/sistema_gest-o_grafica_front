"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import PageHeader from "@/components/ui/PageHeader";
import TesourariaTab from "@/components/vendas/TesourariaTab";
import ContasBancariasTab from "@/components/tesouraria/ContasBancariasTab";

export default function TesourariaPage() {
  const [tab, setTab] = useState("movimentos");

  return (
    <div className="space-y-6">
      <PageHeader title="Tesouraria" description="Movimentos financeiros, contas e caixa" />

      <div className="seg-track">
        {[
          { id: "movimentos", label: "Movimentos", icon: "swap_horiz" },
          { id: "contas", label: "Contas e Caixa", icon: "account_balance" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`seg-tab ${tab === t.id ? "is-active" : ""}`}
          >
            <Icon name={t.icon} className="text-lg" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "movimentos" && <TesourariaTab />}

      {tab === "contas" && <ContasBancariasTab />}
    </div>
  );
}