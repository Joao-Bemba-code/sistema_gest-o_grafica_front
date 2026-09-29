"use client";

import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";

/**
 * Diálogo exibido ao aprovar um orçamento: deixa o utilizador escolher se
 * quer apenas aprovar ou também enviar para produção (cria a OP).
 * onConfirmar recebe `true` para "aprovar e enviar" e `false` para "só aprovar".
 */
export default function AprovarOrcamentoDialog({ open, orcamento, onClose, onConfirmar, carregando = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Aprovar Orçamento"
      icon="task_alt"
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={carregando}>
            Cancelar
          </Button>
          <Button type="button" variant="outline" onClick={() => onConfirmar(false)} disabled={carregando} loading={carregando}>
            Só Aprovar
          </Button>
          <Button type="button" onClick={() => onConfirmar(true)} disabled={carregando} loading={carregando}>
            <Icon name="factory" className="text-[16px]" /> Aprovar e Enviar para Produção
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name="task_alt" className="text-xl" />
        </span>
        <div className="flex-1 min-w-0 space-y-3">
          <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">
            O orçamento <span className="font-semibold text-foreground">{orcamento?.numero || orcamento?.id}</span> será
            marcado como aprovado.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Deseja também enviá-lo já para produção? Se escolher apenas aprovar, pode enviar mais tarde
            através do botão <span className="font-semibold text-foreground">Enviar para Produção</span> nos detalhes do orçamento.
          </p>
        </div>
      </div>
    </Modal>
  );
}
