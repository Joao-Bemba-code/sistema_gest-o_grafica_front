"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";
import OrdensTab from "@/components/producao/OrdensTab";
import OperacionalTab from "@/components/producao/OperacionalTab";
import ProcessosTab from "@/components/producao/ProcessosTab";
import RequisicoesTab from "@/components/producao/RequisicoesTab";
import NovaOpModal from "@/components/producao/NovaOpModal";
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
  const [novaOpOpen, setNovaOpOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // A aba Requisições é do pessoal de chão de fábrica. Quem gere o stock
  // faz saídas manuais no Provisionamento e só aceita/rejeita pedidos.
  // O administrador não fica preso a esta separação: cria e cancela também.
  const eAdmin = getUsuario()?.perfil === "admin";
  const podePedirMaterial = podeAtual("producao", "criar") && (eAdmin || !podeAtual("estoque", "editar"));
  const abasVisiveis = abas.filter((a) => !a.soProducao || podePedirMaterial);
  const abaAtual = abasVisiveis.some((a) => a.id === tab) ? tab : "ordens";

  return (
    <div className="space-y-4">
      {/* Faixa do módulo — identificação produção */}
      <div className="flex items-center rounded-xl bg-[#FF5500] px-5 py-2.5 text-white shadow-sm">
        <span className="text-lg font-bold uppercase tracking-wider">3. Produção</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Ordens de Produção</h2>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">Planeamento, execução e controle dos trabalhos.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setNovaOpOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Icon name="add" className="text-base" />
            Nova OP
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border">
        {abasVisiveis.map((t) => {
          const ativo = abaAtual === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-semibold transition-colors",
                ativo ? "border-primary font-bold text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon name={t.icon} className="text-base" />
              {t.label}
            </button>
          );
        })}
      </div>

      {abaAtual === "ordens" && <OrdensTab key={refreshKey} />}
      {abaAtual === "operacional" && <OperacionalTab />}
      {abaAtual === "processos" && <ProcessosTab />}
      {abaAtual === "requisicoes" && podePedirMaterial && <RequisicoesTab />}

      {novaOpOpen && (
        <NovaOpModal
          open
          onClose={() => setNovaOpOpen(false)}
          onCriada={() => { setNovaOpOpen(false); setTab("ordens"); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}
