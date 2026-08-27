"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Modal from "@/components/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import { inputCls, familias, familiasServico, tiposItem, normalizarFamilia, normalizarTipoItem, tipoRecursoOptions } from "@/lib/estoque";
import CreatableSelect from "@/components/ui/CreatableSelect";
import { listar, criar, atualizar, remover } from "@/services/categorias";
import { listar as listarServicos, criar as criarServico, atualizar as atualizarServico, remover as removerServico } from "@/services/servicos";
import { useFilter } from "@/components/ui/FilterBar";

const blankForm = { nome: "", familia: "", tipo: "Artigo / Produto", descricao: "", subfamilia: "" };

const todosFamilias = { ...familias, ...familiasServico };

// Devolve a chave interna se o texto corresponder a uma família existente,
// caso contrário devolve o próprio texto (nova família criada pelo utilizador).
function familiaParaSalvar(texto) {
  const t = String(texto || "").trim();
  if (!t) return "papeis";
  const entrada = Object.entries(todosFamilias).find(
    ([, cfg]) => cfg.label.toLowerCase() === t.toLowerCase()
  );
  return entrada ? entrada[0] : t;
}

// Devolve o valor/chave se o texto corresponder a um tipo existente, caso
// contrário devolve o próprio texto (novo tipo criado pelo utilizador).
function tipoParaSalvar(texto) {
  const t = String(texto || "").trim();
  const entrada = tipoRecursoOptions.find(
    (o) => o.label.toLowerCase() === t.toLowerCase()
  );
  return entrada ? entrada.valor : t;
}

const CATEGORIAS_FILTRO = [
  { value: "todos", label: "Todos", icon: "apps" },
  { value: "servico", label: "Serviços", icon: "home_repair_service" },
  { value: "artigo", label: "Artigos / Produtos", icon: "inventory_2" },
  { value: "maquina", label: "Maquinaria", icon: "precision_manufacturing" },
  { value: "funcionario", label: "Funcionários", icon: "groups" },
];

