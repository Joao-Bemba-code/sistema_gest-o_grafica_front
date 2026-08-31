"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Modal from "@/components/Modal";
import { ListSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { listar, criar, atualizar, listarPerfis, listarAcessos } from "@/services/usuarios";
import { getUsuario } from "@/services/auth";
import { perfilLabel, MODULOS, ACOES, permissoesDoUsuario } from "@/lib/permissoes";

const inputCls =
  "w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

const perfilVariant = (p) =>
  p === "admin" ? "destructive" : p === "gestao" ? "warning" : p === "leitura" ? "outline" : "info";

const permissoesVazias = () => {
  const obj = {};
  MODULOS.forEach((m) => {
    obj[m.valor] = {};
    ACOES.forEach((a) => { obj[m.valor][a.valor] = false; });
  });
  return obj;
};

const permissoesDoPerfil = (perfil) => {
  return JSON.parse(JSON.stringify(permissoesDoUsuario({ perfil, permissoes: null })));
};

const alternarPermissao = (perm, modulo, acao) => {
  const nova = JSON.parse(JSON.stringify(perm));
  if (!nova[modulo]) nova[modulo] = {};
  nova[modulo][acao] = !nova[modulo][acao];
  return nova;
};

// Marca/desmarca todas as ações de um módulo de uma só vez.
const alternarTodasPermissoes = (perm, modulo, acoes) => {
  const nova = JSON.parse(JSON.stringify(perm));
  if (!nova[modulo]) nova[modulo] = {};
  const todasLigadas = acoes.every((a) => nova[modulo][a.valor]);
  acoes.forEach((a) => { nova[modulo][a.valor] = !todasLigadas; });
  return nova;
};

const formatarDataHora = (valor) => {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const identificarDispositivo = (ua) => {
  if (!ua) return { browser: "", os: "" };
  let browser = "Navegador";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  let os = "SO";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return { browser, os };
};

const dispositivoLabel = (ua) => {
  const { browser, os } = identificarDispositivo(ua);
  return [os, browser].filter(Boolean).join(" · ");
};

function PermissoesResumo({ usuario }) {
  const perm = permissoesDoUsuario(usuario);
  if (usuario.perfil === "admin") {
    return <Badge variant="success" className="text-[10px]">Acesso total</Badge>;
  }
  const modulosComAcesso = MODULOS.filter((m) => perm[m.valor] && perm[m.valor].ver).length;
  return (
    <span className="text-[11px] text-muted-foreground">
      Acesso a <strong className="text-foreground">{modulosComAcesso}</strong> de {MODULOS.length} módulos
    </span>
  );
}

export default function UtilizadoresPage() {
  const { addToast } = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState({ aberto: false, edicao: null });
  const [form, setForm] = useState({ nome: "", email: "", senha: "", perfil: "producao" });
  const [permPersonalizadas, setPermPersonalizadas] = useState(false);
  const [permissoes, setPermissoes] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [desativando, setDesativando] = useState(false);
  const [modalAcessos, setModalAcessos] = useState({ aberto: false, usuario: null });
  const [acessos, setAcessos] = useState([]);
  const [carregandoAcessos, setCarregandoAcessos] = useState(false);
  const atual = getUsuario();
  const admin = atual?.perfil === "admin";

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [usuariosData, perfisData] = await Promise.all([listar(), listarPerfis()]);
        if (!ativo) return;
        setUsuarios(Array.isArray(usuariosData) ? usuariosData : (usuariosData?.data || []));
        setPerfis(Array.isArray(perfisData) ? perfisData : (perfisData?.perfis || []));
      } catch (err) {
        if (ativo) addToast(err.response?.data?.erro || "Erro ao carregar utilizadores", "error");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [addToast]);

  const recarregar = async () => {
    try {
      const [usuariosData, perfisData] = await Promise.all([listar(), listarPerfis()]);
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : (usuariosData?.data || []));
      setPerfis(Array.isArray(perfisData) ? perfisData : (perfisData?.perfis || []));
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar utilizadores", "error");
    }
  };

  const abrirNovo = () => {
    setForm({ nome: "", email: "", senha: "", perfil: "producao" });
    setPermPersonalizadas(false);
    setPermissoes(permissoesVazias());
    setModal({ aberto: true, edicao: null });
  };

  const abrirEdicao = (u) => {
    setForm({ nome: u.nome || "", email: u.email || "", senha: "", perfil: u.perfil || "producao" });
    const temPerm = !!u.permissoes && Object.keys(u.permissoes).length > 0;
    setPermPersonalizadas(temPerm);
    setPermissoes(temPerm ? JSON.parse(JSON.stringify(u.permissoes)) : permissoesVazias());
    setModal({ aberto: true, edicao: u });
  };

  const fechar = () => setModal({ aberto: false, edicao: null });

  const abrirAcessos = async (u) => {
    setModalAcessos({ aberto: true, usuario: u });
    setAcessos([]);
    setCarregandoAcessos(true);
    try {
      const dados = await listarAcessos(u.id);
      setAcessos(Array.isArray(dados) ? dados : []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar acessos", "error");
    } finally {
      setCarregandoAcessos(false);
    }
  };

  const aoSubmeter = async (e) => {
    e.preventDefault();
    if (!form.nome || !form.email) {
      addToast("Nome e email são obrigatórios", "error");
      return;
    }
    if (!modal.edicao && !form.senha) {
      addToast("Defina uma senha para o novo utilizador", "error");
      return;
    }
    setSalvando(true);
    try {
      const permsEnvio = permPersonalizadas ? permissoes : null;
      if (modal.edicao) {
        await atualizar(modal.edicao.id, {
          nome: form.nome,
          email: form.email,
          perfil: form.perfil,
          senha: form.senha || undefined,
          permissoes: permsEnvio,
        });
        addToast("Utilizador atualizado com sucesso", "success");
      } else {
        await criar({
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          perfil: form.perfil,
          permissoes: permsEnvio,
        });
        addToast("Utilizador criado com sucesso", "success");
      }
      fechar();
      await recarregar();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar utilizador", "error");
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (u) => {
    setDesativando(true);
    try {
      await atualizar(u.id, { ativo: !u.ativo });
      addToast(u.ativo ? "Utilizador desativado" : "Utilizador ativado", "success");
      await recarregar();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao alterar estado", "error");
    } finally {
      setDesativando(false);
    }
  };

  const filtrados = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) =>
      [u.nome, u.email, perfilLabel(u.perfil)].some((c) => String(c || "").toLowerCase().includes(q))
    );
  })();

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Utilizadores</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Gestão de utilizadores e permissões // USR · {usuarios.length} utilizadores</p>
        </div>
        {admin && (
          <Button onClick={abrirNovo}>
            <Icon name="person_add" className="text-lg" /> Novo Utilizador
          </Button>
        )}
      </div>

      {!admin ? (
        <Card>
          <CardContent>
            <div className="p-10 text-center">
              <Icon name="lock" className="text-4xl text-muted-foreground/30 block mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">Acesso restrito</p>
              <p className="text-xs text-muted-foreground mt-1">
                Apenas utilizadores com perfil de Administrador podem gerir utilizadores e permissões.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="relative flex-1 sm:max-w-xs">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]" />
                <input
                  className="pl-10 pr-4 py-2 bg-background border border-input rounded-full text-xs w-full focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                  placeholder="Buscar por nome, email, perfil..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {carregando && usuarios.length === 0 ? (
              <ListSkeleton count={5} />
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {["Utilizador", "Email", "Perfil", "Permissões", "Estado", "Ações"].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((u) => (
                        <tr key={u.id} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                {(u.nome || "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{u.nome}</p>
                                {Number(u.id) === Number(atual?.id) && (
                                  <span className="text-[10px] text-primary font-semibold">(você)</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                          <td className="px-5 py-3"><Badge variant={perfilVariant(u.perfil)} className="text-[10px]">{perfilLabel(u.perfil)}</Badge></td>
                          <td className="px-5 py-3"><PermissoesResumo usuario={u} /></td>
                          <td className="px-5 py-3">
                            <Badge variant={u.ativo ? "success" : "outline"} className="text-[10px]">{u.ativo ? "Ativo" : "Inativo"}</Badge>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => abrirAcessos(u)} title="Histórico de acessos">
                                <Icon name="history" className="text-[16px]" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => abrirEdicao(u)} title="Editar"><Icon name="edit" className="text-[16px]" /></Button>
                              {Number(u.id) !== Number(atual?.id) && (
                                <Button variant="ghost" size="icon" onClick={() => alternarAtivo(u)} title={u.ativo ? "Desativar" : "Ativar"} loading={desativando}>
                                  <Icon name={u.ativo ? "person_off" : "person_add"} className="text-[16px] text-warning" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtrados.length === 0 && (
                    <div className="p-12 text-center">
                      <Icon name="person_search" className="text-4xl text-muted-foreground/40 block mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum utilizador encontrado</p>
                    </div>
                  )}
                </div>

                <div className="md:hidden divide-y divide-border/20">
                  {filtrados.map((u) => (
                    <div key={u.id} className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {(u.nome || "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{u.nome}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                        <Badge variant={perfilVariant(u.perfil)} className="text-[10px]">{perfilLabel(u.perfil)}</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant={u.ativo ? "success" : "outline"} className="text-[10px]">{u.ativo ? "Ativo" : "Inativo"}</Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirAcessos(u)} title="Histórico de acessos">
                            <Icon name="history" className="text-[14px]" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => abrirEdicao(u)} title="Editar"><Icon name="edit" className="text-[14px]" /></Button>
                          {Number(u.id) !== Number(atual?.id) && (
                            <Button variant="ghost" size="icon" onClick={() => alternarAtivo(u)} title={u.ativo ? "Desativar" : "Ativar"}>
                              <Icon name={u.ativo ? "person_off" : "person_add"} className="text-[14px] text-warning" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Modal
            open={modal.aberto}
            onClose={fechar}
            title={modal.edicao ? "Editar Utilizador" : "Novo Utilizador"}
            icon={modal.edicao ? "edit" : "person_add"}
            size="lg"
            footer={
              <>
                <Button variant="outline" onClick={fechar}>Cancelar</Button>
                <Button type="submit" form="form-usuario" loading={salvando}>
                  <Icon name="save" className="text-lg" /> Guardar
                </Button>
              </>
            }
          >
            <form id="form-usuario" onSubmit={aoSubmeter} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nome *</label>
                <input required className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email *</label>
                <input type="email" required className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.angola" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{modal.edicao ? "Senha (deixe vazio para manter)" : "Senha *"}</label>
                <input type="password" className={inputCls} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Perfil</label>
                <select className={inputCls} value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })}>
                  {perfis.map((p) => (
                    <option key={p.valor} value={p.valor}>{p.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  O perfil define as permissões por defeito. O perfil <strong>Administrador</strong> tem acesso total ao sistema.
                </p>
              </div>

              {form.perfil !== "admin" && (
                <div className="border border-border/20 rounded-xl p-4 space-y-3 bg-muted/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Permissões personalizadas</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Se ativadas, sobrepõem o perfil por defeito. Use as ações Ver, Criar, Editar e Eliminar por módulo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPermPersonalizadas((v) => {
                          if (!v) {
                            setPermissoes(permissoesDoPerfil(form.perfil));
                            return true;
                          }
                          return false;
                        });
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${permPersonalizadas ? "bg-primary" : "bg-muted"}`}
                      aria-pressed={permPersonalizadas}
                      aria-label="Ativar permissões personalizadas"
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${permPersonalizadas ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </div>

                  {permPersonalizadas && (() => {
                    const perfilBase = permissoesDoPerfil(form.perfil);
                    const acoesEditor = ACOES.filter((a) => a.valor !== "aprovar");
                    return (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                        <div className="grid grid-cols-[1fr_repeat(4,44px)] gap-2 items-center">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Módulo</span>
                          {acoesEditor.map((a) => (
                            <span key={a.valor} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider" title={a.label}>{a.valor.slice(0, 3)}</span>
                          ))}
                        </div>
                        {MODULOS.map((m) => {
                          const acessivel = !!perfilBase?.[m.valor]?.ver;
                          return (
                            <div key={m.valor} className="grid grid-cols-[1fr_repeat(4,44px)] gap-2 items-center py-1 border-b border-border/10 last:border-0">
                              <span className="text-[12px] font-medium text-foreground truncate flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPermissoes((p) => alternarTodasPermissoes(p, m.valor, acoesEditor))}
                                  className="w-5 h-5 shrink-0 rounded bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors"
                                  title="Marcar/desmarcar todas as ações deste módulo"
                                >
                                  <Icon name="select_all" className="text-[14px]" />
                                </button>
                                <span className="truncate">{m.label}</span>
                                <span className={`shrink-0 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${acessivel ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                                  {acessivel ? "perfil" : "extra"}
                                </span>
                              </span>
                              {acoesEditor.map((a) => (
                                <label
                                  key={a.valor}
                                  className="w-6 h-6 mx-auto flex items-center justify-center cursor-pointer"
                                  title={a.label}
                                >
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-[var(--color-primary)] cursor-pointer"
                                    checked={!!permissoes?.[m.valor]?.[a.valor]}
                                    onChange={() => setPermissoes((p) => alternarPermissao(p, m.valor, a.valor))}
                                  />
                                </label>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </form>
          </Modal>

          <Modal
            open={modalAcessos.aberto}
            onClose={() => setModalAcessos({ aberto: false, usuario: null })}
            title={`Acessos · ${modalAcessos.usuario?.nome || "Utilizador"}`}
            icon="history"
            size="md"
          >
            {carregandoAcessos ? (
              <ListSkeleton count={4} />
            ) : acessos.length === 0 ? (
              <div className="p-10 text-center">
                <Icon name="person_search" className="text-4xl text-muted-foreground/40 block mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum acesso registado para este utilizador.</p>
                <p className="text-[11px] text-muted-foreground mt-1">As tentativas de login começam a ser registadas a partir de agora.</p>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto space-y-2">
                {acessos.map((a) => (
                  <div key={a.id} className="p-3 border border-border/10 rounded-lg flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${a.sucesso ? "bg-success/15 text-success" : "bg-[var(--color-error)]/15 text-[var(--color-error)]"}`}>
                      <Icon name={a.sucesso ? "login" : "login_cancel"} className="text-[16px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground break-words">{a.sucesso ? "Acesso com sucesso" : "Tentativa falhada"}</p>
                        <Badge variant={a.sucesso ? "success" : "outline"} className="text-[10px] shrink-0 whitespace-nowrap">{a.sucesso ? "OK" : "Falha"}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{formatarDataHora(a.createdAt)}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <Icon name="devices" className="text-[13px] shrink-0" />
                          <span className="break-words">{dispositivoLabel(a.user_agent) || "Dispositivo desconhecido"}</span>
                        </span>
                        {a.ip && (
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <Icon name="pin_drop" className="text-[13px] shrink-0" />
                            <span className="break-words">IP {a.ip}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  );
}
