"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import SuporteGuard from "@/components/suporte/SuporteGuard";
import SuporteSidebar from "@/components/suporte/SuporteSidebar";
import { ToastProvider } from "@/components/Toast";
import { useTheme } from "@/contexts/ThemeContext";
import Icon from "@/components/Icon";
import { listarAcessos, getSuporte, logout } from "@/services/suporte";
import { cn, getInitials } from "@/lib/utils";
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
  LuPanelLeftClose,
  LuPanelLeft,
  LuChevronDown,
  LuLogOut,
  LuSettings,
} from "react-icons/lu";

const TITULOS = {
  "/suporte": "Resumo",
  "/suporte/organizacoes": "Organizações",
  "/suporte/acessos": "Acessos",
  "/suporte/configuracoes": "Configurações",
};

function MarcaSuporte() {
  return (
    <svg className="h-full w-full" fill="none" viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0H20V32H0V0Z" fill="#EE2A24" />
      <path d="M20 0H40V32H20V0Z" fill="#0066FF" />
      <path d="M0 16L20 0V32L0 16Z" fill="#FFB800" />
      <path d="M20 0C25 10 35 15 40 16C35 20 25 22 20 32V0Z" fill="#0047AB" opacity="0.75" />
    </svg>
  );
}

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
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [semNotificacoes, setSemNotificacoes] = useState(false);
  const caminho = usePathname();
  const emLogin = caminho === "/suporte/login";
  const { dark, toggleTheme } = useTheme();
  const utilizador = getSuporte();

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
            style={{ left: recolhida ? 60 : 240 }}
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
            <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center border-b border-border bg-card px-3 sm:px-4">
              <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMenuAberto(true)}
                    aria-label="Abrir menu"
                    className="-ml-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                  >
                    <LuMenu className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={alternarSidebar}
                    aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
                    title={recolhida ? "Expandir menu" : "Recolher menu"}
                    className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
                  >
                    {recolhida ? <LuPanelLeft className="size-[18px]" /> : <LuPanelLeftClose className="size-[18px]" />}
                  </button>

                  <span className="hidden min-w-0 items-center gap-2.5 border-r border-border pr-4 sm:flex">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                      <MarcaSuporte />
                    </span>
                    <span className="hidden leading-none lg:flex">
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black tracking-tight text-foreground">KAMGEST</span>
                        <span className="text-base font-bold text-muted-foreground">1.0</span>
                      </span>
                      <span className="mt-1 block text-[10px] font-semibold tracking-tight text-muted-foreground">
                        Consola de suporte
                      </span>
                    </span>
                  </span>

                  <Breadcrumbs caminho={caminho} />
                </div>

                <div className="relative flex shrink-0 items-center gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    aria-label="Pesquisar"
                    className="hidden h-9 w-64 items-center rounded-lg border border-border bg-muted/50 pl-9 pr-3 text-left text-xs text-muted-foreground transition-colors hover:border-outline-variant hover:bg-card md:flex lg:w-80"
                  >
                    <LuSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    Pesquisar na consola...
                  </button>
                  <button
                    type="button"
                    aria-label="Pesquisar"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                  >
                    <LuSearch className="size-[18px]" />
                  </button>

                  <span className="hidden h-6 w-px bg-border sm:block" />

                  {/* Caixa de mensagens */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setChatAberto((v) => !v); setSinoAberto(false); setPerfilAberto(false); }}
                      aria-label="Mensagens"
                      aria-expanded={chatAberto}
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        chatAberto && "bg-muted text-foreground"
                      )}
                    >
                      <LuMessageSquare className="size-[18px]" />
                    </button>
                    <CaixaMensagens aberto={chatAberto} onFechar={() => setChatAberto(false)} />
                  </div>

                  {/* Sino de notificações */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setSinoAberto((v) => !v); setChatAberto(false); setPerfilAberto(false); }}
                      aria-label={semNotificacoes ? "Notificações, com novas" : "Notificações"}
                      aria-expanded={sinoAberto}
                      className={cn(
                        "relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        sinoAberto && "bg-muted text-foreground"
                      )}
                    >
                      <LuBell className="size-[18px]" />
                      {semNotificacoes && (
                        <span className="absolute top-1 right-1 size-2 rounded-full border-2 border-card bg-error" aria-hidden="true" />
                      )}
                    </button>
                    <PainelNotificacoes aberto={sinoAberto} onFechar={() => setSinoAberto(false)} />
                  </div>

                  <span className="hidden h-6 w-px bg-border sm:block" />

                  <span className="hidden items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground lg:flex">
                    <LuShield className="size-3.5 text-primary" />
                    Área restrita
                  </span>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
                    title={dark ? "Tema claro" : "Tema escuro"}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Icon name={dark ? "light_mode" : "dark_mode"} className="text-base" />
                  </button>

                  {/* Perfil do técnico de suporte */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setPerfilAberto((v) => !v); setSinoAberto(false); setChatAberto(false); }}
                      aria-expanded={perfilAberto}
                      aria-haspopup="menu"
                      className="flex select-none items-center gap-2 rounded-lg border-l border-border py-1 pl-2 pr-1.5 transition-colors hover:bg-muted"
                    >
                      <span className="flex size-8 items-center justify-center rounded-full bg-[#0b2447] text-xs font-bold tracking-wide text-white">
                        {getInitials(utilizador?.nome)}
                      </span>
                      <span className="hidden flex-col text-left leading-tight xl:flex">
                        <span className="text-xs font-bold leading-tight text-foreground">{utilizador?.nome || "Suporte"}</span>
                        <span className="text-[10px] leading-tight text-muted-foreground">
                          {utilizador?.email || "Sessão ativa"}
                        </span>
                      </span>
                      <LuChevronDown className="ml-0.5 size-4 text-muted-foreground" />
                    </button>

                    {perfilAberto && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setPerfilAberto(false)} />
                        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-dropdown">
                          <div className="border-b border-border px-4 py-3">
                            <p className="truncate text-sm font-semibold text-foreground">{utilizador?.nome || "Suporte"}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {utilizador?.email || "Sessão ativa"}
                            </p>
                          </div>
                          <div className="p-1.5">
                            <Link
                              href="/suporte/configuracoes"
                              onClick={() => setPerfilAberto(false)}
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <LuSettings className="size-4" /> Configurações
                            </Link>
                            <button
                              type="button"
                              onClick={toggleTheme}
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <Icon name={dark ? "light_mode" : "dark_mode"} className="text-base" />
                              {dark ? "Tema claro" : "Tema escuro"}
                            </button>
                            <button
                              type="button"
                              onClick={logout}
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-error/10"
                            >
                              <LuLogOut className="size-4" /> Sair
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </header>

            <main className="flex flex-1 flex-col p-4 sm:p-5 lg:p-6">
              <div className="@container mx-auto flex w-full max-w-[1500px] flex-col gap-5 text-foreground">
                <div key={caminho} className="flex flex-col gap-4 sm:gap-5 animate-page-fade">{children}</div>
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </SuporteGuard>
  );
}
