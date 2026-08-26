"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls, toNum } from "@/lib/estoque";

const estadoReserva = {
  ativa: { label: "Ativa", variant: "warning" },
  parcial: { label: "Parcial", variant: "warning" },
  consumida: { label: "Consumida", variant: "success" },
  cancelada: { label: "Cancelada", variant: "outline" },
};

export default function ReservasModal({ open, onClose, item, reservas, carregando, onCancelarReserva, onNovaReserva }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [quantidade, setQuantidade] = useState("");
  const [lote, setLote] = useState("");
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);

  const qtd = Number(quantidade) || 0;
  const disponivel = toNum(item?.estoque_disponivel);

  const confirmarReserva = async () => {
    setErro("");
    if (!qtd || qtd <= 0) return setErro("Informe uma quantidade válida");
    if (qtd > disponivel) return setErro(`Quantidade excede o disponível (${disponivel} ${item?.unidade || ""})`);
    setSubmetendo(true);
    const ok = await onNovaReserva({ material_id: item.id, quantidade: qtd, lote: lote || undefined });
    setSubmetendo(false);
    if (ok) { setQuantidade(""); setLote(""); setMostrarForm(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reservas — ${item?.nome || ""}`}
      icon="lock"
      size="lg"
      footer={<Button variant="outline" onClick={onClose}>Fechar</Button>}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Disponível: <strong>{disponivel.toLocaleString("pt-AO")}</strong> {item?.unidade}</p>
          {!mostrarForm && (
            <Button size="sm" variant="outline" onClick={() => setMostrarForm(true)}>
              <Icon name="add" className="text-sm" /> Nova Reserva
            </Button>
          )}
        </div>

        {mostrarForm && (
          <div className="bg-muted/50 rounded-xl p-4 border border-border/60 space-y-3">
            <p className="text-xs font-bold text-foreground">Nova Reserva</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Quantidade *</span>
                <NumeroInput required value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className={inputCls} placeholder="0" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Lote</span>
                <input value={lote} onChange={(e) => setLote(e.target.value)} className={inputCls} placeholder="Opcional" />
              </label>
            </div>
            {erro && (
              <p className="flex items-center gap-2 text-[10px] font-semibold text-destructive bg-destructive/10 rounded-lg px-2 py-1.5">
                <Icon name="error" className="text-sm" /> {erro}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setMostrarForm(false); setErro(""); }}>Cancelar</Button>
              <Button size="sm" onClick={confirmarReserva} loading={submetendo}>
                <Icon name="lock" className="text-sm" /> Reservar
              </Button>
            </div>
          </div>
        )}

        {carregando ? (
          <div className="space-y-2" aria-label="A carregar reservas">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {reservas.map((r) => {
              const est = estadoReserva[r.estado] || { label: r.estado, variant: "outline" };
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 bg-muted/50 rounded-xl p-3 border border-border/40">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">
                        {r.ordem_producao?.numero ? `OP ${r.ordem_producao.numero}` : "Reserva Manual"}
                      </p>
                      <Badge variant={est.variant} className="text-[10px]">{est.label}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Reservado: <strong>{toNum(r.quantidade_reservada)}</strong> • Consumido: <strong>{toNum(r.quantidade_consumida)}</strong> {item?.unidade}
                      {r.lote && ` • Lote: ${r.lote}`}
                    </p>
                  </div>
                  {["ativa", "parcial"].includes(r.estado) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive text-[10px] shrink-0"
                      onClick={() => onCancelarReserva(r)}
                    >
                      <Icon name="close" className="text-sm" /> Cancelar
                    </Button>
                  )}
                </div>
              );
            })}
            {reservas.length === 0 && (
              <p className="text-center p-6 text-muted-foreground">Sem reservas para este material</p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
