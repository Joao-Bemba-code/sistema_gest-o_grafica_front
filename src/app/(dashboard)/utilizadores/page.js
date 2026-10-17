"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import Modal from "@/components/Modal";
import KpiCard from "@/components/ui/KpiCard";
import { ListSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/ui/Avatar";
import RowMenu from "@/components/ui/RowMenu";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import {
  Ledger,
  LedgerHeader,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import { listar, criar, atualizar, listarPerfis, listarAcessos } from "@/services/usuarios";
import { getUsuario } from "@/services/auth";
import { perfilLabel, MODULOS, ACOES, permissoesDoUsuario, podeAtual } from "@/lib/permissoes";

const inputCls =
  "w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";

const CAMPOS = [
  { value: "geral", label: "Todos os campos", obter: (u) => [u.nome, u.email, perfilLabel(u.perfil)].join(" ") },
  { value: "nome", label: "Nome", obter: (u) => u.nome || "" },
  { value: "email", label: "Email", obter: (u) => u.email || "" },
  { value: "perfil", label: "Perfil", obter: (u) => perfilLabel(u.perfil) || "" },
];

const tabClsBase = "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-2 text-sm font-medium transition-colors";
const tabClsAtiva = "border-blue-600 font-bold text-blue-600";
const tabClsInativa = "border-transparent text-muted-foreground hover:text-foreground";

const perfilTom = (p) =>
  p === "admin" ? "error" : p === "gestao" ? "warning" : p === "leitura" ? "neutral" : "info";

const valorOrdem = (u, chave) =>
  chave === "perfil" ? perfilLabel(u.perfil) : chave === "estado" ? (u.ativo ? 1 : 0) : u[chave];

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
  // Sem "ver" não é possível usar o módulo: ao marcar qualquer outra ação,
  // liga "ver"; ao desligar "ver", limpa as restantes ações do módulo.
  if (acao !== "ver" && nova[modulo][acao]) nova[modulo].ver = true;
  if (acao === "ver" && !nova[modulo].ver) {
    ACOES.forEach((a) => { if (a.valor !== "ver") nova[modulo][a.valor] = false; });
  }
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

const temModuloVisivel = (perm) => MODULOS.some((m) => !!perm?.[m.valor]?.ver);

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
    return <StatusBadge tom="success">Acesso total</StatusBadge>;
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
  const [filtro, setFiltro] = useState({ campo: "geral", operador: "contem", termo: "" });
  const [perfilFiltro, setPerfilFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
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
    setPermissoes(temPerm ? JSON.parse(JSON.stringify(permissoesDoUsuario(u))) : permissoesVazias());
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
      // Permissões sem nenhum módulo visível não têm efeito: guarda-se null
      // para o utilizador ficar com as permissões por defeito do perfil.
      const permsEnvio = permPersonalizadas && temModuloVisivel(permissoes) ? permissoes : null;
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

  const contagensPerfil = usuarios.reduce((acc, u) => {
    const chave = u.perfil || "producao";
    acc[chave] = (acc[chave] || 0) + 1;
    return acc;
  }, {});
  const perfisDisponiveis = Object.keys(contagensPerfil).sort((a, b) => perfilLabel(a).localeCompare(perfilLabel(b)));

  const tabs = [
    { id: "todos", label: "Todos", count: usuarios.length },
    ...perfisDisponiveis.map((p) => ({ id: p, label: perfilLabel(p), count: contagensPerfil[p] })),
  ];

  const contagemAtivos = usuarios.filter((u) => u.ativo).length;
  const contagemAdmins = usuarios.filter((u) => u.perfil === "admin").length;

  const filtrados = (() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...usuarios];
    if (perfilFiltro !== "todos") res = res.filter((u) => (u.perfil || "") === perfilFiltro);
    if (estadoFiltro === "ativo") res = res.filter((u) => u.ativo);
    if (estadoFiltro === "inativo") res = res.filter((u) => !u.ativo);
    if (termo) {
      const cfg = CAMPOS.find((c) => c.value === filtro.campo) || CAMPOS[0];
      res = res.filter((u) => {
        const alvo = String(cfg.obter(u) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (ordem.chave) {
      res.sort((a, b) => {
        const av = valorOrdem(a, ordem.chave);
        const bv = valorOrdem(b, ordem.chave);
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * ordem.dir;
        const as = String(av || "").toLowerCase();
        const bs = String(bv || "").toLowerCase();
        return (as < bs ? -1 : as > bs ? 1 : 0) * ordem.dir;
      });
    }
    return res;
  })();

  const pag = usePaginacao({ items: filtrados });

  return (
    <div className="space-y-4">
      {/* Faixa do módulo - identificação Recursos Humanos (carmim) */}
      <div className="flex items-center justify-between rounded-xl bg-[#9f1239] px-5 py-2.5 text-white shadow-sm">
        <span className="text-lg font-extrabold uppercase tracking-wide">9. Recursos Humanos</span>
        <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-rose-100 sm:block">
          Sistema Integrado de Gestão Empresarial
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Gestão de Pessoas</h1>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">Colaboradores, perfis e permissões.</p>
        </div>
        {admin && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {podeAtual("relatorios", "ver") && (
              <Link
                href="/relatorios"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#be123c] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#9f1239]"
              >
                <Icon name="description" className="text-base" /> Relatórios
              </Link>
            )}
            <button
              type="button"
              onClick={abrirNovo}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#be123c] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#9f1239]"
            >
              <Icon name="add" className="text-base" /> Novo Utilizador
            </button>
          </div>
        )}
      </div>

      {!admin ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Icon name="lock" className="text-4xl text-muted-foreground/30 block mx-auto mb-3" />
          <p className="text-sm font-normal text-foreground">Acesso restrito</p>
          <p className="text-xs text-muted-foreground mt-1">
            Apenas utilizadores com perfil de Administrador podem gerir utilizadores e permissões.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores de recursos humanos">
            <KpiCard icon="groups" label="Total Equipa" value={String(usuarios.length)} iconVariant="primary" />
            <KpiCard icon="check_circle" label="Activos" value={String(contagemAtivos)} iconVariant="success" />
            <KpiCard icon="person_off" label="Inativos" value={String(usuarios.length - contagemAtivos)} iconVariant="warning" />
            <KpiCard icon="admin_panel_settings" label="Administradores" value={String(contagemAdmins)} iconVariant="error" />
          </section>

          <Ledger rotulo="Utilizadores ledger">
            <LedgerHeader
              titulo="Equipa"
              subtitulo={`${filtrados.length} de ${usuarios.length} utilizadores · ${perfisDisponiveis.length} perfis`}
            />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border px-4">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPerfilFiltro(t.id)}
                  aria-pressed={perfilFiltro === t.id}
                  className={`${tabClsBase} ${perfilFiltro === t.id ? tabClsAtiva : tabClsInativa}`}
                >
                  {t.label}
                  <span className="text-[11px] text-muted-foreground">{t.count}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5">
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                aria-label="Filtrar por estado"
                className="h-8 rounded-lg border border-border bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25 cursor-pointer"
              >
                <option value="todos">Todos os estados</option>
                <option value="ativo">Activos</option>
                <option value="inativo">Inativos</option>
              </select>
              <input
                value={filtro.termo}
                onChange={(e) => setFiltro((f) => ({ ...f, termo: e.target.value }))}
                placeholder="Pesquisar..."
                aria-label="Pesquisar utilizadores"
                className="h-8 min-w-0 ml-auto w-full basis-40 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/25 transition-colors sm:w-64 sm:basis-auto"
              />
              {(filtro.termo || estadoFiltro !== "todos" || perfilFiltro !== "todos") && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltro((f) => ({ ...f, termo: "" }));
                    setEstadoFiltro("todos");
                    setPerfilFiltro("todos");
                  }}
                  className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-foreground whitespace-nowrap transition-colors hover:bg-muted/60"
                >
                  Limpar
                </button>
              )}
            </div>

            {carregando && usuarios.length === 0 ? (
              <div className="p-4"><ListSkeleton count={5} /></div>
            ) : (
              <>
                <LedgerTable>
                  <thead>
                    <tr className="border-b border-border">
                      <LedgerTh onSort={() => setOrdem((prev) => (prev.chave === "nome" ? { chave: "nome", dir: -prev.dir } : { chave: "nome", dir: 1 }))} ativo={ordem.chave === "nome"}>Utilizador</LedgerTh>
                      <LedgerTh onSort={() => setOrdem((prev) => (prev.chave === "perfil" ? { chave: "perfil", dir: -prev.dir } : { chave: "perfil", dir: 1 }))} ativo={ordem.chave === "perfil"}>Perfil</LedgerTh>
                      <LedgerTh>Permissões</LedgerTh>
                      <LedgerTh onSort={() => setOrdem((prev) => (prev.chave === "estado" ? { chave: "estado", dir: -prev.dir } : { chave: "estado", dir: 1 }))} ativo={ordem.chave === "estado"}>Estado</LedgerTh>
                      <LedgerTh className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {pag.visiveis.map((u) => {
                      const eu = Number(u.id) === Number(atual?.id);
                      return (
                        <LedgerTr key={u.id}>
                          <LedgerTd className="max-w-56">
                            <span className="flex items-center gap-2.5">
                              <Avatar nome={u.nome} tamanho="sm" />
                              <span className="min-w-0">
                                <IdCell id={u.nome || "—"} meta={eu ? `${u.email || "—"} · (você)` : (u.email || "—")} />
                              </span>
                            </span>
                          </LedgerTd>
                          <LedgerTd>
                            <StatusBadge tom={perfilTom(u.perfil)}>{perfilLabel(u.perfil)}</StatusBadge>
                          </LedgerTd>
                          <LedgerTd>
                            <PermissoesResumo usuario={u} />
                          </LedgerTd>
                          <LedgerTd>
                            <StatusBadge tom={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</StatusBadge>
                          </LedgerTd>
                          <LedgerTd>
                            <RowMenu
                              ariaLabel={`Ações de ${u.nome || "utilizador"}`}
                              itens={[
                                { icone: "history", rotulo: "Histórico de acessos", onClick: () => abrirAcessos(u) },
                                { icone: "edit", rotulo: "Editar", onClick: () => abrirEdicao(u) },
                                ...(!eu ? [
                                  { icone: u.ativo ? "person_off" : "person_add", rotulo: u.ativo ? "Desativar" : "Ativar", danger: u.ativo, onClick: () => alternarAtivo(u) },
                                ] : []),
                              ]}
                            />
                          </LedgerTd>
                        </LedgerTr>
                      );
                    })}
                  </tbody>
                </LedgerTable>
                {pag.total === 0 && (
                  usuarios.length === 0
                    ? <LedgerEmpty icone="group">Nenhum utilizador registado</LedgerEmpty>
                    : <LedgerEmpty icone="person_search">Nenhum utilizador corresponde ao filtro</LedgerEmpty>
                )}
                <Paginacao {...pag} label="utilizadores" />
              </>
            )}
          </Ledger>

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
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-normal text-foreground">Permissões personalizadas</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Se ativadas, sobrepõem o perfil por defeito. Use as ações Ver, Criar, Editar, Eliminar e Aprovar por módulo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const ativar = !permPersonalizadas;
                        setPermPersonalizadas(ativar);
                        if (ativar) setPermissoes(permissoesDoPerfil(form.perfil));
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
                    const acoesEditor = ACOES;
                    return (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                        <div className="grid grid-cols-[1fr_repeat(5,44px)] gap-2 items-center">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Módulo</span>
                          {acoesEditor.map((a) => (
                            <span key={a.valor} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider" title={a.label}>{a.valor.slice(0, 3)}</span>
                          ))}
                        </div>
                        {MODULOS.map((m) => {
                          const acessivel = !!perfilBase?.[m.valor]?.ver;
                          return (
                            <div key={m.valor} className="grid grid-cols-[1fr_repeat(5,44px)] gap-2 items-center py-1 border-b border-border/10 last:border-0">
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
                        <StatusBadge tom={a.sucesso ? "success" : "neutral"} className="shrink-0 whitespace-nowrap">{a.sucesso ? "OK" : "Falha"}</StatusBadge>
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
