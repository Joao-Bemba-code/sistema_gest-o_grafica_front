"use client";

import { useState, useEffect, useMemo } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { inputCls, toNum } from "@/lib/estoque";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import FloatButton from "@/components/ui/FloatButton";
import { useToast } from "@/components/Toast";
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
import { criarFatura, listarFaturas, exportarFaturas, marcarPaga, buscarFatura, anularFatura, consultarEstadoAGT, enviarFaturaAGT } from "@/services/faturacao";
import { listar as listarOrcamentos } from "@/services/orcamentos";
import { listarOrdens } from "@/services/producao";
import { listar as listarClientes } from "@/services/clientes";
import { listarContas } from "@/services/contasBancarias";
import { buscarOrganizacao } from "@/services/configuracoes";
import { resumoTesouraria, listarMovimentos } from "@/services/tesouraria";
import { podeAtual } from "@/lib/permissoes";
import gerarPDF from "@/lib/faturacaoPdf";
import DespesaModal from "@/components/financeiro/DespesaModal";
import CustosRateiosTab from "@/components/financeiro/CustosRateiosTab";

const metodos = {
  dinheiro: { label: "Dinheiro", icon: "payments" },
  transferencia: { label: "Transferência", icon: "account_balance" },
  ordem_saida: { label: "Ordem de Saque", icon: "receipt_long" },
  deposito: { label: "Depósito", icon: "savings" },
  multicaixa: { label: "Multicaixa", icon: "credit_card" },
  referencia: { label: "Referência", icon: "receipt" },
  cheque: { label: "Cheque", icon: "description" },
};

const tiposDoc = {
  fatura: { label: "Fatura", variant: "info" },
  factura_recibo: { label: "Factura Recibo", variant: "success" },
  recibo: { label: "Recibo", variant: "secondary" },
};

const faturaEstados = {
  emitida: { label: "Emitida", tom: "warning" },
  paga: { label: "Paga", tom: "success" },
  parcial: { label: "Parcial", tom: "info" },
  vencida: { label: "Vencida", tom: "error" },
  cancelada: { label: "Anulada", tom: "neutral" },
};

const agtEstados = {
  pendente: { label: "AGT: Pendente", tom: "warning" },
  valida: { label: "AGT: Validada", tom: "success" },
  invalida: { label: "AGT: Inválida", tom: "error" },
};

const CAMPOS_FAT = [
  { value: "numero", label: "Número", obter: (f) => f.numero || "" },
  { value: "cliente", label: "Cliente", obter: (f) => `${f.cliente?.nome || ""} ${f.cliente?.empresa || ""}` },
  { value: "estado", label: "Estado", obter: (f) => f.estado || "" },
  { value: "tipo", label: "Tipo de documento", obter: (f) => f.tipo || "" },
];

const hoje = new Date().toISOString().split("T")[0];
const blankItem = { descricao: "", quantidade: "", preco_unit: "" };
const blankFaturaForm = {
  tipo: "fatura", cliente_id: "", orcamento_id: "", op: "", data_emissao: hoje, data_vencimento: "", iva: 14,
  metodo: "transferencia", itens: [{ ...blankItem }], observacoes: "", valor_pago: "",
};

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

const tabClsBase = "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-2 text-sm font-semibold transition-colors";
const tabClsAtiva = "border-blue-600 font-bold text-blue-600";
const tabClsInativa = "border-transparent text-muted-foreground hover:text-foreground";

