"use client";

import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import { toNum } from "@/lib/estoque";

const estadoReserva = {
  ativa: { label: "Ativa", variant: "warning" },
  parcial: { label: "Parcial", variant: "warning" },
  consumida: { label: "Consumida", variant: "success" },
  cancelada: { label: "Cancelada", variant: "outline" },
};

export default function ReservasModal({ open, onClose, item, reservas, carregando, onCancelarReserva }) {
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
                      <p className="text-sm font-bold text-foreground">OP {r.ordem_producao?.numero || r.ordem_producao_id}</p>
                      <Badge variant={est.variant} className="text-[10px]">{est.label}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Reservado: <strong>{toNum(r.quantidade_reservada)}</strong> • Consumido: <strong>{toNum(r.quantidade_consumida)}</strong> {r.material?.unidade}
                      {r.lote && ` • Lote: ${r.lote}`}
                    </p>
                  </div>
                  {["ativa", "parcial"].includes(r.estado) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive text-[10px] shrink-0"
                      onClick={() => onCancelarReserva(r)}
                      aria-label={`Cancelar reserva da OP ${r.ordem_producao?.numero || r.ordem_producao_id}`}
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
