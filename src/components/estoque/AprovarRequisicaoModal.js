"use client";

// Aprovação de uma requisição de material no Estoque.
// Antes era um clique e o material saía; agora fica registado quem preparou,
// quem entregou, quem recebeu e a data/hora da saída, porque é isso que se
// pede numa conferência física de stock.
import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/Icon";
import SugestaoSelect from "@/components/ui/SugestaoSelect";
import { inputCls } from "@/lib/estoque";

const pad = (n) => String(n).padStart(2, "0");
const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const agora = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ROTULOS = {
  preparado_por: "Quem preparou",
  entregue_por: "Quem entregou",
  recebido_por: "Quem recebeu",
  data: "Data",
  hora: "Hora",
};

export default function AprovarRequisicaoModal({
  open,
  requisicao,
  nomeUsuario = "",
  sugestoes = [],
  onClose,
  onConfirm,
}) {
  // O pai monta este modal com uma `key` nova a cada abertura: por isso os
  // valores por defeito (hoje, agora, o nome de quem está ligado) vivem no
  // estado inicial e não precisam de um efeito a resetar o formulário.
  const [form, setForm] = useState(() => ({
    preparado_por: nomeUsuario || "",
    entregue_por: "",
    // Quem pediu o material costuma ser quem o recebe na produção.
    recebido_por: requisicao?.solicitado_por || "",
    data: hoje(),
    hora: agora(),
  }));
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const faltam = [
    !form.preparado_por.trim() && "preparado_por",
    !form.entregue_por.trim() && "entregue_por",
    !form.recebido_por.trim() && "recebido_por",
    !/^\d{4}-\d{2}-\d{2}$/.test(form.data) && "data",
    !/^\d{2}:\d{2}$/.test(form.hora) && "hora",
  ].filter(Boolean);

  // O fecho é decisão de quem chama: só fecha depois de a aprovação ter dado certo.
  const aoConfirmar = async () => {
    if (faltam.length) return;
    setEnviando(true);
    try {
      await onConfirm?.(requisicao, {
        preparado_por: form.preparado_por.trim(),
        entregue_por: form.entregue_por.trim(),
        recebido_por: form.recebido_por.trim(),
        data: form.data,
        hora: form.hora,
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!enviando) onClose?.(); }}
      title={`Aprovar requisição ${requisicao?.numero || ""}`}
      icon="check_circle"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onClose?.()} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="success" onClick={aoConfirmar} loading={enviando} disabled={Boolean(faltam.length)}>
            <Icon name="check" className="text-base" /> Aprovar e dar saída
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {requisicao?.ordem_producao_numero ? `OP ${requisicao.ordem_producao_numero} · ` : ""}
          {requisicao?.cliente_nome || "Consumo interno"} · {requisicao?.total_itens ?? (requisicao?.itens || []).length} material(is).
          Ao aprovar, o stock baixa imediatamente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Quem preparou *</span>
            <SugestaoSelect
              id="aprovacao-preparou"
              value={form.preparado_por}
              opcoes={sugestoes}
              onChange={(v) => mudar("preparado_por", v)}
              placeholder="Nome de quem preparou..."
              icon="inventory_2"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Quem entregou *</span>
            <SugestaoSelect
              id="aprovacao-entregou"
              value={form.entregue_por}
              opcoes={sugestoes}
              onChange={(v) => mudar("entregue_por", v)}
              placeholder="Nome de quem fez a entrega..."
              icon="handshake"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Quem recebeu *</span>
            <SugestaoSelect
              id="aprovacao-recebeu"
              value={form.recebido_por}
              opcoes={sugestoes}
              onChange={(v) => mudar("recebido_por", v)}
              placeholder="Nome de quem recebeu o material..."
              icon="person"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Data *</span>
            <input type="date" value={form.data} onChange={(e) => mudar("data", e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Hora *</span>
            <input type="time" value={form.hora} onChange={(e) => mudar("hora", e.target.value)} className={inputCls} />
          </div>
        </div>

        {Boolean(faltam.length) && (
          <p className="text-[11px] text-warning">
            Preenche {faltam.map((c) => ROTULOS[c].toLowerCase()).join(", ")} para poderes aprovar.
          </p>
        )}
      </div>
    </Modal>
  );
}
