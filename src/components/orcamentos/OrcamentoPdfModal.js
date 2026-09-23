"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import gerarOrcamentoPdf from "@/lib/orcamentoPdf";

const OPCOES_INICIAIS = {
  mostrarQtd: true,
  mostrarPrecoUnit: true,
  mostrarTotalItem: true,
  mostrarMateriais: true,
  mostrarMob: true,
  mostrarPrazo: true,
  mostrarDuracao: true,
  mostrarValorHora: true,
  mostrarTotalServico: true,
};

const GRUPO_ITENS = [
  { chave: "mostrarQtd", label: "Quantidade" },
  { chave: "mostrarPrecoUnit", label: "Preço Unitário" },
  { chave: "mostrarTotalItem", label: "Total do item" },
];

const GRUPO_SERVICOS = [
  { chave: "mostrarMob", label: "Trabalhadores" },
  { chave: "mostrarPrazo", label: "Prazo" },
  { chave: "mostrarDuracao", label: "Duração" },
  { chave: "mostrarValorHora", label: "Valor/Hora" },
  { chave: "mostrarTotalServico", label: "Total do serviço" },
];

function LinhaOpcao({ label, checado, onToggle }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checado}
        onChange={onToggle}
        className="w-4 h-4 accent-primary"
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

export default function OrcamentoPdfModal({ open, orcamento, empresa = {}, onClose }) {
  const { addToast } = useToast();
  const [opcoes, setOpcoes] = useState(OPCOES_INICIAIS);

  const alternar = (chave) => setOpcoes((p) => ({ ...p, [chave]: !p[chave] }));

  const gerar = async () => {
    try {
      await gerarOrcamentoPdf(orcamento, empresa || {}, opcoes);
      onClose();
    } catch {
      addToast("Erro ao gerar PDF", "error");
    }
  };

  return (
    <Modal open={Boolean(open)} onClose={onClose} title="Gerar PDF — colunas do orçamento" icon="picture_as_pdf" size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={gerar}><Icon name="picture_as_pdf" className="text-[16px]" /> Gerar PDF</Button>
      </>}>
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Artigos / Produtos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
            {GRUPO_ITENS.map((it) => (
              <LinhaOpcao key={it.chave} label={it.label} checado={opcoes[it.chave]} onToggle={() => alternar(it.chave)} />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Materiais da composição</h3>
          <div className="pl-1">
            <LinhaOpcao label="Mostrar tabela de materiais" checado={opcoes.mostrarMateriais} onToggle={() => alternar("mostrarMateriais")} />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Serviços</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
            {GRUPO_SERVICOS.map((it) => (
              <LinhaOpcao key={it.chave} label={it.label} checado={opcoes[it.chave]} onToggle={() => alternar(it.chave)} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}