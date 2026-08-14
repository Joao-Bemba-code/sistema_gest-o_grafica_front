"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls, toNum } from "@/lib/estoque";

export default function PedidoReceberModal({ open, pedido, onClose, onConfirm }) {
  const itens = (pedido?.itens || []).filter((i) => toNum(i.quantidade_recebida) < toNum(i.quantidade));
  const [qtds, setQtds] = useState(() => {
    const mapa = {};
    itens.forEach((i) => {
      mapa[i.id] = String(toNum(i.quantidade) - toNum(i.quantidade_recebida));
    });
    return mapa;
  });
  const [lote, setLote] = useState("");
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);

  const recebendo = itens.some((i) => toNum(qtds[i.id]) > 0);

  const confirmar = async () => {
    setErro("");
    const corpo = itens
      .filter((i) => toNum(qtds[i.id]) > 0)
      .map((i) => ({
        id: i.id,
        quantidade: String(qtds[i.id]),
        lote: lote || null,
      }));
    if (!corpo.length) { setErro("Indique a quantidade recebida de pelo menos um material"); return; }
    setSubmetendo(true);
    const ok = await onConfirm(corpo);
    setSubmetendo(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Receber ${pedido?.numero || "Pedido"}`}
      icon="inventory_2"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} loading={submetendo} disabled={!recebendo}>
            <Icon name="download" className="text-lg" /> Registar Entrada
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-muted/50 rounded-xl p-4 border border-border/60 space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fornecedor</p>
          <p className="text-base font-bold text-foreground">{pedido?.fornecedor_nome || "—"}</p>
          <p className="text-xs text-muted-foreground">
            O stock só aumenta pelas quantidades que confirmas aqui. Cada item gera uma entrada no estoque.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/60">
          {itens.map((i) => {
            const pendente = toNum(i.quantidade) - toNum(i.quantidade_recebida);
            return (
              <div key={i.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 px-4 py-3 items-end">
                <div className="sm:col-span-6">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">{i.codigo || "Material"}</span>
                  <p className="text-sm font-bold text-foreground truncate">{i.nome}</p>
                </div>
                <div className="sm:col-span-3">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Qtd recebida agora</span>
                  <NumeroInput
                    value={qtds[i.id]}
                    onChange={(e) => setQtds((m) => ({ ...m, [i.id]: e.target.value }))}
                    className={inputCls}
                    placeholder="0"
                  />
                </div>
                <div className="sm:col-span-3 flex items-center justify-end gap-2 pb-1">
                  <Badge variant="outline">pendente {toNum(pendente).toLocaleString("pt-AO")} {i.unidade}</Badge>
                  <span className="text-[11px] font-mono text-muted-foreground">/ {toNum(i.quantidade).toLocaleString("pt-AO")}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Lote (aplicado a todas as quantidades)</span>
          <input value={lote} onChange={(e) => setLote(e.target.value)} className={inputCls} placeholder="Ex: LOTE-2026-01" />
        </div>

        {erro && (
          <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-3 py-2.5 animate-msg-in">
            <Icon name="error" className="text-base" /> {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}
