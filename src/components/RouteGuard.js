"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { podeAtual } from "@/lib/permissoes";

// Mapeia os caminhos da aplicação para (módulo, ação) exigidos.
// O primeiro prefixo que corresponder define a permissão necessária.
// `permOu` permite alternativas (ex.: Compras acessível com estoque OU compras).
const rotasProtegidas = [
  { prefixo: "/vendas", perm: ["comercial", "ver"] },
  { prefixo: "/tesouraria", perm: ["tesouraria", "ver"], permOu: [["financeiro", "ver"]] },
  { prefixo: "/orcamentos", perm: ["comercial", "ver"] },
  { prefixo: "/clientes", perm: ["comercial", "ver"], permOu: [["compras", "ver"]] },
  { prefixo: "/faturacao", perm: ["faturacao", "ver"], permOu: [["financeiro", "ver"]] },
  { prefixo: "/producao", perm: ["producao", "ver"] },
  { prefixo: "/pre-impressao", perm: ["producao", "ver"] },
  { prefixo: "/impressao", perm: ["producao", "ver"] },
  { prefixo: "/acabamento", perm: ["producao", "ver"] },
  { prefixo: "/qualidade", perm: ["producao", "ver"] },
  { prefixo: "/estoque", perm: ["estoque", "ver"] },
  { prefixo: "/compras", perm: ["estoque", "ver"], permOu: [["compras", "ver"]] },
  { prefixo: "/categorias", perm: ["categorias", "ver"] },
  { prefixo: "/maquinas", perm: ["maquinas", "ver"] },
  { prefixo: "/patrimonio", perm: ["patrimonio", "ver"] },
  { prefixo: "/relatorios", perm: ["relatorios", "ver"] },
  { prefixo: "/configuracoes", perm: ["configuracao", "ver"] },
  { prefixo: "/utilizadores", perm: ["utilizadores", "ver"] },
];

export default function RouteGuard({ children }) {
  const { autenticado, carregando } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const passaRegra = (regra) => {
    if (podeAtual(...regra.perm)) return true;
    return !!(regra.permOu && regra.permOu.some((p) => podeAtual(...p)));
  };

  useEffect(() => {
    if (carregando) return;
    if (!autenticado) {
      router.replace("/login");
      return;
    }
    if (pathname === "/") return;
    const regra = rotasProtegidas.find((r) => pathname.startsWith(r.prefixo));
    if (regra && !passaRegra(regra)) {
      router.replace("/");
    }
  }, [autenticado, carregando, router, pathname]);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!autenticado) return null;

  if (pathname !== "/") {
    const regra = rotasProtegidas.find((r) => pathname.startsWith(r.prefixo));
    if (regra && !passaRegra(regra)) return null;
  }

  return children;
}
