"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import FornecedorSelect from "./FornecedorSelect";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls, toNum } from "@/lib/estoque";

const formVazio = {
  quantidade: "",
  fornecedor: "",
  cliente: "",
  solicitado_por: "",
  permitido_por: "",
  lote: "",
  validade: "",
  observacoes: "",
  confirma: false,
};

function Campo({ label, children, obrigatorio }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label} {obrigatorio && <span className="text-destructive" aria-hidden="true">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function MovimentacaoModal({ open, item, tipo, onClose, onConfirm, clientes, fornecedores, nomeUsuario }) {
  const ehEntrada = tipo === "entrada";
  const [passo, setPasso] = useState(1);
  const [form, setForm] = useState(() => ({ ...formVazio, solicitado_por: nomeUsuario || "" }));
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);

  const qtd = Number(form.quantidade) || 0;
  const parte = ehEntrada ? form.fornecedor : form.cliente;

  const projetado = useMemo(() => {
    const disp = toNum(item?.estoque_disponivel);
    return Math.max(0, ehEntrada ? disp + qtd : disp - qtd);
  }, [item, qtd, ehEntrada]);

  const validaPasso1 = () => {
    if (!qtd || qtd <= 0) { setErro("Informe uma quantidade válida"); return false; }
    if (!parte) { setErro(ehEntrada ? "Informe o fornecedor da entrada" : "Informe o cliente da saída"); return false; }
    if (!ehEntrada && qtd > toNum(item?.estoque_disponivel)) {
      setErro("A quantidade excede o disponível em estoque");
      return false;
    }
    return true;
  };

  const avancar = () => {
    setErro("");
    if (validaPasso1()) setPasso(2);
  };

  const voltar = () => {
    setErro("");
    setPasso(1);
  };

  const confirmar = async () => {
    if (!ehEntrada && !form.confirma) { setErro("Confirme a saída para continuar"); return; }
    setErro("");
    setSubmetendo(true);
    const ok = await onConfirm(form);
    setSubmetendo(false);
    if (ok) onClose();
  };

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Registrar ${ehEntrada ? "Entrada" : "Saída"}`}
      icon={ehEntrada ? "add" : "remove"}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={passo === 1 ? onClose : voltar}>
            {passo === 1 ? "Cancelar" : "Voltar"}
          </Button>
          {passo === 1 ? (
            <Button onClick={avancar}>
              <Icon name="arrow_forward" className="text-lg" /> Continuar
            </Button>
          ) : (
            <Button variant={ehEntrada ? "default" : "destructive"} onClick={confirmar} loading={submetendo}>
              {ehEntrada ? "Confirmar Entrada" : "Registar Saída"}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Indicador de passos */}
        <div className="flex items-center gap-2" role="group" aria-label="Progresso do formulário">
          {[
            { n: 1, label: "Dados" },
            { n: 2, label: "Confirmação" },
          ].map((s) => (
            <div key={s.n} className="flex-1" aria-current={passo === s.n ? "step" : undefined}>
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${passo >= s.n ? "gradient-brand" : "bg-muted"}`}
              />
              <p className={`mt-1.5 text-[10px] font-bold uppercase tracking-widest ${passo === s.n ? "text-primary" : "text-muted-foreground"}`}>
                {s.n}. {s.label}
              </p>
            </div>
          ))}
        </div>

        {passo === 1 ? (
          <div className="space-y-4 animate-slide-up" key="passo1">
            <div className="bg-muted/50 rounded-xl p-4 space-y-1 border border-border/60">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Material</p>
              <p className="text-base font-bold text-foreground">{item?.nome || "—"}</p>
              <p className="text-xs text-muted-foreground">
                Atual: <strong>{toNum(item?.quantidade).toLocaleString("pt-AO")}</strong> • Disponível:{" "}
                <strong>{toNum(item?.estoque_disponivel).toLocaleString("pt-AO")}</strong> {item?.unidade}
              </p>
            </div>

            <Campo label="Quantidade" obrigatorio>
              <NumeroInput
                required
                aria-required="true"
                value={form.quantidade}
                onChange={set("quantidade")}
                className={inputCls}
                placeholder="Ex: 100"
                autoFocus
              />
            </Campo>

            <Campo label={ehEntrada ? "Fornecedor" : "Cliente"} obrigatorio>
              {ehEntrada ? (
                <FornecedorSelect
                  value={form.fornecedor}
                  onChange={(v) => setForm((f) => ({ ...f, fornecedor: v }))}
                  fornecedores={fornecedores}
                  placeholder="Procurar fornecedor ou escrever novo..."
                  required
                />
              ) : (
                <select
                  required
                  aria-required="true"
                  value={parte}
                  onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((p) => (
                    <option key={p.id} value={p.nome}>{p.nome}</option>
                  ))}
                </select>
              )}
            </Campo>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Responsável">
                <input value={form.solicitado_por} onChange={set("solicitado_por")} className={inputCls} placeholder="Responsável pela impressão/trabalho" />
              </Campo>
              <Campo label="Autorizado por">
                <input value={form.permitido_por} onChange={set("permitido_por")} className={inputCls} placeholder="Quem autoriza a saída no estoque" />
              </Campo>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Lote">
                <input value={form.lote} onChange={set("lote")} className={inputCls} placeholder="Ex: LOTE-2026-01" />
              </Campo>
              <Campo label="Validade">
                <input type="date" value={form.validade} onChange={set("validade")} className={inputCls} />
              </Campo>
            </div>

            <Campo label="Observações">
              <textarea
                rows={2}
                value={form.observacoes}
                onChange={set("observacoes")}
                className={`${inputCls} resize-none`}
                placeholder="Observações da movimentação..."
              />
            </Campo>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up" key="passo2">
            <div className="obsidian-glass cyber-border rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resumo da movimentação</p>
              <Linha label="Material" valor={item?.nome || "—"} />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo</span>
                <Badge variant={ehEntrada ? "success" : "destructive"}>{ehEntrada ? "Entrada" : "Saída"}</Badge>
              </div>
              <Linha label="Quantidade" valor={`${qtd.toLocaleString("pt-AO")} ${item?.unidade || "un"}`} />
              <Linha label={ehEntrada ? "Fornecedor" : "Cliente"} valor={parte || "—"} />
              <Linha label="Responsável" valor={form.solicitado_por || "—"} />
              <Linha label="Autorizado por" valor={form.permitido_por || "—"} />
              {form.observacoes && <Linha label="Observações" valor={form.observacoes} />}
              <div className="border-t border-border/60 pt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Disponível após</span>
                <span className={`text-xl font-extrabold ${!ehEntrada && projetado < toNum(item?.ponto_ressuprimento || item?.estoque_min) ? "text-destructive" : "text-primary"}`}>
                  {projetado.toLocaleString("pt-AO")} <span className="text-xs text-muted-foreground font-semibold">{item?.unidade}</span>
                </span>
              </div>
            </div>

            {!ehEntrada && (
              <label className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3 cursor-pointer transition-all hover:bg-warning/10">
                <input
                  type="checkbox"
                  checked={form.confirma}
                  required
                  aria-required="true"
                  onChange={(e) => setForm((f) => ({ ...f, confirma: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded accent-primary"
                />
                <span className="text-xs text-foreground">
                  Confirmo a saída de <strong>{qtd.toLocaleString("pt-AO")} {item?.unidade}</strong> do estoque.
                </span>
              </label>
            )}
          </div>
        )}

        {erro && (
          <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-3 py-2.5 animate-msg-in">
            <Icon name="error" className="text-base" /> {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}

function Linha({ label, valor }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-foreground text-right">{valor}</span>
    </div>
  );
}
