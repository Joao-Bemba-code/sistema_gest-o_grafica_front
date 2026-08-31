"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { podeAtual } from "@/lib/permissoes";

// Mapeia os caminhos da aplicação para (módulo, ação) exigidos.
// O primeiro prefixo que corresponder define a permissão necessária.
const rotasProtegidas = [
  { prefixo: "/vendas", perm: ["comercial", "ver"] },
  { prefixo: "/orcamentos", perm: ["comercial", "ver"] },
  { prefixo: "/clientes", perm: ["comercial", "ver"] },
  { prefixo: "/faturacao", perm: ["faturacao", "ver"] },
  { prefixo: "/producao", perm: ["producao", "ver"] },
  { prefixo: "/pre-impressao", perm: ["producao", "ver"] },
  { prefixo: "/impressao", perm: ["producao", "ver"] },
  { prefixo: "/acabamento", perm: ["producao", "ver"] },
  { prefixo: "/qualidade", perm: ["producao", "ver"] },
  { prefixo: "/estoque", perm: ["estoque", "ver"] },
  { prefixo: "/categorias", perm: ["categorias", "ver"] },
  { prefixo: "/maquinas", perm: ["maquinas", "ver"] },
  { prefixo: "/relatorios", perm: ["relatorios", "ver"] },
  { prefixo: "/configuracoes", perm: ["configuracao", "ver"] },
  { prefixo: "/utilizadores", perm: ["utilizadores", "ver"] },
];

export default function RouteGuard({ children }) {
  const { autenticado, carregando } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (carregando) return;
    if (!autenticado) {
      router.replace("/login");
      return;
    }
    if (pathname === "/") return;
    const regra = rotasProtegidas.find((r) => pathname.startsWith(r.prefixo));
    if (regra && !podeAtual(...regra.perm)) {
      router.replace("/");
    }
  }, [autenticado, carregando, router, pathname]);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-500">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!autenticado) return null;

  if (pathname !== "/") {
    const regra = rotasProtegidas.find((r) => pathname.startsWith(r.prefixo));
    if (regra && !podeAtual(...regra.perm)) return null;
  }

  return children;
}