export default function CategoriasPage() {
  const { addToast } = useToast();
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState({ aberto: false, id: null });
  const [form, setForm] = useState(blankForm);
  const [salvando, setSalvando] = useState(false);
  const [eliminar, setEliminar] = useState(null);
  const [deletando, setDeletando] = useState(false);

  const [servicos, setServicos] = useState([]);
  const [modalServicos, setModalServicos] = useState(false);
  const [carregandoServicos, setCarregandoServicos] = useState(false);
  const [modalServico, setModalServico] = useState({ aberto: false, id: null });
  const [formServico, setFormServico] = useState({ nome: "", descricao: "" });
  const [salvandoServico, setSalvandoServico] = useState(false);
  const [eliminarServico, setEliminarServico] = useState(null);

  const [abaTipo, setAbaTipo] = useState("todos");

  const categoriasMateriais = useMemo(() => {
    const servicosTipois = new Set(["servico", "servicos"]);
    return categorias.filter((c) => {
      if (!c.tipo) return true;
      if (abaTipo === "todos") return true;
      const t = String(c.tipo).trim().toLowerCase();
      if (abaTipo === "servico") return servicosTipois.has(t);
      return t === abaTipo;
    });
  }, [categorias, abaTipo]);

  const { search, setSearch, filtered, total } = useFilter({
    items: categoriasMateriais,
    searchFields: ["nome", "subfamilia", "descricao"],
  });

  const carregar = useCallback(async () => {
    try {
      setCategorias(await listar());
    } catch {
      addToast?.("Erro ao carregar recursos", "error");
    } finally {
      setCarregando(false);
    }
  }, [addToast]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await listar();
        if (ativo) setCategorias(dados);
      } catch {
        if (ativo) addToast?.("Erro ao carregar recursos", "error");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [addToast]);

  const abrirNova = (tipoChave) => {
    const label = tipoRecursoOptions.find((o) => o.valor === tipoChave)?.label;
    setModal({ aberto: true, id: null });
    setForm({ ...blankForm, tipo: label || blankForm.tipo });
  };
  const abrirEdicao = (categoria) => {
    setModal({ aberto: true, id: categoria.id });
    setForm({
      nome: categoria.nome || "",
      familia: todosFamilias[normalizarFamilia(categoria.familia)]?.label || categoria.familia || "",
      tipo: tipoRecursoOptions.find((o) => o.valor === categoria.tipo)?.label || String(categoria.tipo || "Artigo / Produto"),
      descricao: categoria.descricao || "",
      subfamilia: categoria.subfamilia || "",
    });
  };

  const aoSubmeter = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return addToast?.("Informe o nome", "error");
    if (!form.familia.trim()) return addToast?.("Escolha ou crie uma família", "error");
    setSalvando(true);
    try {
      const payload = { nome: form.nome.trim(), familia: familiaParaSalvar(form.familia), tipo: tipoParaSalvar(form.tipo), descricao: form.descricao.trim(), subfamilia: form.subfamilia.trim() };
      if (modal.id) await atualizar(modal.id, payload);
      else await criar(payload);
      addToast?.(modal.id ? "Recurso atualizado" : "Recurso criado", "success");
      setModal({ aberto: false, id: null });
      await carregar();
    } catch (err) {
      addToast?.(err.response?.data?.erro || "Erro na operação", "error");
    } finally {
      setSalvando(false);
    }
  };

  const confirmarEliminacao = async () => {
    if (!eliminar) return;
    setDeletando(true);
    try {
      await remover(eliminar.id);
      setCategorias((prev) => prev.filter((c) => c.id !== eliminar.id));
      addToast?.("Recurso removido", "success");
      setEliminar(null);
    } catch (err) {
      addToast?.(err.response?.data?.erro || "Erro ao remover", "error");
    } finally {
      setDeletando(false);
    }
  };

  const abrirGerirServicos = async () => {
    setModalServicos(true);
    setCarregandoServicos(true);
    try {
      const srvData = await listarServicos().catch(() => []);
      const listaSrv = Array.isArray(srvData) ? srvData : srvData?.data ?? [];
      setServicos(listaSrv);
    } catch {
      addToast?.("Erro ao carregar serviços", "error");
    } finally {
      setCarregandoServicos(false);
    }
  };

  const abrirNovoServico = () => { setModalServico({ aberto: true, id: null }); setFormServico({ nome: "", descricao: "" }); };
  const abrirEditarServico = (s) => {
    setModalServico({ aberto: true, id: s.id });
    setFormServico({ nome: s.nome || "", descricao: s.descricao || "" });
  };

  const aoSubmeterServico = async (e) => {
    e.preventDefault();
    if (!formServico.nome.trim()) return addToast?.("Nome é obrigatório", "error");
    setSalvandoServico(true);
    try {
      const dados = { nome: formServico.nome.trim(), descricao: formServico.descricao.trim() };
      if (modalServico.id) await atualizarServico(modalServico.id, dados);
      else await criarServico(dados);
      addToast?.(modalServico.id ? "Serviço atualizado" : "Serviço criado", "success");
      setModalServico({ aberto: false, id: null });
      const data = await listarServicos();
      setServicos(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      addToast?.(err.response?.data?.erro || "Erro ao salvar", "error");
    } finally {
      setSalvandoServico(false);
    }
  };

  const confirmarEliminarServico = async () => {
    if (!eliminarServico) return;
    try {
      await removerServico(eliminarServico.id);
      setServicos((prev) => prev.filter((s) => s.id !== eliminarServico.id));
      addToast?.("Serviço removido", "success");
      setEliminarServico(null);
    } catch (err) {
      addToast?.(err.response?.data?.erro || "Erro ao remover", "error");
    }
  };

  if (carregando) return <ListSkeleton count={4} />;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground tracking-tight">Recursos</h1>
          <p className="text-muted-foreground mt-0.5 text-xs">Classificação por categoria, família, sub-família, tipo e descrição</p>
        </div>
        <Button variant="outline" onClick={abrirGerirServicos}>
          <Icon name="home_repair_service" className="text-lg" /> Serviços
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIAS_FILTRO.map((f) => (
          <button
            key={f.value}
            onClick={() => setAbaTipo(f.value)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${abaTipo === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
          >
            <Icon name={f.icon} className="text-sm mr-1.5 align-[-2px]" />
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, sub-família..."
            className={`${inputCls} pl-10`}
          />
        </div>
        <Button onClick={() => abrirNova()}>
          <Icon name="add" className="text-lg" /> Novo
        </Button>
      </div>

      {!carregando && categoriasMateriais.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Icon name="category" className="text-4xl text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Ainda não existem recursos desta categoria.</p>
        </div>
      )}

      {!carregando && categoriasMateriais.length > 0 && (
        <>
          {filtered.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-10 text-center">
              <Icon name="search_off" className="text-4xl text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum recurso encontrado.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const fam = todosFamilias[normalizarFamilia(c.familia)] || { label: c.familia || "—", icon: "label", classe: "text-muted-foreground" };
              const tipo = tiposItem[normalizarTipoItem(c.tipo)];
              return (
                <div key={c.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon name={fam.icon} className="text-lg text-muted-foreground" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{c.nome}</h3>
                        {c.descricao && <p className="text-[11px] text-muted-foreground truncate">{c.descricao}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">{tipo.label}</Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground border-t border-border pt-3">
                    <span>Família: <strong className="text-foreground font-medium">{fam.label}</strong></span>
                    {c.subfamilia && <span>• Sub: <strong className="text-foreground font-medium">{c.subfamilia}</strong></span>}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => abrirEdicao(c)}>
                      <Icon name="edit" className="text-sm" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEliminar(c)} className="text-destructive">
                      <Icon name="delete" className="text-sm" /> Remover
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Modal open={modal.aberto} onClose={() => setModal({ aberto: false, id: null })} title={modal.id ? "Editar Recurso" : "Novo Recurso"} icon="category" size="lg"
        footer={<>
          <Button type="button" variant="outline" onClick={() => setModal({ aberto: false, id: null })}>Cancelar</Button>
          <Button type="submit" form="form-categoria" loading={salvando}><Icon name="save" className="text-lg" /> Guardar</Button>
        </>}
      >
        <form id="form-categoria" onSubmit={aoSubmeter} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nome *</label>
              <input required value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} className={inputCls} placeholder="Ex: Papel Couché 150g" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Família *</label>
              <CreatableSelect
                required
                value={form.familia}
                options={Object.entries(todosFamilias).map(([key, cfg]) => ({ id: cfg.label, label: cfg.label }))}
                placeholder="Escolher uma família..."
                createLabel="Criar nova família"
                onChange={(label) => setForm((p) => ({ ...p, familia: label }))}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sub-família</label>
              <input value={form.subfamilia} onChange={(e) => setForm((p) => ({ ...p, subfamilia: e.target.value }))} className={inputCls} placeholder="Ex: Couché, Impressão Digital" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo *</label>
              <CreatableSelect
                required
                value={form.tipo}
                options={tipoRecursoOptions.map((t) => ({ id: t.label, label: t.label }))}
                placeholder="Escolher um tipo..."
                createLabel="Criar novo tipo"
                onChange={(label) => setForm((p) => ({ ...p, tipo: label }))}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</label>
              <textarea rows={2} value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Descrição do recurso..." />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(eliminar)} onClose={() => setEliminar(null)} onConfirm={confirmarEliminacao} loading={deletando} title="Remover recurso"
        description={eliminar ? `Remover "${eliminar.nome}"?` : ""} />

      <Modal open={modalServicos} onClose={() => setModalServicos(false)} title="Gerir Serviços" icon="home_repair_service" size="lg"
        footer={<Button type="button" variant="outline" onClick={() => setModalServicos(false)}>Fechar</Button>}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">{servicos.length} serviço(s) registado(s)</p>
            <Button size="sm" onClick={abrirNovoServico}><Icon name="add" className="text-sm" /> Novo Serviço</Button>
          </div>
          {carregandoServicos ? <ListSkeleton count={3} /> : servicos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon name="home_repair_service" className="text-3xl mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhum serviço registado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {servicos.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 bg-muted/50 rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{s.nome}</p>
                    {s.descricao && <p className="text-xs text-muted-foreground truncate">{s.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => abrirEditarServico(s)} title="Editar"><Icon name="edit" className="text-sm" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setEliminarServico(s)} title="Remover"><Icon name="delete" className="text-sm text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={modalServico.aberto} onClose={() => setModalServico({ aberto: false, id: null })} title={modalServico.id ? "Editar Serviço" : "Novo Serviço"} icon="home_repair_service"
        footer={<>
          <Button type="button" variant="outline" onClick={() => setModalServico({ aberto: false, id: null })}>Cancelar</Button>
          <Button type="submit" form="form-servico" loading={salvandoServico}><Icon name="save" className="text-lg" /> Guardar</Button>
        </>}
      >
        <form id="form-servico" onSubmit={aoSubmeterServico} className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nome *</span>
            <input required value={formServico.nome} onChange={(e) => setFormServico((p) => ({ ...p, nome: e.target.value }))} className={inputCls} placeholder="Ex: Impressão Digital, Laminação" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</span>
            <textarea value={formServico.descricao} onChange={(e) => setFormServico((p) => ({ ...p, descricao: e.target.value }))} className={`${inputCls} min-h-[60px]`} placeholder="Descrição do serviço..." />
          </label>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(eliminarServico)} onClose={() => setEliminarServico(null)} onConfirm={confirmarEliminarServico} title="Remover serviço"
        description={eliminarServico ? `Remover "${eliminarServico.nome}"?` : ""} />

      <footer className="p-6 text-center border-t bg-muted/30 rounded-xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
