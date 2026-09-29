"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import PageHeader from "@/components/ui/PageHeader";
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
      <PageHeader title="Produção" description="Ordens de produção, processos e operacional" />

      <div className="seg-track">
        {abasVisiveis.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`seg-tab ${abaAtual === t.id ? "is-active" : ""}`}
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