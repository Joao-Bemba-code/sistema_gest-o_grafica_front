"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Modal from "@/components/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import { inputCls, familias, tiposItem, normalizarFamilia, normalizarTipoItem } from "@/lib/estoque";
import { listar, criar, atualizar, remover } from "@/services/categorias";

const blankForm = { nome: "", familia: "papeis", tipo: "materia_prima" };

export default function CategoriasPage() {
  const { addToast } = useToast();
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState({ aberto: false, id: null });
  const [form, setForm] = useState(blankForm);
  const [salvando, setSalvando] = useState(false);
  const [eliminar, setEliminar] = useState(null);
  const [deletando, setDeletando] = useState(false);

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
    const iniciar = async () => {
      try {
        const dados = await listar();
        if (ativo) setCategorias(dados);
      } catch {
        if (ativo) addToast?.("Erro ao carregar categorias", "error");
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    iniciar();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const abrirNova = () => {
    setModal({ aberto: true, id: null });
    setForm(blankForm);
  };

  const abrirEdicao = (categoria) => {
    setModal({ aberto: true, id: categoria.id });
    setForm({
      nome: categoria.nome || "",
      familia: categoria.familia || "papeis",
      tipo: categoria.tipo || "materia_prima",
    });
  };

  const aoSubmeter = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      addToast?.("Informe o nome da categoria", "error");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        familia: form.familia,
        tipo: form.tipo,
      };
      if (modal.id) await atualizar(modal.id, payload);
      else await criar(payload);
      addToast?.(modal.id ? "Categoria atualizada com sucesso" : "Categoria criada com sucesso", "success");
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
      addToast?.("Categoria removida com sucesso", "success");
      setEliminar(null);
    } catch (err) {
      addToast?.(err.response?.data?.erro || "Erro ao remover categoria", "error");
    } finally {
      setDeletando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Categorias</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Classificação: Família, Subfamília, Tipo // CAT</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={abrirNova}>
            <Icon name="add" className="text-lg" /> Nova Categoria
          </Button>
        </div>
      </div>

      {carregando && <ListSkeleton count={4} />}

      {!carregando && categorias.length === 0 && (
        <div className="obsidian-glass rounded-2xl p-10 text-center">
          <Icon name="category" className="text-4xl text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Ainda não existem categorias. Crie a primeira para organizar os materiais.</p>
        </div>
      )}

      {!carregando && categorias.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categorias.map((c) => {
            const fam = familias[normalizarFamilia(c.familia)];
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
                  <span>• Tipo: <strong className="text-foreground">{tipo.label}</strong></span>
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
      )}

      <Modal
        open={modal.aberto}
        onClose={() => setModal({ aberto: false, id: null })}
        title={modal.id ? "Editar Categoria" : "Nova Categoria"}
        icon="category"
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setModal({ aberto: false, id: null })}>Cancelar</Button>
            <Button type="submit" form="form-categoria" loading={salvando}>
              <Icon name="save" className="text-lg" /> Guardar Categoria
            </Button>
          </>
        }
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
                {Object.keys(tiposItem).map((t) => <option key={t} value={t}>{tiposItem[t].label}</option>)}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(eliminar)}
        onClose={() => setEliminar(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title="Remover categoria"
        description={eliminar ? `Tem a certeza que deseja remover a categoria "${eliminar.nome}"? Os materiais associados ficarão sem categoria.` : ""}
      />

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
