"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import { inputCls } from "@/lib/estoque";
import NumeroInput from "@/components/ui/NumeroInput";
import { FormField } from "@/components/ui/FormField";

const formVazio = {
  solicitado_por: "",
  permitido_por: "",
  observacoes: "",
  confirma: false,
};

function materiaisDoOrcamento(op) {
  const orc = op?.orcamentoDados || op?.orcamento;
  const itens = Array.isArray(orc?.orcamento_items) ? orc.orcamento_items : [];
  const mapa = new Map();
  for (const item of itens) {
    const qtdItem = parseInt(item.quantidade, 10) || 0;
    const mats = Array.isArray(item.materiais) ? item.materiais : [];
    for (const mat of mats) {
      const mid = Number(mat.material_id);
      if (!mid) continue;
      const mover = mat.mover_estoque === true || mat.mover_estoque === 1;
      if (!mover) continue;
      const ehToner = mat.tipo_material === "toner";
      const porUnidade = ehToner
        ? Number(mat.quantidade) || 0
        : mat.usar_parcial === true || mat.usar_parcial === 1
          ? Number(mat.quantidade_folhas) || Number(mat.quantidade) || 0
          : Number(mat.quantidade) || 0;
      const qtd = porUnidade * (qtdItem || 1);
      if (qtd > 0) mapa.set(mid, (mapa.get(mid) || 0) + qtd);
    }
  }
  return Array.from(mapa, ([material_id, quantidade]) => ({ material_id, quantidade, lote: null }));
}

