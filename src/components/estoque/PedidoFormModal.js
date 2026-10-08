"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/Icon";
import FornecedorSelect from "./FornecedorSelect";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls, toNum } from "@/lib/estoque";
import { FormField } from "@/components/ui/FormField";

export default function PedidoFormModal({ open, onClose, fornecedores, materiais, materialInicial, nomeUsuario, onConfirm }) {
  const inicial = materialInicial || {};
  const [form, setForm] = useState(() => ({
    fornecedor: inicial.fornecedor || "",
    solicitado_por: nomeUsuario || "",
    observacoes: "",
    itens: [
      {
        material_id: inicial.id != null ? String(inicial.id) : "",
        quantidade: "",
      },
    ],
  }));
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);

  const setItem = (idx, campo, valor) =>
    setForm((f) => ({
      ...f,
      itens: f.itens.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item)),
    }));

  const adicionarItem = () =>
    setForm((f) => ({ ...f, itens: [...f.itens, { material_id: "", quantidade: "" }] }));

  const removerItem = (idx) =>
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));

  const trocarMaterial = (idx, id) => {
    setItem(idx, "material_id", id);
  };

  const valida = () => {
    if (!String(form.fornecedor || "").trim()) { setErro("Informe o fornecedor do pedido"); return false; }
    const validos = form.itens.filter((i) => i.material_id && toNum(i.quantidade) > 0);
    if (!validos.length) { setErro("Adicione pelo menos um material com quantidade"); return false; }
    return true;
  };

  const confirmar = async () => {
    setErro("");
    if (!valida()) return;
    const fornecedorNome = String(form.fornecedor).trim();
    const fornecedor = fornecedores.find((f) => String(f.nome).toLowerCase() === fornecedorNome.toLowerCase());
    const itens = form.itens
      .filter((i) => i.material_id && toNum(i.quantidade) > 0)
      .map((i) => ({
        material_id: Number(i.material_id),
        quantidade: String(i.quantidade),
        preco_unit: "0",
      }));
    setSubmetendo(true);
    const ok = await onConfirm({
      fornecedor_id: fornecedor?.id || null,
      fornecedor_nome: fornecedorNome,
      solicitado_por: form.solicitado_por,
      observacoes: form.observacoes,
      itens,
    });
    setSubmetendo(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo Pedido de Compra"
      icon="shopping_cart"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} loading={submetendo}>
            <Icon name="check" className="text-lg" /> Guardar Pedido
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Fornecedor" obrigatorio>
            <FornecedorSelect
              value={form.fornecedor}
              onChange={(v) => setForm((f) => ({ ...f, fornecedor: v }))}
              fornecedores={fornecedores}
              placeholder="Procurar fornecedor ou escrever novo..."
              required
            />
          </FormField>
          <FormField label="Solicitado por">
            <input value={form.solicitado_por} onChange={(e) => setForm((f) => ({ ...f, solicitado_por: e.target.value }))} className={inputCls} placeholder="Responsável pelo pedido" />
          </FormField>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border/60">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-wider">Materiais do pedido</p>
            <Button type="button" size="sm" variant="outline" onClick={adicionarItem}>
              <Icon name="add" className="text-base" /> Adicionar material
            </Button>
          </div>
          <div className="divide-y divide-border/60">
            {form.itens.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 px-4 py-3 items-end">
                  <div className="sm:col-span-8">
                    <span className="text-[10px] font-semibold text-muted-foreground tracking-wider block mb-1.5">Material</span>
                    <select
                      value={item.material_id}
                      onChange={(e) => trocarMaterial(idx, e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seleccionar material...</option>
                      {materiais.map((m) => (
                        <option key={m.id} value={m.id}>{m.nome} {m.unidade ? `(${m.unidade})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-[10px] font-semibold text-muted-foreground tracking-wider block mb-1.5">Quantidade</span>
                    <NumeroInput value={item.quantidade} onChange={(e) => setItem(idx, "quantidade", e.target.value)} className={inputCls} placeholder="0" />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    {form.itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerItem(idx)}
                        aria-label="Remover material"
                        className="w-8 h-8 rounded border border-error/30 bg-error/10 text-error hover:bg-error hover:text-white flex items-center justify-center transition-colors"
                      >
                        <Icon name="close" className="text-base" />
                      </button>
                    )}
                  </div>
                </div>
            ))}
          </div>
        </div>

        <FormField label="Observações">
          <textarea
            rows={2}
            value={form.observacoes}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            className={`${inputCls} resize-none`}
            placeholder="Condições de entrega, notas para o fornecedor..."
          />
        </FormField>

        {erro && (
          <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-3 py-2.5 animate-msg-in">
            <Icon name="error" className="text-base" /> {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}
