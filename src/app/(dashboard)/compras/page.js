"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import RowMenu from "@/components/ui/RowMenu";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CardSkeleton } from "@/components/Skeleton";
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
import { useToast } from "@/components/Toast";
import PedidoFormModal from "@/components/estoque/PedidoFormModal";
import PedidoReceberModal from "@/components/estoque/PedidoReceberModal";
import CadastrosTab from "@/components/vendas/CadastrosTab";
import {
  listar as listarPedidos,
  criar as criarPedido,
  receber as receberPedido,
  cancelar as cancelarPedido,
  aprovar as aprovarPedido,
  rejeitar as rejeitarPedido,
  enviar as enviarPedido,
} from "@/services/pedidos";
import { gerarPedidoPDF } from "@/lib/estoquePdf";
import { formatHora, formatKz, toNum } from "@/lib/estoque";
import { podeAtual } from "@/lib/permissoes";

const TABS = [
  { id: "cotacoes", label: "Cotações", icon: "request_quote" },
  { id: "encomendas", label: "Encomendas", icon: "shopping_cart" },
  { id: "recepcoes", label: "Recepções", icon: "inventory_2" },
  { id: "fornecedores", label: "Fornecedores", icon: "local_shipping" },
];

/* Paleta do módulo compras (referência KAMGEST) */
const ESTADO_PEDIDO = {
  pendente: { label: "Aguarda aprovação", badge: "border-transparent bg-warning/15 text-warning" },
  aprovado: { label: "Aprovada", badge: "border-transparent bg-success/15 text-success" },
  enviado: { label: "Encomendada", badge: "border-transparent bg-info/15 text-info" },
  recebido: { label: "Recebida", badge: "border-transparent bg-success/15 text-success" },
  rejeitado: { label: "Rejeitada", badge: "border-transparent bg-error/15 text-error" },
  cancelado: { label: "Cancelada", badge: "border-transparent bg-muted text-muted-foreground" },
};

const tabBase = "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-2 text-sm font-semibold transition-colors";
const tabAtiva = "border-primary font-bold text-primary";
const tabInativa = "border-transparent text-muted-foreground hover:text-foreground";

function dataStr(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-AO");
}

function estadoPedido(p) {
  return ESTADO_PEDIDO[p.estado] || ESTADO_PEDIDO.pendente;
}

