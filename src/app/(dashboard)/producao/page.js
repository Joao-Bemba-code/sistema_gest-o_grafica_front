"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import OrdensTab from "@/components/producao/OrdensTab";
import OperacionalTab from "@/components/producao/OperacionalTab";
import ProcessosTab from "@/components/producao/ProcessosTab";
import RequisicoesTab from "@/components/producao/RequisicoesTab";
import { podeAtual } from "@/lib/permissoes";
import { getUsuario } from "@/services/auth";

const abas = [
  { id: "ordens", label: "Ordens", icon: "construction" },
  { id: "processos", label: "Processos", icon: "verified" },
  { id: "requisicoes", label: "Requisições", icon: "inventory_2", soProducao: true },
  { id: "operacional", label: "Operacional", icon: "precision_manufacturing" },
];

export default function ProducaoPage() {
  const [tab, setTab] = useState("ordens");
  // A aba Requisições é do pessoal de chão de fábrica. Quem gere o stock
  // faz saídas manuais no Provisionamento e só aceita/rejeita pedidos.
  // O administrador não fica preso a esta separação: cria e cancela também.
  const eAdmin = getUsuario()?.perfil === "admin";
  const podePedirMaterial = podeAtual("producao", "criar") && (eAdmin || !podeAtual("estoque", "editar"));
  const abasVisiveis = abas.filter((a) => !a.soProducao || podePedirMaterial);
  const abaAtual = abasVisiveis.some((a) => a.id === tab) ? tab : "ordens";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Produção</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordens de produção, processos e operacional
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap rounded-xl border border-border bg-card p-1.5">
        {abasVisiveis.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
              abaAtual === t.id ? "nav-pill text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} className="text-lg" />
            {t.label}
          </button>
        ))}
      </div>

      {abaAtual === "ordens" && <OrdensTab />}
      {abaAtual === "operacional" && <OperacionalTab />}
      {abaAtual === "processos" && <ProcessosTab />}
      {abaAtual === "requisicoes" && podePedirMaterial && <RequisicoesTab />}
    </div>
  );
}