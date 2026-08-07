"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import useEstoque from "@/hooks/useEstoque";
import useMovimentacoes from "@/hooks/useMovimentacoes";
import KpiGrid from "@/components/estoque/KpiGrid";
import MaterialCard, { MaterialCardSkeleton } from "@/components/estoque/MaterialCard";
import MovimentacaoModal from "@/components/estoque/MovimentacaoModal";
import MovimentacoesModal from "@/components/estoque/MovimentacoesModal";
import ConversorModal from "@/components/estoque/ConversorModal";
import ReservasModal from "@/components/estoque/ReservasModal";
import EditMaterialModal from "@/components/estoque/EditMaterialModal";
import EmptyState from "@/components/estoque/EmptyState";
import { grupos } from "@/lib/estoque";
import { gerarFichaMaterialPDF } from "@/lib/estoquePdf";

export default function EstoquePage() {
  const {
    materiais, categorias, fornecedores, clientes, org, formatos,
    carregando, erro, nomeUsuario, totais, alertas,
    salvarMaterial, registrarMovimentacao, converterFormatos,
    carregarReservas, cancelarReservaDe,
  } = useEstoque();
  const movs = useMovimentacoes({ org });

  const [filtro, setFiltro] = useState("todos");
  const [mov, setMov] = useState({ open: false, item: null, tipo: "entrada" });
  const [movSessao, setMovSessao] = useState(0);
  const [edit, setEdit] = useState({ open: false, item: null });
  const [editSessao, setEditSessao] = useState(0);
  const [convOpen, setConvOpen] = useState(false);
  const [convSessao, setConvSessao] = useState(0);
  const [res, setRes] = useState({ open: false, item: null, reservas: [], carregando: false });

  const filtrados = useMemo(
    () => (filtro === "todos" ? materiais : materiais.filter((i) => (i.categoria?.grupo || "outros") === filtro)),
    [materiais, filtro]
  );

  const porGrupo = useMemo(() => {
    const mapa = {};
    Object.keys(grupos).forEach((g) => {
      mapa[g] = filtrados.filter((i) => (i.categoria?.grupo || "outros") === g);
    });
    return mapa;
  }, [filtrados]);

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

  const fichaPdf = useCallback((item) => gerarFichaMaterialPDF(item, org), [org]);

  if (erro && materiais.length === 0) {
    return (
      <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive p-6 text-center font-semibold">
        Erro ao carregar estoque
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

      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Stock</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Visão geral e gestão de inventário // {org?.sigla || org?.nome || "T-001"}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={movs.abrir} className="bg-surface-variant text-on-surface border border-outline-variant px-4 py-2 rounded font-mono flex items-center gap-2 hover:border-primary hover:text-primary transition-all text-[11px] uppercase tracking-wider">
            <Icon name="sync_alt" className="text-[16px]" /> Movimentações
          </button>
          <button onClick={abrirConversor} className="bg-surface-variant text-on-surface border border-outline-variant px-4 py-2 rounded font-mono flex items-center gap-2 hover:border-primary hover:text-primary transition-all text-[11px] uppercase tracking-wider">
            <Icon name="calculate" className="text-[16px]" /> Conversor
          </button>
          <Link href="/estoque/novo">
            <button className="bg-primary/20 text-primary border border-primary/50 px-5 py-2 rounded font-mono flex items-center gap-2 hover:bg-primary/30 transition-all text-[11px] uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(128,213,203,0.2)] hover:shadow-[0_0_25px_rgba(128,213,203,0.4)]">
              <Icon name="add" className="text-[16px]" /> Novo Material
            </button>
          </Link>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4 flex items-start gap-3 mb-8">
          <span className="w-10 h-10 shrink-0 rounded bg-error/10 flex items-center justify-center">
            <Icon name="warning" className="text-xl text-error" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-error">Materiais abaixo do ponto de pedido</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {alertas.map((a) => (
                <span key={a.id} className="px-2.5 py-1 bg-error/10 text-error text-[10px] font-mono font-bold rounded-full border border-error/20">
                  {a.nome}: {a.estoque_disponivel}/{a.ponto_ressuprimento || a.estoque_min} {a.unidade}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <KpiGrid totais={totais} alertas={alertas} materiais={materiais} />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide border-b border-outline-variant/50" role="group" aria-label="Filtrar materiais por grupo">
        {["todos", ...Object.keys(grupos)].map((g) => {
          const ativo = filtro === g;
          return (
            <button
              key={g}
              onClick={() => setFiltro(g)}
              aria-pressed={ativo}
              className={`px-3 py-1 font-mono text-[11px] uppercase tracking-wider whitespace-nowrap focus:outline-none flex items-center gap-1 transition-colors ${
                ativo ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-on-surface border-b-2 border-transparent hover:border-outline"
              }`}
            >
              <Icon name={g === "todos" ? "filter_list" : grupos[g].icon} className={`text-[14px] ${ativo ? "ms-fill" : ""}`} />
              {g === "todos" ? "Todos" : grupos[g].label}
            </button>
          );
        })}
      </div>

      {!carregandoInicial && materiais.length === 0 && (
        <EmptyState categorias={categorias} fornecedores={fornecedores} />
      )}

      {!carregandoInicial && materiais.length > 0 && (
        <>
          {Object.keys(grupos).map((g) => {
            const itens = porGrupo[g];
            if (itens.length === 0) return null;
            return (
              <section key={g} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${grupos[g].classe} border border-outline-variant/30`}>
                    <Icon name={grupos[g].icon} className="text-xl" />
                  </span>
                  <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">{grupos[g].label}</h2>
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
                    />
                  ))}
                </div>
              </section>
            );
          })}
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
      />

      <EditMaterialModal
        key={`edit-${editSessao}`}
        open={edit.open}
        item={edit.item}
        categorias={categorias}
        fornecedores={fornecedores}
        formatos={formatos}
        onClose={fecharEdicao}
        onSave={salvarEdicao}
      />

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
