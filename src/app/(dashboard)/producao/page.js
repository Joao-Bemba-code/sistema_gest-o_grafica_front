"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import OrdensTab from "@/components/producao/OrdensTab";
import EtapasTab from "@/components/producao/EtapasTab";
import MaquinasTab from "@/components/producao/MaquinasTab";

const abas = [
  { id: "ordens", label: "Ordens", icon: "construction" },
  { id: "maquinas", label: "Máquinas", icon: "precision_manufacturing" },
  { id: "etapas", label: "Etapas", icon: "verified" },
];

export default function ProducaoPage() {
  const [tab, setTab] = useState("ordens");

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Produção</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">
            Ordens · máquinas · etapas de produção // PROD
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
      {tab === "maquinas" && <MaquinasTab />}
      {tab === "etapas" && <EtapasTab />}
    </div>
  );
}