"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { verificarSessaoSuporte } from "@/services/suporte";

// Bloqueia o grupo de rotas (suporte) a contas de suporte autenticadas.
// A sessão é validada junto do servidor (cookie HttpOnly ou token em
// sessão antiga); tokens do SIGRAF nunca são aceites nesta área.
export default function SuporteGuard({ children }) {
  const router = useRouter();
  const [estado, setEstado] = useState("a-verificar");

  useEffect(() => {
    let activo = true;
    verificarSessaoSuporte().then((ok) => {
      if (!activo) return;
      if (ok) setEstado("ok");
      else router.replace("/suporte/login");
    });
    return () => { activo = false; };
  }, [router]);

  if (estado !== "ok") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <span className="spinner" aria-hidden="true" />
      </div>
    );
  }

  return children;
}
