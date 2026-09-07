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
        <div className="border-gradient rounded-xl bg-card p-7 sm:p-8 animate-fade-up">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-4">
              <Icon name="precision_manufacturing" className="text-xl ms-fill" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
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
                  className="w-full pl-10 pr-3 h-11 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all placeholder:text-muted-foreground/50"
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
                  className="w-full pl-10 pr-3 h-11 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all placeholder:text-muted-foreground/50"
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
              className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="logout" className="text-base" />
              {loading ? "A entrar..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
