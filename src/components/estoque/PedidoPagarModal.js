"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls, toNum } from "@/lib/estoque";
import { FormField } from "@/components/ui/FormField";
import { listarContas } from "@/services/contasBancarias";

const METODOS = [
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "deposito", label: "Depósito" },
  { value: "ordem_saida", label: "Ordem de Saque" },
  { value: "multicaixa", label: "Multicaixa" },
  { value: "referencia", label: "Referência" },
  { value: "cheque", label: "Cheque" },
  { value: "tpa", label: "TPA" },
];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function PedidoPagarModal({ open, pedido, onClose, onConfirm }) {
  const saldo = Math.max(0, toNum(pedido?.total) - toNum(pedido?.valor_pago));
  const [form, setForm] = useState(() => ({
    valor: String(saldo || ""),
    data_pagamento: hojeISO(),
    conta_bancaria_id: "",
    metodo_pagamento: "transferencia",
    observacoes: "",
  }));
  const [contas, setContas] = useState([]);
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);

  useEffect(() => {
    if (!open || !pedido) return;
    const restante = Math.max(0, toNum(pedido.total) - toNum(pedido.valor_pago));
    setForm({
      valor: String(restante || ""),
      data_pagamento: hojeISO(),
      conta_bancaria_id: pedido.conta_bancaria_id || "",
      metodo_pagamento: pedido.metodo_pagamento || "transferencia",
      observacoes: "",
    });
    setErro("");
    listarContas({ ativo: "true" })
      .then((d) => setContas(Array.isArray(d) ? d : d?.data ?? []))
      .catch(() => setContas([]));
  }, [open, pedido]);

  const confirmar = async () => {
    setErro("");
    const valor = toNum(form.valor);
    if (!(valor > 0)) { setErro("Informe um valor maior que zero"); return; }
    if (valor > saldo + 0.005) { setErro(`O pagamento não pode ultrapassar ${saldo.toLocaleString("pt-AO")} Kz`); return; }
    setSubmetendo(true);
    const ok = await onConfirm({
      valor,
      data_pagamento: form.data_pagamento,
      conta_bancaria_id: form.conta_bancaria_id || null,
      metodo_pagamento: form.metodo_pagamento,
      observacoes: form.observacoes,
    });
    setSubmetendo(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pagar ${pedido?.numero || "Encomenda"}`}
      icon="payments"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} loading={submetendo}>
            <Icon name="check" className="text-lg" /> Registar Pagamento
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-wider">Fornecedor</p>
          <p className="text-base font-bold text-foreground">{pedido?.fornecedor_nome || "—"}</p>
          <p className="text-xs text-muted-foreground">
            Total {toNum(pedido?.total).toLocaleString("pt-AO")} Kz · Já pago {toNum(pedido?.valor_pago).toLocaleString("pt-AO")} Kz ·
            <span className="font-semibold text-foreground"> Restante {saldo.toLocaleString("pt-AO")} Kz</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            Vai ser criada uma saída na Tesouraria e o saldo da conta será actualizado. Não registe outra vez na aba de Movimentos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Valor a Pagar *" obrigatorio>
            <NumeroInput value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} className={inputCls} />
          </FormField>
          <FormField label="Data">
            <input type="date" value={form.data_pagamento} onChange={(e) => setForm((p) => ({ ...p, data_pagamento: e.target.value }))} className={inputCls} />
          </FormField>
          {pedido?.data_vencimento && (
            <FormField label="Vencimento do crédito">
              <input value={pedido.data_vencimento} readOnly className={`${inputCls} opacity-70`} />
            </FormField>
          )}
          <FormField label="Conta" full>
            <select value={form.conta_bancaria_id} onChange={(e) => setForm((p) => ({ ...p, conta_bancaria_id: e.target.value }))} className={inputCls}>
              <option value="">Sem conta (não mexe no saldo)</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.banco_nome} — {c.numero_conta || c.iban || `#${c.id}`}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Método" full>
            <select value={form.metodo_pagamento} onChange={(e) => setForm((p) => ({ ...p, metodo_pagamento: e.target.value }))} className={inputCls}>
              {METODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </FormField>
          <FormField label="Observações" full>
            <input value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} className={inputCls} />
          </FormField>
        </div>

        {erro && (
          <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">
            <Icon name="error" className="text-base" /> {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}
