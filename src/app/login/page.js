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
      const destino =
        data.usuario?.perfil === "producao" ? "/producao" : data.usuario?.perfil === "gestao" ? "/vendas" : "/";
      router.push(destino);
    } catch (err) {
      setError(err.response?.data?.erro || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-aurora p-4">
      <div className="w-full max-w-sm">
        <div className="border-gradient rounded-3xl bg-card p-7 sm:p-8 animate-fade-up">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center text-white mb-4">
              <Icon name="precision_manufacturing" className="text-2xl ms-fill" />
            </div>
            <h1 className="text-xl font-black tracking-tight">
              <span className="text-gradient">SIGRAF</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1 text-center">Sistema de Gestão para Indústria Gráfica</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
              <div className="relative">
                <Icon name="person" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-base" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="w-full pl-10 pr-3 h-11 bg-surface-container-high/70 border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                  placeholder="seu.email@exemplo.com"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Senha</label>
              <div className="relative">
                <Icon name="lock" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-base" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setError(""); }}
                  className="w-full pl-10 pr-3 h-11 bg-surface-container-high/70 border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-2.5 flex items-center gap-2 animate-pop">
                <Icon name="warning" className="text-error text-sm shrink-0" />
                <p className="text-xs text-error font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-brand hover:brightness-110 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Icon name="logout" className="text-base rotate-180" />
              {loading ? "A entrar..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
