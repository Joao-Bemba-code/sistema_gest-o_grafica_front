"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls, toNum } from "@/lib/estoque";

const formVazio = { quantidade: "", lote: "", observacoes: "" };

function Campo({ label, children, obrigatorio }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label} {obrigatorio && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function ReservarMaterialModal({ open, item, onClose, onConfirm }) {
  const [form, setForm] = useState(formVazio);
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);

  const qtd = Number(form.quantidade) || 0;
  const disponivel = toNum(item?.estoque_disponivel);
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const confirmar = async () => {
    setErro("");
    if (!qtd || qtd <= 0) return setErro("Informe uma quantidade válida");
    if (qtd > disponivel) return setErro(`Quantidade excede o disponível (${disponivel} ${item?.unidade || ""})`);
    setSubmetendo(true);
    const ok = await onConfirm({ material_id: item.id, quantidade: qtd, lote: form.lote || undefined });
    setSubmetendo(false);
    if (ok) { setForm(formVazio); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Reservar Material" icon="lock" size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={confirmar} loading={submetendo}><Icon name="lock" className="text-lg" /> Reservar</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="bg-muted/50 rounded-xl p-4 border border-border/60">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Material</p>
          <p className="text-base font-bold text-foreground">{item?.nome || "---"}</p>
          <p className="text-xs text-muted-foreground">Disponível: <strong>{disponivel.toLocaleString("pt-AO")}</strong> {item?.unidade}</p>
        </div>

        <Campo label="Quantidade a Reservar" obrigatorio>
          <NumeroInput required value={form.quantidade} onChange={set("quantidade")} className={inputCls} placeholder="0" autoFocus />
        </Campo>

        <Campo label="Lote (opcional)">
          <input value={form.lote} onChange={set("lote")} className={inputCls} placeholder="Número do lote" />
        </Campo>

        {erro && (
          <p className="flex items-center gap-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">
            <Icon name="error" className="text-base" /> {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}
