"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Badge, Frame, FramePanel, CartaoKpi, BarraProgresso } from "@/components/suporte/ui";
import { obterResumo, listarAcessos, listarOrganizacoes } from "@/services/suporte";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  LuBuilding,
  LuGroup,
  LuLogIn,
  LuShield,
  LuShieldAlert,
  LuTriangleAlert,
  LuCircleCheck,
  LuArrowRight,
  LuFolder,
} from "react-icons/lu";

function Tabs({ opcoes, activo, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex h-8 shrink-0 items-center rounded-lg bg-muted p-[3px]">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="tab"
          aria-selected={activo === o.valor}
          data-ativo={activo === o.valor}
          onClick={() => onChange(o.valor)}
          className="h-[calc(100%-1px)] rounded-md px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[ativo=true]:bg-background data-[ativo=true]:text-foreground data-[ativo=true]:shadow-sm"
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}

function TooltipGrafico({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium text-foreground">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color || p.stroke }} />
          <span>{p.dataKey === "sucessos" ? "Sucessos" : "Falhas"}:</span>
          <strong className="font-semibold tabular-nums text-foreground">{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function SuporteResumoPage() {
  const [resumo, setResumo] = useState(null);
  const [acessos, setAcessos] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState("7");

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [r, a, o] = await Promise.all([
          obterResumo(),
          listarAcessos({ limite: 6 }),
          listarOrganizacoes({ limite: 5, pagina: 1 }),
        ]);
        if (!activo) return;
        setResumo(r); setAcessos(a.itens || []); setOrgs(o.itens || []);
      } catch (e) {
        if (!activo) return;
        setErro(e?.response?.data?.erro || "Não foi possível carregar o resumo.");
      } finally { if (activo) setCarregando(false); }
    })();
    return () => { activo = false; };
  }, []);

  const taxaFalhas = resumo?.acessos7d && resumo.acessos7d.sucesso + resumo.acessos7d.falhas > 0
    ? Math.round((resumo.acessos7d.falhas / (resumo.acessos7d.sucesso + resumo.acessos7d.falhas)) * 100) : 0;

  const serie = (resumo?.serie || []).slice(periodo === "7" ? -7 : undefined);
  const temFalhas = (resumo?.acessos7d?.falhas || 0) > 0;

  return (
    <div className="flex flex-col gap-4 @5xl:gap-4">
      <h1 className="sr-only">Resumo da consola de suporte</h1>

      {erro && (
        <FramePanel className="flex items-center gap-2 border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <Icon name="error" className="shrink-0 text-base" />
          {erro}
        </FramePanel>
      )}

      {/* Faixa de cabeçalho */}
      <div className="gradient-hero relative overflow-hidden rounded-xl border border-border px-5 py-5">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-primary/60 to-tertiary" aria-hidden="true" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <span className="pill pill-primary">
              <LuShield className="size-3" />
              Consola de suporte
            </span>
            <h2 className="mt-2.5 text-2xl leading-tight font-black tracking-tight text-foreground">
              Visão geral da plataforma
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Acompanha organizações, utilizadores e tentativas de acesso registadas no KAMGEST.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="pill pill-muted">
              <LuBuilding className="size-3" />
              {resumo?.organizacoes?.total ?? 0} organizações
            </span>
            <span className="pill pill-muted">
              <LuGroup className="size-3" />
              {resumo?.utilizadores?.total ?? 0} utilizadores
            </span>
            <Link
              href="/suporte/acessos"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
            >
              Ver acessos
              <LuArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 gap-4 @5xl:grid-cols-3">
        {carregando || !resumo ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-[172px] animate-pulse rounded-xl border border-border bg-card shadow-card" />
          ))
        ) : (
          <>
            <CartaoKpi
              icone={LuBuilding}
              titulo="Organizações"
              descricao="Total de clientes na plataforma"
              valor={resumo.organizacoes.total}
              nota={`${resumo.organizacoes.ativas} activas · ${resumo.organizacoes.inativas} inactivas`}
              notaCor="text-success"
            >
              <BarraProgresso
                className="mt-3"
                valor={resumo.organizacoes.ativas}
                total={resumo.organizacoes.total}
                cor="var(--success)"
              />
            </CartaoKpi>

            <CartaoKpi
              icone={LuGroup}
              titulo="Utilizadores"
              descricao="Contas de acesso registadas"
              valor={resumo.utilizadores.total}
              nota={`${resumo.utilizadores.ativos} activos`}
              notaCor="text-success"
            >
              <BarraProgresso
                className="mt-3"
                valor={resumo.utilizadores.ativos}
                total={resumo.utilizadores.total}
                cor="var(--primary)"
              />
            </CartaoKpi>

            <CartaoKpi
              icone={LuLogIn}
              titulo="Logins (7 dias)"
              descricao="Sessões iniciadas com sucesso"
              valor={resumo.acessos7d.sucesso}
              nota={`${resumo.organizacoes.comAcesso7d} organizações com acesso`}
              notaCor={temFalhas ? "text-warning" : "text-success"}
            >
              <BarraProgresso
                className="mt-3"
                valor={resumo.acessos7d.sucesso}
                total={resumo.acessos7d.sucesso + resumo.acessos7d.falhas}
                cor={temFalhas ? "var(--warning)" : "var(--success)"}
              />
            </CartaoKpi>
          </>
        )}
      </div>

      {/* Caixa de mensagem */}
      {!carregando && resumo && (
        <FramePanel
          className={`flex items-start gap-3 px-4 py-3.5 ${
            temFalhas ? "border-warning/25 bg-warning/10" : "border-success/25 bg-success/10"
          }`}
        >
          <span
            className={`mt-px flex size-7 shrink-0 items-center justify-center rounded-lg border ${
              temFalhas ? "border-warning/20 bg-warning/10 text-warning" : "border-success/20 bg-success/10 text-success"
            }`}
          >
            {temFalhas ? <LuShieldAlert className="size-4" /> : <LuCircleCheck className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {temFalhas
                ? `${resumo.acessos7d.falhas} falhas de login nos últimos 7 dias`
                : "Sem falhas de login nos últimos 7 dias"}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {temFalhas
                ? `Representam ${taxaFalhas}% das tentativas. Reveja o fluxo de Acessos para confirmar se são utilizadores reais.`
                : "Todas as tentativas de acesso dos últimos 7 dias terminaram com sucesso."}
            </p>
          </div>
          {temFalhas && (
            <Link
              href="/suporte/acessos"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              Ver acessos
              <LuArrowRight className="size-3.5" />
            </Link>
          )}
        </FramePanel>
      )}

      {/* Gráfico */}
      <Frame
        titulo="Logins por dia"
        descricao="Tentativas de acesso registadas na plataforma."
        label="Logins por dia"
        acao={
          <Tabs
            label="Período do gráfico"
            opcoes={[
              { nome: "7 dias", valor: "7" },
              { nome: "30 dias", valor: "30" },
            ]}
            activo={periodo}
            onChange={setPeriodo}
          />
        }
      >
        <FramePanel className="p-3.5">
          {carregando ? (
            <div className="h-[280px] animate-pulse rounded-lg bg-muted" />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serie} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSucessos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradFalhas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dia"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    minTickGap={24}
                    tickFormatter={(d) => {
                      const [, m, dia] = String(d).split("-");
                      return `${dia}/${m}`;
                    }}
                  />
                  <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <Tooltip content={<TooltipGrafico />} cursor={{ stroke: "var(--border)" }} />
                  <Area
                    type="monotone"
                    dataKey="sucessos"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#gradSucessos)"
                    dot={serie.length <= 8 ? { r: 2.5, fill: "var(--primary)", strokeWidth: 0 } : false}
                    activeDot={{ r: 3.5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="falhas"
                    stroke="var(--destructive)"
                    strokeWidth={1.8}
                    fill="url(#gradFalhas)"
                    dot={serie.length <= 8 ? { r: 2.5, fill: "var(--destructive)", strokeWidth: 0 } : false}
                    activeDot={{ r: 3.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-border pt-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary" />
              Sucessos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-destructive" />
              Falhas
            </span>
            <span className="ml-auto">{serie.length} dias apresentados</span>
          </div>
        </FramePanel>
      </Frame>

      {/* Listas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Frame
          titulo="Últimos acessos"
          descricao="Tentativas de login mais recentes."
          label="Últimos acessos"
          acao={
            <Link
              href="/suporte/acessos"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              Ver todos
            </Link>
          }
        >
          <FramePanel className="overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-separate border-spacing-0 text-left align-middle text-sm font-normal text-foreground">
                <thead>
                  <tr>
                    <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Data</th>
                    <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Email</th>
                    <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {acessos.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-12 text-center text-sm text-muted-foreground">Sem acessos registados.</td></tr>
                  ) : (
                    acessos.map((a, idx) => (
                      <tr
                        key={a.id}
                        className={`transition-colors hover:bg-muted/40 ${idx < acessos.length - 1 ? "[&>td]:border-b [&>td]:border-border" : ""}`}
                      >
                        <td className="truncate px-2 py-1.5 align-middle text-xs tabular-nums text-muted-foreground">
                          {a.createdAt ? new Date(a.createdAt).toLocaleString("pt-PT") : "—"}
                        </td>
                        <td className="truncate px-2 py-1.5 align-middle text-sm font-medium text-foreground">{a.email}</td>
                        <td className="px-2 py-1.5 align-middle">
                          <Badge variant={a.sucesso ? "success" : "destructive"}>{a.sucesso ? "Sucesso" : "Falha"}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </FramePanel>
        </Frame>

        <Frame
          titulo="Organizações recentes"
          descricao="Últimos clientes registados."
          label="Organizações recentes"
          acao={
            <Link
              href="/suporte/organizacoes"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              Ver todas
            </Link>
          }
        >
          <FramePanel className="p-1.5">
            {carregando ? (
              <div className="flex flex-col gap-2 p-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : orgs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <LuFolder className="size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Sem organizações registadas.</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {orgs.map((o, idx) => (
                  <li key={o.id} className={idx < orgs.length - 1 ? "border-b border-dashed border-border" : ""}>
                    <Link
                      href={`/suporte/organizacoes/${o.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-primary">
                        <LuBuilding className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{o.nome}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          ORG-{String(o.id).padStart(4, "0")}{o.sigla ? ` · ${o.sigla}` : ""} · {o.utilizadores ?? 0} utilizadores
                        </span>
                      </span>
                      <Badge variant={o.ativo ? "success" : "destructive"}>{o.ativo ? "Activa" : "Inactiva"}</Badge>
                      <LuArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </FramePanel>
        </Frame>
      </div>
    </div>
  );
}
