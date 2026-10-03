"use client";

import { useEffect, useMemo, useState } from "react";
import { listar as listarDividas, criar, atualizar, remover, pagar, resumo as resumoDividas } from "@/services/dividas";
import { listar as listarClientes } from "@/services/clientes";
import { listarContas } from "@/services/contasBancarias";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormField } from "@/components/ui/FormField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Modal from "@/components/Modal";
import NumeroInput from "@/components/ui/NumeroInput";
import { useToast } from "@/components/Toast";
import { inputCls } from "@/lib/estoque";
import { ListSkeleton } from "@/components/Skeleton";

const estadoCfg = {
  pendente: { label: "Pendente", variant: "warning" },
  parcial: { label: "Parcial", variant: "info" },
  paga: { label: "Paga", variant: "success" },
  vencida: { label: "Vencida", variant: "destructive" },
  cancelada: { label: "Cancelada", variant: "secondary" },
};

const categorias = [
  { value: "adiantamento", label: "Adiantamento de cliente" },
  { value: "encomenda", label: "Encomenda em curso" },
  { value: "servico", label: "Serviço por facturar" },
  { value: "venda", label: "Venda a prazo" },
  { value: "emprestimo", label: "Empréstimo a cliente" },
  { value: "outra", label: "Outra dívida" },
];

const metodos = [
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "deposito", label: "Depósito" },
  { value: "ordem_saida", label: "Ordem de Saque" },
  { value: "multicaixa", label: "Multicaixa" },
  { value: "referencia", label: "Referência" },
  { value: "cheque", label: "Cheque" },
  { value: "tpa", label: "TPA" },
];

