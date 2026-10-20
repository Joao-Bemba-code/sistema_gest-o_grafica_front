"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import CredenciaisModal from "@/components/suporte/CredenciaisModal";
import { Badge, Frame, FramePanel, BotaoPrimario, BotaoVariante, IconeBotao, Paginacao, Avatar } from "@/components/suporte/ui";
import { listarOrganizacoes, criarOrganizacao } from "@/services/suporte";
import { LuPlus, LuSearch, LuX, LuBuilding2, LuArrowRight, LuFilter, LuListFilter, LuKeyRound } from "react-icons/lu";

function formatarDataHora(valor) {
  if (!valor) return "—";
  try {
    const d = new Date(valor);
    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }) +
      ", " + d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

export default function SuporteOrganizacoesPage() {
  const router = useRouter();
  const [itens, setItens] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [modalOrg, setModalOrg] = useState(false);
  const [formOrg, setFormOrg] = useState({});
  const [formAdmin, setFormAdmin] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [erroModal, setErroModal] = useState(null);
  const [credenciais, setCredenciais] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setBusca(buscaInput.trim()); setPagina(1); }, 350);
    return () => clearTimeout(t);
  }, [buscaInput]);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const data = await listarOrganizacoes({ pagina, limite, ...(busca ? { busca } : {}), ...(filtroAtivo ? { ativo: filtroAtivo } : {}) });
      setItens(data.itens || []); setTotal(data.total || 0); setTotalPaginas(data.totalPaginas || 1);
    } catch (e) {
      setErro(e?.response?.data?.erro || "Não foi possível carregar as organizações."); setItens([]);
    } finally { setCarregando(false); }
  }, [pagina, limite, busca, filtroAtivo]);

  useEffect(() => { carregar(); }, [carregar]);

  const submeterOrg = async (e) => {
    e.preventDefault(); if (enviando) return; setErroModal(null);
    if (!formOrg.nome?.trim()) { setErroModal("O nome da organização é obrigatório."); return; }
    if (!formAdmin.nome?.trim() || !formAdmin.email?.trim()) { setErroModal("Indique o nome e o email do administrador."); return; }
    setEnviando(true);
    try {
      const data = await criarOrganizacao({
        ...Object.fromEntries(Object.entries(formOrg).filter(([, v]) => String(v || "").trim())),
        admin: { nome: formAdmin.nome.trim(), email: formAdmin.email.trim(), perfil: "admin" },
      });
      setModalOrg(false); setFormOrg({}); setFormAdmin({}); setCredenciais(data.credenciais || null); carregar();
    } catch (err) { setErroModal(err?.response?.data?.erro || "Não foi possível criar a organização."); }
    finally { setEnviando(false); }
  };

  const temFiltro = !!(busca || filtroAtivo);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Frame
        titulo="Organizações"
        descricao="Ledger de clientes da plataforma"
        label="Organizações"
        acao={
          <BotaoPrimario onClick={() => { setErroModal(null); setModalOrg(true); }}>
            <LuPlus className="size-4" />
            Nova organização
          </BotaoPrimario>
        }
      >
        {/* Filtros */}
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
                  Organização
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
                    aria-label="Procurar organizações"
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
                  value={filtroAtivo}
                  onChange={(e) => { setFiltroAtivo(e.target.value); setPagina(1); }}
                  aria-label="Filtrar por estado"
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:outline-none focus:ring-3 focus:ring-ring/50"
                >
                  <option value="">Todos os estados</option>
                  <option value="1">Activas</option>
                  <option value="0">Inactivas</option>
                </select>
              )}
            </div>

            {temFiltro && (
              <BotaoVariante onClick={() => { setBuscaInput(""); setBusca(""); setFiltroAtivo(""); }}>
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

        {/* Tabela */}
        <FramePanel className="overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left align-middle text-sm font-normal text-foreground">
              <thead>
                <tr>
                  <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Organização</th>
                  <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">NIF</th>
                  <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Utilizadores</th>
                  <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Último acesso</th>
                  <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="relative h-8 border-b border-border px-2 text-right align-middle text-sm font-medium text-muted-foreground">Acções</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="border-b border-border px-2 py-1.5 last:border-0">
                        <div className="h-5 animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : itens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-16 text-center">
                      <LuBuilding2 className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {temFiltro ? "Nenhuma organização corresponde aos filtros." : "Ainda não há organizações registadas."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  itens.map((org, idx) => (
                    <tr
                      key={org.id}
                      className={`transition-colors hover:bg-muted/40 ${idx < itens.length - 1 ? "[&>td]:border-b [&>td]:border-border" : ""}`}
                    >
                      <td className="truncate px-2 py-1.5 align-middle">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => router.push(`/suporte/organizacoes/${org.id}`)}
                            className="group/ref inline-flex min-w-0 cursor-pointer items-center gap-1 truncate rounded-sm text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            <span className="border-b border-transparent py-0.25 transition-colors group-hover/ref:border-primary">
                              {org.nome}
                            </span>
                            <LuArrowRight className="size-3 shrink-0 -translate-x-1 opacity-0 transition-all group-hover/ref:translate-x-0 group-hover/ref:opacity-100" />
                          </button>
                          <span className="truncate font-mono text-xs text-muted-foreground">
                            ORG-{String(org.id).padStart(4, "0")}{org.sigla ? ` · ${org.sigla}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="truncate px-2 py-1.5 align-middle font-mono text-xs tabular-nums text-muted-foreground">
                        {org.nif || "—"}
                      </td>
                      <td className="px-2 py-1.5 align-middle text-sm tabular-nums text-foreground">
                        {org.utilizadores ?? 0}
                      </td>
                      <td className="truncate px-2 py-1.5 align-middle text-xs tabular-nums text-muted-foreground">
                        {formatarDataHora(org.ultimoAcesso)}
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <Badge variant={org.ativo ? "success" : "destructive"}>
                          {org.ativo ? "Activa" : "Inactiva"}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <div className="flex justify-end">
                          <IconeBotao
                            onClick={() => router.push(`/suporte/organizacoes/${org.id}`)}
                            aria-label={`Abrir ${org.nome}`}
                          >
                            <LuArrowRight className="size-4" />
                          </IconeBotao>
                        </div>
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

      {/* Modal: nova organização */}
      {modalOrg && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOrg(false)} />
          <div className="fixed inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg rounded-xl border border-border bg-card shadow-modal" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-semibold text-foreground">Nova organização</h3>
                  <p className="text-xs text-muted-foreground">Cria a organização e o primeiro administrador.</p>
                </div>
                <IconeBotao onClick={() => setModalOrg(false)} aria-label="Fechar">
                  <LuX className="size-4" />
                </IconeBotao>
              </div>
              <form onSubmit={submeterOrg} className="space-y-4 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { campo: "nome", rotulo: "Nome da organização", req: true, span: true, placeholder: "Ex.: Gráfica Kwanzas" },
                    { campo: "sigla", rotulo: "Sigla", placeholder: "KWZ" },
                    { campo: "nif", rotulo: "NIF", placeholder: "0000000000" },
                    { campo: "email", rotulo: "Email", placeholder: "geral@empresa.co.ao" },
                    { campo: "telefone", rotulo: "Telefone", placeholder: "+244 900 000 000" },
                  ].map((f) => (
                    <div key={f.campo} className={f.span ? "sm:col-span-2" : ""}>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        {f.rotulo}{f.req && <span className="text-destructive"> *</span>}
                      </label>
                      <input
                        type="text"
                        placeholder={f.placeholder}
                        value={formOrg[f.campo] || ""}
                        onChange={(e) => setFormOrg((v) => ({ ...v, [f.campo]: e.target.value }))}
                        className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-3 focus:ring-ring/50"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Primeiro administrador <span className="font-normal text-muted-foreground/70">(senha gerada automaticamente)</span>
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { campo: "nome", rotulo: "Nome", req: true, placeholder: "Nome completo" },
                      { campo: "email", rotulo: "Email", req: true, placeholder: "admin@empresa.co.ao" },
                    ].map((f) => (
                      <div key={f.campo}>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                          {f.rotulo}{f.req && <span className="text-destructive"> *</span>}
                        </label>
                        <input
                          type="text"
                          placeholder={f.placeholder}
                          value={formAdmin[f.campo] || ""}
                          onChange={(e) => setFormAdmin((v) => ({ ...v, [f.campo]: e.target.value }))}
                          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-3 focus:ring-ring/50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {erroModal && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/15 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <Icon name="error" className="shrink-0 text-base" />
                    {erroModal}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <BotaoVariante onClick={() => setModalOrg(false)} disabled={enviando}>Cancelar</BotaoVariante>
                  <BotaoPrimario type="submit" disabled={enviando}>
                    {enviando ? <span className="spinner" /> : <><LuPlus className="size-4" /> Criar organização</>}
                  </BotaoPrimario>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <CredenciaisModal open={!!credenciais} onClose={() => setCredenciais(null)} credenciais={credenciais} titulo="Organização criada — credenciais" />
    </div>
  );
}
