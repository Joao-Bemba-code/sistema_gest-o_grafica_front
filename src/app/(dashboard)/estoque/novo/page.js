// ═══════════════════════════════════════════════════════════════
// app/categorias/page.jsx
// ═══════════════════════════════════════════════════════════════
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Modal from "@/components/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import { inputCls, familias, familiasServico, tiposItem, normalizarFamilia, normalizarTipoItem, tipoRecursoOptions } from "@/lib/estoque";
import NumeroInput from "@/components/ui/NumeroInput";
import CreatableSelect from "@/components/ui/CreatableSelect";
import { listar, criar, atualizar, remover } from "@/services/categorias";
import { listar as listarServicos, criar as criarServico, atualizar as atualizarServico, remover as removerServico } from "@/services/servicos";
import { buscarOrganizacao, guardarOrganizacao } from "@/services/configuracoes";
import FilterBar, { useFilter } from "@/components/ui/FilterBar";
import { useOpcoesCategoria } from "@/hooks/useOpcoesCategoria";

const blankForm = { familia: "", subfamilia: "", tipo: "Artigo / Produto", descricao: "" };
const todosFamiliasFixas = { ...familias, ...familiasServico };

function familiaParaSalvar(texto, todosFamilias) {
  const t = String(texto || "").trim();
  if (!t) return "papeis";
  const entrada = Object.entries(todosFamilias).find(
    ([, cfg]) => cfg.label.toLowerCase() === t.toLowerCase()
  );
  return entrada ? entrada[0] : t;
}

function tipoParaSalvar(texto) {
  const t = String(texto || "").trim();
  const entrada = tipoRecursoOptions.find(
    (o) => o.label.toLowerCase() === t.toLowerCase()
  );
  return entrada ? entrada.valor : t;
}

const RECURSO_META = {
  materia_prima: { label: "Matéria-Prima", icon: "inventory", classe: "text-blue-500 bg-blue-500/10" },
  artigo: { label: "Artigo / Produto", icon: "inventory_2", classe: "text-emerald-500 bg-emerald-500/10" },
  produto_acabado: { label: "Produto Acabado", icon: "inventory_2", classe: "text-emerald-500 bg-emerald-500/10" },
  servico: { label: "Serviço", icon: "home_repair_service", classe: "text-violet-500 bg-violet-500/10" },
  servicos: { label: "Serviço", icon: "home_repair_service", classe: "text-violet-500 bg-violet-500/10" },
  maquina: { label: "Maquinaria", icon: "precision_manufacturing", classe: "text-slate-500 bg-slate-500/10" },
  funcionario: { label: "Funcionário", icon: "groups", classe: "text-amber-500 bg-amber-500/10" },
  colaborador: { label: "Colaborador", icon: "group", classe: "text-cyan-500 bg-cyan-500/10" },
  consumiveis: { label: "Consumíveis", icon: "local_fire_department", classe: "text-orange-500 bg-orange-500/10" },
  materiais: { label: "Materiais", icon: "inventory", classe: "text-blue-500 bg-blue-500/10" },
  ferramentas: { label: "Ferramentas", icon: "handyman", classe: "text-gray-500 bg-gray-500/10" },
  equipamentos: { label: "Equipamentos", icon: "precision_manufacturing", classe: "text-indigo-500 bg-indigo-500/10" },
};

function tipoChave(v) {
  const chave = String(v || "").trim();
  if (!chave) return "";
  const txt = chave.toLowerCase();
  if (RECURSO_META[txt]) return txt;
  const n = normalizarTipoItem(chave);
  if (RECURSO_META[n]) return n;
  return `custom:${txt}`;
}

function normalizarSubfamilia(s) {
  return String(s || "").trim().toLowerCase();
}

function categoriaLabel(c, todosFamilias) {
  const famCfg = todosFamilias[normalizarFamilia(c?.familia)];
  const tipoCfg = tiposItem[normalizarTipoItem(c?.tipo)];
  return [
    famCfg?.label || c?.familia,
    c?.subfamilia,
    tipoCfg?.label || c?.tipo,
  ].filter(Boolean).join(" › ");
}

