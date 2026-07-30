"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { login } from "@/services/auth";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { setUsuario } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, senha);
      setUsuario(data.usuario);
      router.push("/");
    } catch (err) {
      setError(err.response?.data?.erro || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container dark:from-surface-dim to-surface-container p-4">
      <div className="w-full max-w-sm bg-surface-container dark:bg-surface-container rounded-2xl shadow-xl border border-outline-variant p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-md mb-4">
            <Icon name="print" className="text-2xl" />
          </div>
          <h1 className="text-xl font-bold text-on-surface tracking-tight">SIGRAF</h1>
          <p className="text-xs text-on-surface-variant mt-1">Sistema de Gestão para Indústria Gráfica</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Email</label>
            <div className="relative">
              <Icon name="person" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full pl-9 pr-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-on-surface-variant"
                placeholder="Digite o email"
                autoFocus
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Palavra-passe</label>
            <div className="relative">
              <Icon name="settings" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base" />
              <input
                type="password"
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setError(""); }}
                className="w-full pl-9 pr-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-on-surface-variant"
                placeholder="Digite a palavra-passe"
              />
            </div>
          </div>

          {error && (
            <div className="bg-error-container/10 border border-error/30 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <Icon name="warning" className="text-error text-sm" />
              <p className="text-xs text-error font-medium">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2">
            <Icon name="logout" className="text-sm rotate-180" />
            {loading ? "A entrar..." : "Entrar"}
          </button>
        </form>

        <p className="text-[10px] text-on-surface-variant text-center mt-6">
          Use o email e senha da sua conta
        </p>
      </div>
    </div>
  );
}