"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAutenticadoSuporte } from "@/services/suporte";

// Bloqueia o grupo de rotas (suporte) a contas de suporte autenticadas.
// Qualquer token do SIGRAF (chaves "sigraf_token") é ignorado aqui.
export default function SuporteGuard({ children }) {
  const router = useRouter();
  const [estado, setEstado] = useState("a-verificar");

  useEffect(() => {
    if (isAutenticadoSuporte()) {
      setEstado("ok");
    } else {
      router.replace("/suporte/login");
    }
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
