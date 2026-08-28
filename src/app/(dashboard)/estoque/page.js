"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import FloatButton from "@/components/ui/FloatButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import useEstoque from "@/hooks/useEstoque";
import useMovimentacoes from "@/hooks/useMovimentacoes";
import FilterBar, { useFilter } from "@/components/ui/FilterBar";
import KpiGrid from "@/components/estoque/KpiGrid";
import MaterialCard, { MaterialCardSkeleton } from "@/components/estoque/MaterialCard";
import MovimentacaoModal from "@/components/estoque/MovimentacaoModal";
import MovimentacoesModal from "@/components/estoque/MovimentacoesModal";
import ConversorModal from "@/components/estoque/ConversorModal";
import ReservasModal from "@/components/estoque/ReservasModal";
import EditMaterialModal from "@/components/estoque/EditMaterialModal";
import TransferModal from "@/components/estoque/TransferModal";
import PerdasDesperdicioModal from "@/components/estoque/PerdasDesperdicioModal";
import EmptyState from "@/components/estoque/EmptyState";
import PedidosModal from "@/components/estoque/PedidosModal";
import PedidoFormModal from "@/components/estoque/PedidoFormModal";
import PedidoReceberModal from "@/components/estoque/PedidoReceberModal";
import { normalizarTipoItem } from "@/lib/estoque";
import { gerarFichaMaterialPDF, gerarPedidoPDF } from "@/lib/estoquePdf";
import { listar as listarPedidos, criar as criarPedido, cancelar as cancelarPedido, receber as apiReceberPedido } from "@/services/pedidos";
import { remover as removerMaterial } from "@/services/materiais";
import { useToast } from "@/components/Toast";

const TIPO_META = {
  materia_prima: { label: "Matéria-Prima", icon: "inventory", classe: "text-blue-500 bg-blue-500/10" },
  artigo: { label: "Artigo / Produto", icon: "inventory_2", classe: "text-emerald-500 bg-emerald-500/10" },
  produto_acabado: { label: "Produto Acabado", icon: "inventory_2", classe: "text-emerald-500 bg-emerald-500/10" },
  servico: { label: "Serviço", icon: "home_repair_service", classe: "text-violet-500 bg-violet-500/10" },
  maquina: { label: "Maquinaria", icon: "precision_manufacturing", classe: "text-slate-500 bg-slate-500/10" },
  funcionario: { label: "Funcionário", icon: "groups", classe: "text-amber-500 bg-amber-500/10" },
  colaborador: { label: "Colaborador", icon: "group", classe: "text-cyan-500 bg-cyan-500/10" },
  consumiveis: { label: "Consumíveis", icon: "local_fire_department", classe: "text-orange-500 bg-orange-500/10" },
  materiais: { label: "Materiais", icon: "inventory", classe: "text-blue-500 bg-blue-500/10" },
  ferramentas: { label: "Ferramentas", icon: "handyman", classe: "text-gray-500 bg-gray-500/10" },
  equipamentos: { label: "Equipamentos", icon: "precision_manufacturing", classe: "text-indigo-500 bg-indigo-500/10" },
};

// Agrupa o tipo de uma categoria/material num identificador canónico:
// variantes do mesmo tipo (ex.: "matéria prima" vs "materia_prima") colapsam
// num único grupo. Tipos desconhecidos mantêm-se separados.
function tipoGrupo(v) {
  const chave = String(v || "").trim();
  if (!chave) return "";
  const txt = chave.toLowerCase();
  if (TIPO_META[txt]) return txt;
  const n = normalizarTipoItem(chave);
  if (TIPO_META[n]) return n;
  return `custom:${txt}`;
}