// ─────────────────────────────────────────────────────────────
// Hook: arrasto da modal
// ─────────────────────────────────────────────────────────────
function useArrastavel({ ativo }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  useEffect(() => {
    setPos({ x: 0, y: 0 });
    if (!ativo) setDragging(false);
  }, [ativo]);

  const onHeaderMouseDown = useCallback((e) => {
    if (e.target.closest("button")) return;
    if (typeof window !== "undefined" && window.innerWidth < 640) return;
    e.preventDefault();
    setDragging(true);
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };
  }, [pos.x, pos.y]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      setPos({
        x: startRef.current.posX + dx,
        y: startRef.current.posY + dy,
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  return { pos, dragging, onHeaderMouseDown };
}

export default function CategoriasPage() {
  const { addToast } = useToast();
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState({ aberto: false, id: null });
  const [form, setForm] = useState(blankForm);
  const [salvando, setSalvando] = useState(false);
  const [eliminar, setEliminar] = useState(null);
  const [deletando, setDeletando] = useState(false);

  const [modalDuplicar, setModalDuplicar] = useState({ aberto: false, origem: null });
  const [formDuplicar, setFormDuplicar] = useState(blankForm);
  const [salvandoDuplicar, setSalvandoDuplicar] = useState(false);

  const [servicos, setServicos] = useState([]);
  const [modalServicos, setModalServicos] = useState(false);
  const [carregandoServicos, setCarregandoServicos] = useState(false);
  const [modalServico, setModalServico] = useState({ aberto: false, id: null });
  const [formServico, setFormServico] = useState({ nome: "", descricao: "" });
  const [salvandoServico, setSalvandoServico] = useState(false);
  const [eliminarServico, setEliminarServico] = useState(null);
  const [valorHoraServicos, setValorHoraServicos] = useState("");
  const [salvandoValorHora, setSalvandoValorHora] = useState(false);

  const [subFiltro, setSubFiltro] = useState("todas");
  const [subSubFiltro, setSubSubFiltro] = useState("todas");

  const dragCategoria = useArrastavel({ ativo: modal.aberto });
  const dragDuplicar = useArrastavel({ ativo: modalDuplicar.aberto });

  // ═══ OPÇÕES DINÂMICAS (backend + fixas) ═══
  const opcoesCategoria = useOpcoesCategoria(categorias);

  // Mapa completo de famílias (fixas + backend) para usar em labels
  const todosFamilias = useMemo(() => {
    const mapa = { ...todosFamiliasFixas };
    opcoesCategoria.familias.forEach((f) => {
      if (!mapa[f.value]) {
        mapa[f.value] = { label: f.label, icon: f.icon || "label", classe: f.classe };
      }
    });
    return mapa;
  }, [opcoesCategoria.familias]);

  const tiposRegistados = useMemo(() => {
    const mapa = new Map();
    categorias.forEach((c) => {
      const k = tipoChave(c.tipo);
      if (!k || mapa.has(k)) return;
      const meta = RECURSO_META[k] || {};
      mapa.set(k, {
        value: k,
        label: meta.label || c.tipo,
        icon: meta.icon || "label",
        classe: meta.classe || "bg-surface-variant",
      });
    });
    return [...mapa.values()];
  }, [categorias]);

  const filterConfig = useMemo(() => [
    { value: "todos", label: "Todos", icon: "filter_list" },
    ...tiposRegistados.map((f) => ({
      value: f.value,
      label: f.label,
      icon: f.icon,
      predicate: (item) => tipoChave(item.tipo) === f.value,
    })),
  ], [tiposRegistados]);

  const categoriasComBusca = useMemo(() => categorias.map((c) => {
    const famCfg = todosFamilias[normalizarFamilia(c.familia)];
    const tipoCfg = tiposItem[normalizarTipoItem(c.tipo)];
    const buscavel = [
      famCfg?.label || c.familia,
      c.subfamilia,
      tipoCfg?.label || c.tipo,
      c.descricao,
    ].filter(Boolean).join(" ").toLowerCase();
    return { ...c, _busca: buscavel };
  }), [categorias, todosFamilias]);

  const { search, setSearch, activeFilter, setActiveFilter, filtered, total } = useFilter({
    items: categoriasComBusca,
    searchFields: ["_busca", "familia", "subfamilia", "descricao"],
    filterConfig,
  });

  const aoMudarFiltro = useCallback((v) => {
    setActiveFilter(v);
    setSubFiltro("todas");
    setSubSubFiltro("todas");
  }, [setActiveFilter]);

  const aoMudarSubFiltro = useCallback((v) => {
    setSubFiltro(v);
    setSubSubFiltro("todas");
  }, []);

  const subFiltros = useMemo(() => {
    if (activeFilter === "todos") return [];
    const metas = new Map();
    categorias.forEach((c) => {
      if (tipoChave(c.tipo) !== activeFilter) return;
      const chave = normalizarFamilia(c.familia);
      if (!chave || metas.has(chave)) return;
      const cfg = todosFamilias[chave] || {};
      metas.set(chave, {
        value: chave,
        label: cfg.label || c.familia || chave,
        icon: cfg.icon || "label",
      });
    });
    return [...metas.values()];
  }, [categorias, activeFilter, todosFamilias]);

  const subSubFiltros = useMemo(() => {
    if (activeFilter === "todos") return [];
    if (!subFiltro || subFiltro === "todas") return [];
    const metas = new Map();
    categorias.forEach((c) => {
      if (tipoChave(c.tipo) !== activeFilter) return;
      if (normalizarFamilia(c.familia) !== subFiltro) return;
      const bruta = String(c.subfamilia || "").trim();
      if (!bruta) return;
      const chave = normalizarSubfamilia(bruta);
      if (metas.has(chave)) return;
      metas.set(chave, { value: chave, label: bruta });
    });
    return [...metas.values()].sort((a, b) => a.label.localeCompare(b.label, "pt"));
  }, [categorias, activeFilter, subFiltro]);

  const visiveis = useMemo(() => {
    let lista = filtered;
    if (subFiltro && subFiltro !== "todas") {
      lista = lista.filter((i) => normalizarFamilia(i.familia) === subFiltro);
    }
    if (subSubFiltro && subSubFiltro !== "todas") {
      lista = lista.filter((i) => normalizarSubfamilia(i.subfamilia) === subSubFiltro);
    }
    return lista;
  }, [filtered, subFiltro, subSubFiltro]);

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

  const categoriaParaForm = useCallback((categoria) => ({
    familia: todosFamilias[normalizarFamilia(categoria.familia)]?.label || categoria.familia || "",
    subfamilia: categoria.subfamilia || "",
    tipo: tipoRecursoOptions.find((o) => o.valor === categoria.tipo)?.label || String(categoria.tipo || "Artigo / Produto"),
    descricao: categoria.descricao || "",
  }), [todosFamilias]);

  const abrirNova = (tipoChaveArg) => {
    const label = tipoRecursoOptions.find((o) => o.valor === tipoChaveArg)?.label;
    setModal({ aberto: true, id: null });
    setForm({ ...blankForm, tipo: label || blankForm.tipo });
  };

  const abrirEdicao = (categoria) => {
    setModal({ aberto: true, id: categoria.id });
    setForm(categoriaParaForm(categoria));
  };

  const abrirDuplicar = (categoria) => {
    setModalDuplicar({ aberto: true, origem: categoria });
    setFormDuplicar(categoriaParaForm(categoria));
  };

  const fecharDuplicar = () => {
    setModalDuplicar({ aberto: false, origem: null });
    setFormDuplicar(blankForm);
  };

  const aoSubmeter = async (e) => {
    e.preventDefault();
    if (!form.familia.trim()) return addToast?.("Escolha ou crie uma família", "error");
    if (salvando) return;
    setSalvando(true);
    try {
      const payload = {
        familia: familiaParaSalvar(form.familia, todosFamilias),
        subfamilia: form.subfamilia.trim(),
        tipo: tipoParaSalvar(form.tipo),
        descricao: form.descricao.trim(),
      };
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

  const aoSubmeterDuplicar = async (e) => {
    e.preventDefault();
    if (!formDuplicar.familia.trim()) return addToast?.("Escolha ou crie uma família", "error");
    if (salvandoDuplicar) return;
    setSalvandoDuplicar(true);
    try {
      const payload = {
        familia: familiaParaSalvar(formDuplicar.familia, todosFamilias),
        subfamilia: formDuplicar.subfamilia.trim(),
        tipo: tipoParaSalvar(formDuplicar.tipo),
        descricao: formDuplicar.descricao.trim(),
      };
      await criar(payload);
      addToast?.("Categoria duplicada com sucesso", "success");
      fecharDuplicar();
      await carregar();
    } catch (err) {
      addToast?.(err.response?.data?.erro || "Erro ao duplicar categoria", "error");
    } finally {
      setSalvandoDuplicar(false);
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
      const [srvData, orgData] = await Promise.all([
        listarServicos().catch(() => []),
        buscarOrganizacao().catch(() => null),
      ]);
      const listaSrv = Array.isArray(srvData) ? srvData : srvData?.data ?? [];
      setServicos(listaSrv);
      if (orgData && orgData.valor_hora_servicos != null) {
        setValorHoraServicos(String(orgData.valor_hora_servicos));
      } else {
        setValorHoraServicos("");
      }
    } catch {
      addToast?.("Erro ao carregar serviços", "error");
    } finally {
      setCarregandoServicos(false);
    }
  };

  const guardarValorHoraServicos = async () => {
    setSalvandoValorHora(true);
    try {
      await guardarOrganizacao({ valor_hora_servicos: Number(valorHoraServicos) || 0 });
      addToast?.("Valor por hora guardado", "success");
    } catch (err) {
      addToast?.(err.response?.data?.erro || "Erro ao guardar valor por hora", "error");
    } finally {
      setSalvandoValorHora(false);
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
    if (salvandoServico) return;
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
          <h1 className="font-sans text-2xl font-semibold text-foreground tracking-tight">Categorias</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={abrirGerirServicos}>
            <Icon name="home_repair_service" className="text-lg" /> Serviços
          </Button>
          <Button onClick={() => abrirNova()}>
            <Icon name="add" className="text-lg" /> Novo
          </Button>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Pesquisar por nome, família, subfamília, grupo..."
        filters={filterConfig}
        activeFilter={activeFilter}
        onFilterChange={aoMudarFiltro}
        count={total}
        countLabel="categorias"
      />

      {subFiltros.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => aoMudarSubFiltro("todas")}
            className={`pill transition-colors ${subFiltro === "todas" ? "nav-pill" : "pill-muted hover:border-primary hover:text-primary"}`}
          >
            Todas famílias
          </button>
          {subFiltros.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => aoMudarSubFiltro(f.value)}
              className={`pill transition-colors ${subFiltro === f.value ? "nav-pill" : "pill-muted hover:border-primary hover:text-primary"}`}
            >
              <Icon name={f.icon} className="text-sm" />
              {f.label}
            </button>
          ))}
        </div>
      )}

      {subSubFiltros.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-4 border-l-2 border-primary/30">
          <button
            type="button"
            onClick={() => setSubSubFiltro("todas")}
            className={`pill transition-colors ${subSubFiltro === "todas" ? "nav-pill" : "pill-muted hover:border-primary hover:text-primary"}`}
          >
            Todas subfamílias
          </button>
          {subSubFiltros.map((sf) => (
            <button
              key={sf.value}
              type="button"
              onClick={() => setSubSubFiltro(sf.value)}
              className={`pill transition-colors ${subSubFiltro === sf.value ? "nav-pill" : "pill-muted hover:border-primary hover:text-primary"}`}
            >
              <Icon name="label" className="text-sm" />
              {sf.label}
            </button>
          ))}
        </div>
      )}

      {!carregando && categorias.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Icon name="category" className="text-4xl text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Ainda não existem categorias deste tipo.</p>
        </div>
      )}

      {!carregando && categorias.length > 0 && (
        <>
          {visiveis.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-10 text-center">
              <Icon name="search_off" className="text-4xl text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {subSubFiltro !== "todas"
                  ? "Nenhuma categoria nesta subfamília."
                  : subFiltro !== "todas"
                  ? "Nenhuma categoria nesta família."
                  : "Nenhuma categoria encontrada."}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visiveis.map((c) => {
              const fam = todosFamilias[normalizarFamilia(c.familia)] || { label: c.familia || "—", icon: "label", classe: "text-muted-foreground" };
              const tipo = tiposItem[normalizarTipoItem(c.tipo)] || { label: c.tipo || "—" };
              return (
                <div key={c.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon name={fam.icon} className="text-lg text-muted-foreground" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground leading-snug break-words">
                        {fam.label}
                      </h3>
                      <Badge variant="outline" className="mt-1.5 text-[10px] px-1.5 py-0.5 whitespace-normal break-words leading-tight max-w-full">
                        <Icon name="label" className="text-[10px] mr-1 shrink-0" />
                        <span className="break-words">{tipo.label}</span>
                      </Badge>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground border-t border-border pt-3 flex flex-wrap gap-x-1.5 gap-y-0.5">
                    <span className="shrink-0">Subfamília:</span>
                    <strong className="text-foreground font-medium break-words">{c.subfamilia || "—"}</strong>
                  </div>

                  {c.descricao && (
                    <p className="text-[11px] text-muted-foreground border-t border-border pt-2 line-clamp-2 break-words">
                      {c.descricao}
                    </p>
                  )}

                  <div className="flex flex-wrap justify-end gap-1 pt-2 border-t border-border mt-auto">
                    <Button variant="outline" size="sm" onClick={() => abrirDuplicar(c)} title="Duplicar esta categoria">
                      <Icon name="content_copy" className="text-sm" />
                      <span className="hidden sm:inline">Duplicar</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => abrirEdicao(c)} title="Editar">
                      <Icon name="edit" className="text-sm" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEliminar(c)} className="text-destructive" title="Remover">
                      <Icon name="delete" className="text-sm" />
                      <span className="hidden sm:inline">Remover</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─────────── MODAL: CRIAR / EDITAR (arrastável) ─────────── */}
      <Modal
        open={modal.aberto}
        onClose={() => setModal({ aberto: false, id: null })}
        title={modal.id ? "Editar Categoria" : "Nova Categoria"}
        icon="category"
        size="lg"
        dragPos={dragCategoria.pos}
        dragging={dragCategoria.dragging}
        onHeaderMouseDown={dragCategoria.onHeaderMouseDown}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setModal({ aberto: false, id: null })}>Cancelar</Button>
            <Button type="submit" form="form-categoria" loading={salvando}>
              <Icon name="save" className="text-lg" /> Guardar
            </Button>
          </>
        }
      >
        <form id="form-categoria" onSubmit={aoSubmeter} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Família *</label>
              <CreatableSelect
                required
                value={form.familia}
                options={opcoesCategoria.familias.map((f) => ({ id: f.label, label: f.label, icon: f.icon }))}
                placeholder="Escolher uma família..."
                createLabel="Criar nova família"
                onChange={(label) => setForm((p) => ({ ...p, familia: label }))}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subfamília</label>
              <input value={form.subfamilia} onChange={(e) => setForm((p) => ({ ...p, subfamilia: e.target.value }))} className={inputCls} placeholder="Ex: Couché, Offset..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Grupo *</label>
              <CreatableSelect
                required
                value={form.tipo}
                options={opcoesCategoria.grupos.map((g) => ({ id: g.label, label: g.label, icon: g.icon }))}
                placeholder="Escolher um grupo..."
                createLabel="Criar novo grupo"
                onChange={(label) => setForm((p) => ({ ...p, tipo: label }))}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</label>
              <textarea rows={2} value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Descrição da categoria..." />
            </div>
          </div>
        </form>
      </Modal>

      {/* ─────────── MODAL: DUPLICAR (arrastável) ─────────── */}
      <Modal
        open={modalDuplicar.aberto}
        onClose={fecharDuplicar}
        title="Duplicar Categoria"
        icon="content_copy"
        size="lg"
        dragPos={dragDuplicar.pos}
        dragging={dragDuplicar.dragging}
        onHeaderMouseDown={dragDuplicar.onHeaderMouseDown}
        footer={
          <>
            <Button type="button" variant="outline" onClick={fecharDuplicar}>Cancelar</Button>
            <Button type="submit" form="form-duplicar-categoria" loading={salvandoDuplicar}>
              <Icon name="content_copy" className="text-lg" /> Criar Cópia
            </Button>
          </>
        }
      >
        <form id="form-duplicar-categoria" onSubmit={aoSubmeterDuplicar} className="space-y-5">
          {modalDuplicar.origem && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2.5">
              <Icon name="info" className="text-primary text-base shrink-0 mt-0.5" />
              <div className="text-xs text-foreground">
                <p className="font-semibold">A duplicar a partir de:</p>
                <p className="text-muted-foreground mt-0.5 break-words">{categoriaLabel(modalDuplicar.origem, todosFamilias)}</p>
                <p className="text-muted-foreground mt-1.5 text-[11px]">
                  Altera apenas os campos que precisares. Será criada uma <strong>nova categoria</strong>.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Família *</label>
              <CreatableSelect
                required
                value={formDuplicar.familia}
                options={opcoesCategoria.familias.map((f) => ({ id: f.label, label: f.label, icon: f.icon }))}
                placeholder="Escolher uma família..."
                createLabel="Criar nova família"
                onChange={(label) => setFormDuplicar((p) => ({ ...p, familia: label }))}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subfamília</label>
              <input
                value={formDuplicar.subfamilia}
                onChange={(e) => setFormDuplicar((p) => ({ ...p, subfamilia: e.target.value }))}
                className={inputCls}
                placeholder="Ex: Couché, Offset..."
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Grupo *</label>
              <CreatableSelect
                required
                value={formDuplicar.tipo}
                options={opcoesCategoria.grupos.map((g) => ({ id: g.label, label: g.label, icon: g.icon }))}
                placeholder="Escolher um grupo..."
                createLabel="Criar novo grupo"
                onChange={(label) => setFormDuplicar((p) => ({ ...p, tipo: label }))}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</label>
              <textarea rows={2} value={formDuplicar.descricao} onChange={(e) => setFormDuplicar((p) => ({ ...p, descricao: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Descrição da categoria..." />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(eliminar)} onClose={() => setEliminar(null)} onConfirm={confirmarEliminacao} loading={deletando} title="Remover categoria"
        description={eliminar ? `Remover a categoria "${categoriaLabel(eliminar, todosFamilias)}"?` : ""} />

      {/* ─────────── MODAL SERVIÇOS ─────────── */}
      <Modal open={modalServicos} onClose={() => setModalServicos(false)} title="Gerir Serviços" icon="home_repair_service" size="lg"
        footer={<Button type="button" variant="outline" onClick={() => setModalServicos(false)}>Fechar</Button>}
      >
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor por hora dos serviços (Kz)</label>
              <NumeroInput
                value={valorHoraServicos}
                onChange={(e) => setValorHoraServicos(e.target.value)}
                className={inputCls}
                placeholder="0"
              />
            </div>
            <Button size="sm" onClick={guardarValorHoraServicos} loading={salvandoValorHora}>
              <Icon name="save" className="text-sm" /> Guardar valor
            </Button>
          </div>
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