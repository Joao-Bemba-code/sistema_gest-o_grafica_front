"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import CredenciaisModal from "@/components/suporte/CredenciaisModal";
import { Badge, Frame, FramePanel, BotaoPrimario, BotaoVariante, IconeBotao, Avatar } from "@/components/suporte/ui";
import {
  obterOrganizacao,
  atualizarOrganizacao,
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
} from "@/services/suporte";
import { LuArrowLeft, LuPlus, LuKeyRound, LuPower, LuX, LuScrollText, LuBuilding2 } from "react-icons/lu";

const PERFIS = [
  { valor: "admin", rotulo: "Administrador" },
  { valor: "gestao", rotulo: "Gestão" },
  { valor: "producao", rotulo: "Produção" },
  { valor: "leitura", rotulo: "Leitura" },
];

function formatarDataHora(valor) {
  if (!valor) return "—";
  try {
    return new Date(valor).toLocaleString("pt-PT", {
      day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

function LinhaInfo({ rotulo, valor }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{valor || "—"}</dd>
    </div>
  );
}

export default function SuporteOrgDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params?.id;

  const [org, setOrg] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [modalUsuario, setModalUsuario] = useState(false);
  const [formUsuario, setFormUsuario] = useState({ perfil: "producao" });
  const [enviando, setEnviando] = useState(false);
  const [erroModal, setErroModal] = useState(null);
  const [credenciais, setCredenciais] = useState(null);
  const [accaoEmCurso, setAccaoEmCurso] = useState(null);

  const carregar = useCallback(async () => {
    if (!orgId) return;
    setCarregando(true); setErro(null);
    try {
      const [o, us] = await Promise.all([obterOrganizacao(orgId), listarUsuarios(orgId)]);
      setOrg(o); setUsuarios(Array.isArray(us) ? us : []);
    } catch (e) {
      setErro(e?.response?.data?.erro || "Não foi possível carregar a organização.");
    } finally { setCarregando(false); }
  }, [orgId]);

  useEffect(() => { carregar(); }, [carregar]);

  const alternarEstado = async () => {
    if (!org) return;
    setAccaoEmCurso("estado");
    try { await atualizarOrganizacao(org.id, { ativo: !org.ativo }); await carregar(); }
    catch (e) { setErro(e?.response?.data?.erro || "Não foi possível alterar o estado."); }
    finally { setAccaoEmCurso(null); }
  };

  const submeterUsuario = async (e) => {
    e.preventDefault(); if (enviando) return; setErroModal(null);
    if (!formUsuario.nome?.trim() || !formUsuario.email?.trim()) {
      setErroModal("Preencha o nome e o email do utilizador."); return;
    }
    setEnviando(true);
    try {
      const data = await criarUsuario(orgId, {
        nome: formUsuario.nome.trim(),
        email: formUsuario.email.trim(),
        perfil: formUsuario.perfil || "producao",
        funcao: formUsuario.funcao?.trim() || undefined,
      });
      setModalUsuario(false); setFormUsuario({ perfil: "producao" });
      setCredenciais(data.credenciais || null); carregar();
    } catch (err) { setErroModal(err?.response?.data?.erro || "Não foi possível criar o utilizador."); }
    finally { setEnviando(false); }
  };

  const reporSenha = async (usuario) => {
    const senha = cryptoRandomSenha();
    setAccaoEmCurso(`senha-${usuario.id}`);
    try {
      await atualizarUsuario(usuario.id, { senha });
      setCredenciais({ email: usuario.email, senha, gerada: true }); carregar();
    } catch (e) { setErro(e?.response?.data?.erro || "Não foi possível repor a senha."); }
    finally { setAccaoEmCurso(null); }
  };

  const alternarUsuario = async (usuario) => {
    setAccaoEmCurso(`user-${usuario.id}`);
    try { await atualizarUsuario(usuario.id, { ativo: !usuario.ativo }); carregar(); }
    catch (e) { setErro(e?.response?.data?.erro || "Não foi possível alterar o utilizador."); }
    finally { setAccaoEmCurso(null); }
  };

  if (carregando) {
    return (
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="h-14 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    );
  }

  if (erro && !org) {
    return (
      <div className="flex flex-col gap-4 sm:gap-5">
        <FramePanel className="flex items-center gap-2 border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <Icon name="error" className="shrink-0 text-base" />
          {erro}
        </FramePanel>
        <div>
          <BotaoVariante onClick={() => router.push("/suporte/organizacoes")}>
            <LuArrowLeft className="size-4" />
            Voltar às organizações
          </BotaoVariante>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <button
        type="button"
        onClick={() => router.push("/suporte/organizacoes")}
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <LuArrowLeft className="size-3.5" />
        Organizações
      </button>

      <Frame
        titulo={org?.nome || "Organização"}
        descricao={`ORG-${String(org?.id || "").padStart(4, "0")}${org?.sigla ? ` · ${org.sigla}` : ""} · ${org?.ativo ? "Activa" : "Inactiva"}`}
        label={org?.nome}
        acao={
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={org?.ativo ? "success" : "destructive"}>
              {org?.ativo ? "Activa" : "Inactiva"}
            </Badge>
            <BotaoVariante onClick={alternarEstado} disabled={accaoEmCurso === "estado"}>
              {accaoEmCurso === "estado" ? <span className="spinner" /> : <LuPower className="size-4" />}
              {org?.ativo ? "Desactivar" : "Activar"}
            </BotaoVariante>
          </div>
        }
      >
        {erro && (
          <FramePanel className="flex items-center gap-2 border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <Icon name="error" className="shrink-0 text-base" />
            {erro}
          </FramePanel>
        )}

        {/* Ficha */}
        <FramePanel className="px-3.5 py-3.5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <LinhaInfo rotulo="NIF" valor={org?.nif} />
            <LinhaInfo rotulo="Email" valor={org?.email} />
            <LinhaInfo rotulo="Telefone" valor={org?.telefone} />
            <LinhaInfo rotulo="Website" valor={org?.website} />
            <LinhaInfo rotulo="Endereço" valor={org?.endereco} />
            <LinhaInfo rotulo="Utilizadores" valor={String(org?.utilizadores ?? "—")} />
            <LinhaInfo rotulo="Acessos totais" valor={String(org?.totalAcessos ?? "—")} />
            <LinhaInfo rotulo="Último acesso" valor={formatarDataHora(org?.ultimoAcesso)} />
          </dl>
        </FramePanel>

        {/* Utilizadores */}
        <Frame
          titulo="Utilizadores"
          descricao="Contas que acedem ao KAMGEST desta organização."
          label="Utilizadores"
          acao={
            <BotaoPrimario onClick={() => { setErroModal(null); setModalUsuario(true); }}>
              <LuPlus className="size-4" />
              Novo utilizador
            </BotaoPrimario>
          }
          className="border-0 bg-transparent p-0 shadow-none"
        >
          <FramePanel className="overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left align-middle text-sm font-normal text-foreground">
                <thead>
                  <tr>
                    <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Nome</th>
                    <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Email</th>
                    <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Perfil</th>
                    <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Último acesso</th>
                    <th className="relative h-8 border-b border-border px-2 text-left align-middle text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="relative h-8 border-b border-border px-2 text-right align-middle text-sm font-medium text-muted-foreground">Acções</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-12 text-center">
                        <LuScrollText className="mx-auto mb-3 size-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Sem utilizadores nesta organização.</p>
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((u, idx) => (
                      <tr
                        key={u.id}
                        className={`transition-colors hover:bg-muted/40 ${idx < usuarios.length - 1 ? "[&>td]:border-b [&>td]:border-border" : ""}`}
                      >
                        <td className="truncate px-2 py-1.5 align-middle">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <Avatar nome={u.nome} />
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <span className="truncate text-sm font-medium text-foreground">{u.nome}</span>
                              {u.funcao && <span className="truncate text-xs text-muted-foreground">{u.funcao}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="truncate px-2 py-1.5 align-middle text-sm text-muted-foreground">{u.email}</td>
                        <td className="px-2 py-1.5 align-middle">
                          <Badge variant="info" className="capitalize">{u.perfil}</Badge>
                        </td>
                        <td className="truncate px-2 py-1.5 align-middle text-xs tabular-nums text-muted-foreground">
                          {formatarDataHora(u.ultimoAcesso)}
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <Badge variant={u.ativo ? "success" : "destructive"}>
                            {u.ativo ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <div className="flex justify-end gap-1">
                            <BotaoVariante
                              className="h-8 px-2"
                              onClick={() => reporSenha(u)}
                              disabled={accaoEmCurso === `senha-${u.id}`}
                              title="Gerar uma nova senha (mostrada uma única vez)"
                            >
                              {accaoEmCurso === `senha-${u.id}` ? <span className="spinner" /> : <LuKeyRound className="size-4" />}
                              <span className="hidden sm:inline">Repor senha</span>
                            </BotaoVariante>
                            <IconeBotao
                              onClick={() => alternarUsuario(u)}
                              disabled={accaoEmCurso === `user-${u.id}`}
                              aria-label={u.ativo ? "Desactivar utilizador" : "Activar utilizador"}
                              title={u.ativo ? "Desactivar" : "Activar"}
                            >
                              <LuPower className="size-4" />
                            </IconeBotao>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </FramePanel>
        </Frame>
      </Frame>

      {/* Modal: novo utilizador */}
      {modalUsuario && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalUsuario(false)} />
          <div className="fixed inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-card shadow-modal" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-semibold text-foreground">Novo utilizador</h3>
                  <p className="text-xs text-muted-foreground">A senha é gerada e mostrada uma única vez.</p>
                </div>
                <IconeBotao onClick={() => setModalUsuario(false)} aria-label="Fechar">
                  <LuX className="size-4" />
                </IconeBotao>
              </div>
              <form onSubmit={submeterUsuario} className="space-y-3 p-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Nome <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={formUsuario.nome || ""}
                    onChange={(e) => setFormUsuario((v) => ({ ...v, nome: e.target.value }))}
                    className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-3 focus:ring-ring/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="utilizador@empresa.co.ao"
                    value={formUsuario.email || ""}
                    onChange={(e) => setFormUsuario((v) => ({ ...v, email: e.target.value }))}
                    className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-3 focus:ring-ring/50"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Perfil</label>
                    <select
                      value={formUsuario.perfil || "producao"}
                      onChange={(e) => setFormUsuario((v) => ({ ...v, perfil: e.target.value }))}
                      className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-3 focus:ring-ring/50"
                    >
                      {PERFIS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Função</label>
                    <input
                      type="text"
                      placeholder="Ex.: Operadora de máquina"
                      value={formUsuario.funcao || ""}
                      onChange={(e) => setFormUsuario((v) => ({ ...v, funcao: e.target.value }))}
                      className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-3 focus:ring-ring/50"
                    />
                  </div>
                </div>

                <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  A senha será gerada automaticamente e mostrada uma única vez após a criação.
                </p>

                {erroModal && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/15 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive">
                    <Icon name="error" className="shrink-0 text-base" />
                    {erroModal}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <BotaoVariante onClick={() => setModalUsuario(false)} disabled={enviando}>Cancelar</BotaoVariante>
                  <BotaoPrimario type="submit" disabled={enviando}>
                    {enviando ? <span className="spinner" /> : <><LuPlus className="size-4" /> Criar utilizador</>}
                  </BotaoPrimario>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <CredenciaisModal
        open={!!credenciais}
        onClose={() => setCredenciais(null)}
        credenciais={credenciais}
        titulo="Credenciais do utilizador"
      />
    </div>
  );
}

function cryptoRandomSenha() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[bytes[i] % chars.length];
  return s;
}
