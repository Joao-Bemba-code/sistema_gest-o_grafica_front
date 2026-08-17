"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import DesktopConfig from "@/components/DesktopConfig";
import { login } from "@/services/auth";
import { desktopDisponivel, estadoOffline, ligarServidor, loginServidor, SERVIDOR_PADRAO } from "@/services/offline";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { setUsuario } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ligado, setLigado] = useState(() => (desktopDisponivel() ? null : true));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!desktopDisponivel()) return;
    let activo = true;
    estadoOffline()
      .then((s) => {
        if (activo) setLigado(!!(s && s.org_id));
      })
      .catch(() => {
        if (activo) setLigado(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const entrar = async (emailLogin, senhaLogin) => {
    const data = await login(emailLogin, senhaLogin);
    setUsuario(data.usuario);
    router.push("/");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (desktopDisponivel() && ligado === false) {
        // Primeiro acesso neste computador: valida contra o servidor real.
        await ligarServidor({ url: SERVIDOR_PADRAO, email, senha });
        await entrar(email, senha);
        return;
      }
      try {
        await entrar(email, senha);
      } catch (err) {
        // Credenciais desconhecidas neste computador: pode ser o primeiro
        // acesso deste utilizador — valida online e regista localmente.
        if (desktopDisponivel() && err.response?.status === 401) {
          await loginServidor({ email, senha });
          await entrar(email, senha);
          return;
        }
        throw err;
      }
    } catch (err) {
      setError(err.response?.data?.erro || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-aurora p-4">
      <div className="w-full max-w-sm">
        <div className="border-gradient rounded-3xl bg-card/90 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/40 p-7 sm:p-8 animate-fade-up">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-brand glow-brand flex items-center justify-center text-white mb-4">
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

          <p className="text-[11px] text-muted-foreground text-center mt-6">
            Use as credenciais da sua conta
          </p>
          {desktopDisponivel() && ligado === false && (
            <p className="text-[10px] text-muted-foreground/70 text-center mt-2">
              Primeiro acesso neste computador: precisa de internet para validar a conta no servidor.
            </p>
          )}
        </div>
      </div>
      <DesktopConfig />
    </div>
  );
}
