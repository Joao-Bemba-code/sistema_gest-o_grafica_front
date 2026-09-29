"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { FormField } from "@/components/ui/FormField";
import { inputCls, toNum } from "@/lib/estoque";

const linhaVazia = { material_id: "", quantidade: "", observacoes: "" };

export default function RequisicaoMaterialFormModal({
  open,
  onClose,
  clientes,
  materiais,
  nomeUsuario,
  onConfirm,
}) {
  const [form, setForm] = useState(() => ({
    cliente_id: "",
    solicitado_por: nomeUsuario || "",
    observacoes: "",
    itens: [{ ...linhaVazia }],
  }));
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);

  const setItem = (idx, campo, valor) =>
    setForm((f) => ({
      ...f,
      itens: f.itens.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item)),
    }));

  const adicionarItem = () =>
    setForm((f) => ({ ...f, itens: [...f.itens, { ...linhaVazia }] }));

  const removerItem = (idx) =>
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));

  const valida = () => {
    const validos = form.itens.filter((i) => i.material_id && toNum(i.quantidade) > 0);
    if (!validos.length) {
      setErro("Adicione pelo menos um material com quantidade maior que zero");
      return false;
    }
    return true;
  };

  const confirmar = async () => {
    setErro("");
    if (!valida()) return;
    const itens = form.itens
      .filter((i) => i.material_id && toNum(i.quantidade) > 0)
      .map((i) => ({
        material_id: Number(i.material_id),
        quantidade: String(i.quantidade),
        observacoes: i.observacoes || null,
      }));
    setSubmetendo(true);
    const ok = await onConfirm({
      cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
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
      title="Requisitar Material ao Estoque"
      icon="inventory"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} loading={submetendo}>
            <Icon name="send" className="text-lg" /> Enviar requisição
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Destino"
            hint="Deixe em consumo interno para material acabado ou uso da própria fábrica."
          >
            <select
              value={form.cliente_id}
              onChange={(e) => setForm((f) => ({ ...f, cliente_id: e.target.value }))}
              className={inputCls}
            >
              <option value="">Consumo interno / produção</option>
              {(clientes || []).map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Solicitado por">
            <input
              value={form.solicitado_por}
              onChange={(e) => setForm((f) => ({ ...f, solicitado_por: e.target.value }))}
              className={inputCls}
              placeholder="Responsável pela requisição"
            />
          </FormField>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border/60">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Materiais a requisitar
            </p>
            <Button type="button" size="sm" variant="outline" onClick={adicionarItem}>
              <Icon name="add" className="text-base" /> Adicionar material
            </Button>
          </div>
          <div className="divide-y divide-border/60">
            {form.itens.map((item, idx) => {
              const mat = materiais.find((m) => String(m.id) === item.material_id);
              const disponivel = mat ? toNum(mat.quantidade) - toNum(mat.estoque_reservado) : 0;
              const pedido = toNum(item.quantidade);
              const excede = mat && pedido > disponivel;
              return (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 px-4 py-3 items-end">
                  <div className="sm:col-span-5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Material</span>
                    <select
                      value={item.material_id}
                      onChange={(e) => setItem(idx, "material_id", e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seleccionar material...</option>
                      {materiais.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.codigo} — {m.nome} {m.unidade ? `(${m.unidade})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Quantidade</span>
                    <NumeroInput
                      value={item.quantidade}
                      onChange={(e) => setItem(idx, "quantidade", e.target.value)}
                      className={inputCls}
                      placeholder="0"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Observação</span>
                    <input
                      value={item.observacoes}
                      onChange={(e) => setItem(idx, "observacoes", e.target.value)}
                      className={inputCls}
                      placeholder="Opcional"
                    />
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
                  {mat && (
                    <div className="sm:col-span-12 text-[11px]">
                      {excede ? (
                        <span className="text-error font-semibold">
                          Stock insuficiente — disponível {disponivel} {mat.unidade}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Disponível: {disponivel} {mat.unidade}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <FormField label="Observações">
          <textarea
            rows={2}
            value={form.observacoes}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            className={`${inputCls} resize-none`}
            placeholder="Motivo da requisição, obra a que se destina..."
          />
        </FormField>

        <p className="text-[11px] text-muted-foreground flex items-start gap-2">
          <Icon name="info" className="text-base shrink-0 mt-px" />
          A requisição fica pendente. No Estoque, o responsável confirma e aprova — o stock só sai quando a
          aprovação for dada.
        </p>

        {erro && (
          <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-3 py-2.5 animate-msg-in">
            <Icon name="error" className="text-base" /> {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}
