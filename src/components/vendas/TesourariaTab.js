"use client";

import { useState, useEffect, useMemo } from "react";
import { listarMovimentos, criarMovimento, removerMovimento, resumoTesouraria, exportarTesouraria, anexarFicheiros } from "@/services/tesouraria";
import { listarContas, criarConta } from "@/services/contasBancarias";
import { resumo as resumoDividas } from "@/services/dividas";
import { podeAtual } from "@/lib/permissoes";
import AnexosModal from "@/components/vendas/AnexosModal";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import NumeroInput from "@/components/ui/NumeroInput";
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
import { inputCls } from "@/lib/estoque";
import gerarRelatorioTesourariaPdf from "@/lib/tesourariaPdf";
import { ListSkeleton } from "@/components/Skeleton";

const tipoCfg = {
  entrada: { label: "Entrada", tom: "success", icon: "south_west" },
  saida: { label: "Saída", tom: "error", icon: "north_east" },
  transferencia: { label: "Transferência", tom: "info", icon: "swap_horiz" },
};

const estadoCfg = {
  confirmado: { label: "Confirmado", tom: "success" },
  pendente: { label: "Pendente", tom: "warning" },
  cancelado: { label: "Cancelado", tom: "neutral" },
};

const tipoBadge = {
  entrada: "bg-emerald-50 text-emerald-600",
  saida: "bg-red-50 text-red-600",
  transferencia: "bg-blue-50 text-blue-600",
};

const metodos = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
  { value: "ordem_saida", label: "Ordem de Saque" },
  { value: "deposito", label: "Depósito" },
  { value: "multicaixa", label: "Multicaixa" },
  { value: "referencia", label: "Referência" },
  { value: "cheque", label: "Cheque" },
  { value: "tpa", label: "TPA" },
];

const categoriasEntrada = [
  { value: "comissao", label: "Comissão" },
  { value: "venda", label: "Venda" },
  { value: "emprestimo", label: "Empréstimo" },
  { value: "outras receitas", label: "Outras receitas" },
];

const categoriasSaida = [
  { value: "compra", label: "Compra" },
  { value: "despesa", label: "Despesa" },
  { value: "salario", label: "Salário" },
  { value: "imposto", label: "Imposto" },
  { value: "aluguel", label: "Aluguel" },
  { value: "utilidades", label: "Utilidades" },
  { value: "emprestimo", label: "Empréstimo" },
  { value: "levantamento", label: "Levantamento" },
];

const categoriasTransferencia = [
  { value: "transferencia_interna", label: "Transferência Interna" },
];

const categoriasPorTipo = {
  entrada: categoriasEntrada,
  saida: categoriasSaida,
  transferencia: categoriasTransferencia,
};

const tiposForm = [
  { tipo: "entrada", ...tipoCfg.entrada },
  { tipo: "saida", ...tipoCfg.saida },
  { tipo: "transferencia", ...tipoCfg.transferencia },
];

const initialForm = {
  tipo: "saida",
  categoria: "",
  descricao: "",
  valor: "",
  data_movimento: new Date().toISOString().split("T")[0],
  conta_bancaria_id: "",
  conta_destino_id: "",
  metodo_pagamento: "dinheiro",
  referencia: "",
  observacoes: "",
  cliente_id: "",
};

const POR_PAGINA = 5;

const CAMPOS = [
  { value: "geral", label: "Todos os campos", obter: (m) => `${m.descricao || ""} ${m.referencia || ""} ${m.categoria || ""}` },
  { value: "descricao", label: "Descrição", obter: (m) => m.descricao || "" },
  { value: "categoria", label: "Categoria", obter: (m) => m.categoria || "" },
  { value: "referencia", label: "Referência", obter: (m) => m.referencia || "" },
];

const pillBase = "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-colors";
const pillAtiva = "border-primary/40 bg-primary/10 text-primary";
const pillInativa = "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground";

const tabClsBase = "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-2 text-sm font-medium transition-colors";
const tabClsAtiva = "border-primary font-bold text-primary";
const tabClsInativa = "border-transparent text-muted-foreground hover:text-foreground";

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function rotuloConta(conta) {
  return `${conta.banco_nome}${conta.numero_conta ? ` — Conta ${conta.numero_conta}` : ""}`;
}

