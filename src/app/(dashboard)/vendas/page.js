"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import FloatButton from "@/components/ui/FloatButton";
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
import { listar as listarOrcamentos, remover as removerOrcamento, mudarEstado } from "@/services/orcamentos";
import { listarFaturas, buscarFatura } from "@/services/faturacao";
import { buscarOrganizacao } from "@/services/configuracoes";
import OrcamentoModal from "@/components/vendas/OrcamentoModal";
import OrcamentoDetalhesModal from "@/components/vendas/OrcamentoDetalhesModal";
import FaturaDetalhesModal from "@/components/vendas/FaturaDetalhesModal";
import OrcamentoPdfModal from "@/components/orcamentos/OrcamentoPdfModal";
import CadastrosTab from "@/components/vendas/CadastrosTab";
import gerarFaturaPdf from "@/lib/faturacaoPdf";

const ROTULOS_FAT = { paga: "Paga", emitida: "Emitida", parcial: "Parcial", vencida: "Vencida", cancelada: "Cancelada" };
const ROTULOS_ORC = { pendente: "Em análise", aprovado: "Aprovado", producao: "Em produção", cancelado: "Cancelado", rejeitado: "Rejeitado" };
const TIPOS_DOC = { fatura: "Fatura", factura_recibo: "Factura Recibo", recibo: "Recibo" };

/* Paleta do módulo comercial (referência KAMGEST) */
const BADGE_ORC = {
  pendente: "border-transparent bg-[#e0e7ff] text-[#4338ca]",
  aprovado: "border-transparent bg-[#dcfce7] text-[#15803d]",
  producao: "border-transparent bg-[#fef3c7] text-[#b45309]",
  cancelado: "border-transparent bg-slate-100 text-slate-500",
  rejeitado: "border-transparent bg-red-50 text-red-700",
};
const BADGE_FAT = {
  paga: "border-transparent bg-[#dcfce7] text-[#15803d]",
  emitida: "border-transparent bg-[#e0e7ff] text-[#4338ca]",
  parcial: "border-transparent bg-[#fef3c7] text-[#b45309]",
  vencida: "border-transparent bg-red-50 text-red-700",
  cancelada: "border-transparent bg-slate-100 text-slate-500",
};

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }
function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}
function estadoOrcVisual(o) {
  if (o.estado === "aprovado" && o.ordem_producao) return "producao";
  return o.estado;
}

const TABS = [
  { value: "orcamentos", label: "Orçamentos", icone: "request_quote" },
  { value: "pedidos", label: "Pedidos", icone: "pending_actions" },
  { value: "vendas", label: "Vendas", icone: "receipt_long" },
  { value: "clientes", label: "Clientes", icone: "groups" },
];

function usarFiltroLedger({ items, campos }) {
  const [filtro, setFiltro] = useState({ campo: campos[0]?.value || "", operador: "contem", termo: "" });
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });

  const resultado = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...items];

    if (termo) {
      res = res.filter((item) => {
        const cfg = campos.find((c) => c.value === filtro.campo);
        let alvo = cfg?.obter ? String(cfg.obter(item) || "") : String(item[filtro.campo] || "");
        alvo = alvo.toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }

    if (ordem.chave) {
      res.sort((a, b) => {
        const av = String(a[ordem.chave] || "").toLowerCase();
        const bv = String(b[ordem.chave] || "").toLowerCase();
        return (av < bv ? -1 : av > bv ? 1 : 0) * ordem.dir;
      });
    }

    return res;
  }, [items, filtro, ordem, campos]);

  const alternarOrdem = (chave) =>
    setOrdem((prev) => (prev.chave === chave ? { chave, dir: -prev.dir } : { chave, dir: 1 }));

  return { filtro, setFiltro, ordem, alternarOrdem, resultado };
}

