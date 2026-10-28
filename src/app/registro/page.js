"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { registrar } from "@/services/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const campoCls =
  "flex h-11 w-full rounded-lg border border-input bg-background py-2 pr-3.5 pl-10 text-sm text-foreground " +
  "placeholder:text-muted-foreground/60 transition-all duration-200 ease-in-out " +
  "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function mensagemDeErro(err) {
  const status = err?.response?.status;
  const doBackend = err?.response?.data?.erro;
  if (status === 429) return doBackend || "Demasiadas tentativas. Aguarde uns minutos.";
  if (status === 409) return doBackend || "Já existe uma conta com este email.";
  if (!err?.response) return "Não foi possível falar com o servidor. Verifique a ligação.";
  return doBackend || "Não foi possível criar a conta. Tente novamente.";
}

export default function RegistroPage() {
  const router = useRouter();
  const { setUsuario } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const [empresa, setEmpresa] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);

  const entrar = (usuario) => {
    setUsuario(usuario);
    router.replace(usuario?.perfil === "producao" ? "/producao" : "/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErro(null);
    if (empresa.trim().length < 2) return setErro("Indique o nome da empresa.");
    if (!nome.trim()) return setErro("Indique o seu nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro("Email inválido.");
    if (senha.length < 8) return setErro("A senha deve ter pelo menos 8 caracteres.");

    setLoading(true);
    try {
      const data = await registrar({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        organizacao_nome: empresa.trim(),
      });
      entrar(data.usuario);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden lg:flex flex-col overflow-hidden bg-muted/40 border-r border-border p-10 xl:p-14">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Icon name="precision_manufacturing" className="text-xl ms-fill" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-none tracking-tight text-foreground">KAMGEST</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Gestão de Gráfica</p>
          </div>
        </div>

        <div className="my-auto max-w-md py-10">
          <p className="text-xs font-medium text-primary">Comece agora</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground leading-tight">
            Crie a conta da sua empresa.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            Cada empresa tem os seus dados isolados. O primeiro utilizador fica como
            administrador e pode convidar a equipa depois.
          </p>
          <ul className="mt-8 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2.5">
              <Icon name="check_circle" className="text-base text-primary" />
              Dados separados por empresa
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="check_circle" className="text-base text-primary" />
              Entrada segura com email e senha
            </li>
            <li className="flex items-center gap-2.5">
              <Icon name="check_circle" className="text-base text-primary" />
              Pronto para facturação certificada
            </li>
          </ul>
        </div>

        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} KAMGEST — Sistema de Gestão para Indústria Gráfica
        </p>
      </aside>

      <main className="relative flex min-h-screen lg:min-h-0 items-center justify-center bg-background px-4 py-10 sm:px-8">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
          title={dark ? "Tema claro" : "Tema escuro"}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-ring-soft"
        >
          <Icon name={dark ? "light_mode" : "dark_mode"} className="text-lg" />
        </button>

        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Icon name="precision_manufacturing" className="text-2xl ms-fill" />
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground">KAMGEST</p>
            <p className="mt-1 text-xs text-muted-foreground">Sistema de Gestão para Indústria Gráfica</p>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Criar conta</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Registe a sua empresa para começar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="reg-empresa" className="form-label">Empresa</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon name="business" className="text-lg" />
                </span>
                <input
                  id="reg-empresa"
                  type="text"
                  value={empresa}
                  onChange={(e) => { setEmpresa(e.target.value); setErro(null); }}
                  className={campoCls}
                  placeholder="Nome da gráfica"
                  autoComplete="organization"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reg-nome" className="form-label">O seu nome</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon name="person" className="text-lg" />
                </span>
                <input
                  id="reg-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => { setNome(e.target.value); setErro(null); }}
                  className={campoCls}
                  placeholder="Nome completo"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reg-email" className="form-label">Email</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon name="mail" className="text-lg" />
                </span>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErro(null); }}
                  className={campoCls}
                  placeholder="seu.email@exemplo.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reg-senha" className="form-label">Senha</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon name="lock" className="text-lg" />
                </span>
                <input
                  id="reg-senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErro(null); }}
                  className={`${campoCls} pr-12`}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-ring-soft"
                >
                  <Icon name={mostrarSenha ? "visibility_off" : "visibility"} className="text-lg" />
                </button>
              </div>
            </div>

            {erro && (
              <div role="alert" aria-live="assertive" className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-error">
                <Icon name="error" className="text-base shrink-0 mt-px" />
                <p className="text-xs font-medium leading-relaxed">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-medium rounded-lg flex items-center justify-center gap-2 focus-ring-soft transition-colors"
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  A criar…
                </>
              ) : (
                <>
                  <Icon name="person_add" className="text-base" />
                  Criar conta
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>

          <p className="mt-8 text-center text-[11px] text-muted-foreground lg:hidden">
            © {new Date().getFullYear()} KAMGEST — Sistema de Gestão para Indústria Gráfica
          </p>
        </div>
      </main>
    </div>
  );
}
