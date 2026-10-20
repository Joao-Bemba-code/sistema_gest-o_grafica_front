"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { login, isAutenticadoSuporte } from "@/services/suporte";
import { useTheme } from "@/contexts/ThemeContext";
import { LuShield } from "react-icons/lu";

function mensagemDeErro(err) {
  const status = err?.response?.status;
  const doBackend = err?.response?.data?.erro;
  if (status === 429) return doBackend || "Demasiadas tentativas. Aguarde uns minutos.";
  if (status === 401 || status === 400) return doBackend || "Email ou senha incorretos.";
  if (!err?.response) return "Não foi possível falar com o servidor. Verifique a ligação.";
  return doBackend || "Não foi possível iniciar sessão.";
}

const campoCls =
  "flex h-11 w-full rounded-lg border border-input bg-background py-2 pr-3.5 pl-10 text-sm text-foreground " +
  "placeholder:text-muted-foreground/60 transition-all duration-200 ease-in-out " +
  "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export default function SuporteLoginPage() {
  const router = useRouter();
  const { dark, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAutenticadoSuporte()) router.replace("/suporte");
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErro(null);

    if (!email.trim() || !senha) {
      setErro("Preencha o email e a senha para continuar.");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), senha);
      router.replace("/suporte");
    } catch (err) {
      setErro(mensagemDeErro(err));
      setSenha("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
        title={dark ? "Tema claro" : "Tema escuro"}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon name={dark ? "light_mode" : "dark_mode"} className="text-lg" />
      </button>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <LuShield className="h-6 w-6" />
          </div>
          <p className="text-xl font-bold tracking-tight text-foreground">KAMGEST · Suporte</p>
          <p className="mt-1 text-xs text-muted-foreground">Consola de suporte técnico</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-modal">
          <div className="mb-5">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Entrar na consola</h1>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Área restrita — apenas para a equipa de suporte técnico.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="suporte-email" className="text-xs font-medium text-muted-foreground">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon name="person" className="text-lg" />
                </span>
                <input
                  id="suporte-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErro(null); }}
                  className={campoCls}
                  placeholder="suporte@exemplo.com"
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="suporte-senha" className="text-xs font-medium text-muted-foreground">
                Senha
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon name="lock" className="text-lg" />
                </span>
                <input
                  id="suporte-senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErro(null); }}
                  className={`${campoCls} pr-12`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Icon name={mostrarSenha ? "visibility_off" : "visibility"} className="text-lg" />
                </button>
              </div>
            </div>

            {erro && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 animate-msg-in">
                <Icon name="error" className="mt-px shrink-0 text-base text-error" />
                <p className="text-xs font-medium leading-relaxed text-error">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  A entrar…
                </>
              ) : (
                <>
                  <Icon name="login" className="text-base" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Sessões são registadas para auditoria. Contas de suporte não acedem ao sistema dos clientes.
        </p>
      </div>
    </div>
  );
}
