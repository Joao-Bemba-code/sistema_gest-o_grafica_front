"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Modal from "@/components/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import FilterBar, { useFilter } from "@/components/ui/FilterBar";
import { inputCls, familias, tiposItem, normalizarTipoItem } from "@/lib/estoque";
import { listar, criar, atualizar, remover } from "@/services/categorias";
import { listar as listarServicos, criar as criarServico, atualizar as atualizarServico, remover as removerServico } from "@/services/servicos";

const blankForm = { nome: "", familia: "papeis", tipo: "materia_prima", validade_dias: "" };

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

  const filterConfig = useMemo(() => [
    { value: "todos", label: "Todos", icon: "apps" },
    ...Object.entries(familias).map(([k, v]) => ({ value: k, label: v.label, icon: v.icon, field: "familia" })),
  ], []);

  const categoriasMateriais = useMemo(() => categorias.filter((c) => c.tipo !== "servico"), [categorias]);

  const { search, setSearch, activeFilter, setActiveFilter, filtered, total } = useFilter({
    items: categoriasMateriais,
    searchFields: ["nome", "subfamilia"],
    filterConfig,
  });

  const carregar = useCallback(async () => {
    try {
      setCategorias(await listar());
    } catch {
      addToast?.("Erro ao carregar categorias", "error");
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
        if (ativo) addToast?.("Erro ao carregar categorias", "error");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [addToast]);

  const abrirNova = () => { setModal({ aberto: true, id: null }); setForm(blankForm); };
  const abrirEdicao = (categoria) => {
    setModal({ aberto: true, id: categoria.id });
    setForm({ nome: categoria.nome || "", familia: categoria.familia || "papeis", tipo: categoria.tipo || "materia_prima", validade_dias: categoria.validade_dias || "" });
  };

  const aoSubmeter = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return addToast?.("Informe o nome da categoria", "error");
    setSalvando(true);
    try {
      const payload = { nome: form.nome.trim(), familia: form.familia, tipo: form.tipo };
      if (form.familia === "produto_quimico" && form.validade_dias) payload.validade_dias = Number(form.validade_dias);
      if (modal.id) await atualizar(modal.id, payload);
      else await criar(payload);
      addToast?.(modal.id ? "Categoria atualizada" : "Categoria criada", "success");
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
      addToast?.("Categoria removida", "success");
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
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Categorias</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Classificação: Família, Subfamília, Tipo // CAT</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={abrirGerirServicos}>
            <Icon name="home_repair_service" className="text-lg" /> Serviços
          </Button>
          <Button onClick={abrirNova}>
            <Icon name="add" className="text-lg" /> Nova Categoria
          </Button>
        </div>
      </div>

      {!carregando && categoriasMateriais.length === 0 && (
        <div className="obsidian-glass rounded-2xl p-10 text-center">
          <Icon name="category" className="text-4xl text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Ainda não existem categorias.</p>
        </div>
      )}

      {!carregando && categoriasMateriais.length > 0 && (
        <>
          <FilterBar search={search} onSearchChange={setSearch} placeholder="Pesquisar categorias..." filters={filterConfig} activeFilter={activeFilter} onFilterChange={setActiveFilter} count={total} countLabel="categorias" />

          {filtered.length === 0 && (
            <div className="obsidian-glass rounded-2xl p-10 text-center">
              <Icon name="search_off" className="text-4xl text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma categoria encontrada.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const fam = familias[c.familia] || { label: c.familia, icon: "label", classe: "text-muted-foreground" };
              const tipo = tiposItem[normalizarTipoItem(c.tipo)];
              return (
                <div key={c.id} className="obsidian-glass cyber-border rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${fam.classe}`}>
                        <Icon name={fam.icon} className="text-xl" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground truncate">{c.nome}</h3>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{fam.label}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{tipo.label}</Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground border-t border-outline-variant/30 pt-3">
                    <span>Família: <strong className="text-foreground">{fam.label}</strong></span>
                    {c.subfamilia && <span>• Sub: <strong className="text-foreground">{c.subfamilia}</strong></span>}
                    {c.validade_dias && <span>• Validade: <strong className="text-foreground">{c.validade_dias} dias</strong></span>}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
                    <Button variant="outline" size="sm" onClick={() => abrirEdicao(c)}>
                      <Icon name="edit" className="text-sm" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEliminar(c)} className="text-error">
                      <Icon name="delete" className="text-sm" /> Remover
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Modal open={modal.aberto} onClose={() => setModal({ aberto: false, id: null })} title={modal.id ? "Editar Categoria" : "Nova Categoria"} icon="category" size="lg"
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
              <select required value={form.familia} onChange={(e) => setForm((p) => ({ ...p, familia: e.target.value }))} className={inputCls}>
                {Object.keys(familias).map((f) => <option key={f} value={f}>{familias[f].label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo *</label>
              <select required value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))} className={inputCls}>
                <option value="materia_prima">Matéria-Prima</option>
                <option value="produto_acabado">Produto Acabado</option>
              </select>
            </div>
            {form.familia === "produto_quimico" && (
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Validade (dias) *</label>
                <input type="number" min="1" required value={form.validade_dias} onChange={(e) => setForm((p) => ({ ...p, validade_dias: e.target.value }))} className={inputCls} placeholder="Ex: 365 — Dias até expirar a partir da fabricação" />
                <p className="text-[10px] text-muted-foreground">Informa a validade em dias para que o sistema avise antes do vencimento</p>
              </div>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(eliminar)} onClose={() => setEliminar(null)} onConfirm={confirmarEliminacao} loading={deletando} title="Remover categoria"
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
                      <p className="font-bold text-sm text-foreground truncate">{s.nome}</p>
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

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
