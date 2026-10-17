"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Modal from "@/components/Modal";
import KpiCard from "@/components/ui/KpiCard";
import { inputCls } from "@/lib/estoque";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
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
  LedgerEmpty,
} from "@/components/ui/Ledger";
import { listarOrdens, salvarImpressao } from "@/services/producao";
import { listar as listarMaquinas } from "@/services/maquinas";

const initialForm = { op: "", maquina: "", operador: "", inicio: "", fim: "", produzido: "", rejeitado: "", observacoes: "" };

const CAMPOS = [
  { value: "geral", label: "Todos os campos", obter: (r) => `${r.op || ""} ${r.cliente || ""} ${r.produto || ""} ${r.maquina || ""} ${r.operador || ""}` },
  { value: "op", label: "OP", obter: (r) => r.op || "" },
  { value: "cliente", label: "Cliente", obter: (r) => r.cliente || "" },
  { value: "produto", label: "Produto", obter: (r) => r.produto || "" },
  { value: "maquina", label: "Operacional", obter: (r) => r.maquina || "" },
  { value: "operador", label: "Operador", obter: (r) => r.operador || "" },
];

export default function ImpressaoPage() {
  const [registros, setRegistros] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [filtro, setFiltro] = useState({ campo: "geral", operador: "contem", termo: "" });
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const { addToast } = useToast();

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [ordensData, maquinasData] = await Promise.all([listarOrdens(), listarMaquinas().catch(() => [])]);
      setMaquinas(Array.isArray(maquinasData) ? maquinasData : maquinasData?.data ?? []);
      const arr = Array.isArray(ordensData) ? ordensData : ordensData?.ordens || [];
      setOrdens(arr);
      const mapped = [];
      arr.forEach(o => {
        const regs = o.impressaos || [];
        (Array.isArray(regs) ? regs : [regs]).forEach((r, idx) => {
          if (r && typeof r === "object") mapped.push({
            id: `${o.id}-${idx}`, op: o.id, cliente: o.cliente?.nome || o.cliente || "—", produto: o.produto || "—",
            maquina: r.maquina || "—", operador: r.operador || "—",
            inicio: r.data_inicio || r.inicio || r.horaInicio || "—", fim: r.data_fim || r.fim || r.horaFim || "—",
            produzido: r.quantidade_produzida || r.produzido || r.quantidadeProduzida || 0,
            rejeitado: r.quantidade_rejeitada || r.rejeitado || r.quantidadeRejeitada || 0,
            observacoes: r.observacoes || "",
          });
        });
      });
      setRegistros(mapped);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { carregarDados(); }, [carregarDados]);