export default function AreaComercialPage() {
  const router = useRouter();
  const [tab, setTab] = useState(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("tab");
      if (q && TABS.some((t) => t.value === q)) return q;
    }
    return "orcamentos";
  });
  const [orcamentos, setOrcamentos] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [empresa, setEmpresa] = useState({ nome: "", nif: "", endereco: "", telefone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const [orcForm, setOrcForm] = useState({ open: false, id: null });
  const [orcDetalhe, setOrcDetalhe] = useState(null);
  const [pdfOrcamento, setPdfOrcamento] = useState(null);
  const [fatDetalhe, setFatDetalhe] = useState(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const { addToast } = useToast();

  const trocarTab = (t) => {
    setTab(t);
    router.replace(`/vendas${t === "orcamentos" ? "" : `?tab=${t}`}`, { scroll: false });
  };

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      try {
        const [orcData, fatData, empData] = await Promise.all([
          listarOrcamentos().catch(() => []),
          listarFaturas().catch(() => []),
          buscarOrganizacao().catch(() => null),
        ]);
        if (!ativo) return;
        setOrcamentos(Array.isArray(orcData) ? orcData : orcData?.data ?? []);
        setFaturas(Array.isArray(fatData) ? fatData : fatData?.data ?? []);
        if (empData) setEmpresa(empData);
      } catch {
        if (ativo) addToast("Erro ao carregar dados de vendas", "error");
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [addToast]);

  const atualizarOrcamentos = async () => {
    const d = await listarOrcamentos().catch(() => []);
    setOrcamentos(Array.isArray(d) ? d : d?.data ?? []);
  };

  const abrirOrcDetalhe = (o) => {
    setOrcDetalhe(o);
    setOrcForm({ open: false, id: null });
  };

  const abrirEdicaoOrc = (o) => {
    setOrcDetalhe(null);
    setOrcForm({ open: true, id: o.id });
  };

  const fecharOrcForm = () => setOrcForm({ open: false, id: null });

  const mudarEstadoOrc = async (o, novoEstado) => {
    if (!novoEstado || novoEstado === o.estado) return;
    try {
      const atualizado = await mudarEstado(o.id, novoEstado);
      setOrcamentos((prev) => prev.map((x) => (x.id === o.id ? { ...x, ...atualizado } : x)));
      setOrcDetalhe((prev) => (prev && prev.id === o.id ? { ...prev, ...atualizado } : prev));
      addToast(`Orçamento ${o.numero || o.id} marcado como ${novoEstado}`, "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao mudar o estado", "error");
    }
  };

  const abrirFaturaDetalhe = async (f) => {
    setFatDetalhe(f);
    try {
      const fresca = await buscarFatura(f.id);
      if (fresca && fresca.id) setFatDetalhe(fresca);
    } catch {
      // mantém os dados já carregados da lista
    }
  };

  const pedidosAprovados = orcamentos.filter((o) => o.estado === "aprovado");
  const totalPedidos = pedidosAprovados.reduce((s, o) => s + (Number(o.total) || 0), 0);

  const orcLedger = usarFiltroLedger({
    items: tab === "pedidos" ? pedidosAprovados : orcamentos,
    campos: [
      { value: "cliente", label: "Cliente", obter: (o) => `${o.cliente?.empresa || ""} ${o.cliente?.nome || ""}` },
      { value: "numero", label: "Número", obter: (o) => o.numero || "" },
      { value: "produto", label: "Produto", obter: (o) => o.especificacao?.produto || "" },
      { value: "estado", label: "Estado", obter: (o) => o.estado || "" },
    ],
  });
  const fatLedger = usarFiltroLedger({
    items: faturas,
    campos: [
      { value: "cliente", label: "Cliente", obter: (f) => `${f.cliente?.empresa || ""} ${f.cliente?.nome || ""}` },
      { value: "numero", label: "Número", obter: (f) => f.numero || "" },
      { value: "estado", label: "Estado", obter: (f) => f.estado || "" },
    ],
  });

  const orcPag = usePaginacao({ items: orcLedger.resultado });
  const fatPag = usePaginacao({ items: fatLedger.resultado });

  const totalOrc = orcamentos.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const totalFat = faturas.reduce((s, f) => s + Number(f.total || f.valor || 0), 0);
  const totalReceber = faturas.filter((f) => !["paga", "cancelada"].includes(f.estado)).reduce((s, f) => s + Number(f.total || f.valor || 0), 0);
  const pendentes = orcamentos.filter((o) => o.estado === "pendente").length;
  const aprovados = orcamentos.filter((o) => o.estado === "aprovado").length;

  const mesLabel = (() => {
    const m = new Date().toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
    return m.charAt(0).toUpperCase() + m.slice(1);
  })();

  const kpis = [
    { label: "Orçamentos", valor: orcamentos.length, icone: "request_quote", tom: "bg-primary/10 text-primary" },
    { label: "Pedidos", valor: aprovados, icone: "pending_actions", tom: "bg-info/10 text-info" },
    { label: "Vendas", valor: faturas.length, icone: "receipt_long", tom: "bg-success/10 text-success" },
  ];

  const confirmarEliminacao = async () => {
    if (!eliminarItem) return;
    setDeletando(true);
    try {
      await removerOrcamento(eliminarItem.id);
      setOrcamentos((prev) => prev.filter((o) => o.id !== eliminarItem.id));
      addToast("Orçamento removido com sucesso", "success");
      setEliminarItem(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao eliminar", "error");
    } finally {
      setDeletando(false);
    }
  };

  if (loading) return <ListSkeleton lines={8} />;

  return (
    <div className="space-y-4">
      {/* Faixa do módulo — identificação comercial (brandGreen) */}
      <div className="flex items-center justify-between rounded-xl bg-[#0a6b3f] px-5 py-2.5 text-white shadow-sm">
        <span className="text-lg font-black tracking-wide drop-shadow-sm">2. COMERCIAL</span>
        <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-emerald-100 sm:block">
          Sistema de Gestão Integrada • KAMGEST
        </span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Gestão Comercial</h2>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">Clientes, orçamentos, pedidos e vendas.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/60 sm:self-auto"
          >
            <Icon name="calendar_month" className="h-4 w-4 text-muted-foreground" />
            <span>{mesLabel}</span>
            <Icon name="expand_more" className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", k.tom)}>
              <Icon name={k.icone} className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-black leading-tight tracking-tight text-foreground tabular-nums">{k.valor}</p>
            </div>
          </div>
        ))}
        <div className="flex flex-col justify-center rounded-xl bg-[#0b4fa8] p-4 text-white shadow-md">
          <p className="text-xs font-medium tracking-wide text-blue-100">Valor de Vendas</p>
          <p className="mt-1 text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">{formatKz(totalFat)}</p>
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-border">
        {TABS.map((t) => {
          const ativo = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => trocarTab(t.value)}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 text-sm transition-colors",
                ativo ? "border-[#0b4fa8] font-bold text-[#0b4fa8]" : "font-semibold text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon name={t.icone} className="text-base" />
              {t.label}
            </button>
          );
        })}
      </div>

      {(tab === "orcamentos" || tab === "pedidos") && (
        <Ledger rotulo="Orçamentos ledger">
          <LedgerHeader
            titulo={tab === "pedidos" ? "Pedidos" : "Orçamentos"}
            subtitulo={
              tab === "pedidos"
                ? `${pedidosAprovados.length} pedidos aprovados · ${formatKz(totalPedidos)}`
                : `${orcamentos.length} orçamentos · ${pendentes} pendentes · ${formatKz(totalOrc)}`
            }
            novo={tab === "orcamentos" ? "Novo orçamento" : undefined}
            aoNovo={() => setOrcForm({ open: true, id: null })}
            onToggleFiltros={() => setFiltrosAbertos((v) => !v)}
            filtrosAbertos={filtrosAbertos}
          />
          {filtrosAbertos && (
            <FilterRow
              campo={orcLedger.filtro.campo}
              setCampo={(v) => orcLedger.setFiltro((f) => ({ ...f, campo: v }))}
              campos={[
                { value: "cliente", label: "Cliente" },
                { value: "numero", label: "Número" },
                { value: "produto", label: "Produto" },
                { value: "estado", label: "Estado" },
              ]}
              operador={orcLedger.filtro.operador}
              setOperador={(v) => orcLedger.setFiltro((f) => ({ ...f, operador: v }))}
              termo={orcLedger.filtro.termo}
              setTermo={(v) => orcLedger.setFiltro((f) => ({ ...f, termo: v }))}
              aoLimpar={() => orcLedger.setFiltro((f) => ({ ...f, termo: "" }))}
              placeholder="Pesquisar..."
            />
          )}
          <LedgerTable>
            <thead>
              <tr className="border-b border-border">
                <LedgerTh onSort={() => orcLedger.alternarOrdem("numero")} ativo={orcLedger.ordem.chave === "numero"}>Nº</LedgerTh>
                <LedgerTh onSort={() => orcLedger.alternarOrdem("data")} ativo={orcLedger.ordem.chave === "data"}>Data</LedgerTh>
                <LedgerTh>Cliente</LedgerTh>
                <LedgerTh onSort={() => orcLedger.alternarOrdem("total")} ativo={orcLedger.ordem.chave === "total"}>Valor (Kz)</LedgerTh>
                <LedgerTh>Estado</LedgerTh>
                <LedgerTh className="w-10" />
              </tr>
            </thead>
            <tbody>
              {orcPag.visiveis.map((o) => (
                <LedgerTr key={o.id} onClick={() => abrirOrcDetalhe(o)}>
                  <LedgerTd className="max-w-44">
                    <IdCell id={o.numero || `#${o.id}`} aoAbrir={() => abrirOrcDetalhe(o)} />
                  </LedgerTd>
                  <LedgerTd className="text-muted-foreground">{formatData(o.data)}</LedgerTd>
                  <LedgerTd className="max-w-52">
                    <span className="block truncate text-sm">{o.cliente?.empresa || o.cliente?.nome || "—"}</span>
                    {o.cliente?.empresa && o.cliente?.nome && (
                      <span className="block truncate text-xs text-muted-foreground">{o.cliente.nome}</span>
                    )}
                  </LedgerTd>
                  <LedgerTd className="font-bold tabular-nums text-foreground">{formatKz(o.total)}</LedgerTd>
                  <LedgerTd>
                    <StatusBadge tom="neutral" className={cn("rounded-full px-3 py-1 text-[11px] font-bold", BADGE_ORC[estadoOrcVisual(o)])}>
                      {ROTULOS_ORC[estadoOrcVisual(o)] || o.estado || "—"}
                    </StatusBadge>
                  </LedgerTd>
                  <LedgerTd>
                    <RowMenu
                      ariaLabel="Ações do orçamento"
                      itens={[
                        { icone: "visibility", rotulo: "Ver detalhes", onClick: () => abrirOrcDetalhe(o) },
                        { icone: "edit", rotulo: "Editar", onClick: () => abrirEdicaoOrc(o) },
                        { icone: "download", rotulo: "Baixar PDF", onClick: () => setPdfOrcamento(o) },
                        { icone: "delete", rotulo: "Remover", danger: true, onClick: () => setEliminarItem({ ...o, _tipo: "orcamento" }) },
                      ]}
                    />
                  </LedgerTd>
                </LedgerTr>
              ))}
            </tbody>
          </LedgerTable>
          {orcPag.total === 0 && <LedgerEmpty icone="request_quote">{tab === "pedidos" ? "Nenhum pedido encontrado" : "Nenhum orçamento encontrado"}</LedgerEmpty>}
          <Paginacao {...orcPag} label={tab === "pedidos" ? "pedidos" : "orçamentos"} />
        </Ledger>
      )}

      {tab === "vendas" && (
        <Ledger rotulo="Facturas ledger">
          <LedgerHeader
            titulo="Vendas"
            subtitulo={`${faturas.length} facturas · ${totalReceber > 0 ? `${formatKz(totalReceber)} a receber` : formatKz(totalFat)}`}
            onToggleFiltros={() => setFiltrosAbertos((v) => !v)}
            filtrosAbertos={filtrosAbertos}
          />
          {filtrosAbertos && (
            <FilterRow
              campo={fatLedger.filtro.campo}
              setCampo={(v) => fatLedger.setFiltro((f) => ({ ...f, campo: v }))}
              campos={[
                { value: "cliente", label: "Cliente" },
                { value: "numero", label: "Número" },
                { value: "estado", label: "Estado" },
              ]}
              operador={fatLedger.filtro.operador}
              setOperador={(v) => fatLedger.setFiltro((f) => ({ ...f, operador: v }))}
              termo={fatLedger.filtro.termo}
              setTermo={(v) => fatLedger.setFiltro((f) => ({ ...f, termo: v }))}
              aoLimpar={() => fatLedger.setFiltro((f) => ({ ...f, termo: "" }))}
              placeholder="Pesquisar..."
            />
          )}
          <LedgerTable>
            <thead>
              <tr className="border-b border-border">
                <LedgerTh onSort={() => fatLedger.alternarOrdem("numero")} ativo={fatLedger.ordem.chave === "numero"}>Fatura</LedgerTh>
                <LedgerTh>Cliente</LedgerTh>
                <LedgerTh onSort={() => fatLedger.alternarOrdem("data_emissao")} ativo={fatLedger.ordem.chave === "data_emissao"}>Emissão</LedgerTh>
                <LedgerTh onSort={() => fatLedger.alternarOrdem("total")} ativo={fatLedger.ordem.chave === "total"}>Total</LedgerTh>
                <LedgerTh>Estado</LedgerTh>
                <LedgerTh className="w-10" />
              </tr>
            </thead>
            <tbody>
              {fatPag.visiveis.map((f) => (
                <LedgerTr key={f.id} onClick={() => abrirFaturaDetalhe(f)}>
                  <LedgerTd className="max-w-44">
                    <IdCell
                      id={f.numero || `#${f.id}`}
                      meta={`${TIPOS_DOC[f.tipo] || f.tipo || "Documento"} · ${formatData(f.data_emissao)}`}
                      aoAbrir={() => abrirFaturaDetalhe(f)}
                    />
                  </LedgerTd>
                  <LedgerTd className="max-w-52">
                    <span className="block truncate text-sm">{f.cliente?.empresa || f.cliente?.nome || "—"}</span>
                    {f.cliente?.empresa && f.cliente?.nome && (
                      <span className="block truncate text-xs text-muted-foreground">{f.cliente.nome}</span>
                    )}
                  </LedgerTd>
                  <LedgerTd className="text-muted-foreground">{formatData(f.data_emissao)}</LedgerTd>
                  <LedgerTd className="tabular-nums">{formatKz(f.total || f.valor)}</LedgerTd>
                  <LedgerTd>
                    <StatusBadge tom="neutral" className={cn("rounded-full px-3 py-1 text-[11px] font-bold", BADGE_FAT[f.estado])}>
                      {ROTULOS_FAT[f.estado] || f.estado || "—"}
                    </StatusBadge>
                  </LedgerTd>
                  <LedgerTd>
                    <RowMenu
                      ariaLabel="Ações da fatura"
                      itens={[
                        { icone: "visibility", rotulo: "Ver detalhes", onClick: () => abrirFaturaDetalhe(f) },
                        { icone: "download", rotulo: "Baixar PDF", onClick: () => gerarFaturaPdf(f, empresa) },
                      ]}
                    />
                  </LedgerTd>
                </LedgerTr>
              ))}
            </tbody>
          </LedgerTable>
          {fatPag.total === 0 && <LedgerEmpty icone="receipt_long">Nenhuma fatura encontrada</LedgerEmpty>}
          <Paginacao {...fatPag} label="facturas" />
        </Ledger>
      )}

      {tab === "clientes" && <CadastrosTab apenas="cliente" />}

      <OrcamentoModal
        open={orcForm.open}
        editingId={orcForm.id}
        onClose={fecharOrcForm}
        onSaved={() => atualizarOrcamentos()}
      />

      <OrcamentoDetalhesModal
        orcamento={orcDetalhe}
        empresa={empresa}
        onClose={() => setOrcDetalhe(null)}
        onEditar={abrirEdicaoOrc}
        onEliminar={(o) => { setOrcDetalhe(null); setEliminarItem({ ...o, _tipo: "orcamento" }); }}
        onEstado={mudarEstadoOrc}
      />

      <OrcamentoPdfModal
        open={Boolean(pdfOrcamento)}
        orcamento={pdfOrcamento}
        empresa={empresa}
        onClose={() => setPdfOrcamento(null)}
      />

      <FaturaDetalhesModal
        fatura={fatDetalhe}
        empresa={empresa}
        podeRemover={false}
        onClose={() => setFatDetalhe(null)}
        onChanged={(atual) => {
          setFatDetalhe(atual);
          setFaturas((prev) => prev.map((x) => (x.id === atual.id ? atual : x)));
        }}
      />

      <ConfirmDialog
        open={Boolean(eliminarItem)}
        onClose={() => setEliminarItem(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title="Remover orçamento"
        description={eliminarItem ? `Tem a certeza que deseja remover o orçamento "${eliminarItem.numero}"? Esta ação não pode ser desfeita.` : ""}
      />


      {tab === "orcamentos" && (
        <FloatButton
          onClick={() => setOrcForm({ open: true, id: null })}
          label="Novo Orçamento"
          icon="request_quote"
        />
      )}
    </div>
  );
}
