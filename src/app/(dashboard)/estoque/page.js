"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import FloatButton from "@/components/ui/FloatButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CardSkeleton } from "@/components/Skeleton";
import RowMenu from "@/components/ui/RowMenu";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import {
  Ledger,
  LedgerHeader,
  FilterRow,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import useEstoque from "@/hooks/useEstoque";
import useMovimentacoes from "@/hooks/useMovimentacoes";
import KpiGrid from "@/components/estoque/KpiGrid";
import MovimentacaoModal from "@/components/estoque/MovimentacaoModal";
import MovimentacoesModal from "@/components/estoque/MovimentacoesModal";
import ConversorModal from "@/components/estoque/ConversorModal";
import ReservasModal from "@/components/estoque/ReservasModal";
import EditMaterialModal from "@/components/estoque/EditMaterialModal";
import TransferModal from "@/components/estoque/TransferModal";
import PerdasDesperdicioModal from "@/components/estoque/PerdasDesperdicioModal";
import EmptyState from "@/components/estoque/EmptyState";
import PedidoFormModal from "@/components/estoque/PedidoFormModal";
import RequisicoesMaterialModal from "@/components/estoque/RequisicoesMaterialModal";
import { listar as listarRequisicoes, aprovar as aprovarRequisicao, rejeitar as rejeitarRequisicao } from "@/services/requisicoesMaterial";
import { familias, normalizarFamilia, normalizarTipoItem, toNum, especificacoesObjeto, tipoChaveDe } from "@/lib/estoque";
import { gerarFichaMaterialPDF } from "@/lib/estoquePdf";
import { criar as criarPedido } from "@/services/pedidos";
import { remover as removerMaterial } from "@/services/materiais";
import { podeAtual } from "@/lib/permissoes";
import { useToast } from "@/components/Toast";

const TIPO_META = {
  materia_prima: { label: "Matéria-Prima", icon: "inventory" },
  artigo: { label: "Artigo / Produto", icon: "inventory_2" },
  produto_acabado: { label: "Produto Acabado", icon: "inventory_2" },
  servico: { label: "Serviço", icon: "home_repair_service" },
  maquina: { label: "Maquinaria", icon: "precision_manufacturing" },
  funcionario: { label: "Funcionário", icon: "groups" },
  colaborador: { label: "Colaborador", icon: "group" },
  consumiveis: { label: "Consumíveis", icon: "local_fire_department" },
  materiais: { label: "Materiais", icon: "inventory" },
  ferramentas: { label: "Ferramentas", icon: "handyman" },
  equipamentos: { label: "Equipamentos", icon: "precision_manufacturing" },
};

/* Paleta do módulo stocks (referência KAMGEST) */
const STATUS_META = {
  ok: { label: "Normal", badge: "border-transparent bg-emerald-100 text-emerald-700" },
  repor: { label: "Atenção", badge: "border-transparent bg-amber-100 text-amber-700" },
  esgotado: { label: "Crítico", badge: "border-transparent bg-red-100 text-red-600" },
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

// Categoria/grupo/família podem vir da categoria ligada ou dos campos digitados à mão.
const espDe = (i) => especificacoesObjeto(i.especificacoes);
const nomeCategoriaDe = (i) => (i.categoria && i.categoria.nome) || espDe(i).categoria || "";
const familiaDe = (i) => (i.categoria && i.categoria.familia) || espDe(i).familia || "";
const tipoDe = (i) => (i.categoria && i.categoria.tipo) || tipoChaveDe(espDe(i).grupo);

const CAMPOS = [
  { value: "geral", label: "Todos os campos", obter: (i) => [i.nome, i.codigo, i.fornecedor, nomeCategoriaDe(i), familiaDe(i), espDe(i).grupo, espDe(i).subfamilia].join(" ") },
  { value: "nome", label: "Nome", obter: (i) => i.nome || "" },
  { value: "codigo", label: "Código / SKU", obter: (i) => i.codigo || "" },
  { value: "fornecedor", label: "Fornecedor", obter: (i) => i.fornecedor || "" },
  { value: "categoria", label: "Categoria", obter: (i) => nomeCategoriaDe(i) },
  { value: "familia", label: "Família", obter: (i) => familiaDe(i) },
];

const pillBase = "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-colors";
const pillAtiva = "border-blue-600/40 bg-blue-50 text-blue-600";
const pillInativa = "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground [&_svg]:text-blue-600 [&_.material-symbols-outlined]:text-blue-600";

const tabBase = "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-2 text-sm font-medium transition-colors";
const tabAtiva = "border-blue-600 font-bold text-blue-600";
const tabInativa = "border-transparent text-muted-foreground hover:text-foreground";

export default function EstoquePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const {
    materiais, categorias, fornecedores, clientes, org, formatos,
    carregando, erro, carregar, nomeUsuario, totais, alertas,
    salvarMaterial, registrarMovimentacao, registrarTransferencia, converterFormatos,
    carregarReservas, cancelarReservaDe, reservarMaterial,
  } = useEstoque();
  const movs = useMovimentacoes({ org });

  const [requisicoes, setRequisicoes] = useState([]);
  const [reqCarregando, setReqCarregando] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  // Índice de materiais por id para o modal das requisições. Memoizado: sem
  // isto, cada render criava um objeto novo e a lista inteira re-renderizava.
  const materiaisPorId = useMemo(
    () => Object.fromEntries(materiais.map((x) => [x.id, x])),
    [materiais]
  );
  const [novoPedido, setNovoPedido] = useState({ open: false, materialInicial: null, sessao: 0 });

  const [filtro, setFiltro] = useState({ campo: "geral", operador: "contem", termo: "" });
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [subFiltro, setSubFiltro] = useState("todas");
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
      });
    });
    return [...mapa.values()];
  }, [categorias]);

  const filtrados = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...materiais];
    if (termo) {
      const cfg = CAMPOS.find((c) => c.value === filtro.campo) || CAMPOS[0];
      res = res.filter((i) => {
        const alvo = String(cfg.obter(i) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (tipoFiltro !== "todos") {
      res = res.filter((i) => tipoGrupo(tipoDe(i)) === tipoFiltro);
    }
    if (ordem.chave === "nome") res.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt") * ordem.dir);
    if (ordem.chave === "codigo") res.sort((a, b) => String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt") * ordem.dir);
    if (ordem.chave === "stock") res.sort((a, b) => (toNum(a.estoque_disponivel) - toNum(b.estoque_disponivel)) * ordem.dir);
    return res;
  }, [materiais, filtro, tipoFiltro, ordem]);

  const contagensTipo = useMemo(() => {
    const c = { todos: materiais.length };
    for (const t of tiposRegistados) c[t.value] = materiais.filter((i) => tipoGrupo(tipoDe(i)) === t.value).length;
    return c;
  }, [materiais, tiposRegistados]);

  const subFiltros = useMemo(() => {
    if (tipoFiltro === "todos") return [];
    const metas = new Map();
    categorias.forEach((c) => {
      if (tipoGrupo(c.tipo) !== tipoFiltro) return;
      const chave = normalizarFamilia(c.familia);
      if (!chave || metas.has(chave)) return;
      const cfg = familias[chave] || {};
      metas.set(chave, {
        value: chave,
        label: cfg.label || c.familia || chave,
        icon: cfg.icon || "label",
      });
    });
    return [...metas.values()];
  }, [categorias, tipoFiltro]);

  const visiveis = useMemo(() => {
    if (!subFiltro || subFiltro === "todas") return filtrados;
    return filtrados.filter((i) => normalizarFamilia(familiaDe(i)) === subFiltro);
  }, [filtrados, subFiltro]);

  const { visiveis: paginaVisiveis, ...pag } = usePaginacao({ items: visiveis });

  const aoMudarTipo = (v) => {
    setTipoFiltro(v);
    setSubFiltro("todas");
  };

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

  const recarregarRequisicoes = useCallback(async () => {
    try {
      const data = await listarRequisicoes();
      setRequisicoes(Array.isArray(data) ? data : []);
    } catch {
      // silencioso: o modal mostra o estado anterior
    }
  }, []);

  const abrirRequisicoes = useCallback(async () => {
    setReqOpen(true);
    setReqCarregando(true);
    try {
      const data = await listarRequisicoes();
      setRequisicoes(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar as requisições", "error");
    } finally {
      setReqCarregando(false);
    }
  }, [addToast]);

  const confirmarAprovacaoRequisicao = useCallback(
    async (requisicao) => {
      try {
        await aprovarRequisicao(requisicao.id);
        await Promise.all([recarregarRequisicoes(), carregar()]);
        addToast(`Requisição ${requisicao.numero} aprovada — material com saída do stock registada`, "success");
      } catch (err) {
        const proibido = err.response?.status === 403;
        addToast(
          proibido
            ? "Não tem permissão para aprovar requisições de material"
            : err.response?.data?.erro || "Erro ao aprovar a requisição",
          "error"
        );
      }
    },
    [recarregarRequisicoes, carregar, addToast]
  );

  const confirmarRejeicaoRequisicao = useCallback(
    async (requisicao, motivo) => {
      try {
        await rejeitarRequisicao(requisicao.id, motivo);
        await recarregarRequisicoes();
        addToast(`Requisição ${requisicao.numero} rejeitada`, "success");
        return true;
      } catch (err) {
        const proibido = err.response?.status === 403;
        addToast(
          proibido
            ? "Não tem permissão para rejeitar requisições de material"
            : err.response?.data?.erro || "Erro ao rejeitar a requisição",
          "error"
        );
        return false;
      }
    },
    [recarregarRequisicoes, addToast]
  );

  const abrirNovoPedido = useCallback((item = null) => {
    setNovoPedido((s) => ({ open: true, materialInicial: item, sessao: s.sessao + 1 }));
  }, []);
  const fecharNovoPedido = useCallback(() => setNovoPedido((s) => ({ ...s, open: false })), []);

  const confirmarCriacao = useCallback(async (dados) => {
    try {
      await criarPedido(dados);
      addToast("Pedido de compra criado", "success");
      return true;
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao criar pedido", "error");
      return false;
    }
  }, [addToast]);

  if (erro && materiais.length === 0) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
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

  const acoesTopo = [
    { icon: "inventory_2", label: "Requisições", onClick: abrirRequisicoes },
    { icon: "calculate", label: "Conversor", onClick: abrirConversor },
  ];

  return (
    <div className="space-y-4">
      {/* Faixa do módulo - identificação stocks (indigo) */}
      <div className="flex items-center justify-between rounded-xl bg-[#3B4CA8] px-5 py-2.5 text-white shadow-sm">
        <span className="text-lg font-black tracking-wide drop-shadow-sm">4. STOCKS</span>
        <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-indigo-100 sm:block">
          Sistema de Gestão Integrada · KAMGEST
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Gestão de Stocks</h1>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            Materiais, consumíveis e produtos acabados · {materiais.length} {materiais.length === 1 ? "artigo" : "artigos"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {acoesTopo.map((a) => (
            <button key={a.label} type="button" onClick={a.onClick} className={`${pillBase} ${pillInativa}`}>
              <Icon name={a.icon} className="text-sm" /> {a.label}
            </button>
          ))}
          <button
            type="button"
            onClick={movs.abrir}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Icon name="sync_alt" className="text-base" /> Movimentações
          </button>
          <button
            type="button"
            onClick={() => router.push("/estoque/novo")}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Icon name="add" className="text-base" /> Novo Artigo
          </button>
        </div>
      </div>

      <KpiGrid totais={totais} alertas={alertas} materiais={materiais} />

      {alertas.length > 0 && (
        <div className="rounded-lg border border-error/25 bg-error/10 p-4 flex items-start gap-3">
          <span className="w-10 h-10 shrink-0 rounded-lg bg-error/15 flex items-center justify-center border border-error/25">
            <Icon name="warning" className="text-xl text-error" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-error">Materiais abaixo do ponto de pedido</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {alertas.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 rounded-md border border-error/25 bg-error/15 px-[5px] py-0.5 text-xs font-medium text-error">
                  <span className="font-mono">{a.nome}: {a.estoque_disponivel}/{a.ponto_ressuprimento || a.estoque_min} {a.unidade}</span>
                  <button
                    onClick={() => abrirNovoPedido(a)}
                    className="inline-flex items-center gap-1 rounded border border-error/25 px-1.5 py-0.5 text-[11px] transition-colors hover:bg-error hover:text-white"
                    title={`Criar pedido de compra para ${a.nome}`}
                  >
                    <Icon name="add_shopping_cart" className="text-[12px]" /> Pedir
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <Ledger rotulo="Materiais ledger">
        <LedgerHeader
          titulo="Materiais"
          subtitulo={`${visiveis.length} de ${materiais.length} materiais · ${tiposRegistados.length} tipos`}
          onToggleFiltros={() => setFiltrosAbertos((v) => !v)}
          filtrosAbertos={filtrosAbertos}
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border px-4">
          <button
            type="button"
            onClick={() => aoMudarTipo("todos")}
            aria-pressed={tipoFiltro === "todos"}
            className={`${tabBase} ${tipoFiltro === "todos" ? tabAtiva : tabInativa}`}
          >
            Todos <span className="text-[11px] font-medium text-muted-foreground">{contagensTipo.todos}</span>
          </button>
          {tiposRegistados.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => aoMudarTipo(t.value)}
              aria-pressed={tipoFiltro === t.value}
              className={`${tabBase} ${tipoFiltro === t.value ? tabAtiva : tabInativa}`}
            >
              <Icon name={t.icon} className="text-base" /> {t.label}
              <span className="text-[11px] font-medium text-muted-foreground">{contagensTipo[t.value] ?? 0}</span>
            </button>
          ))}
        </div>
        {filtrosAbertos && (
          <FilterRow
            campo={filtro.campo}
            setCampo={(v) => setFiltro((f) => ({ ...f, campo: v }))}
            campos={CAMPOS.map(({ value, label }) => ({ value, label }))}
            operador={filtro.operador}
            setOperador={(v) => setFiltro((f) => ({ ...f, operador: v }))}
            termo={filtro.termo}
            setTermo={(v) => setFiltro((f) => ({ ...f, termo: v }))}
            aoLimpar={() => setFiltro((f) => ({ ...f, termo: "" }))}
            placeholder="Pesquisar materiais por nome, código, fornecedor..."
          />
        )}
        {subFiltros.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
            <button
              type="button"
              onClick={() => setSubFiltro("todas")}
              aria-pressed={subFiltro === "todas"}
              className={`${pillBase} ${subFiltro === "todas" ? pillAtiva : pillInativa}`}
            >
              Todas famílias
            </button>
            {subFiltros.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setSubFiltro(f.value)}
                aria-pressed={subFiltro === f.value}
                className={`${pillBase} ${subFiltro === f.value ? pillAtiva : pillInativa}`}
              >
                <Icon name={f.icon} className="text-sm" /> {f.label}
              </button>
            ))}
          </div>
        )}

        {carregandoInicial ? (
          <div className="p-4"><CardSkeleton lines={6} /></div>
        ) : (
          <>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "codigo" ? { chave: "codigo", dir: -p.dir } : { chave: "codigo", dir: 1 }))} ativo={ordem.chave === "codigo"}>Código</LedgerTh>
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "nome" ? { chave: "nome", dir: -p.dir } : { chave: "nome", dir: 1 }))} ativo={ordem.chave === "nome"}>Artigo</LedgerTh>
                  <LedgerTh>Unidade</LedgerTh>
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "stock" ? { chave: "stock", dir: -p.dir } : { chave: "stock", dir: 1 }))} ativo={ordem.chave === "stock"}>Stock</LedgerTh>
                  <LedgerTh>Stock Mínimo</LedgerTh>
                  <LedgerTh>Situação</LedgerTh>
                  <LedgerTh className="w-10" />
                </tr>
              </thead>
              <tbody>
                {paginaVisiveis.map((item) => {
                  const mover = item.mover_estoque !== false;
                  const st = STATUS_META[item.status] || STATUS_META.ok;
                  const famTexto = familiaDe(item);
                  const familiaCfg = familias[normalizarFamilia(famTexto)] || { label: famTexto || "—" };
                  const unidade = item.unidade?.toUpperCase() || "UN";
                  return (
                    <LedgerTr key={item.id}>
                      <LedgerTd className="whitespace-nowrap">
                        <span className="block font-mono text-xs tabular-nums">{item.codigo || "—"}</span>
                      </LedgerTd>
                      <LedgerTd className="max-w-56">
                        <IdCell id={item.nome || "Item sem nome"} meta={familiaCfg.label} />
                      </LedgerTd>
                      <LedgerTd className="whitespace-nowrap text-muted-foreground">{unidade}</LedgerTd>
                      <LedgerTd>
                        {mover ? (
                          <span className="tabular-nums">{toNum(item.estoque_disponivel).toLocaleString("pt-AO")}</span>
                        ) : (
                          <span className="text-muted-foreground">Não controlado</span>
                        )}
                      </LedgerTd>
                      <LedgerTd className="tabular-nums whitespace-nowrap">
                        {mover ? toNum(item.estoque_min).toLocaleString("pt-AO") : "—"}
                      </LedgerTd>
                      <LedgerTd>
                        <StatusBadge tom="neutral" className={st.badge}>{st.label}</StatusBadge>
                      </LedgerTd>
                      <LedgerTd>
                        <RowMenu
                          ariaLabel="Ações do material"
                          itens={[
                            { icone: "add", rotulo: "Entrada", onClick: () => abrirEntrada(item) },
                            { icone: "remove", rotulo: "Saída", onClick: () => abrirSaida(item) },
                            { icone: "description", rotulo: "Ficha do material (PDF)", onClick: () => fichaPdf(item) },
                            { icone: "add_shopping_cart", rotulo: "Pedido de compra", onClick: () => abrirNovoPedido(item) },
                            ...(mover ? [
                              { icone: "swap_horiz", rotulo: "Transferência", onClick: () => abrirTransferencia(item) },
                              { icone: "warning", rotulo: "Registar perda", onClick: () => abrirPerda(item) },
                              { icone: "delete_sweep", rotulo: "Registar desperdício", onClick: () => abrirDesperdicio(item) },
                              { icone: "lock", rotulo: "Reservas", onClick: () => abrirReservas(item) },
                            ] : []),
                            { icone: "edit", rotulo: "Editar", onClick: () => abrirEdicao(item) },
                            { icone: "delete", rotulo: "Remover", danger: true, onClick: () => setEliminar(item) },
                          ]}
                        />
                      </LedgerTd>
                    </LedgerTr>
                  );
                })}
              </tbody>
            </LedgerTable>
            {pag.total === 0 && (
              materiais.length === 0
                ? <LedgerEmpty icone="inventory_2">Nenhum material registado</LedgerEmpty>
                : <LedgerEmpty icone="search_off">Nenhum material corresponde ao filtro</LedgerEmpty>
            )}
            <Paginacao {...pag} label="materiais" />
          </>
        )}
      </Ledger>

      {!carregandoInicial && materiais.length === 0 && (
        <EmptyState categorias={categorias} fornecedores={fornecedores} />
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

      <RequisicoesMaterialModal
        open={reqOpen}
        onClose={() => setReqOpen(false)}
        requisicoes={requisicoes}
        carregando={reqCarregando}
        materiaisPorId={materiaisPorId}
        podeAprovar={podeAtual("estoque", "editar")}
        onAprovar={confirmarAprovacaoRequisicao}
        onRejeitar={confirmarRejeicaoRequisicao}
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

      <FloatButton href="/estoque/novo" label="Novo" icon="inventory_2" />
    </div>
  );
}