export default function EstoquePage() {
  const { addToast } = useToast();
  const {
    materiais, categorias, fornecedores, clientes, org, formatos,
    carregando, erro, carregar, nomeUsuario, totais, alertas,
    salvarMaterial, registrarMovimentacao, registrarTransferencia, converterFormatos,
    carregarReservas, cancelarReservaDe, reservarMaterial,
  } = useEstoque();
  const movs = useMovimentacoes({ org });


  const [pedidos, setPedidos] = useState([]);
  const [pedOpen, setPedOpen] = useState(false);
  const [pedCarregando, setPedCarregando] = useState(false);
  const [novoPedido, setNovoPedido] = useState({ open: false, materialInicial: null, sessao: 0 });
  const [receberPedido, setReceberPedido] = useState({ open: false, pedido: null, sessao: 0 });

  const [filtro, setFiltro] = useState("todos");
  const [mov, setMov] = useState({ open: false, item: null, tipo: "entrada" });
  const [movSessao, setMovSessao] = useState(0);
  const [edit, setEdit] = useState({ open: false, item: null });
  const [editSessao, setEditSessao] = useState(0);
  const [convOpen, setConvOpen] = useState(false);
  const [convSessao, setConvSessao] = useState(0);
  const [res, setRes] = useState({ open: false, item: null, reservas: [], carregando: false });
  const [eliminar, setEliminar] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const [transfer, setTransfer] = useState({ open: false, item: null });
  const [pdModal, setPdModal] = useState({ open: false, item: null, tipo: "perda" });

  const tiposRegistados = useMemo(() => {
    const mapa = new Map();
    categorias.forEach((c) => {
      const g = tipoGrupo(c.tipo);
      if (!g || mapa.has(g)) return;
      const meta = TIPO_META[g] || {};
      mapa.set(g, {
        value: g,
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
      predicate: (item) => tipoGrupo(item.categoria?.tipo) === f.value,
    })),
  ], [tiposRegistados]);

  const { search, setSearch, activeFilter, setActiveFilter, filtered, total } = useFilter({
    items: materiais,
    searchFields: ["nome", "codigo", "fornecedor", "categoria.nome"],
    filterConfig,
  });

  const filtrados = filtered;

  const porTipo = useMemo(() => {
    const chaves = new Set(tiposRegistados.map((t) => t.value));
    const mapa = { _outras: [] };
    filtrados.forEach((i) => {
      const t = tipoGrupo(i.categoria?.tipo);
      if (chaves.has(t)) {
        (mapa[t] || (mapa[t] = [])).push(i);
      } else {
        mapa._outras.push(i);
      }
    });
    return mapa;
  }, [filtrados, tiposRegistados]);

  const abrirEntrada = useCallback((item) => {
    setMovSessao((s) => s + 1);
    setMov({ open: true, item, tipo: "entrada" });
  }, []);
  const abrirSaida = useCallback((item) => {
    setMovSessao((s) => s + 1);
    setMov({ open: true, item, tipo: "saida" });
  }, []);
  const fecharMov = useCallback(() => setMov({ open: false, item: null, tipo: "entrada" }), []);

  const registrarMov = useCallback(
    (form) => registrarMovimentacao({ item: mov.item, tipo: mov.tipo, dados: form }),
    [mov.item, mov.tipo, registrarMovimentacao]
  );

  const abrirEdicao = useCallback((item) => {
    setEditSessao((s) => s + 1);
    setEdit({ open: true, item });
  }, []);
  const fecharEdicao = useCallback(() => setEdit({ open: false, item: null }), []);
  const salvarEdicao = useCallback((form, id) => salvarMaterial(form, id), [salvarMaterial]);

  const abrirConversor = useCallback(() => {
    setConvSessao((s) => s + 1);
    setConvOpen(true);
  }, []);

  const abrirReservas = useCallback(
    async (item) => {
      setRes({ open: true, item, reservas: [], carregando: true });
      const r = await carregarReservas(item.id);
      setRes({ open: true, item, reservas: r, carregando: false });
    },
    [carregarReservas]
  );
  const fecharReservas = useCallback(() => setRes({ open: false, item: null, reservas: [], carregando: false }), []);
  const cancelarReservaAtiva = useCallback(
    async (reserva) => {
      setRes((prev) =>
        prev.item
          ? { ...prev, reservas: prev.reservas.map((r) => (r.id === reserva.id ? { ...r, estado: "cancelada" } : r)) }
          : prev
      );
      return cancelarReservaDe(reserva);
    },
    [cancelarReservaDe]
  );

  const confirmarReserva = useCallback(async (dados) => {
    const ok = await reservarMaterial(dados);
    if (ok) {
      const r = await carregarReservas(dados.material_id);
      setRes((prev) => ({ ...prev, reservas: r }));
    }
    return ok;
  }, [reservarMaterial, carregarReservas]);

  const fichaPdf = useCallback((item) => gerarFichaMaterialPDF(item, org), [org]);
  const pedidoPdf = useCallback((pedido) => gerarPedidoPDF(pedido, org), [org]);

  const abrirTransferencia = useCallback((item) => setTransfer({ open: true, item }), []);
  const fecharTransferencia = useCallback(() => setTransfer({ open: false, item: null }), []);
  const confirmarTransferencia = useCallback((dados) => registrarTransferencia(dados).then((ok) => { if (ok) fecharTransferencia(); return ok; }), [registrarTransferencia, fecharTransferencia]);

  const abrirPerda = useCallback((item) => setPdModal({ open: true, item, tipo: "perda" }), []);
  const abrirDesperdicio = useCallback((item) => setPdModal({ open: true, item, tipo: "desperdicio" }), []);
  const fecharPdModal = useCallback(() => setPdModal({ open: false, item: null, tipo: "perda" }), []);
  const confirmarPdModal = useCallback(async (dados) => {
    if (!pdModal.item) return false;
    const ok = await registrarMovimentacao({ item: pdModal.item, tipo: dados.tipo, dados });
    if (ok) { setPdModal({ open: false, item: null, tipo: "perda" }); }
    return ok;
  }, [pdModal.item, registrarMovimentacao]);

  const eliminarMaterial = useCallback(async () => {
    if (!eliminar) return;
    setDeletando(true);
    try {
      await removerMaterial(eliminar.id);
      await carregar();
      addToast("Material removido com sucesso", "success");
      setEliminar(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao remover material", "error");
    } finally {
      setDeletando(false);
    }
  }, [eliminar, carregar, addToast]);

  const recarregarPedidos = useCallback(async () => {
    try {
      const data = await listarPedidos();
      setPedidos(Array.isArray(data) ? data : []);
    } catch {
      // silencioso: o modal mostra o estado atual
    }
  }, []);

  const abrirPedidos = useCallback(async () => {
    setPedOpen(true);
    setPedCarregando(true);
    try {
      const data = await listarPedidos();
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar pedidos", "error");
    } finally {
      setPedCarregando(false);
    }
  }, [addToast]);

  const abrirNovoPedido = useCallback((item = null) => {
    setNovoPedido((s) => ({ open: true, materialInicial: item, sessao: s.sessao + 1 }));
  }, []);
  const fecharNovoPedido = useCallback(() => setNovoPedido((s) => ({ ...s, open: false })), []);

  const confirmarCriacao = useCallback(async (dados) => {
    try {
      await criarPedido(dados);
      await recarregarPedidos();
      addToast("Pedido de compra criado", "success");
      return true;
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao criar pedido", "error");
      return false;
    }
  }, [recarregarPedidos, addToast]);

  const abrirRecebimento = useCallback((pedido) => {
    setReceberPedido((s) => ({ open: true, pedido, sessao: s.sessao + 1 }));
  }, []);
  const fecharRecebimento = useCallback(() => setReceberPedido((s) => ({ ...s, open: false })), []);

  const confirmarRecebimento = useCallback(async (itens) => {
    const pedido = receberPedido.pedido;
    if (!pedido) return false;
    try {
      await apiReceberPedido(pedido.id, itens);
      await Promise.all([recarregarPedidos(), carregar()]);
      addToast("Entrada registada — stock atualizado", "success");
      return true;
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao registar entrada", "error");
      return false;
    }
  }, [receberPedido.pedido, recarregarPedidos, carregar, addToast]);

  const cancelarPedidoAtual = useCallback(async (pedido) => {
    if (!window.confirm(`Cancelar o pedido ${pedido.numero}?`)) return;
    try {
      await cancelarPedido(pedido.id);
      await recarregarPedidos();
      addToast("Pedido cancelado", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao cancelar pedido", "error");
    }
  }, [recarregarPedidos, addToast]);

  if (erro && materiais.length === 0) {
    return (
      <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
        <Icon name="error" className="text-4xl text-destructive mb-2 block mx-auto" />
        <p className="font-semibold text-destructive">Erro ao carregar estoque</p>
        <p className="text-xs text-muted-foreground mt-1">Não foi possível obter os materiais do servidor. Verifica a ligação à internet e tenta de novo.</p>
        <Button className="mt-4" variant="outline" onClick={() => carregar()} loading={carregando}>
          <Icon name="refresh" className="text-sm" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const carregandoInicial = carregando && materiais.length === 0;

  return (
    <div className="space-y-6">
      {carregandoInicial && (
        <div className="space-y-6" aria-label="A carregar estoque">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 h-28 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {Array.from({ length: 4 }).map((_, i) => <MaterialCardSkeleton key={i} />)}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground tracking-tight">Provisionamento</h1>
          <p className="text-muted-foreground mt-0.5 text-xs">Gestão e controlo de stock e inventário</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={abrirPedidos} className="bg-muted text-muted-foreground border border-border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-accent hover:text-foreground transition-all text-xs font-semibold">
            <Icon name="shopping_cart" className="text-[16px]" /> Pedidos
          </button>
          <button onClick={movs.abrir} className="bg-muted text-muted-foreground border border-border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-accent hover:text-foreground transition-all text-xs font-semibold">
            <Icon name="sync_alt" className="text-[16px]" /> Movimentações
          </button>
          <button onClick={abrirConversor} className="bg-muted text-muted-foreground border border-border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-accent hover:text-foreground transition-all text-xs font-semibold">
            <Icon name="calculate" className="text-[16px]" /> Conversor
          </button>
          <Link href="/estoque/novo">
            <button className="bg-primary text-primary-foreground px-5 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-xs font-semibold">
              <Icon name="add" className="text-[16px]" /> Novo Material
            </button>
          </Link>
        </div>
      </div>

      <KpiGrid totais={totais} alertas={alertas} materiais={materiais} />

      {alertas.length > 0 && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4 flex items-start gap-3 mb-8">
          <span className="w-10 h-10 shrink-0 rounded bg-error/10 flex items-center justify-center">
            <Icon name="warning" className="text-xl text-error" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-error">Materiais abaixo do ponto de pedido</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {alertas.map((a) => (
                <div key={a.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-error/10 text-error text-[10px] font-mono font-bold rounded-full border border-error/20">
                  <span>{a.nome}: {a.estoque_disponivel}/{a.ponto_ressuprimento || a.estoque_min} {a.unidade}</span>
                  <button
                    onClick={() => abrirNovoPedido(a)}
                    className="ml-1 px-1.5 py-0.5 rounded-full bg-error/20 hover:bg-error hover:text-white transition-colors"
                    title={`Criar pedido de compra para ${a.nome}`}
                  >
                    <Icon name="add_shopping_cart" className="text-[12px]" /> Pedir
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Pesquisar materiais por nome, SKU, fornecedor..."
        filters={filterConfig}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        count={total}
        countLabel="materiais"
      />

      {!carregandoInicial && materiais.length === 0 && (
        <EmptyState categorias={categorias} fornecedores={fornecedores} />
      )}

      {!carregandoInicial && materiais.length > 0 && (
        <>
          {tiposRegistados.map((g) => {
            const itens = porTipo[g.value] || [];
            if (itens.length === 0) return null;
            return (
              <section key={g.value} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${g.classe} border border-outline-variant/30`}>
                    <Icon name={g.icon} className="text-xl" />
                  </span>
                  <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">{g.label}</h2>
                  <span className="text-[10px] font-mono text-on-surface-variant">
                    {itens.length} {itens.length === 1 ? "material" : "materiais"}
                  </span>
                </div>
                <div className="space-y-3">
                  {itens.map((item, i) => (
                    <MaterialCard
                      key={item.id}
                      item={item}
                      index={i}
                      onEntrada={abrirEntrada}
                      onSaida={abrirSaida}
                      onReservas={abrirReservas}
                      onEditar={abrirEdicao}
                      onFichaPdf={fichaPdf}
                      onPedido={abrirNovoPedido}
                      onEliminar={setEliminar}
                      onTransferencia={abrirTransferencia}
                      onPerda={abrirPerda}
                      onDesperdicio={abrirDesperdicio}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          {porTipo._outras.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg flex items-center justify-center bg-surface-variant border border-outline-variant/30">
                  <Icon name="label" className="text-xl" />
                </span>
                <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">Outros tipos</h2>
                <span className="text-[10px] font-mono text-on-surface-variant">
                  {porTipo._outras.length} {porTipo._outras.length === 1 ? "material" : "materiais"}
                </span>
              </div>
              <div className="space-y-3">
                {porTipo._outras.map((item, i) => (
                  <MaterialCard
                    key={item.id}
                    item={item}
                    index={i}
                    onEntrada={abrirEntrada}
                    onSaida={abrirSaida}
                    onReservas={abrirReservas}
                    onEditar={abrirEdicao}
                    onFichaPdf={fichaPdf}
                    onPedido={abrirNovoPedido}
                    onEliminar={setEliminar}
                    onTransferencia={abrirTransferencia}
                    onPerda={abrirPerda}
                    onDesperdicio={abrirDesperdicio}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <MovimentacaoModal
        key={`mov-${movSessao}`}
        open={mov.open}
        item={mov.item}
        tipo={mov.tipo}
        onClose={fecharMov}
        onConfirm={registrarMov}
        clientes={clientes}
        fornecedores={fornecedores}
        nomeUsuario={nomeUsuario}
      />

      <MovimentacoesModal
        open={movs.open}
        onClose={movs.fechar}
        movimentos={movs.movimentos}
        filtrados={movs.filtrados}
        visiveis={movs.visiveis}
        temMais={movs.temMais}
        carregarMais={movs.carregarMais}
        carregando={movs.carregando}
        filtro={movs.filtro}
        setFiltro={movs.setFiltro}
        busca={movs.busca}
        setBusca={movs.setBusca}
        gerarPDF={movs.gerarPDF}
        pdfId={movs.pdfId}
      />

      <PedidosModal
        open={pedOpen}
        onClose={() => setPedOpen(false)}
        pedidos={pedidos}
        carregando={pedCarregando}
        onNovo={() => abrirNovoPedido()}
        onPdf={pedidoPdf}
        onReceber={abrirRecebimento}
        onCancelar={cancelarPedidoAtual}
      />

      <PedidoFormModal
        key={`novo-${novoPedido.sessao}`}
        open={novoPedido.open}
        onClose={fecharNovoPedido}
        fornecedores={fornecedores}
        materiais={materiais}
        materialInicial={novoPedido.materialInicial}
        nomeUsuario={nomeUsuario}
        onConfirm={confirmarCriacao}
      />

      <PedidoReceberModal
        key={`receber-${receberPedido.sessao}`}
        open={receberPedido.open}
        pedido={receberPedido.pedido}
        onClose={fecharRecebimento}
        onConfirm={confirmarRecebimento}
      />

      <ConversorModal
        key={`conv-${convSessao}`}
        open={convOpen}
        onClose={() => setConvOpen(false)}
        formatos={formatos}
        onCalcular={converterFormatos}
      />

      <ReservasModal
        open={res.open}
        onClose={fecharReservas}
        item={res.item}
        reservas={res.reservas}
        carregando={res.carregando}
        onCancelarReserva={cancelarReservaAtiva}
        onNovaReserva={confirmarReserva}
      />

      <EditMaterialModal
        key={`edit-${editSessao}`}
        open={edit.open}
        item={edit.item}
        categorias={categorias}
        fornecedores={fornecedores}
        formatos={formatos}
        materiais={materiais}
        onClose={fecharEdicao}
        onSave={salvarEdicao}
      />

      <TransferModal
        open={transfer.open}
        item={transfer.item}
        onClose={fecharTransferencia}
        onConfirm={confirmarTransferencia}
      />

      <PerdasDesperdicioModal
        open={pdModal.open}
        item={pdModal.item}
        tipo={pdModal.tipo}
        onClose={fecharPdModal}
        onConfirm={confirmarPdModal}
      />

      <ConfirmDialog
        open={Boolean(eliminar)}
        onClose={() => setEliminar(null)}
        onConfirm={eliminarMaterial}
        loading={deletando}
        title="Remover material"
        description={eliminar ? `Tem a certeza que deseja remover o material "${eliminar.nome}"? Esta ação não pode ser desfeita.` : ""}
      />

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>

      <FloatButton href="/estoque/novo" label="Novo Material" icon="inventory_2" />
    </div>
  );
}
