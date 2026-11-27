"use client";

import { useEffect, useMemo, useState } from "react";
import { listarFaturas, marcarPaga, abrirAnexoFatura } from "@/services/faturacao";
import { listarContas } from "@/services/contasBancarias";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import Modal from "@/components/Modal";
import NumeroInput from "@/components/ui/NumeroInput";
import { StatusBadge, LedgerEmpty } from "@/components/ui/Ledger";
import { useToast } from "@/components/Toast";
import { inputCls } from "@/lib/estoque";
import { ListSkeleton } from "@/components/Skeleton";

// Estados que representam fatura já validada na Tesouraria e ainda com saldo
// em aberto (dívida do cliente / "factura a receber").
const ESTADOS = {
  emitida: { label: "Emitida", tom: "warning" },
  parcial: { label: "Parcial", tom: "info" },
  vencida: { label: "Vencida", tom: "error" },
  paga: { label: "Paga", tom: "success" },
  cancelada: { label: "Anulada", tom: "neutral" },
  em_analise: { label: "Em análise", tom: "info" },
};

const METODOS = [
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "deposito", label: "Depósito" },
  { value: "multicaixa", label: "Multicaixa" },
  { value: "cheque", label: "Cheque" },
  { value: "tpa", label: "TPA" },
];

function dataLocal(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const HOJE = dataLocal(new Date());

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function totalDe(f) { return Number(f.total || f.valor) || 0; }
function saldoDe(f) { return Math.max(0, totalDe(f) - (Number(f.valor_pago) || 0)); }

function diasAtraso(f) {
  if (!f.data_vencimento || f.data_vencimento >= HOJE) return 0;
  return Math.floor((Date.parse(`${HOJE}T00:00:00`) - Date.parse(`${f.data_vencimento}T00:00:00`)) / 86400000);
}

function rotuloConta(conta) {
  if (!conta) return "—";
  return `${conta.banco_nome}${conta.numero_conta ? ` — ${conta.numero_conta}` : ""}`;
}

export default function FacturasAReceberTab() {
  const { addToast } = useToast();
  const [faturas, setFaturas] = useState([]);
  const [contas, setContas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termo, setTermo] = useState("");
  const [modalPagar, setModalPagar] = useState(null);
  const [pagamento, setPagamento] = useState({ valor: "", data_pagamento: HOJE, conta_bancaria_id: "", metodo_pagamento: "transferencia" });
  const [salvando, setSalvando] = useState(false);

  const carregar = () => Promise.all([listarFaturas(), listarContas({ ativo: "true" })])
    .then(([lista, cs]) => {
      setFaturas(Array.isArray(lista) ? lista : []);
      setContas(Array.isArray(cs) ? cs : []);
    })
    .catch((e) => {
      addToast?.(e?.response?.data?.erro || "Erro ao carregar faturas a receber", "error");
      setFaturas([]);
    })
    .finally(() => setCarregando(false));

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Só faturas já validadas (não "em_analise") com saldo em aberto.
  const aReceber = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return faturas
      .filter((f) => !["paga", "cancelada", "em_analise"].includes(f.estado))
      .filter((f) => saldoDe(f) > 0.005)
      .filter((f) => {
        if (!t) return true;
        const alvo = `${f.numero || ""} ${f.cliente?.nome || ""} ${f.cliente?.empresa || ""}`.toLowerCase();
        return alvo.includes(t);
      })
      .sort((a, b) => String(a.data_vencimento || "9999").localeCompare(String(b.data_vencimento || "9999")));
  }, [faturas, termo]);

  const resumo = useMemo(() => {
    let total = 0, vencido = 0, aVencer = 0;
    for (const f of aReceber) {
      const s = saldoDe(f);
      total += s;
      if (diasAtraso(f) > 0) vencido += s; else aVencer += s;
    }
    return { total, vencido, aVencer, qtd: aReceber.length };
  }, [aReceber]);

  const abrirPagamento = (f) => {
    setPagamento({
      valor: Number(saldoDe(f).toFixed(2)),
      data_pagamento: HOJE,
      conta_bancaria_id: f.conta_bancaria_id || contas[0]?.id || "",
      metodo_pagamento: f.metodo_pagamento || "transferencia",
    });
    setModalPagar(f);
  };

  const handlePagar = async () => {
    if (!modalPagar) return;
    const valor = Number(pagamento.valor) || 0;
    if (valor <= 0) return addToast?.("Indique o valor a receber", "error");
    setSalvando(true);
    try {
      const novoTotal = (Number(modalPagar.valor_pago) || 0) + valor;
      await marcarPaga(modalPagar.id, {
        valor_pago: novoTotal,
        metodo: pagamento.metodo_pagamento,
        conta_bancaria_id: pagamento.conta_bancaria_id || null,
        aplicar_desconto: false,
      });
      addToast?.(novoTotal >= totalDe(modalPagar) ? "Fatura paga integralmente" : "Pagamento parcial registado", "success");
      setModalPagar(null);
      await carregar();
    } catch (e) {
      addToast?.(e?.response?.data?.erro || "Erro ao registar recebimento", "error");
    } finally {
      setSalvando(false);
    }
  };

  const abrirDocumento = async (f) => {
    const anexo = Array.isArray(f.anexos) ? f.anexos[0] : null;
    if (!anexo) return addToast?.("Esta fatura não tem documento anexado", "error");
    try {
      await abrirAnexoFatura(anexo.id);
    } catch {
      addToast?.("Não foi possível abrir o documento", "error");
    }
  };

  if (carregando) return <ListSkeleton count={5} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard icon="account_balance_wallet" label="Total a Receber" value={formatKz(resumo.total)} iconVariant="primary"
          badge={`${resumo.qtd} fatura(s) em aberto`} />
        <KpiCard icon="warning" label="Vencido" value={formatKz(resumo.vencido)} iconVariant="error"
          badge="Já passou a data de vencimento" />
        <KpiCard icon="schedule" label="A Vencer" value={formatKz(resumo.aVencer)} iconVariant="info"
          badge="Dentro do prazo" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Facturas a Receber</p>
              <p className="text-[11px] text-muted-foreground">
                Faturas já validadas na Tesouraria que ainda não foram pagas pelo cliente. O documento anexado fica disponível para consulta.
              </p>
            </div>
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              className={`${inputCls} h-9 max-w-64 text-xs`}
              placeholder="Procurar número ou cliente..."
            />
          </div>

          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Fatura</th>
                  <th className="px-2 py-2 font-medium">Cliente</th>
                  <th className="px-2 py-2 font-medium">Vencimento</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2 font-medium text-right">Saldo</th>
                  <th className="px-2 py-2 font-medium">Documento</th>
                  <th className="px-2 py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {aReceber.map((f) => {
                  const cfg = ESTADOS[f.estado] || ESTADOS.emitida;
                  const atraso = diasAtraso(f);
                  const temAnexo = Array.isArray(f.anexos) && f.anexos.length > 0;
                  return (
                    <tr key={f.id} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className="block font-medium text-foreground">{f.numero || `#${f.id}`}</span>
                        <span className="block text-[11px] text-muted-foreground">Emissão {formatData(f.data_emissao)}</span>
                      </td>
                      <td className="px-2 py-2 max-w-44">
                        <span className="block truncate">{f.cliente?.nome || f.cliente?.empresa || "Sem cliente"}</span>
                        {f.cliente?.nif && <span className="block text-[11px] text-muted-foreground">NIF {f.cliente.nif}</span>}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className="block tabular-nums">{formatData(f.data_vencimento)}</span>
                        {atraso > 0 && <span className="block text-[11px] text-destructive">{atraso} dia(s) em atraso</span>}
                      </td>
                      <td className="px-2 py-2">
                        <span className="flex flex-wrap items-center gap-1">
                          <StatusBadge tom={cfg.tom}>{cfg.label}</StatusBadge>
                          {atraso > 0 && <StatusBadge tom="error">Vencida</StatusBadge>}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-right">
                        <span className="block text-sm font-medium text-primary tabular-nums">{formatKz(saldoDe(f))}</span>
                        <span className="block text-[11px] text-muted-foreground tabular-nums">
                          {Number(f.valor_pago) > 0 ? `Pago ${formatKz(f.valor_pago)} de ${formatKz(totalDe(f))}` : `Total ${formatKz(totalDe(f))}`}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {temAnexo ? (
                          <Button variant="outline" size="sm" onClick={() => abrirDocumento(f)}>
                            <Icon name="picture_as_pdf" className="text-sm" /> Abrir
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Sem documento</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Button size="sm" onClick={() => abrirPagamento(f)}>
                          <Icon name="payments" className="text-sm" /> Receber
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {aReceber.length === 0 && (
              <LedgerEmpty icone="check_circle">Nenhuma fatura por receber</LedgerEmpty>
            )}
          </div>
        </CardContent>
      </Card>

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
              <Icon name="check" className="text-sm" /> Confirmar Recebimento
            </Button>
          </>
        }
      >
        {modalPagar && (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 border border-border/60 px-3 py-2">
              <p className="text-sm font-semibold text-foreground">Fatura {modalPagar.numero}</p>
              <p className="text-xs text-muted-foreground">
                {modalPagar.cliente?.nome || modalPagar.cliente?.empresa || "Sem cliente"} · Saldo {formatKz(saldoDe(modalPagar))}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Vai ser criado um movimento de entrada na Tesouraria e o saldo da conta será actualizado.
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
                  {METODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </FormField>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}