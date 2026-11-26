"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { FormField } from "@/components/ui/FormField";
import { inputCls, toNum } from "@/lib/estoque";
import { cn } from "@/lib/utils";

const linhaVazia = { material_id: "", quantidade: "", observacoes: "" };

// Dois tipos de requisição: uma ligada a uma ordem de produção (actualiza o
// estado da OP) e outra avulsa, que não fica ligada a nenhuma ordem.
const TIPOS = [
  {
    value: "ordem_producao",
    titulo: "Com ordem de produção",
    descricao: "Ligada a uma OP aberta — o cliente vem da ordem.",
    icone: "precision_manufacturing",
  },
  {
    value: "sem_ordem",
    titulo: "Sem ordem de produção",
    descricao: "Saída avulsa para consumo interno ou cliente — não mexe em OPs.",
    icone: "inventory_2",
  },
];

export default function RequisicaoMaterialFormModal({
  open,
  onClose,
  ordens = [],
  clientes = [],
  materiais,
  nomeUsuario,
  // Quando a requisição é aberta a partir de uma OP (lista de Ordens), essa
  // ordem já vem escolhida e o tipo fica fixo em "com ordem de produção".
  ordemInicial = null,
  fixarTipo = null,
  onConfirm,
}) {
  const [form, setForm] = useState(() => ({
    tipo: fixarTipo || "ordem_producao",
    ordem_producao_id: ordemInicial != null ? String(ordemInicial) : "",
    cliente_id: "",
    cliente_nome: "",
    solicitado_por: nomeUsuario || "",
    observacoes: "",
    itens: [{ ...linhaVazia }],
  }));
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);

  const comOp = form.tipo === "ordem_producao";
  const ordem = comOp
    ? ordens.find((o) => String(o.id) === String(form.ordem_producao_id)) || null
    : null;

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
    if (comOp && !form.ordem_producao_id) {
      setErro("Selecione a ordem de produção a que se destina a requisição");
      return false;
    }
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
    const dados = {
      tipo: form.tipo,
      solicitado_por: form.solicitado_por,
      observacoes: form.observacoes,
      itens,
    };
    if (comOp) {
      dados.ordem_producao_id = Number(form.ordem_producao_id);
    } else {
      if (form.cliente_id) dados.cliente_id = Number(form.cliente_id);
      else if (form.cliente_nome.trim()) dados.cliente_nome = form.cliente_nome.trim();
    }
    setSubmetendo(true);
    const ok = await onConfirm(dados);
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
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Tipo de requisição
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TIPOS.map((op) => {
              const ativo = form.tipo === op.value;
              return (
                <button
                  key={op.value}
                  type="button"
                  disabled={Boolean(fixarTipo)}
                  aria-pressed={ativo}
                  onClick={() => setForm((f) => ({ ...f, tipo: op.value }))}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    ativo
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    fixarTipo && "cursor-not-allowed opacity-80"
                  )}
                >
                  <Icon name={op.icone} className="text-lg shrink-0 mt-px" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{op.titulo}</span>
                    <span className="block text-[11px] text-muted-foreground">{op.descricao}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {comOp ? (
            <FormField
              label="Ordem de produção *"
              hint="A requisição é feita com base numa OP aberta."
            >
              <select
                value={form.ordem_producao_id}
                onChange={(e) => setForm((f) => ({ ...f, ordem_producao_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">Selecionar ordem de produção...</option>
                {(ordens || []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero || `OP #${o.id}`} — {o.cliente_nome || "Consumo interno"}
                    {o.produto ? ` · ${o.produto}` : ""}
                  </option>
                ))}
              </select>
            </FormField>
          ) : (
            <FormField
              label="Cliente (opcional)"
              hint="Sem cliente, a requisição fica como consumo interno."
            >
              <select
                value={form.cliente_id}
                onChange={(e) => setForm((f) => ({ ...f, cliente_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">Consumo interno / produção</option>
                {(clientes || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}{c.empresa ? ` · ${c.empresa}` : ""}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label="Solicitado por">
            <input
              value={form.solicitado_por}
              onChange={(e) => setForm((f) => ({ ...f, solicitado_por: e.target.value }))}
              className={inputCls}
              placeholder="Responsável pela requisição"
            />
          </FormField>
        </div>

        {!comOp && !form.cliente_id && (
          <FormField
            label="Destino / cliente avulso"
            hint="Opcional — por exemplo uma obra, departamento ou nome de cliente."
          >
            <input
              value={form.cliente_nome}
              onChange={(e) => setForm((f) => ({ ...f, cliente_nome: e.target.value }))}
              className={inputCls}
              placeholder="Consumo interno / produção"
            />
          </FormField>
        )}

        {comOp && !ordens.length && (
          <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-foreground">
            Não há ordens de produção abertas. Crie primeiro a OP na aba Encomendas ou em “Nova OP” —
            ou escolha “Sem ordem de produção”.
          </p>
        )}

        {comOp && ordem && (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Cliente / destino</p>
              <p className="text-sm text-foreground">{ordem.cliente_nome || "Consumo interno"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Produto</p>
              <p className="text-sm text-foreground">{ordem.produto || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Tiragem</p>
              <p className="text-sm text-foreground">{ordem.quantidade ?? "—"}</p>
            </div>
          </div>
        )}

        {!comOp && (
          <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/10 px-3 py-2.5 text-xs text-foreground">
            <Icon name="info" className="text-base shrink-0 mt-px" />
            Requisição avulsa: não fica ligada a nenhuma ordem de produção e não altera o estado das OPs.
            O Estoque aprova a saída da mesma forma.
          </div>
        )}

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
          <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">
            <Icon name="error" className="text-base" /> {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}
