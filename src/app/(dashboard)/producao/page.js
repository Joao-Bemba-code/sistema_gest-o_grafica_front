"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";
import OrdensTab from "@/components/producao/OrdensTab";
import OperacionalTab from "@/components/producao/OperacionalTab";
import ProcessosTab from "@/components/producao/ProcessosTab";
import RequisicoesTab from "@/components/producao/RequisicoesTab";
import EncomendasProducaoTab from "@/components/producao/EncomendasProducaoTab";
import NovaOpModal from "@/components/producao/NovaOpModal";
import { podeAtual } from "@/lib/permissoes";
import { getUsuario } from "@/services/auth";

const abas = [
  // A encomenda é o ponto de partida do dia: é dela que nasce a OP.
  { id: "encomendas", label: "Encomendas", icon: "pending_actions" },
  { id: "ordens", label: "Ordens", icon: "construction" },
  { id: "requisicoes", label: "Requisições", icon: "inventory_2", soProducao: true },
  { id: "processos", label: "Processos", icon: "verified" },
  { id: "operacional", label: "Operacional", icon: "precision_manufacturing" },
];

export default function ProducaoPage() {
  const [tab, setTab] = useState("encomendas");
  const [novaOpOpen, setNovaOpOpen] = useState(false);
  const [novaOpPrefill, setNovaOpPrefill] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // A aba Requisições é do pessoal de chão de fábrica. Quem gere o stock
  // faz saídas manuais no Stock e só aceita/rejeita pedidos.
  // O administrador não fica preso a esta separação: cria e cancela também.
  const eAdmin = getUsuario()?.perfil === "admin";
  const podePedirMaterial = podeAtual("producao", "criar") && (eAdmin || !podeAtual("estoque", "editar"));
  const podeCriarOp = podeAtual("producao", "criar");
  const abasVisiveis = abas.filter((a) => !a.soProducao || podePedirMaterial);
  const abaAtual = abasVisiveis.some((a) => a.id === tab) ? tab : "encomendas";

  const abrirNovaOp = (prefill = null) => {
    setNovaOpPrefill(prefill);
    setNovaOpOpen(true);
  };

  const fecharNovaOp = () => {
    setNovaOpOpen(false);
    setNovaOpPrefill(null);
  };

  // A OP nasce do orçamento aprovado da encomenda: a modal já abre com o
  // cliente, o orçamento e a data de entrega preenchidos.
  const criarOpDeEncomenda = (row) => {
    const orcamento = row?.orcamento;
    if (!orcamento) return;
    abrirNovaOp({
      clienteId: orcamento.cliente_id ?? row?._cliente?.id ?? null,
      orcamentoId: orcamento.id,
      dataEntrega: row?._entrega || orcamento.data_entrega || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Ordens de Produção</h1>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            Planeamento, execução e controle dos trabalhos.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => abrirNovaOp()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Icon name="add" className="text-base" />
            Nova OP
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {abasVisiveis.map((t) => {
          const ativo = abaAtual === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={ativo}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                ativo
                  ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon name={t.icon} className="text-base" />
              {t.label}
            </button>
          );
        })}
      </div>

      {abaAtual === "ordens" && <OrdensTab key={refreshKey} />}
      {abaAtual === "encomendas" && (
        <EncomendasProducaoTab
          key={`encomendas-${refreshKey}`}
          onCriarOp={podeCriarOp ? criarOpDeEncomenda : undefined}
        />
      )}
      {abaAtual === "operacional" && <OperacionalTab />}
      {abaAtual === "processos" && <ProcessosTab />}
      {abaAtual === "requisicoes" && podePedirMaterial && <RequisicoesTab />}

      {novaOpOpen && (
        <NovaOpModal
          open
          prefill={novaOpPrefill}
          onClose={fecharNovaOp}
          onCriada={() => { fecharNovaOp(); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}
