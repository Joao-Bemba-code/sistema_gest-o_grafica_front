"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Badge, Frame, FramePanel, BotaoPrimario, BotaoVariante } from "@/components/suporte/ui";
import { useTheme } from "@/contexts/ThemeContext";
import { getSuporte, logout, obterResumo, totpEstado, totpGerar, totpConfirmar, totpDesactivar } from "@/services/suporte";
import { LuSun, LuMoon, LuLogOut, LuInfo, LuActivity, LuShield, LuKeyRound, LuCopy, LuCheck, LuSmartphone } from "react-icons/lu";

function LinhaInfo({ rotulo, valor }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{valor || "—"}</dd>
    </div>
  );
}

export default function SuporteConfiguracoesPage() {
  const { dark, toggleTheme } = useTheme();
  const utilizador = getSuporte();
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState(null);

  const [totpActivo, setTotpActivo] = useState(false);
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpCodigo, setTotpCodigo] = useState("");
  const [totpSenha, setTotpSenha] = useState("");
  const [totpMsg, setTotpMsg] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [aCarregarTotp, setACarregarTotp] = useState(false);

  useEffect(() => {
    obterResumo().then(setResumo).catch((e) => setErro(e?.response?.data?.erro || "Não foi possível carregar o estado do sistema."));
    totpEstado().then((d) => setTotpActivo(!!d?.activo)).catch(() => {});
  }, []);

  const iniciarTotp = async () => {
    setACarregarTotp(true); setTotpMsg(null);
    try {
      const d = await totpGerar();
      setTotpSetup(d);
      setTotpCodigo("");
    } catch (e) {
      setTotpMsg({ tipo: "erro", texto: e?.response?.data?.erro || "Não foi possível gerar o código." });
    } finally { setACarregarTotp(false); }
  };

  const confirmarTotp = async () => {
    setACarregarTotp(true); setTotpMsg(null);
    try {
      await totpConfirmar(totpCodigo.trim());
      setTotpActivo(true); setTotpSetup(null); setTotpCodigo("");
      setTotpMsg({ tipo: "ok", texto: "Verificação em dois passos activada." });
    } catch (e) {
      setTotpMsg({ tipo: "erro", texto: e?.response?.data?.erro || "Código inválido." });
    } finally { setACarregarTotp(false); }
  };

  const desactivarTotp = async () => {
    setACarregarTotp(true); setTotpMsg(null);
    try {
      await totpDesactivar(totpSenha);
      setTotpActivo(false); setTotpSenha("");
      setTotpMsg({ tipo: "ok", texto: "Verificação em dois passos desactivada." });
    } catch (e) {
      setTotpMsg({ tipo: "erro", texto: e?.response?.data?.erro || "Não foi possível desactivar." });
    } finally { setACarregarTotp(false); }
  };

  const copiarSegredo = async () => {
    if (!totpSetup?.segredo) return;
    try {
      await navigator.clipboard.writeText(totpSetup.segredo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Caixa de mensagem informativa */}
      <FramePanel className="flex items-start gap-3 border-info/25 bg-info/10 px-4 py-3.5">
        <span className="mt-px flex size-7 shrink-0 items-center justify-center rounded-lg border border-info/20 bg-info/10 text-info">
          <LuInfo className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Consola de suporte técnico — ambiente restrito</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            As alterações desta página afectam apenas a sessão de suporte em curso. As contas de suporte não acedem
            aos dados dos clientes e todas as acções ficam registadas para auditoria.
          </p>
        </div>
      </FramePanel>

      {erro && (
        <FramePanel className="flex items-center gap-2 border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <Icon name="error" className="shrink-0 text-base" />
          {erro}
        </FramePanel>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        {/* Aparência */}
        <Frame titulo="Aparência" descricao="Tema desta consola." label="Aparência">
          <FramePanel className="p-3.5">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => { if (dark) toggleTheme(); }}
                aria-pressed={!dark}
                className={`flex min-w-32 flex-1 flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  !dark
                    ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/30"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <LuSun className="size-5" />
                <span className="text-sm font-medium">Claro</span>
              </button>
              <button
                type="button"
                onClick={() => { if (!dark) toggleTheme(); }}
                aria-pressed={dark}
                className={`flex min-w-32 flex-1 flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  dark
                    ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/30"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                <LuMoon className="size-5" />
                <span className="text-sm font-medium">Escuro</span>
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              A escolha é guardada neste navegador e aplicada a todas as páginas da consola.
            </p>
          </FramePanel>
        </Frame>

        {/* Conta */}
        <Frame titulo="Conta" descricao="A sessão de suporte em curso." label="Conta">
          <FramePanel className="p-3.5">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <LinhaInfo rotulo="Nome" valor={utilizador?.nome} />
              <LinhaInfo rotulo="Email" valor={utilizador?.email} />
              <LinhaInfo rotulo="Perfil" valor="Suporte técnico" />
              <LinhaInfo rotulo="Sessão" valor="Cookie seguro (HttpOnly, 8 horas)" />
            </dl>
            <div className="mt-4 flex justify-end">
              <BotaoVariante onClick={logout}>
                <LuLogOut className="size-4" />
                Terminar sessão
              </BotaoVariante>
            </div>
          </FramePanel>
        </Frame>

        {/* Verificação em dois passos (2FA) */}
        <Frame titulo="Verificação em dois passos" descricao="Código extra no login, gerado por uma app de autenticação." label="2FA">
          <FramePanel className="flex flex-col gap-3.5 p-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant={totpActivo ? "success" : "default"}>
                <LuShield className="size-3" />
                {totpActivo ? "Activada" : "Não activada"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {totpActivo
                  ? "Cada login pede um código de 6 dígitos da app de autenticação."
                  : "Recomendada — protege a consola mesmo se a senha for descoberta."}
              </span>
            </div>

            {totpMsg && (
              <p className={`rounded-lg border px-3 py-2 text-xs ${totpMsg.tipo === "ok" ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
                {totpMsg.texto}
              </p>
            )}

            {!totpActivo && !totpSetup && (
              <div className="flex justify-start">
                <BotaoPrimario onClick={iniciarTotp} disabled={aCarregarTotp}>
                  <LuSmartphone className="size-4" />
                  {aCarregarTotp ? "A gerar…" : "Activar"}
                </BotaoPrimario>
              </div>
            )}

            {!totpActivo && totpSetup && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs font-medium text-foreground">1. Adicione esta chave à sua app de autenticação</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    (Google Authenticator, Microsoft Authenticator, Authy…)
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground">
                      {totpSetup.segredo}
                    </code>
                    <button
                      type="button"
                      onClick={copiarSegredo}
                      aria-label="Copiar chave"
                      title="Copiar chave"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {copiado ? <LuCheck className="size-4 text-success" /> : <LuCopy className="size-4" />}
                    </button>
                  </div>
                  <a
                    href={totpSetup.uri}
                    className="mt-2 inline-block break-all text-[11px] text-primary underline-offset-2 hover:underline"
                  >
                    Abrir ligação otpauth no telemóvel
                  </a>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="totp-codigo" className="text-xs font-medium text-foreground">
                    2. Confirme com o código de 6 dígitos gerado
                  </label>
                  <input
                    id="totp-codigo"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totpCodigo}
                    onChange={(e) => setTotpCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="h-10 w-40 rounded-lg border border-input bg-background px-3 text-center font-mono text-base tracking-[0.4em] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-3 focus:ring-ring/50"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <BotaoPrimario onClick={confirmarTotp} disabled={aCarregarTotp || totpCodigo.length !== 6}>
                    <LuShieldCheck className="size-4" />
                    {aCarregarTotp ? "A confirmar…" : "Confirmar e activar"}
                  </BotaoPrimario>
                  <BotaoVariante onClick={() => { setTotpSetup(null); setTotpCodigo(""); }} disabled={aCarregarTotp}>
                    Cancelar
                  </BotaoVariante>
                </div>
              </div>
            )}

            {totpActivo && (
              <div className="flex flex-col gap-2.5">
                <label htmlFor="totp-senha" className="text-xs font-medium text-foreground">
                  Senha da conta (para confirmar a desactivação)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="totp-senha"
                    type="password"
                    autoComplete="current-password"
                    value={totpSenha}
                    onChange={(e) => setTotpSenha(e.target.value)}
                    className="h-9 w-56 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-3 focus:ring-ring/50"
                  />
                  <BotaoVariante onClick={desactivarTotp} disabled={aCarregarTotp || !totpSenha}>
                    <LuKeyRound className="size-4" />
                    Desactivar
                  </BotaoVariante>
                </div>
              </div>
            )}
          </FramePanel>
        </Frame>
      </div>

      {/* Sistema */}
      <Frame titulo="Sistema" descricao="Estado global lido em tempo real." label="Sistema">
        <FramePanel className="p-3.5">
          {!resumo ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { rotulo: "Organizações", valor: resumo.organizacoes.total, extra: `${resumo.organizacoes.ativas} activas` },
                { rotulo: "Utilizadores", valor: resumo.utilizadores.total, extra: `${resumo.utilizadores.ativos} activos` },
                { rotulo: "Logins (7 dias)", valor: resumo.acessos7d.sucesso, extra: "com sucesso" },
                { rotulo: "Falhas (7 dias)", valor: resumo.acessos7d.falhas, extra: resumo.acessos7d.falhas > 0 ? "a requerer atenção" : "tudo normal" },
              ].map((b) => (
                <div key={b.rotulo} className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-background p-3">
                  <span className="truncate text-xs font-medium text-muted-foreground">{b.rotulo}</span>
                  <span className="text-xl font-semibold tabular-nums text-foreground">{b.valor}</span>
                  <span className="truncate text-[11px] text-muted-foreground/80">{b.extra}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge variant="success">
              <LuActivity className="size-3" />
              API ligada
            </Badge>
            <Badge variant="info">
              <LuShield className="size-3" />
              SECRET_SUPORTE activa
            </Badge>
            <span className="text-xs text-muted-foreground">
              Sessões de suporte são auditadas (modelo SuporteAuditoria).
            </span>
          </div>
        </FramePanel>
      </Frame>
    </div>
  );
}