export default function ComprasPage() {
  const { addToast } = useToast();
  const { materiais, fornecedores, org, nomeUsuario } = useEstoque();

  const [aba, setAba] = useState("encomendas");
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState({ termo: "" });

  const [novoPedido, setNovoPedido] = useState({ open: false, sessao: 0 });
  const [receber, setReceber] = useState({ open: false, pedido: null, sessao: 0 });
  const [cancelar, setCancelar] = useState({ open: false, pedido: null });
  const [cancelando, setCancelando] = useState(false);

  const recarregar = useCallback(async () => {
    const [p] = await Promise.allSettled([listarPedidos()]);
    setPedidos(p.status === "fulfilled" && Array.isArray(p.value) ? p.value : []);
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      await recarregar();
      if (activo) setCarregando(false);
    })();
    return () => {
      activo = false;
    };
  }, [recarregar]);

  const podeEditar = podeAtual("estoque", "editar");
  const podeCriarEncomenda = podeAtual("estoque", "criar") || podeAtual("compras", "criar");
  const podeAprovar = podeAtual("estoque", "aprovar") || podeAtual("compras", "aprovar");

  const recebidos = useMemo(() => pedidos.filter((p) => p.estado === "recebido"), [pedidos]);
  const valorTotal = useMemo(() => pedidos.reduce((s, p) => s + toNum(p.total), 0), [pedidos]);

  const kpis = useMemo(
    () => [
      { key: "cot", icon: "request_quote", label: "Cotações", valor: "0", tom: "bg-primary/10 text-primary", cor: "text-foreground" },
      { key: "enc", icon: "shopping_cart", label: "Encomendas", valor: String(pedidos.length), tom: "bg-success/10 text-success", cor: "text-foreground" },
      { key: "val", icon: "trending_up", label: "Valor Compras", valor: Math.round(valorTotal).toLocaleString("pt-AO"), sufixo: "Kz", tom: "bg-warning/15 text-warning", cor: "text-foreground", alerta: true },
    ],
    [pedidos.length, valorTotal]
  );

  const termo = filtro.termo.trim().toLowerCase();
  const listaAtual = useMemo(() => {
    if (aba === "cotacoes") return [];
    if (aba === "encomendas") {
      return pedidos.filter((p) => !termo || `${p.numero} ${p.fornecedor_nome}`.toLowerCase().includes(termo));
    }
    return recebidos.filter((p) => !termo || `${p.numero} ${p.fornecedor_nome}`.toLowerCase().includes(termo));
  }, [aba, pedidos, recebidos, termo]);

  const { visiveis, ...pag } = usePaginacao({ items: listaAtual });

  const abrirNovoPedido = useCallback(() => setNovoPedido((s) => ({ open: true, sessao: s.sessao + 1 })), []);
  const abrirReceber = useCallback((pedido) => setReceber((s) => ({ open: true, pedido, sessao: s.sessao + 1 })), []);

  const pedidoPdf = useCallback((pedido) => gerarPedidoPDF(pedido, org), [org]);

  const confirmarNovaEncomenda = useCallback(
    async (dados) => {
      try {
        await criarPedido(dados);
        await recarregar();
        addToast("Encomenda registada", "success");
        return true;
      } catch (err) {
        addToast(err.response?.data?.erro || "Erro ao criar encomenda", "error");
        return false;
      }
    },
    [recarregar, addToast]
  );

  const confirmarRecebimento = useCallback(
    async (itens) => {
      const pedido = receber.pedido;
      if (!pedido) return false;
      try {
        await receberPedido(pedido.id, itens);
        await recarregar();
        addToast("Entrada registada — stock atualizado", "success");
        return true;
      } catch (err) {
        addToast(err.response?.data?.erro || "Erro ao registar entrada", "error");
        return false;
      }
    },
    [receber.pedido, recarregar, addToast]
  );

  const aprovarEncomenda = useCallback(
    async (pedido) => {
      try {
        await aprovarPedido(pedido.id);
        await recarregar();
        addToast(`Encomenda ${pedido.numero} aprovada`, "success");
      } catch (err) {
        addToast(err.response?.data?.erro || "Erro ao aprovar encomenda", "error");
      }
    },
    [recarregar, addToast]
  );

  const rejeitarEncomenda = useCallback(
    async (pedido) => {
      const motivo = window.prompt(`Motivo da rejeição da encomenda ${pedido.numero}:`);
      if (!motivo) return;
      try {
        await rejeitarPedido(pedido.id, motivo);
        await recarregar();
        addToast(`Encomenda ${pedido.numero} rejeitada`, "success");
      } catch (err) {
        addToast(err.response?.data?.erro || "Erro ao rejeitar encomenda", "error");
      }
    },
    [recarregar, addToast]
  );

  const enviarEncomenda = useCallback(
    async (pedido) => {
      try {
        await enviarPedido(pedido.id);
        await recarregar();
        addToast(`Encomenda ${pedido.numero} enviada ao fornecedor`, "success");
      } catch (err) {
        addToast(err.response?.data?.erro || "Erro ao enviar encomenda", "error");
      }
    },
    [recarregar, addToast]
  );

  const confirmarCancelamento = useCallback(async () => {
    if (!cancelar.pedido) return;
    setCancelando(true);
    try {
      await cancelarPedido(cancelar.pedido.id);
      await recarregar();
      addToast("Encomenda cancelada", "success");
      setCancelar({ open: false, pedido: null });
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao cancelar encomenda", "error");
    } finally {
      setCancelando(false);
    }
  }, [cancelar.pedido, recarregar, addToast]);

  const carregandoInicial = carregando && pedidos.length === 0;
  const vazio = !carregandoInicial && visiveis.length === 0;

  const tabsBar = (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setAba(t.id)}
          aria-pressed={aba === t.id}
          className={`${tabBase} ${aba === t.id ? tabAtiva : tabInativa}`}
        >
          <Icon name={t.icon} className="text-base" /> {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Faixa do módulo - identificação compras (red) */}
      <div className="flex items-center rounded-xl bg-[#d32f2f] px-5 py-2.5 text-white shadow-sm">
        <span className="text-lg font-extrabold uppercase tracking-wide">5. COMPRAS</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Gestão de Compras</h1>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            Fornecedores, encomendas e recepções.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {podeCriarEncomenda && (
            <button
              type="button"
              onClick={abrirNovoPedido}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Icon name="add" className="text-base" /> Nova Encomenda
            </button>
          )}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores de compras">
        {kpis.map((k) => (
          <div
            key={k.key}
            className={`flex items-center gap-3.5 rounded-xl border p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)] ${
              k.alerta ? "border-warning/30 bg-warning/10" : "border-border bg-card"
            }`}
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl ${k.tom}`}>
              <Icon name={k.icon} />
            </span>
            <div className="min-w-0">
              <p className={`text-xs font-semibold leading-tight ${k.alerta ? "text-warning" : "text-muted-foreground"}`}>{k.label}</p>
              <p className={`text-2xl font-black leading-tight tabular-nums ${k.cor}`}>
                {k.valor}
                {k.sufixo && <span className="ml-1 text-xs font-bold text-muted-foreground">{k.sufixo}</span>}
              </p>
            </div>
          </div>
        ))}
      </section>

      {tabsBar}

      {aba === "fornecedores" ? (
        <CadastrosTab apenas="fornecedor" />
      ) : (
      <>
      <Ledger rotulo="Compras ledger">
        <LedgerHeader
          titulo="Compras"
          subtitulo={`${visiveis.length} de ${listaAtual.length} registos`}
        />
        <FilterRow
          campo=""
          setCampo={() => {}}
          campos={[]}
          operador="contem"
          setOperador={() => {}}
          operadores={[]}
          termo={filtro.termo}
          setTermo={(v) => setFiltro((f) => ({ ...f, termo: v }))}
          aoLimpar={() => setFiltro({ termo: "" })}
          placeholder="Pesquisar por número, fornecedor ou destino..."
        />

        {carregandoInicial ? (
          <div className="p-4">
            <CardSkeleton lines={6} />
          </div>
        ) : (
          <>
            <LedgerTable>
              {aba === "cotacoes" && (
                <>
                  <thead>
                    <tr className="border-b border-border">
                      <LedgerTh>Nº</LedgerTh>
                      <LedgerTh>Data</LedgerTh>
                      <LedgerTh>Fornecedor</LedgerTh>
                      <LedgerTh>Valor (Kz)</LedgerTh>
                      <LedgerTh className="text-center">Estado</LedgerTh>
                      <LedgerTh className="w-10" />
                    </tr>
                  </thead>
                  <tbody />
                </>
              )}

              {aba === "encomendas" && (
                <>
                  <thead>
                    <tr className="border-b border-border">
                      <LedgerTh>Nº</LedgerTh>
                      <LedgerTh>Data</LedgerTh>
                      <LedgerTh>Fornecedor</LedgerTh>
                      <LedgerTh>Valor (Kz)</LedgerTh>
                      <LedgerTh className="text-center">Estado</LedgerTh>
                      <LedgerTh className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((p) => {
                      const st = estadoPedido(p);
                      const itens = [];
                      itens.push({ icone: "print", rotulo: "Imprimir (PDF)", onClick: () => pedidoPdf(p) });
                      if (p.estado === "pendente" && podeAprovar) {
                        itens.push({ icone: "check_circle", rotulo: "Aprovar", onClick: () => aprovarEncomenda(p) });
                        itens.push({ icone: "cancel", rotulo: "Rejeitar", danger: true, onClick: () => rejeitarEncomenda(p) });
                      }
                      if (p.estado === "aprovado" && podeEditar) {
                        itens.push({ icone: "send", rotulo: "Enviar ao fornecedor", onClick: () => enviarEncomenda(p) });
                      }
                      if (p.estado === "enviado" && podeEditar) {
                        itens.push({ icone: "download", rotulo: "Registar entrada", onClick: () => abrirReceber(p) });
                      }
                      if (["pendente", "aprovado", "enviado"].includes(p.estado) && podeEditar) {
                        itens.push({ icone: "delete", rotulo: "Cancelar", danger: true, onClick: () => setCancelar({ open: true, pedido: p }) });
                      }
                      return (
                        <LedgerTr key={p.id}>
                          <LedgerTd>
                            <IdCell id={p.numero} meta={p.solicitado_por || "—"} />
                          </LedgerTd>
                          <LedgerTd className="whitespace-nowrap text-muted-foreground">{dataStr(p.data_pedido)}</LedgerTd>
                          <LedgerTd className="max-w-40"><span className="block truncate">{p.fornecedor_nome}</span></LedgerTd>
                          <LedgerTd className="tabular-nums whitespace-nowrap">{toNum(p.total).toLocaleString("pt-AO")}</LedgerTd>
                          <LedgerTd className="text-center"><StatusBadge tom="neutral" className={st.badge}>{st.label}</StatusBadge></LedgerTd>
                          <LedgerTd><RowMenu ariaLabel="Ações da encomenda" itens={itens} /></LedgerTd>
                        </LedgerTr>
                      );
                    })}
                  </tbody>
                </>
              )}

              {aba === "recepcoes" && (
                <>
                  <thead>
                    <tr className="border-b border-border">
                      <LedgerTh>Nº</LedgerTh>
                      <LedgerTh>Data recepção</LedgerTh>
                      <LedgerTh>Fornecedor</LedgerTh>
                      <LedgerTh>Valor (Kz)</LedgerTh>
                      <LedgerTh className="text-center">Estado</LedgerTh>
                      <LedgerTh className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((p) => (
                      <LedgerTr key={p.id}>
                        <LedgerTd>
                          <IdCell id={p.numero} meta={formatHora(p.data_recebimento)} />
                        </LedgerTd>
                        <LedgerTd className="whitespace-nowrap text-muted-foreground">{dataStr(p.data_recebimento)}</LedgerTd>
                        <LedgerTd className="max-w-40"><span className="block truncate">{p.fornecedor_nome}</span></LedgerTd>
                        <LedgerTd className="tabular-nums whitespace-nowrap">{toNum(p.total).toLocaleString("pt-AO")}</LedgerTd>
                        <LedgerTd className="text-center"><StatusBadge tom="neutral" className="border-transparent bg-emerald-100 text-emerald-700">Recebida</StatusBadge></LedgerTd>
                        <LedgerTd>
                          <RowMenu ariaLabel="Ações da recepção" itens={[{ icone: "print", rotulo: "Imprimir (PDF)", onClick: () => pedidoPdf(p) }]} />
                        </LedgerTd>
                      </LedgerTr>
                    ))}
                  </tbody>
                </>
              )}
            </LedgerTable>
            {vazio && (
              <LedgerEmpty icone={aba === "cotacoes" ? "request_quote" : "shopping_cart"}>
                {termo
                  ? "Nenhum registo corresponde à pesquisa"
                  : aba === "cotacoes"
                    ? "Nenhuma cotação registada"
                    : aba === "recepcoes"
                      ? "Nenhuma recepção registada"
                      : "Nenhuma encomenda registada"}
              </LedgerEmpty>
            )}
            <Paginacao {...pag} label="registos" />
          </>
        )}
      </Ledger>
      </>
      )}

      <PedidoFormModal
        key={`novo-${novoPedido.sessao}`}
        open={novoPedido.open}
        onClose={() => setNovoPedido((s) => ({ ...s, open: false }))}
        fornecedores={fornecedores}
        materiais={materiais}
        materialInicial={null}
        nomeUsuario={nomeUsuario}
        onConfirm={confirmarNovaEncomenda}
      />

      <PedidoReceberModal
        key={`receber-${receber.sessao}`}
        open={receber.open}
        pedido={receber.pedido}
        onClose={() => setReceber((s) => ({ ...s, open: false }))}
        onConfirm={confirmarRecebimento}
      />

      <ConfirmDialog
        open={cancelar.open}
        onClose={() => setCancelar({ open: false, pedido: null })}
        onConfirm={confirmarCancelamento}
        loading={cancelando}
        title="Cancelar encomenda"
        description={cancelar.pedido ? `Tem a certeza que deseja cancelar a encomenda ${cancelar.pedido.numero}?` : ""}
      />
    </div>
  );
}
