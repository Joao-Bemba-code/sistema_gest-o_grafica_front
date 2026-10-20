"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/Icon";

// Mostra credenciais recém-geradas uma única vez.
// A API nunca volta a devolver a senha — o suporte tem de a copiar aqui.
export default function CredenciaisModal({ open, onClose, credenciais, titulo = "Credenciais criadas" }) {
  const [copiado, setCopiado] = useState(null);

  const copiar = async (texto, chave) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 1600);
    } catch {
      setCopiado(null);
    }
  };

  const copiarTudo = async () => {
    if (!credenciais) return;
    await copiar(`Email: ${credenciais.email}\nSenha: ${credenciais.senha}`, "tudo");
  };

  const linha = (rotulo, valor, chave) => (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground">{rotulo}</p>
        <p className="mt-0.5 truncate font-mono text-sm text-foreground">{valor}</p>
      </div>
      <button
        type="button"
        onClick={() => copiar(valor, chave)}
        className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {copiado === chave ? "Copiado" : "Copiar"}
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={titulo} icon="key" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-3 text-warning">
          <Icon name="warning" className="mt-0.5 shrink-0 text-base" />
          <p className="text-xs font-medium leading-relaxed">
            Guarde estas credenciais agora — <strong>a senha não volta a ser mostrada</strong>. Envie-as ao
            cliente por um canal seguro.
          </p>
        </div>

        {credenciais && (
          <div className="space-y-2.5">
            {linha("Email", credenciais.email, "email")}
            {linha("Senha", credenciais.senha, "senha")}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={copiarTudo}>
            <Icon name="content_copy" className="text-base" />
            Copiar tudo
          </Button>
          <Button size="sm" onClick={onClose}>
            Guardei
          </Button>
        </div>
      </div>
    </Modal>
  );
}