export default function FaturacaoPage() {
  const [faturas, setFaturas] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("faturas");
  const [fatModalOpen, setFatModalOpen] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState(null);
  const [faturaForm, setFaturaForm] = useState(blankFaturaForm);
  const [empresa, setEmpresa] = useState({ nome: "", nif: "", endereco: "", telefone: "", email: "" });
  const [anularItem, setAnularItem] = useState(null);
  const [motivoAnulacao, setMotivoAnulacao] = useState("");
  const [deletando, setDeletando] = useState(false);
  const [contas, setContas] = useState([]);
  const [contaPagamento, setContaPagamento] = useState("");
  const [tesouraria, setTesouraria] = useState({});
  const [filtroMes, setFiltroMes] = useState("");
  const [despesaModalOpen, setDespesaModalOpen] = useState(false);
  const { addToast } = useToast();

  const carregarDados = () => {
    Promise.all([listarFaturas(), listarOrdens(), listarClientes({ tipo: "cliente" }), listarOrcamentos(), buscarOrganizacao().catch(() => null), listarContas().catch(() => []), resumoTesouraria().catch(() => ({})), listarMovimentos().catch(() => [])])
      .then(([f, o, c, orcData, emp, cb, tes, mov]) => {
        setFaturas(Array.isArray(f) ? f : f?.data || []);
        setOrdens(Array.isArray(o) ? o : o?.ordens || []);
        setClientes(Array.isArray(c) ? c : c?.data || []);
        setOrcamentos((Array.isArray(orcData) ? orcData : orcData?.data || []).map((o) => ({ ...o, cliente_id: Number(o.cliente_id) || Number(o.cliente?.id) || null })));
        if (emp) setEmpresa(emp);
        const lista = Array.isArray(cb) ? cb : [];
        setContas(lista);
        const fav = lista.find((x) => x.favorita) || lista[0];
        setContaPagamento(fav ? String(fav.id) : "");
        setTesouraria(tes && typeof tes === "object" ? tes : {});
        setMovimentos(Array.isArray(mov) ? mov : mov?.data || mov?.movimentos || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarDados();
  }, []);


  const [filtro, setFiltro] = useState({ campo: "numero", operador: "contem", termo: "" });
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);

  const filteredFaturasFinal = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...faturas];
    if (filtroEstado !== "todas") res = res.filter((f) => f.estado === filtroEstado);
    if (filtroMes) res = res.filter((f) => String(f.data_emissao || "").slice(0, 7) === filtroMes);
    if (termo) {
      const cfg = CAMPOS_FAT.find((c) => c.value === filtro.campo) || CAMPOS_FAT[0];
      res = res.filter((f) => {
        const alvo = String(cfg.obter(f) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (ordem.chave === "numero") res.sort((a, b) => String(a.numero || "").localeCompare(String(b.numero || ""), "pt", { numeric: true }) * ordem.dir);
    if (ordem.chave === "total") res.sort((a, b) => (valorDoc(a) - valorDoc(b)) * ordem.dir);
    if (ordem.chave === "emissao") res.sort((a, b) => (new Date(a.data_emissao || 0) - new Date(b.data_emissao || 0)) * ordem.dir);
    return res;
  }, [faturas, filtro, filtroEstado, ordem, filtroMes]);

  const contagensEstado = useMemo(() => {
    const c = { todas: faturas.length };
    for (const k of Object.keys(faturaEstados)) c[k] = faturas.filter((f) => f.estado === k).length;
    return c;
  }, [faturas]);

  const { visiveis: faturasVisiveis, ...pag } = usePaginacao({ items: filteredFaturasFinal });

  const abrirFatura = async (f) => {
    setSelectedFatura(f);
    try {
      const fresca = await buscarFatura(f.id);
      if (fresca && fresca.id) setSelectedFatura(fresca);
    } catch {
      // mantém os dados já carregados da lista
    }
  };


  const valorDoc = (f) => Number(f.total || f.valor || 0);
  const pagoDoc = (f) => Number(f.valor_pago || f.total || f.valor || 0);

  const totalReceber = faturas.filter((f) => !["paga", "cancelada"].includes(f.estado)).reduce((s, f) => s + valorDoc(f), 0);
  const totalRecebido = faturas.filter((f) => f.estado === "paga").reduce((s, f) => s + pagoDoc(f), 0);
  const totalVencidas = faturas.filter((f) => f.estado === "vencida").reduce((s, f) => s + valorDoc(f), 0);
  const recebidoHoje = faturas.filter((f) => f.estado === "paga" && (f.data_pagamento || f.data_emissao) === hoje).reduce((s, f) => s + pagoDoc(f), 0);

  const despesas = useMemo(() => movimentos.filter((m) => m.tipo === "saida" && m.estado !== "anulado"), [movimentos]);
  const { visiveis: despesasVisiveis, ...pagDesp } = usePaginacao({ items: despesas });

  const faturaSubtotal = faturaForm.itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.preco_unit) || 0), 0);
  const faturaIva = (faturaSubtotal * (Number(faturaForm.iva) || 0)) / 100;
  const faturaTotal = faturaSubtotal + faturaIva;
  const faturaPago = Number(faturaForm.valor_pago) || 0;
  const faturaDivida = faturaForm.tipo === "factura_recibo" ? 0 : Math.max(0, faturaTotal - faturaPago);

  const setFaturaItem = (idx, key, val) => {
    setFaturaForm((p) => {
      const itens = [...p.itens];
      itens[idx] = { ...itens[idx], [key]: val };
      return { ...p, itens };
    });
  };

  const addFaturaItem = () => setFaturaForm((p) => ({ ...p, itens: [...p.itens, { ...blankItem }] }));
  const removeFaturaItem = (idx) => setFaturaForm((p) => (p.itens.length <= 1 ? p : { ...p, itens: p.itens.filter((_, i) => i !== idx) }));

  const orcamentosDoCliente = faturaForm.cliente_id
    ? orcamentos.filter((o) => String(o.cliente_id) === String(faturaForm.cliente_id) && (o.estado === "aprovado" || o.estado === "pendente"))
    : orcamentos.filter((o) => o.estado === "aprovado" || o.estado === "pendente");

  const handleOrcamentoSelect = (e) => {
    const id = e.target.value;
    const o = orcamentos.find((x) => String(x.id) === id);
    if (!o) {
      setFaturaForm((p) => ({ ...p, orcamento_id: "" }));
      return;
    }
    setFaturaForm((p) => ({
      ...p,
      orcamento_id: o.id,
      cliente_id: p.cliente_id || o.cliente_id,
      itens: (o.itens || []).length
        ? o.itens.map((it) => ({ descricao: it.descricao || "", quantidade: Number(it.quantidade) || 0, preco_unit: Number(it.preco_unit != null ? it.preco_unit : it.valorUnitario) || 0 }))
        : [{ ...blankItem }],
    }));
  };

  const handleSubmitFatura = async (e) => {
    e.preventDefault();
    const itens = faturaForm.itens
      .map((i) => ({ descricao: i.descricao, quantidade: Number(i.quantidade) || 0, preco_unit: Number(i.preco_unit) || 0 }))
      .filter((i) => i.descricao);
    if (!itens.length) {
      addToast("Adicione pelo menos um item à fatura", "error");
      return;
    }
    try {
       const criado = await criarFatura({
        tipo: faturaForm.tipo || "fatura",
        cliente_id: Number(faturaForm.cliente_id) || null,
        orcamento_id: Number(faturaForm.orcamento_id) || null,
        op: Number(faturaForm.op) || null,
        data_emissao: faturaForm.data_emissao,
        data_vencimento: faturaForm.data_vencimento || undefined,
        iva: Number(faturaForm.iva) || 0,
        itens,
        metodo: faturaForm.metodo,
        valor_pago: faturaForm.tipo === "factura_recibo" ? undefined : Number(faturaForm.valor_pago) || 0,
        observacoes: faturaForm.observacoes,
      });
      setFaturas((prev) => [criado, ...prev]);
      setFaturaForm(blankFaturaForm);
      setFatModalOpen(false);
      addToast("Fatura registada com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  const contaIdSelecionada = (() => {
    if (contaPagamento) return Number(contaPagamento);
    return Number(selectedFatura?.conta_bancaria_id) || null;
  })();

  const handleMarcarPaga = async (f, valorPago) => {
    try {
      const atual = await marcarPaga(f.id, { valor_pago: Number(valorPago) || undefined, metodo: f.metodo_pagamento || "transferencia", conta_bancaria_id: contaIdSelecionada });
      setFaturas((prev) => prev.map((x) => (x.id === f.id ? atual : x)));
      setSelectedFatura(atual);
      addToast(valorPago && Number(valorPago) < Number(f.total || f.valor) ? "Pagamento parcial registado" : "Fatura marcada como paga", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao marcar fatura como paga", "error");
    }
  };

  const [pagamentoExtra, setPagamentoExtra] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const handleRegistarPagamento = async () => {
    const extra = Number(pagamentoExtra) || 0;
    if (extra <= 0) {
      addToast("Informe um valor maior que zero", "error");
      return;
    }
    const total = Number(selectedFatura.total || selectedFatura.valor) || 0;
    const atual = Number(selectedFatura.valor_pago) || 0;
    const novoTotal = atual + extra;
    setRegistrando(true);
    try {
      const atualizada = await marcarPaga(selectedFatura.id, { valor_pago: novoTotal, metodo: selectedFatura.metodo_pagamento || "transferencia", conta_bancaria_id: contaIdSelecionada });
      setFaturas((prev) => prev.map((x) => (x.id === selectedFatura.id ? atualizada : x)));
      setSelectedFatura(atualizada);
      setPagamentoExtra("");
      addToast(novoTotal >= total ? "Fatura paga integralmente" : "Pagamento parcial registado", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao registar pagamento", "error");
    } finally {
      setRegistrando(false);
    }
  };

  const confirmarAnulacao = async () => {
    if (!anularItem) return;
    setDeletando(true);
    try {
      const atual = await anularFatura(anularItem.id, { motivo: motivoAnulacao.trim() || undefined });
      setFaturas((prev) => prev.map((f) => (f.id === atual.id ? atual : f)));
      if (selectedFatura?.id === anularItem.id) setSelectedFatura(atual);
      addToast(
        Number(atual.estornos) > 0
          ? `Fatura anulada e ${atual.estornos} movimento(s) estornado(s) na tesouraria`
          : "Fatura anulada com sucesso",
        "success"
      );
      setAnularItem(null);
      setMotivoAnulacao("");
      carregarDados();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao anular fatura", "error");
    } finally {
      setDeletando(false);
    }
  };

  const [agtAcao, setAgtAcao] = useState(null);

  const aplicarAGT = (resposta) => {
    if (!resposta?.id) return;
    setSelectedFatura(resposta);
    setFaturas((prev) => prev.map((x) => (x.id === resposta.id ? resposta : x)));
  };

  const handleConsultarAGT = async () => {
    const f = selectedFatura;
    if (!f) return;
    setAgtAcao(f.id);
    try {
      const resp = await consultarEstadoAGT(f.id);
      aplicarAGT(resp);
      if (resp.agt_status === "valida") addToast("Fatura validada pela AGT", "success");
      else if (resp.agt_status === "invalida") addToast("Fatura rejeitada pela AGT", "error");
      else addToast("Estado AGT ainda em processamento", "info");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao consultar estado na AGT", "error");
    } finally {
      setAgtAcao(null);
    }
  };

  const handleEnviarAGT = async () => {
    const f = selectedFatura;
    if (!f) return;
    setAgtAcao(f.id);
    try {
      const resp = await enviarFaturaAGT(f.id);
      aplicarAGT(resp);
      if (resp.agt_status === "pendente") addToast("Fatura submetida à AGT", "success");
      else addToast("Fatura enviada à AGT", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao enviar fatura à AGT", "error");
    } finally {
      setAgtAcao(null);
    }
  };

  const handleExportar = async () => {
    try {
      const blob = await exportarFaturas({ estado: filtroEstado === "todas" ? undefined : filtroEstado });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `faturas_${hoje}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast("Faturas exportadas com sucesso", "success");
    } catch (err) {
      addToast("Erro ao exportar faturas", "error");
    }
  };

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  const entradasMes = Number(tesouraria.entradasMes || 0);
  const saidasMes = Number(tesouraria.saidasMes || 0);
  const resultado = entradasMes - saidasMes;
  const margem = entradasMes > 0 ? (resultado / entradasMes) * 100 : 0;
  const kpis = [
    { key: "receitas", icon: "trending_up", label: "Receitas", valor: Math.round(entradasMes).toLocaleString("pt-AO"), sufixo: "Kz", icone: "bg-primary/10 text-primary", cor: "text-foreground" },
    { key: "despesas", icon: "account_balance_wallet", label: "Despesas", valor: Math.round(saidasMes).toLocaleString("pt-AO"), sufixo: "Kz", icone: "bg-error/10 text-error", cor: "text-foreground" },
    { key: "resultado", icon: "bar_chart", label: "Resultado", valor: Math.round(resultado).toLocaleString("pt-AO"), sufixo: "Kz", icone: "bg-success/10 text-success", cor: resultado < 0 ? "text-error" : "text-success" },
    { key: "margem", icon: "speed", label: "Margem", valor: `${margem.toFixed(1)}%`, icone: "bg-success/10 text-success", cor: "text-foreground" },
  ];
  const podeNovaDespesa = podeAtual("tesouraria", "criar");

  return (
    <div className="space-y-4">
      {/* Faixa do módulo - identificação financeiro (teal) */}
      <div className="flex items-center rounded-xl bg-[#0a615a] px-5 py-2.5 text-white shadow-sm">
        <span className="text-lg font-extrabold uppercase tracking-wide">6. FINANCEIRO</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Gestão Financeira</h1>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">Contabilidade, facturação e resultados.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {faturas.length > 0 && (
            <button type="button" onClick={handleExportar} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60">
              <Icon name="download" className="text-base" /> Exportar
            </button>
          )}
          {podeNovaDespesa && (
            <button type="button" onClick={() => setDespesaModalOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
              <Icon name="add" className="text-base" /> Nova Despesa
            </button>
          )}
          <button onClick={() => setFatModalOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
            <Icon name="add" className="text-base" /> Nova Factura
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores financeiros">
        {kpis.map((k) => (
          <div key={k.key} className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl ${k.icone}`}>
              <Icon name={k.icon} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight text-muted-foreground">{k.label}</p>
              <p className={`truncate text-xl font-black leading-tight tabular-nums tracking-tight sm:text-2xl ${k.cor}`}>
                {k.valor}
                {k.sufixo && <span className="ml-1 text-xs font-bold text-muted-foreground">{k.sufixo}</span>}
              </p>
            </div>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {[
            { id: "faturas", label: "Facturação", icon: "receipt_long" },
            { id: "despesas", label: "Despesas", icon: "account_balance_wallet" },
            { id: "custos", label: "Custos e Rateios", icon: "call_split" },
            { id: "resultados", label: "Resultados", icon: "bar_chart" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`${tabClsBase} ${tab === t.id ? tabClsAtiva : tabClsInativa}`}
            >
              <Icon name={t.icon} className="text-base" /> {t.label}
            </button>
          ))}
        </div>
        {tab === "faturas" && (
          <label className="flex items-center gap-2 pb-1.5 text-xs text-muted-foreground">
            <Icon name="calendar_month" className="text-base" />
            <input
              type="month"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
            {filtroMes && (
              <button type="button" onClick={() => setFiltroMes("")} className="font-medium text-primary hover:underline">Limpar</button>
            )}
          </label>
        )}
      </div>


      {tab === "faturas" && (
        <Ledger rotulo="Faturas ledger">
          <LedgerHeader
            titulo="Faturas"
            subtitulo={`${faturas.length} documentos · a receber ${formatKz(totalReceber)} · recebido ${formatKz(totalRecebido)} · recebido hoje ${formatKz(recebidoHoje)} · vencidas ${formatKz(totalVencidas)}`}
            onToggleFiltros={() => setFiltrosAbertos((v) => !v)}
            filtrosAbertos={filtrosAbertos}
          />
          {filtrosAbertos && (
            <FilterRow
              campo={filtro.campo}
              setCampo={(v) => setFiltro((f) => ({ ...f, campo: v }))}
              campos={CAMPOS_FAT.map(({ value, label }) => ({ value, label }))}
              operador={filtro.operador}
              setOperador={(v) => setFiltro((f) => ({ ...f, operador: v }))}
              termo={filtro.termo}
              setTermo={(v) => setFiltro((f) => ({ ...f, termo: v }))}
              aoLimpar={() => setFiltro((f) => ({ ...f, termo: "" }))}
              placeholder="Pesquisar por nº fatura, cliente..."
            />
          )}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
            <button
              type="button"
              onClick={() => setFiltroEstado("todas")}
              aria-pressed={filtroEstado === "todas"}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-colors ${filtroEstado === "todas" ? "border-blue-600/40 bg-blue-50 text-blue-600" : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
            >
              Todas <span className="text-[11px] text-muted-foreground">{contagensEstado.todas}</span>
            </button>
            {Object.entries(faturaEstados).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFiltroEstado(k)}
                aria-pressed={filtroEstado === k}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-colors ${filtroEstado === k ? "border-blue-600/40 bg-blue-50 text-blue-600" : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
              >
                {v.label} <span className="text-[11px] text-muted-foreground">{contagensEstado[k] ?? 0}</span>
              </button>
            ))}
          </div>

          <LedgerTable>
            <thead>
              <tr className="border-b border-border">
                <LedgerTh onSort={() => setOrdem((p) => (p.chave === "numero" ? { chave: "numero", dir: -p.dir } : { chave: "numero", dir: 1 }))} ativo={ordem.chave === "numero"}>Nº</LedgerTh>
                <LedgerTh onSort={() => setOrdem((p) => (p.chave === "emissao" ? { chave: "emissao", dir: -p.dir } : { chave: "emissao", dir: 1 }))} ativo={ordem.chave === "emissao"}>Data</LedgerTh>
                <LedgerTh>Cliente/Fornecedor</LedgerTh>
                <LedgerTh>Tipo</LedgerTh>
                <LedgerTh onSort={() => setOrdem((p) => (p.chave === "total" ? { chave: "total", dir: -p.dir } : { chave: "total", dir: 1 }))} ativo={ordem.chave === "total"} className="text-right">Valor (Kz)</LedgerTh>
                <LedgerTh>Estado</LedgerTh>
                <LedgerTh className="w-10" />
              </tr>
            </thead>
            <tbody>
              {faturasVisiveis.map((f) => (
                <LedgerTr key={f.id} onClick={() => abrirFatura(f)}>
                  <LedgerTd className="whitespace-nowrap font-semibold text-slate-800">
                    <IdCell id={f.numero} meta={f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-AO") : "—"} aoAbrir={() => abrirFatura(f)} />
                  </LedgerTd>
                  <LedgerTd className="text-muted-foreground whitespace-nowrap">{f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-AO") : "—"}</LedgerTd>
                  <LedgerTd className="max-w-48"><span className="block truncate font-medium">{f.cliente?.nome || "—"}</span></LedgerTd>
                  <LedgerTd className="whitespace-nowrap text-slate-700">{tiposDoc[f.tipo]?.label || f.tipo || "—"}</LedgerTd>
                  <LedgerTd className="text-right tabular-nums whitespace-nowrap">
                    <span className="block font-semibold text-slate-800">{toNum(valorDoc(f)).toLocaleString("pt-AO")}</span>
                    {f.iva > 0 && <span className="block text-xs text-muted-foreground">IVA {Number(f.iva)}%</span>}
                  </LedgerTd>
                  <LedgerTd>
                    <span className="flex flex-wrap items-center gap-1">
                      <StatusBadge tom={(faturaEstados[f.estado] || { tom: "neutral" }).tom}>{faturaEstados[f.estado]?.label || f.estado}</StatusBadge>
                      {f.agt_status && (
                        <StatusBadge tom={(agtEstados[f.agt_status] || { tom: "neutral" }).tom}>{agtEstados[f.agt_status]?.label || f.agt_status}</StatusBadge>
                      )}
                    </span>
                  </LedgerTd>
                  <LedgerTd>
                    <RowMenu
                      ariaLabel="Ações da fatura"
                      itens={[
                        { icone: "visibility", rotulo: "Ver detalhes", onClick: () => abrirFatura(f) },
                        { icone: "download", rotulo: "Baixar PDF", onClick: () => gerarPDF(f, empresa) },
                        ...(f.estado !== "cancelada"
                          ? [{ icone: "block", rotulo: "Anular", danger: true, onClick: () => { setAnularItem(f); setMotivoAnulacao(""); } }]
                          : []),
                      ]}
                    />
                  </LedgerTd>
                </LedgerTr>
              ))}
            </tbody>
          </LedgerTable>
          {pag.total === 0 && (
            <LedgerEmpty icone="receipt_long">
              {faturas.length === 0 ? "Nenhuma fatura registada" : "Nenhuma fatura corresponde ao filtro"}
            </LedgerEmpty>
          )}
          <Paginacao {...pag} label="faturas" />
        </Ledger>
      )}

      {tab === "despesas" && (
        <Ledger rotulo="Despesas ledger">
          <LedgerHeader
            titulo="Despesas"
            subtitulo={`${despesas.length} movimentos de saída`}
          />
          <LedgerTable>
            <thead>
              <tr className="border-b border-border">
                <LedgerTh>Nº</LedgerTh>
                <LedgerTh>Data</LedgerTh>
                <LedgerTh>Cliente/Fornecedor</LedgerTh>
                <LedgerTh>Tipo</LedgerTh>
                <LedgerTh className="text-right">Valor (Kz)</LedgerTh>
              </tr>
            </thead>
            <tbody>
              {despesasVisiveis.map((m) => (
                <LedgerTr key={m.id}>
                  <LedgerTd className="whitespace-nowrap font-semibold text-slate-800">
                    <IdCell id={m.referencia || `DES-${String(m.id).padStart(4, "0")}`} meta={m.categoria || "—"} />
                  </LedgerTd>
                  <LedgerTd className="text-muted-foreground whitespace-nowrap">{m.data_movimento || m.data ? new Date(m.data_movimento || m.data).toLocaleDateString("pt-AO") : "—"}</LedgerTd>
                  <LedgerTd className="max-w-48"><span className="block truncate font-medium">{m.descricao || "—"}</span></LedgerTd>
                  <LedgerTd className="whitespace-nowrap font-medium text-red-500">Despesa</LedgerTd>
                  <LedgerTd className="text-right tabular-nums whitespace-nowrap font-semibold text-slate-800">{toNum(m.valor).toLocaleString("pt-AO")}</LedgerTd>
                </LedgerTr>
              ))}
            </tbody>
          </LedgerTable>
          {pagDesp.total === 0 && (
            <LedgerEmpty icone="account_balance_wallet">Nenhuma despesa registada</LedgerEmpty>
          )}
          <Paginacao {...pagDesp} label="movimentos" />
        </Ledger>
      )}

      {tab === "custos" && <CustosRateiosTab />}

      {tab === "resultados" && (
        <Ledger rotulo="Resultados ledger">
          <LedgerHeader
            titulo="Resultados"
            subtitulo="Receitas, despesas e resultado do período"
          />
          <LedgerTable>
            <thead>
              <tr className="border-b border-border">
                <LedgerTh>Indicador</LedgerTh>
                <LedgerTh className="text-right">Valor (Kz)</LedgerTh>
              </tr>
            </thead>
            <tbody>
              <LedgerTr>
                <LedgerTd className="font-medium">Receitas</LedgerTd>
                <LedgerTd className="text-right tabular-nums font-semibold text-slate-800">{toNum(entradasMes).toLocaleString("pt-AO")}</LedgerTd>
              </LedgerTr>
              <LedgerTr>
                <LedgerTd className="font-medium">Despesas</LedgerTd>
                <LedgerTd className="text-right tabular-nums font-semibold text-slate-800">{toNum(saidasMes).toLocaleString("pt-AO")}</LedgerTd>
              </LedgerTr>
              <LedgerTr>
                <LedgerTd className="font-medium">Resultado</LedgerTd>
                <LedgerTd className={`text-right tabular-nums font-semibold ${resultado < 0 ? "text-red-600" : "text-emerald-600"}`}>{toNum(resultado).toLocaleString("pt-AO")}</LedgerTd>
              </LedgerTr>
              <LedgerTr>
                <LedgerTd className="font-medium">Margem</LedgerTd>
                <LedgerTd className="text-right tabular-nums font-semibold text-slate-800">{margem.toFixed(1)}%</LedgerTd>
              </LedgerTr>
            </tbody>
          </LedgerTable>
        </Ledger>
      )}

      <Modal open={fatModalOpen} onClose={() => { setFaturaForm(blankFaturaForm); setFatModalOpen(false); }} title={faturaForm.tipo === "recibo" ? "Novo Recibo" : faturaForm.tipo === "factura_recibo" ? "Nova Factura Recibo" : "Nova Fatura"} icon="receipt_long" size="2xl"
        footer={<><Button type="button" variant="outline" onClick={() => { setFaturaForm(blankFaturaForm); setFatModalOpen(false); }}>Cancelar</Button><Button type="submit" form="form-fatura">{faturaForm.tipo === "recibo" ? "Registar Recibo" : faturaForm.tipo === "factura_recibo" ? "Registar Factura Recibo" : "Registar Fatura"}</Button></>}>
        <form id="form-fatura" onSubmit={handleSubmitFatura} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo de Documento *</label>
              <select required value={faturaForm.tipo} onChange={(e) => setFaturaForm({ ...faturaForm, tipo: e.target.value, valor_pago: e.target.value === "factura_recibo" ? "" : faturaForm.valor_pago })} className={inputCls}>
                <option value="fatura">Fatura (a receber)</option>
                <option value="recibo">Recibo (pagamento)</option>
                <option value="factura_recibo">Factura Recibo (já paga)</option>
              </select>
              {faturaForm.tipo === "factura_recibo" && (
                <p className="text-[10px] text-amber-600">A Factura Recibo fica automaticamente marcada como paga pelo valor total.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente *</label>
              <select required value={faturaForm.cliente_id} onChange={(e) => setFaturaForm({ ...faturaForm, cliente_id: e.target.value, orcamento_id: "" })} className={inputCls}>
                <option value="">Seleccionar...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome || c.razao_social}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Orçamento</label>
              <select value={faturaForm.orcamento_id || ""} onChange={handleOrcamentoSelect} className={inputCls} disabled={!faturaForm.cliente_id}>
                <option value="">Seleccionar orçamento...</option>
                {orcamentosDoCliente.map((o) => (
                  <option key={o.id} value={o.id}>{o.numero || o.id} — {formatKz(o.total || o.subtotal + o.valorIva)}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ordem de Produção</label>
              <select value={faturaForm.op} onChange={(e) => setFaturaForm({ ...faturaForm, op: e.target.value })} className={inputCls}>
                <option value="">Seleccionar OP...</option>
                {ordens.map((o) => <option key={o.id} value={o.id}>{o.id} — {o.cliente?.nome || o.cliente}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data de Emissão *</label>
              <input required type="date" value={faturaForm.data_emissao} onChange={(e) => setFaturaForm({ ...faturaForm, data_emissao: e.target.value })} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data de Vencimento</label>
              <input type="date" value={faturaForm.data_vencimento} onChange={(e) => setFaturaForm({ ...faturaForm, data_vencimento: e.target.value })} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">IVA (%)</label>
              <NumeroInput value={faturaForm.iva} onChange={(e) => setFaturaForm({ ...faturaForm, iva: e.target.value })} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Método de Pagamento</label>
              <select value={faturaForm.metodo} onChange={(e) => setFaturaForm({ ...faturaForm, metodo: e.target.value })} className={inputCls}>
                {Object.entries(metodos).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}
              </select>
            </div>
            {faturaForm.tipo !== "factura_recibo" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor Pago Agora</label>
                <NumeroInput value={faturaForm.valor_pago} onChange={(e) => setFaturaForm({ ...faturaForm, valor_pago: e.target.value })} className={inputCls} placeholder="0,00" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Icon name="list" className="text-sm text-primary" /> Itens da Fatura</h3>
              <Button type="button" variant="ghost" size="sm" onClick={addFaturaItem}><Icon name="add_circle" className="text-sm" /> Adicionar Item</Button>
            </div>
            {faturaForm.itens.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-muted/50 rounded-xl p-3">
                <div className="col-span-12 sm:col-span-5 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Descrição *</label>}
                  <input required value={it.descricao} onChange={(e) => setFaturaItem(idx, "descricao", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Descrição do serviço" />
                </div>
                <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Qtd *</label>}
                  <NumeroInput required value={it.quantidade} onChange={(e) => setFaturaItem(idx, "quantidade", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                </div>
                <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Valor Unit. *</label>}
                  <NumeroInput required value={it.preco_unit} onChange={(e) => setFaturaItem(idx, "preco_unit", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                </div>
                <div className="col-span-3 sm:col-span-2 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Total</label>}
                  <div className="px-2.5 py-2 bg-muted border border-input rounded-lg text-xs font-bold text-foreground">{formatKz((Number(it.quantidade) || 0) * (Number(it.preco_unit) || 0))}</div>
                </div>
                <div className="col-span-1 flex justify-center">
                  {faturaForm.itens.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFaturaItem(idx)} title="Remover" className="text-error">
                      <Icon name="close" className="text-sm" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <p>Subtotal: <strong className="text-foreground">{formatKz(faturaSubtotal)}</strong></p>
              {faturaIva > 0 && <p>IVA ({Number(faturaForm.iva) || 0}%): <strong className="text-foreground">{formatKz(faturaIva)}</strong></p>}
              {faturaForm.tipo !== "factura_recibo" && Number(faturaForm.valor_pago) > 0 && (
                <p>Valor pago: <strong className="text-success">{formatKz(faturaForm.valor_pago)}</strong></p>
              )}
              {faturaForm.tipo !== "factura_recibo" && faturaDivida > 0 && (
                <p>Em dívida a liquidar: <strong className="text-warning">{formatKz(faturaDivida)}</strong></p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Total</p>
              <p className="text-lg font-bold text-primary">{formatKz(faturaTotal)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</label>
            <textarea value={faturaForm.observacoes} onChange={(e) => setFaturaForm({ ...faturaForm, observacoes: e.target.value })} rows={2} className={`${inputCls} resize-none`} placeholder="Notas adicionais..." />
          </div>
        </form>
      </Modal>

      {selectedFatura && (
        <Modal open={!!selectedFatura} onClose={() => setSelectedFatura(null)} title={`Fatura ${selectedFatura.numero}`} icon="receipt_long" size="lg"
          footer={<>
            <div className="w-full space-y-3">
              {!["paga", "cancelada"].includes(selectedFatura.estado) && selectedFatura.tipo !== "recibo" && (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1 flex-1 min-w-[180px] max-w-[240px]">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor a pagar agora</label>
                    <div className="flex items-center rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
                      <span className="pl-3 pr-1 text-sm font-semibold text-muted-foreground">Kz</span>
                      <NumeroInput
                        value={pagamentoExtra}
                        onChange={(e) => setPagamentoExtra(e.target.value)}
                        className="w-full h-11 px-2 text-sm outline-none bg-transparent"
                        placeholder={String(Math.max(0, Number(selectedFatura.total || selectedFatura.valor) - Number(selectedFatura.valor_pago || 0)))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[160px] max-w-[220px]">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Conta bancária</label>
                    <select
                      value={contaPagamento}
                      onChange={(e) => setContaPagamento(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      <option value="">Sem conta</option>
                      {contas.map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.banco_nome}{c.numero_conta ? ` · ${c.numero_conta}` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={handleRegistarPagamento} disabled={registrando || !pagamentoExtra || Number(pagamentoExtra) <= 0}>
                    <Icon name="payments" className="text-sm" /> {registrando ? "A registar..." : "Registar Pagamento"}
                  </Button>
                  <Button variant="outline" onClick={() => handleMarcarPaga(selectedFatura, Number(selectedFatura.total || selectedFatura.valor))}>
                    Paga Integralmente
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-end gap-3">
                {selectedFatura.tipo === "fatura" && (
                  <>
                    <Button type="button" variant="outline" disabled={agtAcao === selectedFatura.id || !selectedFatura.agt_request_id} onClick={handleConsultarAGT}>
                      <Icon name="sync" className="text-sm" /> {agtAcao === selectedFatura.id ? "A consultar..." : "Consultar AGT"}
                    </Button>
                    <Button type="button" variant="outline" disabled={agtAcao === selectedFatura.id} onClick={handleEnviarAGT}>
                      <Icon name="send" className="text-sm" /> Enviar à AGT
                    </Button>
                  </>
                )}
                <Button type="button" variant="outline" onClick={() => gerarPDF(selectedFatura, empresa)}><Icon name="download" className="text-sm" /> Baixar PDF</Button>
                {selectedFatura.estado !== "cancelada" && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setAnularItem(selectedFatura);
                      setMotivoAnulacao("");
                      setSelectedFatura(null);
                    }}
                  >
                    <Icon name="block" className="text-sm" /> Anular fatura
                  </Button>
                )}
                <Button type="button" onClick={() => setSelectedFatura(null)}>Fechar</Button>
              </div>
            </div>
          </>}>
          <div className="space-y-5">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-semibold text-foreground truncate">{selectedFatura.cliente?.nome || "—"}</p>
                  {selectedFatura.cliente?.nif && <p className="text-xs text-muted-foreground">NIF: {selectedFatura.cliente.nif}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge tom={(faturaEstados[selectedFatura.estado] || { tom: "neutral" }).tom}>
                    {faturaEstados[selectedFatura.estado]?.label || selectedFatura.estado}
                  </StatusBadge>
                  {selectedFatura.orcamento && (
                    <span className="text-[10px] text-muted-foreground">
                      Origem: <span className="font-semibold text-foreground">{selectedFatura.orcamento.numero || selectedFatura.orcamento.id}</span>
                      {selectedFatura.orcamento.total_com_iva != null && (
                        <span> (Total orçamento: {formatKz(selectedFatura.orcamento.total_com_iva)})</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Emissão</p>
                  <p className="text-sm font-medium text-foreground">{selectedFatura.data_emissao ? new Date(selectedFatura.data_emissao).toLocaleDateString("pt-BR") : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vencimento</p>
                  <p className="text-sm font-medium text-foreground">{selectedFatura.data_vencimento ? new Date(selectedFatura.data_vencimento).toLocaleDateString("pt-BR") : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Método</p>
                  <p className="text-sm font-medium text-foreground">{metodos[selectedFatura.metodo_pagamento]?.label || selectedFatura.metodo_pagamento || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">OP</p>
                  <p className="text-sm font-medium text-foreground">{selectedFatura.ordem_producao?.id || "—"}</p>
                </div>
              </div>
            </div>

            {selectedFatura.estado === "cancelada" && (
              <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-xs">
                <p className="font-semibold text-error">Fatura anulada</p>
                <p className="mt-0.5 text-muted-foreground">
                  {selectedFatura.anulado_por ? `Por ${selectedFatura.anulado_por}` : "Anulada"}
                  {selectedFatura.data_anulacao ? ` em ${new Date(selectedFatura.data_anulacao).toLocaleString("pt-BR")}` : ""}
                  {" · "}Os pagamentos ligados foram estornados na tesouraria.
                </p>
                {selectedFatura.motivo_anulacao && (
                  <p className="mt-1 text-foreground">Motivo: {selectedFatura.motivo_anulacao}</p>
                )}
              </div>
            )}

            {selectedFatura.itens?.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-wider">Itens</h3>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2 font-bold text-muted-foreground uppercase">Descrição</th>
                        <th className="text-center px-3 py-2 font-bold text-muted-foreground uppercase">Qtd</th>
                        <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Valor Unit.</th>
                        <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFatura.itens.map((it, i) => (
                        <tr key={i} className="border-b border-border/20">
                          <td className="px-3 py-2 text-foreground">{it.descricao}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{it.quantidade}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{formatKz(it.preco_unit)}</td>
                          <td className="px-3 py-2 text-right font-bold text-foreground">{formatKz(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border p-4 space-y-1.5 text-xs">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-wider">Resumo</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium text-foreground">{formatKz(selectedFatura.subtotal)}</span></div>
                {Number(selectedFatura.iva) > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">IVA ({Number(selectedFatura.iva)}%):</span><span className="font-medium text-foreground">{formatKz(selectedFatura.valor_iva)}</span></div>
                )}
                <div className="flex justify-between border-t pt-1.5 font-bold text-sm"><span>Total:</span><span className="text-primary">{formatKz(selectedFatura.total || selectedFatura.valor)}</span></div>
              </div>

              <div className="rounded-xl border bg-emerald-50/50 p-4 space-y-1.5 text-xs">
                <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2 tracking-wider">Pagamento</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor pago:</span><span className="font-semibold text-emerald-700">{formatKz(selectedFatura.valor_pago)}</span></div>
                {Number(selectedFatura.total || selectedFatura.valor) > Number(selectedFatura.valor_pago || 0) && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Em dívida a liquidar:</span><span className="font-semibold text-amber-600">{formatKz(Number(selectedFatura.total || selectedFatura.valor) - Number(selectedFatura.valor_pago || 0))}</span></div>
                )}
                {Number(selectedFatura.total || selectedFatura.valor) <= Number(selectedFatura.valor_pago || 0) && (
                  <p className="pt-1 text-[11px] text-emerald-700">Fatura integralmente paga.</p>
                )}
              </div>
            </div>

            {selectedFatura.tipo === "fatura" && (
              <div className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Comunicação à AGT</p>
                  {selectedFatura.agt_status && (
                    <StatusBadge tom={(agtEstados[selectedFatura.agt_status] || { tom: "neutral" }).tom}>
                      {agtEstados[selectedFatura.agt_status]?.label || selectedFatura.agt_status}
                    </StatusBadge>
                  )}
                </div>
                {selectedFatura.agt_document_no && (
                  <p className="text-xs text-muted-foreground">
                    Nº documento AGT: <span className="font-semibold text-foreground">{selectedFatura.agt_document_no}</span>
                  </p>
                )}
                {selectedFatura.agt_request_id && (
                  <p className="text-xs text-muted-foreground">
                    Request ID: <span className="font-mono text-foreground">{selectedFatura.agt_request_id}</span>
                  </p>
                )}
                {Array.isArray(selectedFatura.agt_erros) && selectedFatura.agt_erros.length > 0 && (
                  <div className="text-[11px] text-destructive space-y-0.5">
                    {selectedFatura.agt_erros.map((erro, i) => (
                      <p key={i}>{erro?.errorCode || erro?.idError || "Erro"}: {erro?.errorDescription || erro?.descriptionError}</p>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={agtAcao === selectedFatura.id || !selectedFatura.agt_request_id} onClick={handleConsultarAGT}>
                    <Icon name="sync" className="text-sm" /> {agtAcao === selectedFatura.id ? "A consultar..." : "Consultar AGT"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={agtAcao === selectedFatura.id} onClick={handleEnviarAGT}>
                    <Icon name="send" className="text-sm" /> Enviar à AGT
                  </Button>
                </div>
              </div>
            )}

            {selectedFatura.observacoes && (
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-wider">Observações</p>
                <p className="text-foreground text-sm">{selectedFatura.observacoes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      <Modal
        open={Boolean(anularItem)}
        onClose={() => { setAnularItem(null); setMotivoAnulacao(""); }}
        title="Anular fatura"
        icon="block"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => { setAnularItem(null); setMotivoAnulacao(""); }}>Cancelar</Button>
            <Button type="button" variant="destructive" loading={deletando} onClick={confirmarAnulacao}>Anular fatura</Button>
          </>
        }
      >
        {anularItem && (
          <div className="space-y-4">
            <div className="rounded-xl border border-error/20 bg-error/5 p-3">
              <p className="text-sm font-semibold text-foreground">Fatura {anularItem.numero}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {anularItem.cliente?.nome || "Sem cliente"} · {formatKz(valorDoc(anularItem))} · {faturaEstados[anularItem.estado]?.label || anularItem.estado}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              A fatura não é apagada: fica com o estado “Cancelada” no histórico. Os pagamentos confirmados na tesouraria são estornados e o saldo das contas é reposto.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Motivo da anulação (opcional)</label>
              <textarea
                rows={3}
                value={motivoAnulacao}
                onChange={(e) => setMotivoAnulacao(e.target.value)}
                className={inputCls}
                placeholder="Ex: fatura emitida com dados incorrectos"
              />
            </div>
          </div>
        )}
      </Modal>

      {despesaModalOpen && (
        <DespesaModal
          onClose={() => setDespesaModalOpen(false)}
          onSaved={carregarDados}
          movimentos={movimentos}
        />
      )}

      <FloatButton onClick={() => setFatModalOpen(true)} label="Nova Fatura" icon="receipt_long" />
    </div>
  );
}