export default function SaidaMateriaisModal({ open, op, matPorId, materiais, onClose, onConfirm, nomeUsuario, modo = "requisicao" }) {
  const [passo, setPasso] = useState(1);
  const [form, setForm] = useState(() => ({ ...formVazio, solicitado_por: nomeUsuario || "", permitido_por: nomeUsuario || "" }));
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);
  const reservas = Array.isArray(op?.reserva_estoques) ? op.reserva_estoques : [];
  const [itensExtras, setItensExtras] = useState(() => {
    if (modo === "aprovacao" || reservas.length > 0) return [];
    const sugeridos = materiaisDoOrcamento(op);
    const existentes = new Set(reservas.map((r) => Number(r.material_id)));
    return sugeridos.filter((s) => !existentes.has(Number(s.material_id)));
  });
  const [selMaterial, setSelMaterial] = useState("");
  const [selQtd, setSelQtd] = useState("");
  const [selLote, setSelLote] = useState("");
  const extras = modo === "aprovacao" ? [] : itensExtras.map((i) => ({
    material_id: i.material_id,
    quantidade_reservada: i.quantidade,
    lote: i.lote,
    nome: matPorId?.[i.material_id]?.nome || `Material #${i.material_id}`,
    unidade: matPorId?.[i.material_id]?.unidade || "un",
  }));
  const linhas = [
    ...reservas.map((r) => ({
      ...r,
      nome: matPorId?.[r.material_id]?.nome || `Material #${r.material_id}`,
      unidade: matPorId?.[r.material_id]?.unidade || "un",
    })),
    ...extras,
  ];
  const total = linhas.reduce((acc, l) => acc + (Number(l.quantidade_reservada) || 0), 0);

  const opcoes = Array.isArray(materiais) && materiais.length ? materiais : Object.values(matPorId || {});

  const adicionarExtra = () => {
    const qtd = Number(selQtd);
    const mid = Number(selMaterial);
    if (!mid || !qtd || qtd <= 0) {
      setErro("Selecione o material e indique a quantidade");
      return;
    }
    if (reservas.some((r) => Number(r.material_id) === mid)) {
      setErro("Este material já está reservado nesta OP");
      return;
    }
    if (itensExtras.some((i) => Number(i.material_id) === mid)) {
      setErro("Material já adicionado — edite a quantidade se necessário");
      return;
    }
    setItensExtras([...itensExtras, { material_id: mid, quantidade: qtd, lote: selLote.trim() || null }]);
    setErro("");
    setSelMaterial("");
    setSelQtd("");
    setSelLote("");
  };

  const removerExtra = (idx) => setItensExtras(itensExtras.filter((_, i) => i !== idx));

  const validaPasso1 = () => {
    if (linhas.length === 0) {
      setErro("Adicione pelo menos um material para fazer a requisição no estoque");
      return false;
    }
    if (modo === "aprovacao" && !form.permitido_por.trim()) {
      setErro("Informe quem autoriza a saída no estoque");
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
    if (!form.confirma) { setErro("Confirme a ação para continuar"); return; }
    setErro("");
    setSubmetendo(true);
    const ok = await onConfirm(
      modo === "aprovacao"
        ? {
            permitido_por: form.permitido_por.trim() || nomeUsuario || null,
            observacoes: form.observacoes.trim() || null,
          }
        : {
            solicitado_por: form.solicitado_por.trim() || nomeUsuario || null,
            observacoes: form.observacoes.trim() || null,
            itens_materiais: itensExtras.length ? itensExtras.map((i) => ({ material_id: i.material_id, quantidade: i.quantidade, lote: i.lote })) : undefined,
          }
    );
    setSubmetendo(false);
    if (ok) {
      onClose();
      setForm((f) => ({ ...formVazio, solicitado_por: nomeUsuario || "", permitido_por: nomeUsuario || "" }));
      setItensExtras([]);
      setPasso(1);
    }
  };

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modo === "aprovacao" ? "Aprovar requisição" : "Requisição material"}
      icon="inventory"
      size="lg"
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
            <Button variant={modo === "aprovacao" ? "default" : "destructive"} onClick={confirmar} loading={submetendo}>
              <Icon name={modo === "aprovacao" ? "check_circle" : "send"} className="text-lg" />
              {modo === "aprovacao" ? "Aprovar e libertar" : "Submeter requisição"}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">OP #{op?.id}</p>
                <Badge variant={modo === "aprovacao" ? "warning" : "info"}>{modo === "aprovacao" ? "Aguardando aprovação" : "Requisição"}</Badge>
              </div>
              <p className="text-base font-bold text-foreground">{op?.produto || "—"}</p>
              <p className="text-xs text-muted-foreground">
                Cliente: <strong>{op?.cliente || "—"}</strong> • Quantidade: <strong>{op?.quantidade || "—"}</strong>
              </p>
              {modo === "aprovacao" && (
                <p className="text-xs text-muted-foreground pt-1 border-t border-border/60 mt-1">
                  Solicitado por (produção): <strong className="text-foreground">{op?.solicitado_por || "—"}</strong>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Materiais para saída</p>
              {linhas.length > 0 && (
                <div className="space-y-1.5">
                  {linhas.map((l, i) => (
                    <div key={l.id || `extra-${i}`} className="flex items-center justify-between gap-2 bg-muted/40 rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-foreground truncate">{l.nome}</span>
                        <span className="text-muted-foreground shrink-0">{l.lote ? `Lote ${l.lote}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-muted-foreground">
                          {Number(l.quantidade_reservada).toLocaleString("pt-AO")} {l.unidade}
                          {l.id ? " reservado" : " (novo)"}
                        </span>
                        {!l.id && (
                          <button type="button" onClick={() => removerExtra(i - reservas.length)} className="text-red-500 hover:text-red-700 transition-colors" title="Remover"><Icon name="delete" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {reservas.length === 0 && itensExtras.length === 0 && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  {modo === "aprovacao"
                    ? "Esta OP não tem materiais reservados para aprovar."
                    : "Esta OP ainda não tem materiais reservados. Selecione abaixo os materiais a dar saída — a reserva é criada automaticamente."}
                </p>
              )}
              {modo !== "aprovacao" && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <select value={selMaterial} onChange={(e) => setSelMaterial(e.target.value)} className={`${inputCls} flex-1`}>
                    <option value="">Seleccionar material...</option>
                    {opcoes.map((m) => (
                      <option key={m.id} value={m.id} disabled={m.estoque_disponivel <= 0}>
                        {m.nome} — {m.estoque_disponivel} {m.unidade || "un"} disponível
                      </option>
                    ))}
                  </select>
                  <NumeroInput value={selQtd} onChange={(e) => setSelQtd(e.target.value)} className={`${inputCls} sm:w-32`} placeholder="Qtd." />
                  <input value={selLote} onChange={(e) => setSelLote(e.target.value)} className={`${inputCls} sm:w-40`} placeholder="Lote (opcional)" />
                  <Button type="button" size="sm" onClick={adicionarExtra}><Icon name="add" className="text-lg" /> Adicionar</Button>
                </div>
              )}
              {modo !== "aprovacao" && selMaterial && matPorId?.[Number(selMaterial)]?.percentual_quebra > 0 && (
                <p className="text-[10px] text-amber-600">
                  Quebra técnica de {matPorId[Number(selMaterial)].percentual_quebra}% será adicionada à quantidade.
                </p>
              )}
            </div>

            {modo === "aprovacao" ? (
              <>
                <FormField label="Autorizado por" obrigatorio>
                  <input value={form.permitido_por} onChange={set("permitido_por")} className={inputCls} placeholder="Quem autoriza a saída no estoque" />
                </FormField>
              </>
            ) : (
              <FormField label="Responsável">
                <input value={form.solicitado_por} onChange={set("solicitado_por")} className={inputCls} placeholder="Responsável pela requisição/trabalho" />
              </FormField>
            )}

            <FormField label="Observações">
              <textarea
                rows={2}
                value={form.observacoes}
                onChange={set("observacoes")}
                className={`${inputCls} resize-none`}
                placeholder="Observações da saída..."
              />
            </FormField>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up" key="passo2">
            <div className="obsidian-glass cyber-border rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resumo da {modo === "aprovacao" ? "aprovação" : "requisição"}</p>
              <Linha label="OP" valor={`#${op?.id} — ${op?.produto || "—"}`} />
              <Linha label="Cliente" valor={op?.cliente || "—"} />
              {modo === "aprovacao" ? (
                <Linha label="Autorizado por" valor={form.permitido_por || "—"} />
              ) : (
                <Linha label="Responsável" valor={form.solicitado_por || "—"} />
              )}
              {form.observacoes && <Linha label="Observações" valor={form.observacoes} />}
              <div className="border-t border-border/60 pt-2 space-y-2">
                {linhas.map((l, i) => (
                  <div key={l.id || `extra-${i}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-xs text-foreground truncate">{l.nome}</span>
                    <span className="font-bold text-foreground shrink-0">
                      {Number(l.quantidade_reservada).toLocaleString("pt-AO")} <span className="text-xs text-muted-foreground font-semibold">{l.unidade}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/60 pt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total ({linhas.length} materiais)</span>
                <span className="text-xl font-extrabold text-primary">{total.toLocaleString("pt-AO")} <span className="text-xs text-muted-foreground font-semibold">un</span></span>
              </div>
            </div>

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
                {modo === "aprovacao" ? (
                  <>Confirmo a aprovação e a saída destes <strong>{linhas.length}</strong> materiais do estoque. A OP ficará libertada para produção.</>
                ) : (
                  <>Confirmo o envio da requisição destes <strong>{linhas.length}</strong> materiais ao estoque. A saída só é registada após aprovação.</>
                )}
              </span>
            </label>
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