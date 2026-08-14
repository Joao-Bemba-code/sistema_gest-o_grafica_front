"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import { inputCls, toNum } from "@/lib/estoque";
import { formatKz } from "@/lib/estoque";

const estados = {
  enviado: { label: "Enviado", variant: "warning" },
  recebido: { label: "Recebido", variant: "success" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

function estadoBadge(p) {
  const base = estados[p.estado] || estados.enviado;
  if (p.estado === "enviado" && p.pendente && p.itens?.some((i) => toNum(i.quantidade_recebida) > 0)) {
    return <Badge variant="info">Parcial</Badge>;
  }
  return <Badge variant={base.variant}>{base.label}</Badge>;
}

export default function PedidosModal({ open, onClose, pedidos, carregando, onNovo, onPdf, onReceber, onCancelar }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? pedidos.filter(
        (p) =>
          String(p.numero || "").toLowerCase().includes(termo) ||
          String(p.fornecedor_nome || "").toLowerCase().includes(termo)
      )
    : pedidos;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pedidos de Compra"
      icon="shopping_cart"
      size="xl"
      footer={
        <Button onClick={onNovo}>
          <Icon name="add" className="text-lg" /> Novo Pedido
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className={`${inputCls} pl-10`}
            placeholder="Procurar por nº ou fornecedor..."
          />
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none" />
        </div>

        {carregando && pedidos.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Icon name="shopping_cart" className="text-4xl text-muted-foreground block mx-auto" />
            <p className="text-sm font-semibold text-foreground">Nenhum pedido encontrado</p>
            <p className="text-xs text-muted-foreground">
              {pedidos.length === 0 ? "Cria o primeiro pedido de compra ao fornecedor." : "Ajusta a pesquisa."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map((p) => {
              const totalRecebido = p.itens.reduce((s, i) => s + toNum(i.quantidade_recebida), 0);
              const totalPedido = p.itens.reduce((s, i) => s + toNum(i.quantidade), 0);
              const pct = totalPedido > 0 ? Math.round((totalRecebido / totalPedido) * 100) : 0;
              const data = p.data_pedido ? new Date(p.data_pedido) : null;
              const dataStr = data && !isNaN(data.getTime()) ? data.toLocaleDateString("pt-BR") : "—";
              return (
                <div key={p.id} className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon name="receipt_long" className="text-xl text-primary" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{p.numero} <span className="text-muted-foreground font-medium">· {dataStr}</span></p>
                        <p className="text-xs text-muted-foreground truncate">Fornecedor: <strong className="text-foreground">{p.fornecedor_nome}</strong></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {estadoBadge(p)}
                      <span className="text-sm font-extrabold text-primary">{formatKz(p.total)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full gradient-brand rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground whitespace-nowrap">
                      {pct}% recebido ({p.itens.length} {p.itens.length === 1 ? "item" : "itens"})
                    </span>
                  </div>

                  {p.observacoes && (
                    <p className="text-[11px] text-muted-foreground bg-background/50 rounded-lg px-3 py-2 border border-border/40">
                      {p.observacoes}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onPdf(p)}>
                      <Icon name="print" className="text-base" /> PDF
                    </Button>
                    {p.estado === "enviado" && (
                      <Button size="sm" onClick={() => onReceber(p)}>
                        <Icon name="download" className="text-base" /> Registar Entrada
                      </Button>
                    )}
                    {p.estado === "enviado" && (
                      <Button size="sm" variant="destructive" onClick={() => onCancelar(p)}>
                        <Icon name="close" className="text-base" /> Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
