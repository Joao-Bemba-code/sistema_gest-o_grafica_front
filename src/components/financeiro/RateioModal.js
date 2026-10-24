"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import NumeroInput from "@/components/ui/NumeroInput";
import { useToast } from "@/components/Toast";
import { inputCls } from "@/lib/estoque";
import { salvarRateio } from "@/services/rateios";

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function arredondar(v) { return Number(Number(v || 0).toFixed(2)); }

function rotuloOrdem(o) {
  return `OP ${o.numero}${o.produto ? ` · ${o.produto}` : ""}`;
}

let chaveSeq = 1;
function novaChave() {
  chaveSeq += 1;
  return `linha-${chaveSeq}`;
}

export default function RateioModal({ movimento, ordens = [], onClose, onSaved }) {
  const { addToast } = useToast();
  const [modo, setModo] = useState("percentagem");
  const [salvando, setSalvando] = useState(false);
  const [linhas, setLinhas] = useState(() => {
    const existentes = (movimento.rateios || []).map((r, i) => ({
      key: `existente-${r.id || i}`,
      ordem_producao_id: String(r.ordem_producao_id),
      valor: String(Number(r.valor || 0)),
      percentagem: String(Number(r.percentagem || 0)),
    }));
    if (existentes.length) return existentes;
    return [{ key: novaChave(), ordem_producao_id: "", valor: "", percentagem: "100" }];
  });

  const valorDespesa = Number(movimento.valor || 0);
  const temRateio = (movimento.rateios || []).length > 0;

  const valorDaLinha = (l) => {
    if (modo === "percentagem") {
      return arredondar((Number(l.percentagem) || 0) / 100 * valorDespesa);
    }
    return arredondar(Number(l.valor) || 0);
  };

  const totalRateado = arredondar(linhas.reduce((s, l) => s + valorDaLinha(l), 0));
  const restante = arredondar(valorDespesa - totalRateado);
  const excede = totalRateado > arredondar(valorDespesa) + 0.004;

  const ordensUsadas = useMemo(
    () => new Set(linhas.map((l) => l.ordem_producao_id).filter(Boolean)),
    [linhas]
  );

  const atualizarLinha = (key, campo, valor) => {
    setLinhas((prev) => prev.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));
  };

  const adicionarLinha = () => {
    setLinhas((prev) => [...prev, { key: novaChave(), ordem_producao_id: "", valor: "", percentagem: "" }]);
  };

  const removerLinha = (key) => {
    setLinhas((prev) => (prev.length <= 1
      ? [{ key: novaChave(), ordem_producao_id: "", valor: "", percentagem: "" }]
      : prev.filter((l) => l.key !== key)));
  };

  const mudarModo = (novo) => {
    if (novo === modo) return;
    setLinhas((prev) => prev.map((l) => {
      const valorAtual = valorDaLinha(l);
      if (novo === "valor") {
        return { ...l, valor: valorAtual ? String(valorAtual) : "" };
      }
      const pct = valorDespesa > 0 ? arredondar((valorAtual / valorDespesa) * 100) : 0;
      return { ...l, percentagem: pct ? String(pct) : "" };
    }));
    setModo(novo);
  };

  const distribuirIgualmente = () => {
    const n = linhas.length;
    if (!n) return;
    if (modo === "percentagem") {
      const base = Math.floor((100 / n) * 100) / 100;
      setLinhas((prev) => prev.map((l, i) => ({
        ...l,
        percentagem: String(i === n - 1 ? arredondar(100 - base * (n - 1)) : base),
      })));
    } else {
      const base = Math.floor((valorDespesa / n) * 100) / 100;
      setLinhas((prev) => prev.map((l, i) => ({
        ...l,
        valor: String(i === n - 1 ? arredondar(valorDespesa - base * (n - 1)) : base),
      })));
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    const preenchidas = linhas.filter((l) =>
      l.ordem_producao_id || String(l.percentagem || "").trim() || String(l.valor || "").trim()
    );
    if (!preenchidas.length) {
      addToast("Adicione pelo menos uma ordem de produção ao rateio", "error");
      return;
    }
    const itens = [];
    for (const l of preenchidas) {
      if (!l.ordem_producao_id) {
        addToast("Escolha a ordem de produção em todas as linhas", "error");
        return;
      }
      const valor = valorDaLinha(l);
      if (!(valor > 0)) {
        addToast("Indique um valor ou percentagem maior que zero", "error");
        return;
      }
      itens.push(
        modo === "percentagem"
          ? { ordem_producao_id: Number(l.ordem_producao_id), percentagem: Number(l.percentagem) || 0 }
          : { ordem_producao_id: Number(l.ordem_producao_id), valor }
      );
    }
    if (excede) {
      addToast(`A soma dos rateios ultrapassa o valor da despesa (${formatKz(valorDespesa)})`, "error");
      return;
    }
    setSalvando(true);
    try {
      await salvarRateio(movimento.id, itens);
      addToast("Rateio guardado com sucesso", "success");
      onSaved?.();
      onClose?.();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar rateio", "error");
    } finally {
      setSalvando(false);
    }
  };

  const handleLimpar = async () => {
    setSalvando(true);
    try {
      await salvarRateio(movimento.id, []);
      addToast("Rateio removido desta despesa", "success");
      onSaved?.();
      onClose?.();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao remover rateio", "error");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Ratear despesa por OP"
      icon="call_split"
      size="lg"
      footer={
        <>
          {temRateio && (
            <Button type="button" variant="ghost" onClick={handleLimpar} disabled={salvando} className="mr-auto text-error">
              <Icon name="delete" className="text-sm" /> Limpar rateio
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-rateio" loading={salvando}>Guardar rateio</Button>
        </>
      }
    >
      <form id="form-rateio" onSubmit={handleGuardar} className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{movimento.descricao}</p>
              <p className="text-[11px] text-muted-foreground">
                {movimento.categoria || "despesa"} · {movimento.data_movimento ? new Date(movimento.data_movimento).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
            <p className="shrink-0 text-base font-black tabular-nums text-foreground">{formatKz(valorDespesa)}</p>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Rateado <strong className="text-foreground">{formatKz(totalRateado)}</strong></span>
              <span className={excede ? "font-semibold text-error" : "text-muted-foreground"}>
                Por ratear <strong className={excede ? "text-error" : "text-foreground"}>{formatKz(restante)}</strong>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${excede ? "bg-error" : "bg-primary"}`}
                style={{ width: `${Math.min(100, valorDespesa > 0 ? (totalRateado / valorDespesa) * 100 : 0)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Modo de rateio">
            {[
              { id: "percentagem", label: "Por percentagem" },
              { id: "valor", label: "Por valor" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => mudarModo(m.id)}
                aria-pressed={modo === m.id}
                className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors ${
                  modo === m.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={distribuirIgualmente} disabled={linhas.length < 1}>
              <Icon name="balance" className="text-sm" /> Distribuir igualmente
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={adicionarLinha}>
              <Icon name="add" className="text-sm" /> Adicionar OP
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {linhas.map((l, idx) => {
            const valorCalculado = valorDaLinha(l);
            const pctCalculada = valorDespesa > 0 ? arredondar((valorCalculado / valorDespesa) * 100) : 0;
            return (
              <div key={l.key} className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-12 sm:items-end">
                <div className="sm:col-span-7 flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">Ordem de produção {idx + 1} *</label>
                  <select
                    value={l.ordem_producao_id}
                    onChange={(e) => atualizarLinha(l.key, "ordem_producao_id", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Escolher OP...</option>
                    {ordens.map((o) => (
                      <option key={o.id} value={o.id} disabled={ordensUsadas.has(String(o.id)) && String(o.id) !== l.ordem_producao_id}>
                        {rotuloOrdem(o)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4 flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    {modo === "percentagem" ? "Percentagem (%)" : "Valor (Kz)"} *
                  </label>
                  <div className="flex items-center rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/25">
                    <NumeroInput
                      value={modo === "percentagem" ? l.percentagem : l.valor}
                      onChange={(e) => atualizarLinha(l.key, modo === "percentagem" ? "percentagem" : "valor", e.target.value)}
                      className="h-10 w-full bg-transparent px-2.5 text-sm outline-none"
                      placeholder="0"
                    />
                    <span className="pr-2.5 text-xs font-semibold text-muted-foreground">{modo === "percentagem" ? "%" : "Kz"}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {modo === "percentagem" ? `≈ ${formatKz(valorCalculado)}` : `≈ ${pctCalculada.toFixed(2)}%`}
                  </span>
                </div>
                <div className="sm:col-span-1 flex justify-end sm:justify-center">
                  <button
                    type="button"
                    onClick={() => removerLinha(l.key)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                    aria-label="Remover linha"
                  >
                    <Icon name="close" className="text-base" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {ordens.length === 0 && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            Não existem ordens de produção. Crie uma OP antes de ratear despesas.
          </p>
        )}
        {excede && (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-xs font-medium text-error">
            A soma dos rateios não pode ultrapassar {formatKz(valorDespesa)}.
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          O rateio não duplica a despesa: apenas indica quanto desta saída pertence a cada OP.
        </p>
      </form>
    </Modal>
  );
}
