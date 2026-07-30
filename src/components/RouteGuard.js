"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function RouteGuard({ children }) {
  const { autenticado, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !autenticado) {
      router.replace("/login");
    }
  }, [autenticado, carregando, router]);

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

  return children;
}
