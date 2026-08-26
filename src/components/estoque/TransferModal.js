"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls, toNum } from "@/lib/estoque";

const formVazio = { quantidade: "", armazem_externo: "", responsavel: "", autorizado_por: "", data: new Date().toISOString().split("T")[0], observacoes: "", confirma: false };

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

export default function TransferModal({ open, item, onClose, onConfirm }) {
  const [form, setForm] = useState(formVazio);
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);

  const qtd = Number(form.quantidade) || 0;

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const confirmar = async () => {
    setErro("");
    if (!qtd || qtd <= 0) return setErro("Informe uma quantidade válida");
    if (!form.armazem_externo.trim()) return setErro("Informe o armazém de destino externo");
    if (!form.responsavel.trim()) return setErro("Informe o responsável pela transferência");
    if (!form.autorizado_por.trim()) return setErro("Informe quem autorizou a transferência");
    if (!form.data) return setErro("Informe a data da transferência");
    if (qtd > toNum(item?.estoque_disponivel)) return setErro("Quantidade excede o disponível");
    if (!form.confirma) return setErro("Confirme a transferência");
    setSubmetendo(true);
    const ok = await onConfirm({ ...form, quantidade: qtd, material_origem_id: item.id });
    setSubmetendo(false);
    if (ok) { setForm(formVazio); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Transferência para Armazém Externo" icon="swap_horiz" size="md"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={confirmar} loading={submetendo}><Icon name="swap_horiz" className="text-lg" /> Transferir</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="bg-muted/50 rounded-xl p-4 border border-border/60">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Origem — Armazém Interno</p>
          <p className="text-base font-bold text-foreground">{item?.nome || "---"}</p>
          <p className="text-xs text-muted-foreground">Disponível: <strong>{toNum(item?.estoque_disponivel).toLocaleString("pt-AO")}</strong> {item?.unidade}</p>
        </div>

        <Icon name="arrow_downward" className="text-xl text-primary mx-auto block" />

        <Campo label="Armazém Externo (Destino)" obrigatorio>
          <input required value={form.armazem_externo} onChange={set("armazem_externo")} className={inputCls} placeholder="Ex: Armazém Central, Filial Luanda..." autoFocus />
        </Campo>

        <Campo label="Quantidade" obrigatorio>
          <NumeroInput required value={form.quantidade} onChange={set("quantidade")} className={inputCls} placeholder="0" />
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Responsável" obrigatorio>
            <input required value={form.responsavel} onChange={set("responsavel")} className={inputCls} placeholder="Nome do responsável" />
          </Campo>
          <Campo label="Autorizado por" obrigatorio>
            <input required value={form.autorizado_por} onChange={set("autorizado_por")} className={inputCls} placeholder="Quem autoriza" />
          </Campo>
        </div>

        <Campo label="Data" obrigatorio>
          <input type="date" required value={form.data} onChange={set("data")} className={inputCls} />
        </Campo>

        <Campo label="Observações">
          <textarea rows={2} value={form.observacoes} onChange={set("observacoes")} className={`${inputCls} resize-none`} placeholder="Motivo da transferência..." />
        </Campo>

        <label className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 cursor-pointer hover:bg-primary/10">
          <input type="checkbox" checked={form.confirma} onChange={(e) => setForm((f) => ({ ...f, confirma: e.target.checked }))} className="mt-0.5 w-4 h-4 rounded accent-primary" />
          <span className="text-xs text-foreground">Confirmo a transferência de <strong>{qtd.toLocaleString("pt-AO")} {item?.unidade}</strong> para <strong>{form.armazem_externo || "—"}</strong></span>
        </label>

        {erro && (
          <p className="flex items-center gap-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">
            <Icon name="error" className="text-base" /> {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}
