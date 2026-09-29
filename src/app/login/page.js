"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { login } from "@/services/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const DESTAQUES = [
  { icone: "request_quote", titulo: "Orçamentos e facturação", descricao: "Do pedido do cliente à factura, sem duplicar dados." },
  { icone: "factory", titulo: "Produção e ordens", descricao: "Ordens com requisição e saída de materiais controlada." },
  { icone: "inventory_2", titulo: "Stock em tempo real", descricao: "Reservas, consumos e reposição sempre actualizados." },
  { icone: "insights", titulo: "Indicadores e relatórios", descricao: "Decisões suportadas em dados do dia-a-dia." },
];

// O backend responde com 429 quando a conta ou o IP esgotam as tentativas.
// Distinguir os casos evita mostrar "credenciais inválidas" quando o problema
// é outro — era a maior fonte de confusão no ecrã de entrada.
function mensagemDeErro(err) {
  const status = err?.response?.status;
  const doBackend = err?.response?.data?.erro;
  if (status === 429) return { texto: doBackend || "Demasiadas tentativas. Aguarde uns minutos antes de tentar outra vez.", tom: "aviso" };
  if (status === 401 || status === 400) return { texto: doBackend || "Email ou senha incorretos.", tom: "erro" };
  if (status === 403) return { texto: doBackend || "A sua conta está desactivada. Contacte a administração.", tom: "aviso" };
  if (!err?.response) return { texto: "Não foi possível falar com o servidor. Verifique a ligação e tente novamente.", tom: "erro" };
  return { texto: doBackend || "Não foi possível iniciar sessão. Tente novamente.", tom: "erro" };
}

// Só utilitárias do Tailwind, à partida de `Input.js`. Não usar `.form-input`
// aqui: a regra define `padding` no globals.css e, por estar declarada depois
// das utilitárias com a mesma especificidade, anula o `pl-10` — o texto do input
// encosta ao ícone.
const campoCls =
  "flex h-11 w-full rounded-xl border border-input bg-background py-2 pr-3.5 pl-10 text-sm text-foreground " +
  "placeholder:text-muted-foreground/60 transition-all duration-200 ease-in-out " +
  "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export default function LoginPage() {
  const router = useRouter();
  const { setUsuario } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErro(null);

    if (!email.trim() || !senha) {
      setErro({ texto: "Preencha o email e a senha para continuar.", tom: "erro" });
      return;
    }

    setLoading(true);
    try {
      const data = await login(email.trim(), senha);
      setUsuario(data.usuario);
      const destino =
        data.usuario?.perfil === "producao" ? "/producao" : data.usuario?.perfil === "gestao" ? "/vendas" : "/";
      router.replace(destino);
    } catch (err) {
      setErro(mensagemDeErro(err));
      setSenha("");
    } finally {
      setLoading(false);
    }
  };

  const tomDoErro =
    erro?.tom === "aviso"
      ? "bg-warning/10 border-warning/30 text-warning"
      : "bg-error/10 border-error/30 text-error";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca */}
      <aside className="relative hidden lg:flex flex-col overflow-hidden gradient-hero p-10 xl:p-14">
        <span className="wave-overlay" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-brand text-primary-foreground">
            <Icon name="precision_manufacturing" className="text-2xl ms-fill" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-none tracking-tight text-foreground">SIGRAF</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Gestão de Gráfica</p>
          </div>
        </div>

        <div className="relative my-auto max-w-md py-10">
          <p className="text-caption text-primary">Sistema integrado de gestão</p>
          <h2 className="mt-4 text-headline-md text-foreground">
            Toda a sua gráfica,
            <br />
            num só sistema.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            Orçamentos, produção, stock e facturação ligados em tempo real — do pedido à entrega final.
          </p>

          <ul className="mt-8 space-y-2.5">
            {DESTAQUES.map((d) => (
              <li key={d.titulo} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 p-3.5">
                <span className="chip-icon-grad h-9 w-9 shrink-0">
                  <Icon name={d.icone} className="text-lg" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{d.titulo}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{d.descricao}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} SIGRAF — Sistema de Gestão para Indústria Gráfica
        </p>
      </aside>

      {/* Formulário */}
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
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl gradient-brand text-primary-foreground">
              <Icon name="precision_manufacturing" className="text-2xl ms-fill" />
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground">SIGRAF</p>
            <p className="mt-1 text-xs text-muted-foreground">Sistema de Gestão para Indústria Gráfica</p>
          </div>

          <div className="mb-7">
            <h1 className="text-headline-sm text-foreground">Bem-vindo de volta</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Entre com as suas credenciais para aceder ao sistema.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="login-email" className="form-label">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon name="person" className="text-lg" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErro(null); }}
                  className={campoCls}
                  placeholder="seu.email@exemplo.com"
                  autoComplete="email"
                  autoFocus
                  aria-invalid={!!erro}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="login-senha" className="form-label">
                Senha
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon name="lock" className="text-lg" />
                </span>
                <input
                  id="login-senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErro(null); }}
                  className={`${campoCls} pr-12`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!erro}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={mostrarSenha}
                  title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-ring-soft"
                >
                  <Icon name={mostrarSenha ? "visibility_off" : "visibility"} className="text-lg" />
                </button>
              </div>
            </div>

            {erro && (
              <div role="alert" aria-live="assertive" className={`flex items-start gap-2 rounded-xl border px-4 py-3 animate-msg-in ${tomDoErro}`}>
                <Icon name={erro.tom === "aviso" ? "schedule" : "error"} className="text-base shrink-0 mt-px" />
                <p className="text-xs font-medium leading-relaxed">{erro.texto}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 gradient-brand hover:opacity-90 disabled:opacity-60 text-primary-foreground text-sm font-semibold rounded-xl flex items-center justify-center gap-2 focus-ring-soft transition-opacity"
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

          <p className="mt-8 text-center text-[11px] text-muted-foreground lg:hidden">
            © {new Date().getFullYear()} SIGRAF — Sistema de Gestão para Indústria Gráfica
          </p>
        </div>
      </main>
    </div>
  );
}
