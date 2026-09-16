"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import TesourariaTab from "@/components/vendas/TesourariaTab";
import ContasBancariasTab from "@/components/tesouraria/ContasBancariasTab";

export default function TesourariaPage() {
  const [tab, setTab] = useState("movimentos");

  return (
    <div className="space-y-5">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tesouraria</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Movimentos financeiros · contas bancárias // TES
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap obsidian-glass cyber-border p-1.5 rounded-xl">
        {[
          { id: "movimentos", label: "Movimentos", icon: "swap_horiz" },
          { id: "contas", label: "Contas Bancárias", icon: "account_balance" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t.id ? "nav-pill shadow-none text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
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