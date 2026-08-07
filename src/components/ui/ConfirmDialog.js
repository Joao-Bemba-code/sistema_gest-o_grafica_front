"use client";

import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirmar eliminação",
  description = "Esta ação não pode ser desfeita.",
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  loading = false,
  icon = "delete_forever",
  tone = "destructive",
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
          <Icon name="delete_forever" className="text-xl" />
        </span>
        <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </Modal>
  );
}

export { ConfirmDialog };
