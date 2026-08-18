"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Modal from "@/components/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import { inputCls, grupos, normalizarGrupo, tiposCampoEspecificacao } from "@/lib/estoque";
import { listar, criar, atualizar, remover } from "@/services/categorias";
import { useSyncRefresh } from "@/contexts/SyncContext";

const TIPOS_CATEGORIA = ["material", "servico", "produto"];

const grupoVariant = {
  papel: "info",
  insumo: "warning",
  acabamento: "secondary",
  produto: "success",
};

function gerarChave(rotulo) {
  const chave = rotulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return chave || `campo_${Date.now()}`;
}

const campoVazio = () => ({ rotulo: "", chave: "", tipo: "texto", unidade: "", opcoes: "", obrigatorio: false });

function CampoLinha({ campo, index, onChange, onRemover }) {
  const atualizar = (k, v) => onChange(index, k, v);
  return (
    <div className="rounded-xl border border-outline-variant/40 bg-muted/30 p-3 space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
        <div className="sm:col-span-4 flex flex-col gap-1">
          <label className="text-[9px] font-semibold text-muted-foreground uppercase">Rótulo *</label>
          <input value={campo.rotulo} onChange={(e) => atualizar("rotulo", e.target.value)} className={inputCls} placeholder="Ex: Cor" />
        </div>
        <div className="sm:col-span-3 flex flex-col gap-1">
          <label className="text-[9px] font-semibold text-muted-foreground uppercase">Tipo</label>
          <select value={campo.tipo} onChange={(e) => atualizar("tipo", e.target.value)} className={inputCls}>
            {tiposCampoEspecificacao.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
          </select>
        </div>
        {campo.tipo === "numero" && (
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-[9px] font-semibold text-muted-foreground uppercase">Unidade</label>
            <input value={campo.unidade} onChange={(e) => atualizar("unidade", e.target.value)} className={inputCls} placeholder="Ex: g/m²" />
          </div>
        )}
        <div className={`flex flex-col gap-1 ${campo.tipo === "numero" ? "sm:col-span-2" : "sm:col-span-2"}`}>
          <label className="text-[9px] font-semibold text-muted-foreground uppercase">Obrigatório</label>
          <label className="flex items-center h-10 px-2 rounded-xl border border-input bg-background cursor-pointer">
            <input type="checkbox" checked={!!campo.obrigatorio} onChange={(e) => atualizar("obrigatorio", e.target.checked)} className="w-4 h-4 accent-primary" />
          </label>
        </div>
        <div className="sm:col-span-1 flex justify-end">
          <Button type="button" variant="ghost" size="icon" onClick={onRemover} title="Remover campo" className="text-error">
            <Icon name="close" className="text-sm" />
          </Button>
        </div>
      </div>
      {campo.tipo === "selecao" && (
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-semibold text-muted-foreground uppercase">Opções (separadas por vírgula)</label>
          <input value={campo.opcoes} onChange={(e) => atualizar("opcoes", e.target.value)} className={inputCls} placeholder="Ex: Branco, Creme, Off-white" />
        </div>
      )}
    </div>
  );
}

export default function CategoriasPage() {
  const { addToast } = useToast();
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState({ aberto: false, id: null });
  const [form, setForm] = useState({ nome: "", grupo: "papel", tipo: "material", campos: [] });
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    carregar();
  }, [carregar]);

  useSyncRefresh(carregar, [carregar]);

  /* eslint-enable react-hooks/set-state-in-effect */

  const abrirNova = () => {
    setModal({ aberto: true, id: null });
    setForm({ nome: "", grupo: "papel", tipo: "material", campos: [] });
  };

  const abrirEdicao = (categoria) => {
    setModal({ aberto: true, id: categoria.id });
    setForm({
      nome: categoria.nome || "",
      grupo: categoria.grupo || "papel",
      tipo: categoria.tipo || "material",
      campos: (categoria.campos_especificacao || []).map((c) => ({
        rotulo: c.rotulo || "",
        chave: c.chave || "",
        tipo: c.tipo || "texto",
        unidade: c.unidade || "",
        opcoes: Array.isArray(c.opcoes) ? c.opcoes.join(", ") : (c.opcoes || ""),
        obrigatorio: !!c.obrigatorio,
      })),
    });
  };

  const aoMudarCampo = (idx, k, v) => {
    setForm((p) => {
      const campos = [...p.campos];
      campos[idx] = { ...campos[idx], [k]: v };
      return { ...p, campos };
    });
  };

  const adicionarCampo = () => setForm((p) => ({ ...p, campos: [...p.campos, campoVazio()] }));
  const removerCampo = (idx) => setForm((p) => ({ ...p, campos: p.campos.filter((_, i) => i !== idx) }));

  const aoSubmeter = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      addToast?.("Informe o nome da categoria", "error");
      return;
    }
    const vistos = new Set();
    const campos = form.campos
      .map((c) => {
        const rotulo = c.rotulo.trim();
        if (!rotulo) return null;
        if (vistos.has(rotulo.toLowerCase())) return null;
        vistos.add(rotulo.toLowerCase());
        const opcoes = c.tipo === "selecao" ? c.opcoes.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
        const campo = { rotulo, chave: c.chave || gerarChave(rotulo), tipo: c.tipo, obrigatorio: !!c.obrigatorio };
        if (opcoes && opcoes.length) campo.opcoes = opcoes;
        if (c.tipo === "numero" && c.unidade.trim()) campo.unidade = c.unidade.trim();
        return campo;
      })
      .filter(Boolean);

    setSalvando(true);
    try {
      const payload = { nome: form.nome.trim(), grupo: form.grupo, tipo: form.tipo, campos_especificacao: campos };
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
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Tipos de material e campos de especificação por produto // CAT</p>
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
          <p className="text-sm text-muted-foreground">Ainda não existem categorias. Crie a primeira para organizar o estoque.</p>
        </div>
      )}

      {!carregando && categorias.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categorias.map((c) => {
            const grupo = grupos[normalizarGrupo(c.grupo)];
            const campos = Array.isArray(c.campos_especificacao) ? c.campos_especificacao : [];
            return (
              <div key={c.id} className="obsidian-glass cyber-border rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${grupo.classe}`}>
                      <Icon name={grupo.icon} className="text-xl" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate">{c.nome}</h3>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{grupo.label}</p>
                    </div>
                  </div>
                  <Badge variant={grupoVariant[normalizarGrupo(c.grupo)] || "outline"}>{grupos[normalizarGrupo(c.grupo)].label}</Badge>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-outline-variant/30 pt-3">
                  <span>Tipo: <strong className="text-foreground capitalize">{c.tipo}</strong></span>
                  <span>{campos.length} {campos.length === 1 ? "campo" : "campos"} de especificação</span>
                </div>

                {campos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {campos.slice(0, 5).map((f) => (
                      <span key={f.chave} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground border border-outline-variant/30">
                        {f.rotulo}
                      </span>
                    ))}
                    {campos.length > 5 && <span className="px-2 py-0.5 text-[10px] font-mono text-muted-foreground">+{campos.length - 5}</span>}
                  </div>
                )}

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
        size="xl"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nome *</label>
              <input required value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} className={inputCls} placeholder="Ex: Tintas" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Grupo</label>
              <select value={form.grupo} onChange={(e) => setForm((p) => ({ ...p, grupo: e.target.value }))} className={inputCls}>
                {Object.keys(grupos).filter((g) => g !== "outros").map((g) => <option key={g} value={g}>{grupos[g].label}</option>)}
                <option value="outros">Outros</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))} className={inputCls}>
                {TIPOS_CATEGORIA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-outline-variant/30 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Icon name="straighten" className="text-base text-primary" /> Campos de Especificação
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Defina os atributos que os materiais desta categoria devem ter (ex.: Tinta → Cor, Base, Secagem).</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={adicionarCampo}>
                <Icon name="add_circle" className="text-sm" /> Adicionar campo
              </Button>
            </div>

            {form.campos.length === 0 && (
              <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-outline-variant p-4">
                Sem campos definidos. Os materiais desta categoria usarão os campos padrão do grupo {grupos[form.grupo]?.label || form.grupo}.
              </p>
            )}

            <div className="space-y-3">
              {form.campos.map((campo, idx) => (
                <CampoLinha key={idx} campo={campo} index={idx} onChange={aoMudarCampo} onRemover={() => removerCampo(idx)} />
              ))}
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