export default function TesourariaTab({ aba = "movimentos", setAba, abas = [], children }) {
  const [movimentos, setMovimentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [resumo, setResumo] = useState({ saldoTotal: 0, entradasMes: 0, saidasMes: 0, movimentosHoje: 0 });
  const [dividasResumo, setDividasResumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [novosAnexos, setNovosAnexos] = useState([]);
  const [anexosMovimento, setAnexosMovimento] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [criandoCaixa, setCriandoCaixa] = useState(false);
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const [filtro, setFiltro] = useState({ campo: "geral", operador: "contem", termo: "" });
  const [filtroRapido, setFiltroRapido] = useState("todos");
  const [filtroConta, setFiltroConta] = useState("");
  const [filtroContaTipo, setFiltroContaTipo] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const { addToast } = useToast();

  const carregarResumo = async () => {
    try {
      const data = await resumoTesouraria();
      const r = data?.resumo ?? data ?? {};
      setResumo({
        saldoTotal: r.saldo_total ?? r.saldoTotal ?? 0,
        entradasMes: r.total_entradas ?? r.entradasMes ?? 0,
        saidasMes: r.total_saidas ?? r.saidasMes ?? 0,
        movimentosHoje: r.movimentos_hoje ?? r.movimentosHoje ?? 0,
      });
    } catch {
      setResumo({ saldoTotal: 0, entradasMes: 0, saidasMes: 0, movimentosHoje: 0 });
    }
    if (podeAtual("dividas", "ver")) {
      try {
        setDividasResumo(await resumoDividas());
      } catch {
        setDividasResumo(null);
      }
    }
  };

  const carregarMovimentos = async () => {
    try {
      const data = await listarMovimentos();
      setMovimentos(Array.isArray(data) ? data : data?.data ?? data?.movimentos ?? []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar movimentos", "error");
      setMovimentos([]);
    }
  };

  const carregarContas = async () => {
    try {
      const data = await listarContas();
      setContas(Array.isArray(data) ? data : data?.data ?? data?.contas ?? []);
    } catch {
      setContas([]);
    }
  };

  const carregarTudo = async () => {
    setLoading(true);
    await Promise.all([carregarResumo(), carregarMovimentos(), carregarContas()]);
    setLoading(false);
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    carregarTudo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const filterConfig = useMemo(() => [
    { value: "todos", label: "Todos", icon: "filter_list", count: movimentos.length },
    { value: "saida", label: "Saída", icon: tipoCfg.saida.icon, field: "tipo", count: movimentos.filter((m) => m.tipo === "saida").length },
    { value: "transferencia", label: "Transferência", icon: tipoCfg.transferencia.icon, field: "tipo", count: movimentos.filter((m) => m.tipo === "transferencia").length },
    ...Object.entries(estadoCfg).map(([k, v]) => ({
      value: k, label: v.label, icon: k === "confirmado" ? "check_circle" : k === "pendente" ? "pending" : "cancel", field: "estado",
      count: movimentos.filter((m) => m.estado === k).length,
    })),
  ], [movimentos]);

  const filtrados = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...movimentos];
    if (termo) {
      const cfg = CAMPOS.find((c) => c.value === filtro.campo) || CAMPOS[0];
      res = res.filter((m) => {
        const alvo = String(cfg.obter(m) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (filtroRapido !== "todos") {
      const cfg = filterConfig.find((f) => f.value === filtroRapido);
      if (cfg?.field) res = res.filter((m) => m[cfg.field] === filtroRapido);
    }
    if (filtroMes) res = res.filter((m) => String(m.data_movimento || m.data || "").slice(0, 7) === filtroMes);
    if (filtroConta) {
      res = res.filter((m) => String(m.conta_bancaria_id) === String(filtroConta));
    } else if (filtroContaTipo) {
      const tipoDe = Object.fromEntries(contas.map((c) => [String(c.id), c.tipo_conta]));
      res = res.filter((m) => (tipoDe[String(m.conta_bancaria_id)] === "caixa") === (filtroContaTipo === "caixa"));
    }
    if (ordem.chave === "descricao") res.sort((a, b) => String(a.descricao || "").localeCompare(String(b.descricao || ""), "pt") * ordem.dir);
    if (ordem.chave === "valor") res.sort((a, b) => (Number(a.valor || 0) - Number(b.valor || 0)) * ordem.dir);
    if (ordem.chave === "data_movimento") res.sort((a, b) => (new Date(a.data_movimento || a.data || 0).getTime() - new Date(b.data_movimento || b.data || 0).getTime()) * ordem.dir);
    return res;
  }, [movimentos, filtro, filtroRapido, ordem, filterConfig, filtroConta, filtroContaTipo, filtroMes, contas]);

  const { visiveis: movimentosPaginados, ...pag } = usePaginacao({ items: filtrados, tamanhoInicial: POR_PAGINA });

  const mudarTermo = (v) => { setFiltro((f) => ({ ...f, termo: v })); pag.setPagina(1); };
  const mudarFiltroRapido = (v) => { setFiltroRapido(v); pag.setPagina(1); };
  const mudarConta = (v) => { setFiltroConta(v); setFiltroContaTipo(""); pag.setPagina(1); };
  const mudarMes = (v) => { setFiltroMes(v); pag.setPagina(1); };
  const filtrarTipoConta = (v) => { setFiltroContaTipo((p) => (p === v ? "" : v)); setFiltroConta(""); pag.setPagina(1); };
  const limparFiltrosAvancados = () => { setFiltroConta(""); setFiltroContaTipo(""); setFiltroMes(""); pag.setPagina(1); };
  const temFiltroAvancado = Boolean(filtroConta || filtroContaTipo || filtroMes);

  const contasAtivas = contas.filter((c) => c.ativo !== false);
  const contasPorId = Object.fromEntries(contas.map((c) => [String(c.id), c]));

  // Categorias já usadas em movimentos anteriores, para sugerir no formulário
  const categoriasUsadas = useMemo(() => {
    const unicas = new Set();
    movimentos.forEach((m) => {
      const c = String(m.categoria || "").trim();
      if (c) unicas.add(c);
    });
    return [...unicas].sort((a, b) => a.localeCompare(b, "pt"));
  }, [movimentos]);

  // Sugestões do campo Categoria: categorias fixas do tipo atual + todas as já usadas
  const categoriasSugeridas = useMemo(() => {
    const vistos = new Set();
    const lista = [];
    (categoriasPorTipo[form.tipo] || []).forEach((c) => {
      vistos.add(c.value.toLowerCase());
      lista.push(c);
    });
    categoriasUsadas.forEach((c) => {
      if (!vistos.has(c.toLowerCase())) {
        vistos.add(c.toLowerCase());
        lista.push({ value: c, label: c });
      }
    });
    return lista;
  }, [form.tipo, categoriasUsadas]);

  const saldoCaixa = contasAtivas.filter((c) => c.tipo_conta === "caixa").reduce((s, c) => s + Number(c.saldo_atual || 0), 0);
  const saldoBanco = contasAtivas.filter((c) => c.tipo_conta !== "caixa").reduce((s, c) => s + Number(c.saldo_atual || 0), 0);
  const aReceber = Number(dividasResumo?.total || 0);

  const fmt = (v) => Math.round(Number(v || 0)).toLocaleString("pt-AO");
  const kpis = [
    { key: "caixa", icon: "account_balance_wallet", label: "Saldo de Caixa", valor: fmt(saldoCaixa), sufixo: "Kz", icone: "bg-warning/10 text-warning", cor: "text-foreground", sufixoCor: "text-muted-foreground" },
    { key: "banco", icon: "account_balance", label: "Saldo Bancário", valor: fmt(saldoBanco), sufixo: "Kz", icone: "bg-primary/10 text-primary", cor: "text-foreground", sufixoCor: "text-muted-foreground" },
    { key: "saidas", icon: "trending_down", label: "Saídas do Mês", valor: fmt(resumo.saidasMes), sufixo: "Kz", icone: "bg-error/10 text-error", cor: "text-error", sufixoCor: "text-error" },
    { key: "receber", icon: "trending_up", label: "A Receber", valor: fmt(aReceber), sufixo: "Kz", icone: "bg-success/10 text-success", cor: "text-success", sufixoCor: "text-success" },
  ];

  const abrirNovo = (tipo = "saida") => {
    const tipoInicial = typeof tipo === "string" ? tipo : "saida";
    setForm({ ...initialForm, tipo: tipoInicial });
    setNovosAnexos([]);
    setModalNovo(true);
  };

  const fecharNovo = () => {
    setModalNovo(false);
    setForm(initialForm);
    setNovosAnexos([]);
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleContaChange = (e) => {
    const conta = contasAtivas.find((c) => String(c.id) === String(e.target.value));
    const contaPrincipal = e.target.name === "conta_bancaria_id";
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
      ...(contaPrincipal ? { conta_destino_id: "" } : {}),
      ...(contaPrincipal && prev.tipo === "entrada" && conta?.tipo_conta === "caixa" ? { metodo_pagamento: "dinheiro" } : {}),
    }));
  };

  const criarCaixa = async () => {
    setCriandoCaixa(true);
    try {
      const caixa = await criarConta({ banco_nome: "Caixa Principal", tipo_conta: "caixa", numero_conta: null, iban: null, titular: null });
      setContas((prev) => [...prev, caixa]);
      setForm((prev) => ({
        ...prev,
        conta_bancaria_id: String(caixa.id),
        conta_destino_id: "",
        ...(prev.tipo === "entrada" ? { metodo_pagamento: "dinheiro" } : {}),
      }));
      addToast("Caixa criado e selecionado", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao criar Caixa", "error");
    } finally {
      setCriandoCaixa(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Number(form.valor) || Number(form.valor) <= 0) {
      addToast("Indique um valor válido", "error");
      return;
    }
    if (form.tipo === "transferencia") {
      if (!form.conta_bancaria_id) {
        addToast("Selecione a conta de origem ou Caixa", "error");
        return;
      }
      if (!form.conta_destino_id) {
        addToast("Selecione a conta de destino ou Caixa", "error");
        return;
      }
    } else if (!form.conta_bancaria_id) {
      addToast(form.tipo === "entrada" ? "Selecione a conta de recebimento ou Caixa" : "Selecione a conta de origem ou Caixa", "error");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        tipo: form.tipo,
        categoria: String(form.categoria || "").trim(),
        descricao: form.descricao,
        valor: Number(form.valor),
        data_movimento: form.data_movimento,
        conta_bancaria_id: Number(form.conta_bancaria_id),
        conta_destino_id: form.tipo === "transferencia" ? Number(form.conta_destino_id) : undefined,
        metodo_pagamento: form.metodo_pagamento,
        referencia: form.referencia,
        observacoes: form.observacoes,
        cliente_id: form.cliente_id || undefined,
      };
      const criado = await criarMovimento(payload);
      if (novosAnexos.length > 0 && criado?.id) {
        try {
          await anexarFicheiros(criado.id, novosAnexos);
        } catch (err) {
          addToast(err.response?.data?.erro || "Movimento registado, mas os recibos não foram anexados", "warning");
        }
      }
      addToast("Movimento registado com sucesso", "success");
      setModalNovo(false);
      setForm(initialForm);
      setNovosAnexos([]);
      await Promise.all([carregarResumo(), carregarMovimentos(), carregarContas()]);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao registar movimento", "error");
    } finally {
      setSalvando(false);
    }
  };

  const confirmarEliminacao = async () => {
    if (!eliminarItem) return;
    setDeletando(true);
    try {
      await removerMovimento(eliminarItem.id);
      addToast("Movimento removido com sucesso", "success");
      setEliminarItem(null);
      await Promise.all([carregarResumo(), carregarMovimentos(), carregarContas()]);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao eliminar movimento", "error");
    } finally {
      setDeletando(false);
    }
  };

  // Recarrega a lista e actualiza o movimento aberto no modal de anexos,
  // para os anexos novos/removidos aparecerem logo.
  const atualizarAposAnexos = async () => {
    try {
      const data = await listarMovimentos();
      const lista = Array.isArray(data) ? data : data?.data ?? data?.movimentos ?? [];
      setMovimentos(lista);
      setAnexosMovimento((prev) => (prev ? lista.find((x) => x.id === prev.id) || prev : prev));
    } catch {
      // silencioso: o modal mantém o que já tinha
    }
  };

  const handleExportar = async () => {
    try {
      const blob = await exportarTesouraria({ formato: "xlsx" });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `tesouraria_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast("Movimentos exportados com sucesso", "success");
    } catch {
      addToast("Erro ao exportar movimentos", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2.5">
        <button
          type="button"
          onClick={handleExportar}
          disabled={movimentos.length === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50"
        >
          <Icon name="download" className="text-base" /> Exportar Excel
        </button>
        <button
          type="button"
          onClick={() => abrirNovo("entrada")}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-4 text-sm font-semibold text-success transition-colors hover:bg-success/15"
        >
          <Icon name="add" className="text-base" /> Novo Recebimento
        </button>
        <button
          type="button"
          onClick={() => abrirNovo("saida")}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Icon name="add" className="text-base" /> Novo Pagamento
        </button>
      </div>

      <section className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5" aria-label="Indicadores de tesouraria">
        {kpis.map((k) => (
          <div key={k.key} className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl ${k.icone}`}>
              <Icon name={k.icon} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight text-muted-foreground">{k.label}</p>
              <p className={`truncate text-xl font-black leading-tight tabular-nums tracking-tight sm:text-2xl ${k.cor}`}>
                {k.valor}
                {k.sufixo && <span className={`ml-1 text-xs font-bold ${k.sufixoCor}`}>{k.sufixo}</span>}
              </p>
            </div>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border">
        {abas.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAba?.(t.id)}
            aria-pressed={aba === t.id}
            className={`${tabClsBase} ${aba === t.id ? tabClsAtiva : tabClsInativa}`}
          >
            <Icon name={t.icon} className="text-base" />
            {t.label}
          </button>
        ))}
      </div>

      {aba === "movimentos" ? (
        <>
      <Ledger rotulo="Movimentos de tesouraria ledger">
        <LedgerHeader
          titulo="Movimentos"
          subtitulo={`${pag.total} de ${movimentos.length} movimentos`}
          onToggleFiltros={() => setFiltrosAbertos((v) => !v)}
          filtrosAbertos={filtrosAbertos}
        />
        {filtrosAbertos && (
          <FilterRow
            campo={filtro.campo}
            setCampo={(v) => setFiltro((f) => ({ ...f, campo: v }))}
            campos={CAMPOS.map(({ value, label }) => ({ value, label }))}
            operador={filtro.operador}
            setOperador={(v) => setFiltro((f) => ({ ...f, operador: v }))}
            termo={filtro.termo}
            setTermo={mudarTermo}
            aoLimpar={() => { setFiltro((f) => ({ ...f, termo: "" })); pag.setPagina(1); }}
            placeholder="Pesquisar por descrição, referência ou categoria..."
          />
        )}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
          {filterConfig.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => mudarFiltroRapido(f.value)}
              aria-pressed={filtroRapido === f.value}
              className={`${pillBase} ${filtroRapido === f.value ? pillAtiva : pillInativa}`}
            >
              <Icon name={f.icon} className="text-sm" /> {f.label}
              <span className="text-[11px] text-muted-foreground tabular-nums">{f.count}</span>
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <select
              value={filtroConta}
              onChange={(e) => mudarConta(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              aria-label="Filtrar por conta"
            >
              <option value="">Todas as contas</option>
              {contasAtivas.map((c) => (
                <option key={c.id} value={c.id}>{rotuloConta(c)}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon name="calendar_month" className="text-base" />
              <input
                type="month"
                value={filtroMes}
                onChange={(e) => mudarMes(e.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                aria-label="Filtrar por mês"
              />
            </label>
            {temFiltroAvancado && (
              <button type="button" onClick={limparFiltrosAvancados} className="h-8 rounded-lg px-2 text-xs font-medium text-primary hover:underline">
                Limpar
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-4"><ListSkeleton count={6} /></div>
        ) : (
          <>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "data_movimento" ? { chave: "data_movimento", dir: -p.dir } : { chave: "data_movimento", dir: 1 }))} ativo={ordem.chave === "data_movimento"}>Data</LedgerTh>
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "descricao" ? { chave: "descricao", dir: -p.dir } : { chave: "descricao", dir: 1 }))} ativo={ordem.chave === "descricao"}>Descrição</LedgerTh>
                  <LedgerTh>Conta</LedgerTh>
                  <LedgerTh>Tipo</LedgerTh>
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "valor" ? { chave: "valor", dir: -p.dir } : { chave: "valor", dir: 1 }))} ativo={ordem.chave === "valor"} className="text-right">Valor (Kz)</LedgerTh>
                  <LedgerTh className="w-10" />
                </tr>
              </thead>
              <tbody>
                {movimentosPaginados.map((m) => {
                  const tc = tipoCfg[m.tipo] || { label: m.tipo, tom: "neutral", icon: "swap_horiz" };
                  const isEntrada = m.tipo === "entrada";
                  const isSaida = m.tipo === "saida";
                  const conta = contasPorId[String(m.conta_bancaria_id)];
                  return (
                    <LedgerTr key={m.id}>
                      <LedgerTd className="tabular-nums whitespace-nowrap text-muted-foreground">{formatData(m.data_movimento || m.data)}</LedgerTd>
                      <LedgerTd className="max-w-56">
                        <IdCell
                          id={m.descricao || m.categoria || "—"}
                          meta={[m.categoria, m.referencia && `Ref: ${m.referencia}`].filter(Boolean).join(" · ") || "—"}
                        />
                      </LedgerTd>
                      <LedgerTd className="max-w-40"><span className="block truncate text-muted-foreground">{conta ? rotuloConta(conta) : "—"}</span></LedgerTd>
                      <LedgerTd>
                        <StatusBadge tom="neutral" className={tipoBadge[m.tipo]}>
                          <Icon name={tc.icon} className="text-[11px]" /> {tc.label}
                        </StatusBadge>
                      </LedgerTd>
                      <LedgerTd className="tabular-nums whitespace-nowrap text-right">
                        <span className={`font-bold ${isEntrada ? "text-success" : isSaida ? "text-error" : "text-foreground"}`}>
                          {isEntrada ? "+" : isSaida ? "−" : ""}{Math.round(Number(m.valor || 0)).toLocaleString("pt-AO")}
                        </span>
                      </LedgerTd>
                      <LedgerTd>
                        <RowMenu
                          ariaLabel="Ações do movimento"
                          itens={[
                            { icone: "attach_file", rotulo: m.anexos?.length > 0 ? `Anexos (${m.anexos.length})` : "Recibos / Anexos", onClick: () => setAnexosMovimento(m) },
                            { icone: "delete", rotulo: "Remover", danger: true, onClick: () => setEliminarItem(m) },
                          ]}
                        />
                      </LedgerTd>
                    </LedgerTr>
                  );
                })}
              </tbody>
            </LedgerTable>
            {pag.total === 0 && (
              movimentos.length === 0
                ? <LedgerEmpty icone="savings">Nenhum movimento registado</LedgerEmpty>
                : <LedgerEmpty icone="search_off">Nenhum movimento corresponde ao filtro</LedgerEmpty>
            )}
            <Paginacao {...pag} label="movimentos" />
          </>
        )}
      </Ledger>
        </>
      ) : children}

      <Modal
        open={modalNovo}
        onClose={fecharNovo}
        title="Novo Movimento"
        icon="add_card"
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={fecharNovo}>Cancelar</Button>
            <Button type="submit" form="form-tesouraria" loading={salvando}>Registar Movimento</Button>
          </>
        }
      >
        <form id="form-tesouraria" onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo de Movimento *</label>
            <div className="grid grid-cols-3 gap-2">
              {tiposForm.map((v) => (
                <button key={v.tipo} type="button" onClick={() => {
                  setForm((prev) => ({ ...prev, tipo: v.tipo, categoria: "", conta_destino_id: "" }));
                }}
                  className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl border-2 transition-all text-xs font-bold ${
                    form.tipo === v.tipo
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-muted/50 text-muted-foreground"
                  }`}>
                  <Icon name={v.icon} className="text-lg" />
                  {v.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              As vendas entram automaticamente quando uma fatura é paga; entradas manuais aceitam qualquer categoria.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data do Movimento *</label>
              <input required name="data_movimento" type="date" value={form.data_movimento} onChange={handleChange} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor (Kz) *</label>
              <NumeroInput required name="valor" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} className={inputCls} placeholder="Ex: 250000" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Categoria</label>
              <input
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                className={inputCls}
                list="categorias-tesouraria"
                placeholder="Escreva ou escolha uma categoria"
                autoComplete="off"
              />
              <datalist id="categorias-tesouraria">
                {categoriasSugeridas.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Método de Pagamento *</label>
              <select name="metodo_pagamento" value={form.metodo_pagamento} onChange={handleChange} className={inputCls}>
                {metodos.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição *</label>
              <input required name="descricao" value={form.descricao} onChange={handleChange} className={inputCls} placeholder="Ex: Pagamento da fatura nº 1005" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {form.tipo === "entrada" ? "Conta de Recebimento / Caixa" : "Conta de Origem / Caixa"}
              </label>
              <select name="conta_bancaria_id" value={form.conta_bancaria_id} onChange={handleContaChange} className={inputCls}>
                <option value="">Selecione a conta bancária ou Caixa</option>
                {contasAtivas.map((c) => (
                  <option key={c.id} value={c.id}>{rotuloConta(c)}</option>
                ))}
              </select>
              {!contasAtivas.some((c) => c.tipo_conta === "caixa") && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground">O dinheiro em espécie pode ficar separado num Caixa.</p>
                  <Button type="button" variant="ghost" size="sm" onClick={criarCaixa} loading={criandoCaixa} className="shrink-0">
                    <Icon name="add" className="text-[14px]" /> Criar Caixa
                  </Button>
                </div>
              )}
            </div>
            {form.tipo === "transferencia" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Conta de Destino / Caixa *</label>
                <select name="conta_destino_id" value={form.conta_destino_id} onChange={handleContaChange} className={inputCls}>
                  <option value="">Selecione o destino do dinheiro</option>
                  {contasAtivas.filter((c) => String(c.id) !== String(form.conta_bancaria_id)).map((c) => (
                    <option key={c.id} value={c.id}>{rotuloConta(c)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Referência</label>
              <input name="referencia" value={form.referencia} onChange={handleChange} className={inputCls} placeholder="Ex: Nº do documento" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">ID do Cliente (opcional)</label>
              <input name="cliente_id" value={form.cliente_id} onChange={handleChange} className={inputCls} placeholder="Ex: 123" />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</label>
              <textarea name="observacoes" rows={3} value={form.observacoes} onChange={handleChange} className={inputCls} placeholder="Notas adicionais..." />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recibos / Comprovativos (opcional)</label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setNovosAnexos(Array.from(e.target.files || []))}
                className={inputCls}
              />
              <p className="text-[10px] text-muted-foreground">PDF ou imagem (JPG, PNG, WEBP), até 10 MB cada.</p>
              {novosAnexos.length > 0 && (
                <p className="text-[10px] text-foreground truncate">
                  {novosAnexos.length} ficheiro(s): {novosAnexos.map((f) => f.name).join(", ")}
                </p>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(eliminarItem)}
        onClose={() => setEliminarItem(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title="Eliminar movimento"
        description={eliminarItem ? `Tem a certeza que deseja eliminar o movimento "${eliminarItem.descricao || eliminarItem.categoria || eliminarItem.id}"? Esta ação não pode ser desfeita.` : ""}
      />

      <AnexosModal
        movimento={anexosMovimento}
        open={Boolean(anexosMovimento)}
        onClose={() => setAnexosMovimento(null)}
        onMudou={atualizarAposAnexos}
      />
    </div>
  );
}
