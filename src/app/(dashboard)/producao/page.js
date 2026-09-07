"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import OrdensTab from "@/components/producao/OrdensTab";
import OperacionalTab from "@/components/producao/OperacionalTab";
import ProcessosTab from "@/components/producao/ProcessosTab";

const abas = [
  { id: "ordens", label: "Ordens", icon: "construction" },
  { id: "processos", label: "Processos", icon: "verified" },
  { id: "operacional", label: "Operacional", icon: "precision_manufacturing" },
];

export default function ProducaoPage() {
  const [tab, setTab] = useState("ordens");

  return (
    <div className="space-y-5">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Produção</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordens de produção · processos · operacional // PROD
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap obsidian-glass cyber-border p-1.5 rounded-xl">
        {abas.map((t) => (
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

      {tab === "ordens" && <OrdensTab />}
      {tab === "operacional" && <OperacionalTab />}
      {tab === "processos" && <ProcessosTab />}
    </div>
  );
}