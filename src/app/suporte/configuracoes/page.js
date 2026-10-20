"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Badge, Frame, FramePanel, BotaoPrimario, BotaoVariante } from "@/components/suporte/ui";
import { useTheme } from "@/contexts/ThemeContext";
import { getSuporte, logout, obterResumo } from "@/services/suporte";
import { LuSun, LuMoon, LuLogOut, LuInfo, LuActivity, LuShield } from "react-icons/lu";

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

  useEffect(() => {
    obterResumo().then(setResumo).catch((e) => setErro(e?.response?.data?.erro || "Não foi possível carregar o estado do sistema."));
  }, []);

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
              <LinhaInfo rotulo="Token" valor="Sigraf-Suporte (não partilhado com clientes)" />
            </dl>
            <div className="mt-4 flex justify-end">
              <BotaoVariante onClick={logout}>
                <LuLogOut className="size-4" />
                Terminar sessão
              </BotaoVariante>
            </div>
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
