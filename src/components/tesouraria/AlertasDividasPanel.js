"use client";

import { useEffect, useState } from "react";
import { alertasDividas } from "@/services/tesouraria";
import { guardarSistema } from "@/services/configuracoes";
import { podeAtual } from "@/lib/permissoes";
import Icon from "@/components/Icon";
import { Button, Card, CardContent, CardHeader, CardTitle, FormField, Input } from "@/components/ui";
import KpiCard from "@/components/ui/KpiCard";
import { useToast } from "@/components/Toast";

const CAMPOS = [
  { chave: "limite_divida_cliente", label: "Limite de dívida por cliente (Kz)", passo: "0.01", hint: "0 desactiva o bloqueio de orçamentos." },
  { chave: "prazo_divida_dias", label: "Prazo global (dias)", passo: "1", hint: "Contado a partir da emissão da fatura." },
  { chave: "juro_divida_percentual", label: "Juro por 30 dias de atraso (%)", passo: "0.01", hint: "Percentagem simples sobre o saldo vencido." },
  { chave: "desconto_divida_percentual", label: "Desconto por pagamento antecipado (%)", passo: "0.01", hint: "Percentagem aplicada ao saldo se pago dentro do prazo abaixo." },
  { chave: "desconto_prazo_dias", label: "Prazo para desconto (dias desde emissão)", passo: "1", hint: "0 desactiva o desconto." },
];

const NIVEIS = {
  bloqueado: { label: "Limite atingido", cls: "bg-error/10 text-error" },
  atencao: { label: "Perto do limite", cls: "bg-warning/10 text-warning" },
  vencido: { label: "Vencido", cls: "bg-warning/10 text-warning" },
  normal: { label: "Normal", cls: "bg-muted text-muted-foreground" },
};

function kz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

function parametrosParaForm(p = {}) {
  return {
    limite_divida_cliente: Number(p.limite) || 0,
    prazo_divida_dias: Number(p.prazoDias) || 0,
    juro_divida_percentual: Number(p.juroPercentual) || 0,
    desconto_divida_percentual: Number(p.descontoPercentual) || 0,
    desconto_prazo_dias: Number(p.descontoPrazoDias) || 0,
  };
}

export default function AlertasDividasPanel() {
  const { addToast } = useToast();
  const podeEditar = podeAtual("configuracao", "editar");
  const [dados, setDados] = useState({ parametros: {}, resumo: {}, clientes: [] });
  const [form, setForm] = useState(parametrosParaForm());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    try {
      const info = await alertasDividas();
      setDados(info || {});
      setForm(parametrosParaForm(info?.parametros));
    } catch (e) {
      addToast?.(e?.response?.data?.erro || "Erro ao carregar alertas de dívidas", "error");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar() {
    setSalvando(true);
    try {
      const limpo = Object.fromEntries(
        Object.entries(form).map(([chave, valor]) => [chave, Math.max(0, Number(valor) || 0)])
      );
      await guardarSistema(limpo);
      addToast?.("Parâmetros de dívida guardados", "success");
      await carregar();
    } catch (e) {
      addToast?.(e?.response?.data?.erro || "Erro ao guardar parâmetros de dívida", "error");
    } finally {
      setSalvando(false);
    }
  }

  const { resumo = {}, clientes = [] } = dados;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Icon name="warning" className="text-warning" />
          Alertas de dívidas e limites
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Limite global, prazo, juro por atraso e desconto por pagamento antecipado. Os valores são guardados em Configurações → Sistema e também podem ser alterados aqui.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon="payments" iconVariant="primary" label="Limite global" value={kz(resumo.limite)} />
          <KpiCard icon="account_balance_wallet" iconVariant="warning" label="Dívida em aberto" value={kz(resumo.saldoTotal)} />
          <KpiCard icon="schedule" iconVariant="error" label="Clientes vencidos" value={String(resumo.vencidos || 0)} />
          <KpiCard icon="error" iconVariant="error" label="No limite" value={String(resumo.bloqueados || 0)} />
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-3 lg:grid-cols-5">
          {CAMPOS.map((campo) => (
            <FormField key={campo.chave} label={campo.label} hint={campo.hint}>
              <Input
                type="number"
                min="0"
                step={campo.passo}
                value={form[campo.chave] ?? 0}
                disabled={!podeEditar || carregando}
                onChange={(e) => setForm((p) => ({ ...p, [campo.chave]: e.target.value }))}
              />
            </FormField>
          ))}
          {podeEditar && (
            <div className="col-span-2 flex items-end sm:col-span-3 lg:col-span-5">
              <Button onClick={guardar} disabled={salvando}>
                <Icon name="save" className="text-sm" /> {salvando ? "A guardar..." : "Guardar parâmetros"}
              </Button>
            </div>
          )}
        </div>

        {clientes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            Não existem dívidas em aberto para mostrar.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-right font-medium">Dívida</th>
                  <th className="px-3 py-2 text-right font-medium">Juro</th>
                  <th className="px-3 py-2 text-right font-medium">Desconto disponível</th>
                  <th className="px-3 py-2 text-right font-medium">Atraso</th>
                  <th className="px-3 py-2 text-left font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const nivel = NIVEIS[c.nivel] || NIVEIS.normal;
                  return (
                    <tr key={c.clienteId || c.nome} className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium text-foreground">{c.nome}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{kz(c.saldoFinal)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-warning">{kz(c.juro)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-success">{kz(c.desconto)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.diasAtrasoMax ? `${c.diasAtrasoMax} dia(s)` : "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${nivel.cls}`}>{nivel.label}</span>
                        {Number(resumo.limite) > 0 && (
                          <span className="ml-2 text-muted-foreground">{Number(c.percentualLimite).toFixed(0)}% do limite</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