// `toISOString()` converte para UTC e em Angola (UTC+1) a meia-noite local
// recua um dia, o que faria as parcelas vencerem antes da data escolhida.
function dataLocal(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const HOJE = dataLocal(new Date());

function emDias(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dataLocal(d);
}

const formVazio = {
  cliente_id: "",
  descricao: "",
  categoria: "adiantamento",
  valor: "",
  data_emissao: HOJE,
  data_vencimento: emDias(30),
  conta_bancaria_id: "",
  metodo_pagamento: "transferencia",
  observacoes: "",
  n_parcelas: "",
  intervalo_dias: 30,
  vencimento_1a: "",
};

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function saldoDe(d) {
  return Number(Number(d.valor || 0) - Number(d.valor_pago || 0));
}

function diasAtraso(d) {
  if (!d.data_vencimento || d.data_vencimento >= HOJE) return 0;
  return Math.floor((Date.parse(`${HOJE}T00:00:00`) - Date.parse(`${d.data_vencimento}T00:00:00`)) / 86400000);
}

function rotuloConta(conta) {
  if (!conta) return "—";
  return `${conta.banco_nome}${conta.numero_conta ? ` — Conta ${conta.numero_conta}` : ""}`;
}

export default function DividasTab() {
  const { addToast } = useToast();
  const [dividas, setDividas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [contas, setContas] = useState([]);
  const [resumo, setResumo] = useState({ total: 0, vencido: 0, vencemHoje: 0, qtdDividas: 0, faixas: {}, topDevedores: [] });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [modalForm, setModalForm] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [editando, setEditando] = useState(null);

  const [filtroEstado, setFiltroEstado] = useState("aberta");
  const [busca, setBusca] = useState("");

  const [modalPagar, setModalPagar] = useState(null);
  const [pagamento, setPagamento] = useState({ valor: "", parcela_n: "", data_pagamento: HOJE, conta_bancaria_id: "", metodo_pagamento: "transferencia", observacoes: "" });

  const [confirmarApagar, setConfirmarApagar] = useState(null);
  const [verFicha, setVerFicha] = useState(null);

  const carregar = () => Promise.all([listarDividas(), resumoDividas()])
    .then(([lista, res]) => {
      setDividas(Array.isArray(lista) ? lista : []);
      setResumo(res || {});
    })
    .catch((e) => {
      addToast?.(e?.response?.data?.erro || "Erro ao carregar dívidas", "error");
      setDividas([]);
    })
    .finally(() => setCarregando(false));

  useEffect(() => {
    carregar();
    listarClientes({})
      .then((d) => {
        const lista = Array.isArray(d) ? d : [];
        const unicos = Array.from(new Map(lista.map((c) => [c.id, c])).values());
        unicos.sort((a, b) =>
          (a.empresa || a.nome || "").localeCompare(b.empresa || b.nome || "", "pt")
        );
        setClientes(unicos);
      })
      .catch(() => setClientes([]));
    listarContas({ ativo: "true" })
      .then((d) => setContas(Array.isArray(d) ? d : []))
      .catch(() => setContas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return dividas.filter((d) => {
      if (filtroEstado === "aberta" && (saldoDe(d) <= 0.005 || d.estado === "cancelada")) return false;
      if (filtroEstado === "vencida" && !(saldoDe(d) > 0.005 && diasAtraso(d) > 0)) return false;
      if (filtroEstado === "paga" && saldoDe(d) > 0.005) return false;
      if (filtroEstado === "cancelada" && d.estado !== "cancelada") return false;
      if (!termo) return true;
      const alvo = `${d.descricao || ""} ${d.categoria || ""} ${d.cliente?.empresa || ""} ${d.cliente?.nome || ""}`.toLowerCase();
      return alvo.includes(termo);
    });
  }, [dividas, filtroEstado, busca]);

  const totalFiltrado = useMemo(
    () => filtradas.reduce((s, d) => s + Math.max(0, saldoDe(d)), 0),
    [filtradas]
  );

  const abrirNovo = () => {
    setEditando(null);
    setForm({ ...formVazio, vencimento_1a: emDias(30) });
    setModalForm(true);
  };

  const abrirEdicao = (d) => {
    const parcelas = Array.isArray(d.parcelas) ? d.parcelas : [];
    setForm({
      cliente_id: d.cliente_id || "",
      descricao: d.descricao || "",
      categoria: d.categoria || "adiantamento",
      valor: d.valor ?? "",
      data_emissao: d.data_emissao || HOJE,
      data_vencimento: d.data_vencimento || "",
      conta_bancaria_id: d.conta_bancaria_id || "",
      metodo_pagamento: d.metodo_pagamento || "transferencia",
      observacoes: d.observacoes || "",
      n_parcelas: parcelas.length || "",
      intervalo_dias: 30,
      vencimento_1a: parcelas[0]?.vencimento || "",
    });
    setEditando(d);
    setModalForm(true);
  };

  const parcelasPrevistas = useMemo(() => {
    const n = Math.floor(Number(form.n_parcelas) || 0);
    const total = Number(form.valor) || 0;
    if (n < 2 || total <= 0) return [];
    const centavos = Math.round(total * 100);
    const base = Math.floor(centavos / n);
    const resto = centavos - base * n;
    const intervalo = Math.max(1, Math.floor(Number(form.intervalo_dias) || 30));
    const inicio = new Date(`${form.vencimento_1a || form.data_vencimento || HOJE}T00:00:00`);
    if (isNaN(inicio.getTime())) return [];
    return Array.from({ length: n }, (_, i) => {
      const v = new Date(inicio.getTime());
      v.setDate(v.getDate() + i * intervalo);
      return { n: i + 1, valor: Number(((base + (i < resto ? 1 : 0)) / 100).toFixed(2)), vencimento: dataLocal(v) };
    });
  }, [form.n_parcelas, form.valor, form.intervalo_dias, form.vencimento_1a, form.data_vencimento]);

  const somaParcelas = parcelasPrevistas.reduce((s, p) => s + p.valor, 0);
  const valorForm = Number(form.valor) || 0;
  const parcelasBatem = parcelasPrevistas.length === 0 || Math.abs(somaParcelas - valorForm) < 0.005;

  const handleGuardar = async () => {
    const descricao = form.descricao.trim();
    if (!descricao) return addToast?.("Indique a descrição da dívida", "error");
    if (valorForm <= 0) return addToast?.("O valor deve ser maior que zero", "error");
    if (!parcelasBatem) return addToast?.("A soma das parcelas não é igual ao valor da dívida", "error");

    const dados = {
      cliente_id: form.cliente_id || null,
      descricao,
      categoria: form.categoria,
      valor: valorForm,
      data_emissao: form.data_emissao,
      data_vencimento: form.data_vencimento || null,
      conta_bancaria_id: form.conta_bancaria_id || null,
      metodo_pagamento: form.metodo_pagamento,
      observacoes: form.observacoes || null,
    };

    if (Number(form.n_parcelas) > 0) {
      dados.parcelas = { numero: Number(form.n_parcelas), intervalo_dias: Number(form.intervalo_dias) || 30, vencimento: form.vencimento_1a || form.data_vencimento || HOJE };
    }

    setSalvando(true);
    try {
      if (editando) {
        await atualizar(editando.id, dados);
        addToast?.("Dívida atualizada com sucesso");
      } else {
        await criar(dados);
        addToast?.("Dívida registada com sucesso");
      }
      setModalForm(false);
      setEditando(null);
      setForm(formVazio);
      await carregar();
    } catch (e) {
      addToast?.(e?.response?.data?.erro || "Erro ao guardar a dívida", "error");
    } finally {
      setSalvando(false);
    }
  };

  const abrirPagamento = (d, parcela = null) => {
    const restante = parcela ? Number(parcela.valor) - Number(parcela.valor_pago || 0) : saldoDe(d);
    setPagamento({
      valor: Number(restante.toFixed(2)),
      parcela_n: parcela ? parcela.n : "",
      data_pagamento: HOJE,
      conta_bancaria_id: parcela?.conta_bancaria_id || d.conta_bancaria_id || contas[0]?.id || "",
      metodo_pagamento: d.metodo_pagamento || "transferencia",
      observacoes: "",
    });
    setModalPagar(d);
  };

  const handlePagar = async () => {
    if (!modalPagar) return;
    const valor = Number(pagamento.valor) || 0;
    if (valor <= 0) return addToast?.("Indique o valor do pagamento", "error");

    setSalvando(true);
    try {
      const res = await pagar(modalPagar.id, {
        valor,
        parcela_n: pagamento.parcela_n || undefined,
        data_pagamento: pagamento.data_pagamento,
        conta_bancaria_id: pagamento.conta_bancaria_id || null,
        metodo_pagamento: pagamento.metodo_pagamento,
        observacoes: pagamento.observacoes || null,
      });
      addToast?.(
        res?.saldo > 0.005
          ? `Pagamento registado. Falta ${formatKz(res.saldo)}`
          : "Dívida liquidada por completo"
      );
      setModalPagar(null);
      await carregar();
    } catch (e) {
      addToast?.(e?.response?.data?.erro || "Erro ao registar o pagamento", "error");
    } finally {
      setSalvando(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirmarApagar) return;
    try {
      const res = await remover(confirmarApagar.id);
      addToast?.(res?.mensagem || "Dívida removida");
      setConfirmarApagar(null);
      await carregar();
    } catch (e) {
      addToast?.(e?.response?.data?.erro || "Erro ao remover a dívida", "error");
    }
  };

  if (carregando) return <ListSkeleton count={5} />;

  const parcelas = Array.isArray(verFicha?.parcelas) ? verFicha.parcelas : [];
  const pctRecebido = verFicha?.valor ? Math.min(100, Math.round((Number(verFicha.valor_pago || 0) / Number(verFicha.valor)) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard icon="account_balance_wallet" label="Total a Receber" value={formatKz(resumo.total)} iconVariant="primary"
          badge={`${resumo.qtdDividas || 0} dívida(s) em aberto`} />
        <KpiCard icon="warning" label="Vencido" value={formatKz(resumo.vencido)} iconVariant="error"
          badge="Já passou a data de vencimento" />
        <KpiCard icon="today" label="Vencem Hoje" value={formatKz(resumo.vencemHoje)} iconVariant="warning"
          badge={`${formatKz(resumo.proximos7 || 0)} nos próximos 7 dias`} />
        <KpiCard icon="person" label="Maior Devedor" iconVariant="info"
          value={resumo.topDevedores?.[0] ? formatKz(resumo.topDevedores[0].saldo) : formatKz(0)}
          badge={resumo.topDevedores?.[0]?.nome || "Semuco devedor registado"} />
      </div>

      {resumo.faixas && Object.values(resumo.faixas).some((v) => v > 0) && (
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Saldo por faixa de atraso</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { k: "0-30", label: "Até 30 dias", v: "success" },
                { k: "31-60", label: "31 a 60 dias", v: "warning" },
                { k: "61-90", label: "61 a 90 dias", v: "warning" },
                { k: "90+", label: "Mais de 90 dias", v: "error" },
                { k: "sem_vencimento", label: "Sem vencimento", v: "secondary" },
              ].map((f) => (
                <div key={f.k} className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{f.label}</p>
                  <p className="text-sm font-bold text-foreground mt-1">{formatKz(resumo.faixas[f.k])}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {resumo.topDevedores?.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quem mais me deve</p>
            <div className="space-y-1">
              {resumo.topDevedores.slice(0, 5).map((c) => (
                <div key={c.cliente_id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{c.qtd} dívida(s){c.vencida > 0.005 ? ` · ${formatKz(c.vencida)} vencido` : ""}</p>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">{formatKz(c.saldo)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: "aberta", label: "Em aberto" },
                { id: "vencida", label: "Vencidas" },
                { id: "paga", label: "Pagas" },
                { id: "cancelada", label: "Canceladas" },
                { id: "todas", label: "Todas" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroEstado(f.id)}
                  className={`seg-tab ${filtroEstado === f.id ? "is-active" : ""}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className={inputCls}
                placeholder="Procurar dívida ou cliente..."
              />
              <Button size="sm" onClick={abrirNovo}>
                <Icon name="add" className="text-base" />
                Nova Dívida
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filtradas.length} dívida(s) · {formatKz(totalFiltrado)} em saldo</span>
          </div>

          {filtradas.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Icon name="check_circle" className="text-3xl block mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhuma dívida neste filtro</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtradas.map((d) => {
                const saldo = saldoDe(d);
                const atraso = diasAtraso(d);
                const cfg = estadoCfg[d.estado] || estadoCfg.pendente;
                const listaParcelas = Array.isArray(d.parcelas) ? d.parcelas : [];
                return (
                  <div key={d.id} className="rounded-xl border border-border/60 bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{d.descricao}</p>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          {saldo > 0.005 && atraso > 0 && (
                            <Badge variant="destructive">{atraso} dia(s) em atraso</Badge>
                          )}
                        </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
                          {d.cliente?.empresa || d.cliente?.nome || "Sem cliente"}{d.cliente?.nif ? ` (NIF: ${d.cliente.nif})` : ""} �� {categorias.find((c) => c.value === d.categoria)?.label || d.categoria}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Emissão {formatData(d.data_emissao)} · Vencimento {formatData(d.data_vencimento)}
                          {Number(d.valor_pago) > 0 && ` · Pago ${formatKz(d.valor_pago)} de ${formatKz(d.valor)}`}
                          {listaParcelas.length > 0 && ` · ${listaParcelas.length} parcela(s)`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold text-primary">{formatKz(saldo)}</span>
                        <div className="flex items-center gap-1">
                          {saldo > 0.005 && (
                            <Button variant="outline" size="sm" onClick={() => abrirPagamento(d)}>
                              <Icon name="payments" className="text-sm" />
                              Receber
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setVerFicha(d)} title="Ver parcelas"><Icon name="visibility" className="text-[16px]" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => abrirEdicao(d)} title="Editar"><Icon name="edit" className="text-[16px]" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setConfirmarApagar(d)} title="Remover" className="text-error"><Icon name="delete" className="text-[16px]" /></Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalForm}
        onClose={() => { setModalForm(false); setEditando(null); }}
        title={editando ? "Editar Dívida" : "Nova Dívida"}
        icon="money_off"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setModalForm(false); setEditando(null); }}>Cancelar</Button>
            <Button onClick={handleGuardar} loading={salvando} disabled={!form.descricao.trim() || valorForm <= 0 || !parcelasBatem}>
              <Icon name="save" className="text-sm" />
              {editando ? "Atualizar" : "Registar Dívida"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 border border-border/60 px-3 py-2">
            Registe aqui o que o cliente lhe deve. O saldo da conta só é alterado quando der baixa no botão &quot;Receber&quot;.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Cliente">
              <select value={form.cliente_id} onChange={(e) => setForm((p) => ({ ...p, cliente_id: e.target.value }))} className={inputCls}>
                <option value="">Sem cliente vinculado</option>
                {clientes.map((c) => (
                  <option key={c.id || `${c.nome}-${c.nif}`} value={c.id}>{c.empresa || c.nome}{c.nif ? ` (NIF: ${c.nif})` : ""}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Tipo">
              <select value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))} className={inputCls}>
                {categorias.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </FormField>
            <FormField label="Descrição *" obrigatorio full>
              <input
                value={form.descricao}
                onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                className={inputCls}
                placeholder="Ex: Adiantamento da Encomenda 2026/045"
              />
            </FormField>
            <FormField label="Valor *" obrigatorio>
              <NumeroInput value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} className={inputCls} placeholder="0,00" />
            </FormField>
            <FormField label="Data de Emissão">
              <input type="date" value={form.data_emissao} onChange={(e) => setForm((p) => ({ ...p, data_emissao: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Vencimento" hint="Usado para o aviso de atraso">
              <input type="date" value={form.data_vencimento} onChange={(e) => setForm((p) => ({ ...p, data_vencimento: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Conta prevista para o recebimento">
              <select value={form.conta_bancaria_id} onChange={(e) => setForm((p) => ({ ...p, conta_bancaria_id: e.target.value }))} className={inputCls}>
                <option value="">Definir na baixa</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{rotuloConta(c)}</option>)}
              </select>
            </FormField>
            <FormField label="Método previsto">
              <select value={form.metodo_pagamento} onChange={(e) => setForm((p) => ({ ...p, metodo_pagamento: e.target.value }))} className={inputCls}>
                {metodos.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </FormField>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="calendar_month" className="text-primary text-[18px]" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Parcelamento (opcional)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Nº de parcelas" hint="Deixe vazio para dívida de valor único">
                <NumeroInput value={form.n_parcelas} onChange={(e) => setForm((p) => ({ ...p, n_parcelas: e.target.value }))} className={inputCls} placeholder="Ex: 4" />
              </FormField>
              <FormField label="Intervalo (dias)">
                <NumeroInput value={form.intervalo_dias} onChange={(e) => setForm((p) => ({ ...p, intervalo_dias: e.target.value }))} className={inputCls} />
              </FormField>
              <FormField label="Vencimento da 1ª">
                <input type="date" value={form.vencimento_1a} onChange={(e) => setForm((p) => ({ ...p, vencimento_1a: e.target.value }))} className={inputCls} />
              </FormField>
            </div>

            {parcelasPrevistas.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Plano previsto</span>
                  <span className={parcelasBatem ? "text-success" : "text-destructive"}>
                    Soma: {formatKz(somaParcelas)} {parcelasBatem ? "" : "≠ valor da dívida"}
                  </span>
                </div>
                {parcelasPrevistas.map((p) => (
                  <div key={p.n} className="flex items-center justify-between text-xs rounded-lg border border-border/60 bg-card px-3 py-1.5">
                    <span className="text-muted-foreground">Parcela {p.n} — {formatData(p.vencimento)}</span>
                    <span className="font-medium text-foreground">{formatKz(p.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <FormField label="Observações" full>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
              className={inputCls}
              rows={2}
              placeholder="Acordo combinado com o cliente, nº de encomenda, etc."
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={Boolean(modalPagar)}
        onClose={() => setModalPagar(null)}
        title="Registar Recebimento"
        icon="payments"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalPagar(null)}>Cancelar</Button>
            <Button onClick={handlePagar} loading={salvando} disabled={Number(pagamento.valor) <= 0}>
              <Icon name="check" className="text-sm" />
              Confirmar Recebimento
            </Button>
          </>
        }
      >
        {modalPagar && (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 border border-border/60 px-3 py-2">
              <p className="text-sm font-semibold text-foreground">{modalPagar.descricao}</p>
              <p className="text-xs text-muted-foreground">
                {modalPagar.cliente?.empresa || modalPagar.cliente?.nome || "Sem cliente"} · Saldo {formatKz(saldoDe(modalPagar))}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Vai ser criado um movimento de entrada na Tesouraria e o saldo da conta será actualizado. Não registe outra vez na aba de Movimentos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Valor a Receber *" obrigatorio>
                <NumeroInput value={pagamento.valor} onChange={(e) => setPagamento((p) => ({ ...p, valor: e.target.value }))} className={inputCls} />
              </FormField>
              <FormField label="Data">
                <input type="date" value={pagamento.data_pagamento} onChange={(e) => setPagamento((p) => ({ ...p, data_pagamento: e.target.value }))} className={inputCls} />
              </FormField>
              <FormField label="Conta" full>
                <select value={pagamento.conta_bancaria_id} onChange={(e) => setPagamento((p) => ({ ...p, conta_bancaria_id: e.target.value }))} className={inputCls}>
                  <option value="">Sem conta (não mexe no saldo)</option>
                  {contas.map((c) => <option key={c.id} value={c.id}>{rotuloConta(c)}</option>)}
                </select>
              </FormField>
              <FormField label="Método" full>
                <select value={pagamento.metodo_pagamento} onChange={(e) => setPagamento((p) => ({ ...p, metodo_pagamento: e.target.value }))} className={inputCls}>
                  {metodos.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </FormField>
              <FormField label="Observações" full>
                <input value={pagamento.observacoes} onChange={(e) => setPagamento((p) => ({ ...p, observacoes: e.target.value }))} className={inputCls} />
              </FormField>
            </div>

            {Array.isArray(modalPagar.parcelas) && modalPagar.parcelas.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Receber uma parcela</p>
                {modalPagar.parcelas.map((p) => {
                  const restante = Number(p.valor) - Number(p.valor_pago || 0);
                  return (
                    <button
                      key={p.n}
                      type="button"
                      disabled={restante <= 0.005}
                      onClick={() => abrirPagamento(modalPagar, p)}
                      className="w-full flex items-center justify-between text-xs rounded-lg border border-border/60 bg-card px-3 py-2 text-left hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-muted-foreground">Parcela {p.n} — {formatData(p.vencimento)}</span>
                      <span className="font-medium text-foreground">
                        {restante > 0.005 ? `Receber ${formatKz(restante)}` : "Já paga"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(verFicha)}
        onClose={() => setVerFicha(null)}
        title={verFicha?.descricao || "Dívida"}
        icon="receipt_long"
        size="md"
        footer={<Button variant="outline" onClick={() => setVerFicha(null)}>Fechar</Button>}
      >
        {verFicha && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-muted-foreground">Cliente</p><p className="font-medium text-foreground">{verFicha.cliente?.empresa || verFicha.cliente?.nome || "—"}</p></div>
              <div><p className="text-muted-foreground">Estado</p><p className="font-medium text-foreground">{(estadoCfg[verFicha.estado] || {}).label || verFicha.estado}</p></div>
              <div><p className="text-muted-foreground">Valor</p><p className="font-medium text-foreground">{formatKz(verFicha.valor)}</p></div>
              <div><p className="text-muted-foreground">Pago</p><p className="font-medium text-foreground">{formatKz(verFicha.valor_pago)}</p></div>
              <div><p className="text-muted-foreground">Vencimento</p><p className="font-medium text-foreground">{formatData(verFicha.data_vencimento)}</p></div>
              <div><p className="text-muted-foreground">Saldo</p><p className="font-bold text-primary">{formatKz(saldoDe(verFicha))}</p></div>
            </div>

            {pctRecebido > 0 && (
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pctRecebido}%` }} />
              </div>
            )}

            {verFicha.observacoes && (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 border border-border/60 px-3 py-2">{verFicha.observacoes}</p>
            )}

            {parcelas.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Plano de parcelas</p>
                {parcelas.map((p) => {
                  const restante = Number(p.valor) - Number(p.valor_pago || 0);
                  const paga = restante <= 0.005;
                  return (
                    <div key={p.n} className="flex items-center justify-between gap-2 text-xs rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                      <span className="text-muted-foreground">Parcela {p.n} — {formatData(p.vencimento)}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{formatKz(p.valor)}</span>
                        {paga ? (
                          <Badge variant="success">Paga</Badge>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => { setVerFicha(null); abrirPagamento(verFicha, p); }}>
                            Receber {formatKz(restante)}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmarApagar)}
        onClose={() => setConfirmarApagar(null)}
        onConfirm={handleEliminar}
        title="Remover dívida"
        description={
          confirmarApagar && Number(confirmarApagar.valor_pago) > 0
            ? "Esta dívida já tem pagamentos registados. Em vez de a apagar, ela vai ficar marcada como cancelada para não desfazer a tesouraria."
            : "A dívida vai sair da lista e dos totais. Esta acção não pode ser desfeita."
        }
        confirmLabel={confirmarApagar && Number(confirmarApagar.valor_pago) > 0 ? "Cancelar dívida" : "Remover"}
        icon="delete_forever"
      />
    </div>
  );
}