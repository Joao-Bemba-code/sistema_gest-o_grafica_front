"use client";

import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirmar eliminação",
  description = "Esta acção não pode ser desfeita.",
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  loading = false,
  icon = "delete_forever",
  tone = "destructive",
  children,
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
          <Icon name={icon} className="text-xl" />
        </span>
        <div className="flex-1 min-w-0 space-y-3">
          <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          {children}
        </div>
      </div>
    </Modal>
  );
}

export { ConfirmDialog };