/* eslint-enable react-hooks/set-state-in-effect */

  const totalProduzido = registros.reduce((s, r) => s + Number(r.produzido), 0);
  const totalRejeitado = registros.reduce((s, r) => s + Number(r.rejeitado), 0);

  const resultado = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...registros];
    if (termo) {
      const cfg = CAMPOS.find((c) => c.value === filtro.campo) || CAMPOS[0];
      res = res.filter((r) => {
        const alvo = String(cfg.obter(r) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (ordem.chave) {
      res.sort((a, b) => {
        const av = String(a[ordem.chave] ?? "").toLowerCase();
        const bv = String(b[ordem.chave] ?? "").toLowerCase();
        return (av < bv ? -1 : av > bv ? 1 : 0) * ordem.dir;
      });
    }
    return res;
  }, [registros, filtro, ordem]);

  const pag = usePaginacao({ items: resultado });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.op) {
      addToast("Seleccione uma ordem de produção", "error");
      return;
    }
    try {
      await salvarImpressao(Number(form.op), {
        maquina: form.maquina,
        operador: form.operador,
        horaInicio: form.inicio,
        horaFim: form.fim,
        quantidadeProduzida: Number(form.produzido) || 0,
        quantidadeRejeitada: Number(form.rejeitado) || 0,
        observacoes: form.observacoes,
      });
      setForm(initialForm); setModal(false);
      await carregarDados();
      addToast("Registo de impressão guardado", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar registo de impressão", "error");
    }
  };

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <h1 className="text-base font-normal text-foreground">Impressão</h1>
        <p className="mt-1 text-xs text-muted-foreground">{registros.length} registos de impressão</p>
      </div>

      <section className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {[
          { label: "Total Produzido", value: totalProduzido?.toLocaleString() ?? "0", icon: "print", iconVariant: "primary" },
          { label: "Total Rejeitado", value: totalRejeitado?.toLocaleString() ?? "0", icon: "block", iconVariant: "error" },
          { label: "Taxa de Aproveitamento", value: totalProduzido ? `${(((totalProduzido - totalRejeitado) / totalProduzido) * 100).toFixed(1)}%` : "0%", icon: "check_circle", iconVariant: "success" },
          { label: "Operacionais", value: maquinas.length, icon: "precision_manufacturing", iconVariant: "secondary" },
        ].map((kpi) => (
          <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} iconVariant={kpi.iconVariant} />
        ))}
      </section>

      <Ledger rotulo="Impressão ledger">
        <LedgerHeader
          titulo="Registos de impressão"
          subtitulo={`${registros.length} registos · ${totalProduzido?.toLocaleString() ?? "0"} produzidos · ${totalRejeitado?.toLocaleString() ?? "0"} rejeitados`}
          novo="Novo Registo"
          aoNovo={() => setModal(true)}
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
            setTermo={(v) => setFiltro((f) => ({ ...f, termo: v }))}
            aoLimpar={() => setFiltro((f) => ({ ...f, termo: "" }))}
            placeholder="Pesquisar por OP, cliente, produto, operador..."
          />
        )}
        <LedgerTable>
          <thead>
            <tr className="border-b border-border">
              <LedgerTh onSort={() => setOrdem((p) => (p.chave === "op" ? { chave: "op", dir: -p.dir } : { chave: "op", dir: 1 }))} ativo={ordem.chave === "op"}>OP</LedgerTh>
              <LedgerTh>Operacional</LedgerTh>
              <LedgerTh onSort={() => setOrdem((p) => (p.chave === "operador" ? { chave: "operador", dir: -p.dir } : { chave: "operador", dir: 1 }))} ativo={ordem.chave === "operador"}>Operador</LedgerTh>
              <LedgerTh onSort={() => setOrdem((p) => (p.chave === "inicio" ? { chave: "inicio", dir: -p.dir } : { chave: "inicio", dir: 1 }))} ativo={ordem.chave === "inicio"}>Início</LedgerTh>
              <LedgerTh>Fim</LedgerTh>
              <LedgerTh className="text-right">Produzido</LedgerTh>
              <LedgerTh className="text-right">Rejeitado</LedgerTh>
              <LedgerTh>Observações</LedgerTh>
            </tr>
          </thead>
          <tbody>
            {pag.visiveis.map((r) => (
              <LedgerTr key={r.id}>
                <LedgerTd className="max-w-44">
                  <IdCell id={r.op} meta={`${r.cliente} · ${r.produto}`} />
                </LedgerTd>
                <LedgerTd className="max-w-40"><span className="block truncate">{r.maquina}</span></LedgerTd>
                <LedgerTd className="max-w-40"><span className="block truncate">{r.operador}</span></LedgerTd>
                <LedgerTd className="whitespace-nowrap text-muted-foreground">{r.inicio}</LedgerTd>
                <LedgerTd className="whitespace-nowrap text-muted-foreground">{r.fim}</LedgerTd>
                <LedgerTd className="tabular-nums text-right font-medium text-foreground">{r.produzido}</LedgerTd>
                <LedgerTd className="tabular-nums text-right text-error">{r.rejeitado}</LedgerTd>
                <LedgerTd className="max-w-56"><span className="block truncate text-muted-foreground">{r.observacoes || "—"}</span></LedgerTd>
              </LedgerTr>
            ))}
          </tbody>
        </LedgerTable>
        {pag.total === 0 && <LedgerEmpty icone="print">Nenhum registo de impressão encontrado</LedgerEmpty>}
        <Paginacao {...pag} label="registos" />
      </Ledger>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Registo de Impressão" icon="print" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button type="submit" form="form-impressao">Registar</Button></>}>
        <form id="form-impressao" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ordem de Produção *</label>
              <select required value={form.op} onChange={(e) => setForm({ ...form, op: e.target.value })} className={inputCls}>
                <option value="">Seleccionar OP...</option>
                {ordens.map((o) => <option key={o.id} value={o.id}>{o.id} — {o.cliente?.nome || o.cliente || ""} ({o.produto || "—"})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Operacional *</label>
              <select required value={form.maquina} onChange={(e) => setForm({ ...form, maquina: e.target.value })} className={inputCls}>
                <option value="">Seleccionar...</option>
                {maquinas.map(m => <option key={m.id} value={m.nome_comum}>{m.nome_comum}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Operador *</label>
              <input required value={form.operador} onChange={(e) => setForm({ ...form, operador: e.target.value })} className={inputCls} placeholder="Nome do operador" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hora Início *</label>
              <input required type="time" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hora Fim *</label>
              <input required type="time" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Qtd Produzida *</label>
              <NumeroInput required value={form.produzido} onChange={(e) => setForm({ ...form, produzido: e.target.value })} className={inputCls} placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Qtd Rejeitada</label>
              <NumeroInput value={form.rejeitado} onChange={(e) => setForm({ ...form, rejeitado: e.target.value })} className={inputCls} placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</label>
              <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} className={`${inputCls} resize-none`} placeholder="Notas..." />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
