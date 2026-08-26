"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import NumeroInput from "@/components/ui/NumeroInput";
import { inputCls, toNum } from "@/lib/estoque";

const motivoPerda = ["Produção", "Armazenamento", "Transporte", "Validade", "Deterioração", "Erro operacional", "Outro"];
const motivoDesperdicio = ["Corte", "Sobra de produção", "Amostra", "Teste de qualidade", "Avaria", "Outro"];

const formVazio = { quantidade: "", motivo: "", detalhes: "", confirma: false };

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

export default function PerdasDesperdicioModal({ open, item, tipo, onClose, onConfirm }) {
  const ehPerda = tipo === "perda";
  const [form, setForm] = useState(formVazio);
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);

  const qtd = Number(form.quantidade) || 0;
  const motivos = ehPerda ? motivoPerda : motivoDesperdicio;

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const confirmar = async () => {
    setErro("");
    if (!qtd || qtd <= 0) return setErro("Informe uma quantidade válida");
    if (!form.motivo) return setErro("Seleccione o motivo");
    if (qtd > toNum(item?.estoque_disponivel)) return setErro("Quantidade excede o disponível");
    if (!form.confirma) return setErro(`Confirme o registo de ${ehPerda ? "perda" : "desperdício"}`);
    setSubmetendo(true);
    const ok = await onConfirm({ tipo, quantidade: qtd, motivo: form.motivo, detalhes: form.detalhes, material_id: item.id });
    setSubmetendo(false);
    if (ok) { setForm(formVazio); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title={ehPerda ? "Registar Perda" : "Registar Desperdício"} icon={ehPerda ? "warning" : "delete_sweep"} size="md"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="destructive" onClick={confirmar} loading={submetendo}>
          <Icon name={ehPerda ? "warning" : "delete_sweep"} className="text-lg" /> Registar {ehPerda ? "Perda" : "Desperdício"}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <div className="bg-muted/50 rounded-xl p-4 border border-border/60">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Material</p>
          <p className="text-base font-bold text-foreground">{item?.nome || "---"}</p>
          <p className="text-xs text-muted-foreground">Disponível: <strong>{toNum(item?.estoque_disponivel).toLocaleString("pt-AO")}</strong> {item?.unidade}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={ehPerda ? "warning" : "destructive"}>{ehPerda ? "Perda" : "Desperdício"}</Badge>
          <span className="text-xs text-muted-foreground">Movimento de saída do estoque</span>
        </div>

        <Campo label="Quantidade" obrigatorio>
          <NumeroInput required value={form.quantidade} onChange={set("quantidade")} className={inputCls} placeholder="0" autoFocus />
        </Campo>

        <Campo label="Motivo" obrigatorio>
          <div className="flex flex-wrap gap-2">
            {motivos.map((m) => (
              <button key={m} type="button" onClick={() => setForm((f) => ({ ...f, motivo: m }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.motivo === m ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/50"}`}>
                {m}
              </button>
            ))}
          </div>
        </Campo>

        {form.motivo === "Outro" && (
          <Campo label="Especificar motivo" obrigatorio>
            <input value={form.detalhes} onChange={set("detalhes")} className={inputCls} placeholder="Descreva o motivo..." />
          </Campo>
        )}

        <Campo label="Observações">
          <textarea rows={2} value={form.observacoes} onChange={set("observacoes")} className={`${inputCls} resize-none`} placeholder="Detalhes adicionais..." />
        </Campo>

        <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${ehPerda ? "border-warning/30 bg-warning/5 hover:bg-warning/10" : "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"}`}>
          <input type="checkbox" checked={form.confirma} onChange={(e) => setForm((f) => ({ ...f, confirma: e.target.checked }))} className="mt-0.5 w-4 h-4 rounded accent-primary" />
          <span className="text-xs text-foreground">
            Confirmo o registo de <strong>{qtd.toLocaleString("pt-AO")} {item?.unidade}</strong> como {ehPerda ? "perda" : "desperdício"}.
          </span>
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
