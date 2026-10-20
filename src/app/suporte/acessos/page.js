"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Badge, Frame, FramePanel, BotaoVariante, Paginacao } from "@/components/suporte/ui";
import { listarAcessos } from "@/services/suporte";
import { LuSearch, LuX, LuScrollText, LuFilter, LuListFilter } from "react-icons/lu";

function formatarDataHora(valor) {
  if (!valor) return "—";
  try {
    return new Date(valor).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return "—"; }
}

export default function SuporteAcessosPage() {
  const [itens, setItens] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(25);
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [filtroSucesso, setFiltroSucesso] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setBusca(buscaInput.trim()); setPagina(1); }, 350);
    return () => clearTimeout(t);
  }, [buscaInput]);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const data = await listarAcessos({ pagina, limite, ...(busca ? { busca } : {}), ...(filtroSucesso ? { so_sucessos: filtroSucesso } : {}) });
      setItens(data.itens || []); setTotal(data.total || 0);
    } catch (e) {
      setErro(e?.response?.data?.erro || "Não foi possível carregar os acessos."); setItens([]);
    } finally { setCarregando(false); }
  }, [pagina, limite, busca, filtroSucesso]);

  useEffect(() => { carregar(); }, [carregar]);

  const temFiltro = !!(busca || filtroSucesso);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Frame
        titulo="Acessos"
        descricao="Ledger global de tentativas de login"
        label="Acessos"
      >
        <FramePanel>
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <BotaoVariante onClick={() => setMostrarFiltros((v) => !v)} aria-expanded={mostrarFiltros}>
                <LuFilter className="size-4" />
                Filtros
              </BotaoVariante>

              <div role="group" className="flex w-fit items-stretch">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-foreground">
                  <LuListFilter className="size-3.5" />
                  Email
                </div>
                <div className="flex h-8 items-center rounded-lg border border-l-0 border-border bg-background px-2.5 text-sm text-muted-foreground">
                  contém
                </div>
                <div className="relative flex h-8 min-w-0 w-44 items-center rounded-lg border border-l-0 border-border bg-background">
                  <input
                    type="text"
                    placeholder="Pesquisar…"
                    value={buscaInput}
                    onChange={(e) => setBuscaInput(e.target.value)}
                    aria-label="Procurar acessos"
                    className="h-8 w-full min-w-0 rounded-r-lg border-0 bg-transparent px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {buscaInput && (
                    <button
                      type="button"
                      onClick={() => { setBuscaInput(""); setBusca(""); }}
                      aria-label="Limpar pesquisa"
                      className="absolute right-0.5 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <LuX className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {mostrarFiltros && (
                <select
                  value={filtroSucesso}
                  onChange={(e) => { setFiltroSucesso(e.target.value); setPagina(1); }}
                  aria-label="Filtrar por resultado"
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:outline-none focus:ring-3 focus:ring-ring/50"
                >
                  <option value="">Todos os resultados</option>
                  <option value="1">Só sucessos</option>
                  <option value="0">Só falhas</option>
                </select>
              )}
            </div>

            {temFiltro && (
              <BotaoVariante onClick={() => { setBuscaInput(""); setBusca(""); setFiltroSucesso(""); }}>
                <LuX className="size-4" />
                Limpar
              </BotaoVariante>
            )}
          </div>
        </FramePanel>

        {erro && (
          <FramePanel className="flex items-center gap-2 border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <Icon name="error" className="shrink-0 text-base" />
            {erro}
          </FramePanel>
        )}

        <FramePanel className="overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left align-middle text-sm font-normal text-foreground">
              <thead>
                <tr>
                  <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Data</th>
                  <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Email</th>
                  <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Utilizador</th>
                  <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Resultado</th>
                  <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">IP</th>
                  <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Agente</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="border-b border-border px-2 py-1.5 last:border-0">
                        <div className="h-5 animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : itens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-16 text-center">
                      <LuScrollText className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {temFiltro ? "Nenhum acesso corresponde aos filtros." : "Ainda não há acessos registados."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  itens.map((a, idx) => (
                    <tr
                      key={a.id}
                      className={`transition-colors hover:bg-muted/40 ${idx < itens.length - 1 ? "[&>td]:border-b [&>td]:border-border" : ""}`}
                    >
                      <td className="truncate px-2 py-1.5 align-middle text-xs tabular-nums text-muted-foreground">
                        {formatarDataHora(a.createdAt)}
                      </td>
                      <td className="truncate px-2 py-1.5 align-middle text-sm font-medium text-foreground">{a.email}</td>
                      <td className="truncate px-2 py-1.5 align-middle text-sm text-muted-foreground">{a.usuario_nome || "—"}</td>
                      <td className="px-2 py-1.5 align-middle">
                        <Badge variant={a.sucesso ? "success" : "destructive"}>
                          {a.sucesso ? "Sucesso" : "Falha"}
                        </Badge>
                      </td>
                      <td className="truncate px-2 py-1.5 align-middle font-mono text-xs text-muted-foreground">{a.ip || "—"}</td>
                      <td className="max-w-[200px] truncate px-2 py-1.5 align-middle font-mono text-[11px] text-muted-foreground" title={a.user_agent || ""}>
                        {a.user_agent || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Paginacao total={total} pagina={pagina} limite={limite} onLimite={(v) => { setLimite(v); setPagina(1); }} />
        </FramePanel>
      </Frame>
    </div>
  );
}
