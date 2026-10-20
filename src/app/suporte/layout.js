"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import SuporteGuard from "@/components/suporte/SuporteGuard";
import SuporteSidebar from "@/components/suporte/SuporteSidebar";
import { ToastProvider } from "@/components/Toast";
import { useTheme } from "@/contexts/ThemeContext";
import Icon from "@/components/Icon";
import { listarAcessos } from "@/services/suporte";
import {
  LuMenu,
  LuHouse,
  LuSearch,
  LuShield,
  LuBell,
  LuMessageSquare,
  LuSend,
  LuX,
  LuTriangleAlert,
} from "react-icons/lu";

const TITULOS = {
  "/suporte": "Resumo",
  "/suporte/organizacoes": "Organizações",
  "/suporte/acessos": "Acessos",
  "/suporte/configuracoes": "Configurações",
};

function Breadcrumbs({ caminho }) {
  const partes = caminho.split("/").filter(Boolean);
  const rotas = [];
  let acumulado = "";
  for (const p of partes) {
    acumulado += "/" + p;
    rotas.push({ href: acumulado, nome: TITULOS[acumulado] || p });
  }

  return (
    <nav aria-label="breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 flex-nowrap items-center gap-1.5 text-sm text-muted-foreground">
        <li className="inline-flex min-w-0 items-center gap-1 max-md:hidden">
          <Link href="/suporte" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <LuHouse className="size-3.5 text-muted-foreground" />
            <span className="hidden md:block">Home</span>
          </Link>
        </li>
        <li className="max-md:hidden">/</li>
        {rotas.map((r, i) => (
          <li key={r.href} className={i < rotas.length - 1 ? "inline-flex min-w-0 items-center gap-1 max-md:hidden" : "min-w-0"}>
            {i > 0 && i < rotas.length && <span className="max-md:hidden">/</span>}
            <span
              className={
                i === rotas.length - 1
                  ? "truncate font-normal text-foreground"
                  : "truncate font-normal text-muted-foreground"
              }
            >
              {r.nome}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function PainelNotificacoes({ aberto, onFechar }) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!aberto) return;
    let activo = true;
    setCarregando(true); setErro(null);
    listarAcessos({ so_sucessos: "0", limite: 8 })
      .then((d) => { if (activo) { setItens(d.itens || []); setErro(null); } })
      .catch(() => { if (activo) setErro("Não foi possível carregar as notificações."); })
      .finally(() => { if (activo) setCarregando(false); });
    return () => { activo = false; };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onFechar} />
      <div className="absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-modal">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <span className="text-sm font-semibold text-foreground">Notificações</span>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <LuX className="size-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {carregando ? (
            <div className="flex flex-col gap-2 p-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : erro ? (
            <p className="px-3.5 py-4 text-xs text-destructive">{erro}</p>
          ) : itens.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3.5 py-8 text-center">
              <LuShield className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sem falhas de login recentes.</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {itens.map((a, i) => (
                <li key={a.id} className={`flex items-start gap-2.5 px-3.5 py-2.5 ${i < itens.length - 1 ? "border-b border-border/60" : ""}`}>
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-destructive/15 bg-destructive/10 text-destructive">
                    <LuTriangleAlert className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-foreground">Login falhou — {a.email}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {a.createdAt ? new Date(a.createdAt).toLocaleString("pt-PT") : "—"}
                      {a.ip ? ` · ${a.ip}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border p-2">
          <Link
            href="/suporte/acessos"
            onClick={onFechar}
            className="flex h-8 w-full items-center justify-center rounded-lg border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Ver todos os acessos
          </Link>
        </div>
      </div>
    </>
  );
}

function CaixaMensagens({ aberto, onFechar }) {
  const [mensagens, setMensagens] = useState([
    {
      id: 1,
      de: "sistema",
      texto: "Bem-vindo à caixa de mensagens do suporte. As mensagens desta sessão são locais — use o email de contacto da organização para acompanhar os pedidos.",
      hora: "agora",
    },
  ]);
  const [texto, setTexto] = useState("");
  const fimRef = useRef(null);

  useEffect(() => { fimRef.current?.scrollIntoView({ block: "nearest" }); }, [mensagens, aberto]);

  if (!aberto) return null;

  const enviar = (e) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setMensagens((v) => [...v, { id: Date.now(), de: "eu", texto: t, hora: new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) }]);
    setTexto("");
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onFechar} />
      <div className="absolute top-full right-0 z-50 mt-2 flex w-80 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-modal">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <span className="text-sm font-semibold text-foreground">Mensagens</span>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <LuX className="size-4" />
          </button>
        </div>

        <div className="flex max-h-72 min-h-40 flex-col gap-2.5 overflow-y-auto p-3.5">
          {mensagens.map((m) => (
            <div key={m.id} className={`flex ${m.de === "eu" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  m.de === "eu"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-muted text-foreground"
                }`}
              >
                <p className="break-words">{m.texto}</p>
                <span className={`mt-1 block text-[10px] ${m.de === "eu" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {m.hora}
                </span>
              </div>
            </div>
          ))}
          <div ref={fimRef} />
        </div>

        <form onSubmit={enviar} className="flex items-center gap-2 border-t border-border p-2.5">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escrever mensagem…"
            aria-label="Escrever mensagem"
            className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-3 focus:ring-ring/50"
          />
          <button
            type="submit"
            disabled={!texto.trim()}
            aria-label="Enviar mensagem"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/80 disabled:opacity-50"
          >
            <LuSend className="size-4" />
          </button>
        </form>
      </div>
    </>
  );
}

export default function SuporteLayout({ children }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [recolhida, setRecolhida] = useState(false);
  const [sinoAberto, setSinoAberto] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);
  const [semNotificacoes, setSemNotificacoes] = useState(false);
  const caminho = usePathname();
  const emLogin = caminho === "/suporte/login";
  const { dark, toggleTheme } = useTheme();

  useEffect(() => {
    const guardado = localStorage.getItem("sigraf-suporte-sidebar") === "recolhida";
    setRecolhida(guardado);
  }, []);

  // Não pedir dados protegidos no ecrã de login: a chamada ia sem token,
  // recebia 401 e o interceptor do axios apagava a sessão de suporte
  // (impedindo o técnico de voltar a entrar).
  useEffect(() => {
    if (emLogin) return;
    listarAcessos({ so_sucessos: "0", limite: 1 })
      .then((d) => setSemNotificacoes((d.total || 0) > 0))
      .catch(() => {});
  }, [emLogin, caminho]);

  const alternarSidebar = () => {
    setRecolhida((v) => {
      const next = !v;
      localStorage.setItem("sigraf-suporte-sidebar", next ? "recolhida" : "aberta");
      return next;
    });
  };

  if (emLogin) return children;

  return (
    <SuporteGuard>
      <ToastProvider>
        <div className="flex min-h-dvh w-full bg-background">
          <SuporteSidebar className="hidden md:flex" recolhida={recolhida} />

          {/* Grip para recolher/expandir a barra lateral */}
          <button
            type="button"
            onClick={alternarSidebar}
            aria-label={recolhida ? "Expandir barra lateral" : "Recolher barra lateral"}
            title={recolhida ? "Expandir barra" : "Recolher barra"}
            className="group/rail fixed top-1/2 z-30 hidden h-12 w-7 -translate-y-1/2 cursor-pointer items-center pl-2 outline-none transition-[left] duration-200 ease-linear md:flex"
            style={{ left: recolhida ? 52 : 250 }}
          >
            <span className="flex flex-col items-center">
              <span className="block h-2 w-0.5 rounded-t-full bg-foreground/40 origin-bottom transition-all duration-100 ease-linear group-hover/rail:rotate-40 group-hover/rail:bg-foreground/60" />
              <span className="block h-2 w-0.5 rounded-b-full bg-foreground/40 origin-top transition-all duration-100 ease-linear group-hover/rail:-rotate-40 group-hover/rail:bg-foreground/60" />
            </span>
            <span className="pointer-events-none absolute left-full -ml-2 -translate-x-0.5 rounded-md border border-border bg-foreground px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-background opacity-0 shadow-xs transition-all duration-200 ease-out group-hover/rail:translate-x-0 group-hover/rail:opacity-100">
              {recolhida ? "Expandir" : "Recolher"}
            </span>
          </button>

          {menuAberto && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden"
                onClick={() => setMenuAberto(false)}
              />
              <div className="fixed inset-y-0 left-0 z-50 md:hidden">
                <SuporteSidebar className="flex h-full" onFechar={() => setMenuAberto(false)} />
              </div>
            </>
          )}

          <div className="relative flex min-w-0 flex-1 flex-col bg-background">
            <header className="sticky top-0 z-30 flex h-12 w-full shrink-0 items-center border-b border-border bg-background px-4">
              <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMenuAberto(true)}
                    aria-label="Abrir menu"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground md:hidden"
                  >
                    <LuMenu className="size-4" />
                  </button>
                  <Breadcrumbs caminho={caminho} />
                </div>

                <div className="relative flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label="Pesquisar"
                    className="hidden h-8 w-64 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground lg:w-80 md:flex"
                  >
                    <LuSearch className="size-3.5 opacity-60" />
                    <span>Pesquisar ou saltar para…</span>
                    <kbd className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none">
                      ⌘K
                    </kbd>
                  </button>

                  <span className="hidden h-4 w-px bg-border md:block" />

                  {/* Caixa de mensagens */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setChatAberto((v) => !v); setSinoAberto(false); }}
                      aria-label="Mensagens"
                      aria-expanded={chatAberto}
                      className={`inline-flex size-8 items-center justify-center rounded-lg border border-transparent bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground [&_svg]:opacity-60 hover:[&_svg]:opacity-100 ${chatAberto ? "bg-muted text-foreground" : ""}`}
                    >
                      <LuMessageSquare className="size-4" />
                    </button>
                    <CaixaMensagens aberto={chatAberto} onFechar={() => setChatAberto(false)} />
                  </div>

                  {/* Sino de notificações */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setSinoAberto((v) => !v); setChatAberto(false); }}
                      aria-label={semNotificacoes ? "Notificações, com novas" : "Notificações"}
                      aria-expanded={sinoAberto}
                      className={`relative inline-flex size-8 items-center justify-center rounded-lg border border-transparent bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground [&_svg]:opacity-60 hover:[&_svg]:opacity-100 ${sinoAberto ? "bg-muted text-foreground" : ""}`}
                    >
                      <LuBell className="size-4" />
                      {semNotificacoes && (
                        <span className="absolute top-0.5 right-1 size-1.5 rounded-full bg-primary" aria-hidden="true" />
                      )}
                    </button>
                    <PainelNotificacoes aberto={sinoAberto} onFechar={() => setSinoAberto(false)} />
                  </div>

                  <span className="hidden h-4 w-px bg-border sm:block" />

                  <span className="hidden items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground sm:flex">
                    <LuShield className="size-3.5 text-primary" />
                    Área restrita
                  </span>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
                    title={dark ? "Tema claro" : "Tema escuro"}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                  >
                    <Icon name={dark ? "light_mode" : "dark_mode"} className="text-base" />
                  </button>
                </div>
              </div>
            </header>

            <main className="flex flex-1 flex-col gap-4 p-4">
              <div className="@container mx-auto flex w-full max-w-7xl flex-col gap-5 text-foreground">
                <div key={caminho} className="flex flex-col gap-4 sm:gap-5 animate-page-fade">{children}</div>
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </SuporteGuard>
  );
}
