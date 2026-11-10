"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import FornecedorSelect from "./FornecedorSelect";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls, toNum } from "@/lib/estoque";
import { FormField } from "@/components/ui/FormField";

function ehConsumoInterno(item) {
  return [item?.categoria?.nome, item?.categoria?.tipo].some((v) => String(v || "").toLowerCase().includes("consumo interno"));
}

export default function MovimentacaoModal({ open, item, tipo, onClose, onConfirm, clientes = [], fornecedores = [], nomeUsuario }) {
  const ehEntrada = tipo === "entrada";
  const consumoInterno = ehConsumoInterno(item);
  const [passo, setPasso] = useState(1);
  const [form, setForm] = useState(() => ({
    quantidade: "", fornecedor: consumoInterno && ehEntrada ? "Consumo interno" : "",
    cliente: "", tipo_requisicao: consumoInterno ? "interna" : "cliente", destino: "", motivo: "",
    solicitado_por: nomeUsuario || "", permitido_por: "", lote: "", validade: "", observacoes: "", confirma: false,
  }));
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);
  const interna = !ehEntrada && form.tipo_requisicao === "interna";
  const qtd = Number(form.quantidade);
  const parte = ehEntrada ? form.fornecedor : interna ? form.destino : form.cliente;
  const projetado = useMemo(() => Math.max(0, toNum(item?.estoque_disponivel) + (ehEntrada ? 1 : -1) * (Number.isFinite(qtd) ? qtd : 0)), [item, qtd, ehEntrada]);
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value, confirma: false }));

  const validar = () => {
    if (!Number.isFinite(qtd) || qtd <= 0) return "Indique uma quantidade válida.";
    if (!String(parte).trim()) return ehEntrada ? "Indique o fornecedor." : interna ? "Indique o destino ou sector da requisição interna." : "Indique o cliente da saída.";
    if (interna && !form.motivo.trim()) return "Indique o motivo da requisição interna.";
    if (interna && !form.solicitado_por.trim()) return "Indique o responsável pela requisição.";
    if (!ehEntrada && qtd > toNum(item?.estoque_disponivel)) return "A quantidade excede o stock disponível.";
    return "";
  };
  const avancar = () => {
    const mensagem = validar();
    setErro(mensagem);
    if (!mensagem) setPasso(2);
  };
  const confirmar = async () => {
    if (submetendo) return;
    const mensagem = validar();
    if (mensagem) { setErro(mensagem); setPasso(1); return; }
    if (!ehEntrada && !form.confirma) { setErro("Confirme a saída para continuar."); return; }
    setErro("");
    setSubmetendo(true);
    try {
      const ok = await onConfirm({ ...form, cliente: interna ? "" : form.cliente.trim(), destino: interna ? form.destino.trim() : "" });
      if (ok) onClose();
    } catch {
      setErro("Não foi possível registar. Verifique a ligação e tente novamente.");
    } finally { setSubmetendo(false); }
  };

  return (
    <Modal open={open} onClose={() => { if (!submetendo) onClose(); }} title={ehEntrada ? "Registar entrada" : "Baixa de stock"} icon={ehEntrada ? "add" : "remove"} size="md"
      footer={<>
        <Button variant="outline" disabled={submetendo} onClick={passo === 1 ? onClose : () => { setPasso(1); setErro(""); }}>{passo === 1 ? "Cancelar" : "Voltar"}</Button>
        {passo === 1 ? <Button onClick={avancar}>Rever dados <Icon name="arrow_forward" /></Button>
          : <Button onClick={confirmar} loading={submetendo}>{ehEntrada ? "Confirmar entrada" : "Confirmar baixa"}</Button>}
      </>}
    >
      <div className="space-y-4">
        <div className="flex gap-2" aria-label="Etapas do registo">
          {["Dados", "Confirmação"].map((label, i) => <span key={label} aria-current={passo === i + 1 ? "step" : undefined} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${passo === i + 1 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}. {label}</span>)}
        </div>
        <div className="h-[400px] max-h-[52vh] overflow-y-auto pr-1 space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="font-semibold text-foreground">{item?.nome || "Material"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Disponível: <strong className="text-foreground">{toNum(item?.estoque_disponivel).toLocaleString("pt-AO")} {item?.unidade}</strong></p>
          </div>
          {passo === 1 ? <>
            {!ehEntrada && <fieldset>
              <legend className="mb-2 text-sm font-medium text-foreground">Tipo de requisição</legend>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: "interna", label: "Interna", icon: "factory", hint: "Uso na empresa" }, { value: "cliente", label: "Para cliente", icon: "person", hint: "Trabalho de um cliente" }].map((opcao) => (
                  <label key={opcao.value} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition-colors ${form.tipo_requisicao === opcao.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                    <input type="radio" name="tipo-requisicao" value={opcao.value} checked={form.tipo_requisicao === opcao.value} onChange={(e) => { setForm((f) => ({ ...f, tipo_requisicao: e.target.value, confirma: false })); setErro(""); }} className="mt-1 accent-primary" />
                    <span><span className="block text-sm font-semibold text-foreground">{opcao.label}</span><span className="mt-1 block text-xs text-muted-foreground">{opcao.hint}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>}
            <FormField label="Quantidade" obrigatorio>
              <NumeroInput required aria-required="true" value={form.quantidade} onChange={set("quantidade")} className={inputCls} placeholder="Ex.: 100" />
            </FormField>
            {interna ? <>
              <FormField label="Destino / sector" obrigatorio><input required maxLength={200} value={form.destino} onChange={set("destino")} className={inputCls} placeholder="Ex.: Administração, manutenção, uso da gráfica" /></FormField>
              <FormField label="Motivo" obrigatorio><input required maxLength={255} value={form.motivo} onChange={set("motivo")} className={inputCls} placeholder="Ex.: Impressão de documentos internos" /></FormField>
            </> : <FormField label={ehEntrada ? "Fornecedor" : "Cliente"} obrigatorio>
              {ehEntrada && consumoInterno ? <div className={`${inputCls} bg-muted`}>Consumo interno</div> : ehEntrada ?
                <FornecedorSelect value={form.fornecedor} onChange={(v) => setForm((f) => ({ ...f, fornecedor: v }))} fornecedores={fornecedores} placeholder="Procurar fornecedor ou escrever novo..." required /> :
                <><input list="clientes-saida-list" required maxLength={200} value={form.cliente} onChange={set("cliente")} className={inputCls} placeholder="Procurar cliente ou escrever novo..." /><datalist id="clientes-saida-list">{clientes.filter((p) => String(p.nome).toLowerCase().includes(form.cliente.toLowerCase())).map((p) => <option key={p.id} value={p.nome} />)}</datalist></>}
            </FormField>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Responsável" obrigatorio={interna}><input required={interna} maxLength={200} value={form.solicitado_por} onChange={set("solicitado_por")} className={inputCls} placeholder="Quem solicita" /></FormField>
              <FormField label="Autorizado por"><input maxLength={200} value={form.permitido_por} onChange={set("permitido_por")} className={inputCls} placeholder="Quem autoriza" /></FormField>
            </div>
            <details className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">Lote, validade e observações</summary>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Lote"><input maxLength={100} value={form.lote} onChange={set("lote")} className={inputCls} /></FormField>
                  <FormField label="Validade"><input type="date" value={form.validade} onChange={set("validade")} className={inputCls} /></FormField>
                </div>
                <FormField label="Observações"><textarea rows={2} value={form.observacoes} onChange={set("observacoes")} className={`${inputCls} resize-none`} /></FormField>
              </div>
            </details>
          </> : <>
            <div className="space-y-3 rounded-xl border border-border p-4">
              <Linha label="Requisição" valor={ehEntrada ? "Entrada" : interna ? "Interna" : "Para cliente"} />
              <Linha label={ehEntrada ? "Fornecedor" : interna ? "Destino / sector" : "Cliente"} valor={parte} />
              <Linha label="Quantidade" valor={`${qtd.toLocaleString("pt-AO")} ${item?.unidade || "un"}`} />
              <Linha label="Responsável" valor={form.solicitado_por || "—"} />
              {form.permitido_por && <Linha label="Autorizado por" valor={form.permitido_por} />}
              {interna && <Linha label="Motivo" valor={form.motivo} />}
              {form.lote && <Linha label="Lote" valor={form.lote} />}
              {form.validade && <Linha label="Validade" valor={form.validade} />}
              {form.observacoes && <Linha label="Observações" valor={form.observacoes} />}
              <div className="flex justify-between gap-3 border-t border-border pt-3"><span className="text-sm text-muted-foreground">Disponível após</span><Badge variant={projetado < toNum(item?.estoque_min) ? "warning" : "success"}>{projetado.toLocaleString("pt-AO")} {item?.unidade}</Badge></div>
            </div>
            {!ehEntrada && <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm"><input type="checkbox" checked={form.confirma} onChange={(e) => setForm((f) => ({ ...f, confirma: e.target.checked }))} className="mt-1 accent-primary" /><span>Confirmo a baixa de <strong>{qtd.toLocaleString("pt-AO")} {item?.unidade}</strong>. O stock será actualizado ao guardar.</span></label>}
          </>}
        </div>
        {erro && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  );
}

function Linha({ label, valor }) {
  return <div className="flex justify-between gap-4 text-sm"><span className="shrink-0 text-muted-foreground">{label}</span><span className="break-words text-right font-medium text-foreground">{valor}</span></div>;
}
