"use client";

import { useState, useEffect, useMemo } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
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
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { inputCls } from "@/lib/estoque";
import { listarOrdens, salvarQualidade } from "@/services/producao";

const campos = [
  { key: "cor", label: "Cor", icon: "palette" },
  { key: "corte", label: "Corte", icon: "content_cut" },
  { key: "quantidade", label: "Quantidade", icon: "numbers" },
  { key: "acabamento", label: "Acabamento", icon: "handyman" },
  { key: "embalagem", label: "Embalagem", icon: "inventory_2" },
];

const CAMPOS = [
  { value: "geral", label: "Todos os campos", obter: (i) => `${i.op || ""} ${i.cliente || ""} ${i.produto || ""} ${i.responsavel || ""}` },
  { value: "op", label: "OP", obter: (i) => i.op || "" },
  { value: "cliente", label: "Cliente", obter: (i) => i.cliente || "" },
  { value: "produto", label: "Produto", obter: (i) => i.produto || "" },
  { value: "responsavel", label: "Responsável", obter: (i) => i.responsavel || "" },
];

const pillBase = "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-colors";
const pillAtiva = "border-primary/40 bg-primary/10 text-primary";
const pillInativa = "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground";

const statusTom = { aprovado: "success", reprovado: "error", pendente: "neutral" };
const initialForm = { op: "", cliente: "", produto: "", responsavel: "", cor: "pendente", corte: "pendente", quantidade: "pendente", acabamento: "pendente", embalagem: "pendente" };

function calcularResultado(insp) {
  const valores = campos.map(c => insp[c.key]);
  if (valores.some(v => v === "reprovado")) return "reprovado";
  if (valores.every(v => v === "aprovado")) return "aprovado";
  return "pendente";
}

export default function QualidadePage() {
  const [inspecoes, setInspecoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState({ campo: "geral", operador: "contem", termo: "" });
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editandoId, setEditandoId] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    listarOrdens().then(data => {
      const arr = Array.isArray(data) ? data : data?.ordens || [];
      setInspecoes(arr.map(o => {
        const qual = Array.isArray(o.qualidades) ? o.qualidades[0] : o.qualidade;
        return {
        id: o.id, op: o.id, cliente: o.cliente?.nome || o.cliente || "—", produto: o.produto || "—",
        responsavel: qual?.responsavel || o.responsavel_qualidade || "",
        ...campos.reduce((acc, c) => ({ ...acc, [c.key]: qual?.[c.key] || "pendente" }), {}),
      };
      }));
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const filtrados = useMemo(() => {
    let res = filtro === "todos" ? inspecoes : inspecoes.filter(i => calcularResultado(i) === filtro);
    const termo = busca.termo.trim().toLowerCase();
    if (termo) {
      const cfg = CAMPOS.find((c) => c.value === busca.campo) || CAMPOS[0];
      res = res.filter((i) => {
        const alvo = String(cfg.obter(i) || "").toLowerCase();
        if (busca.operador === "igual") return alvo === termo;
        if (busca.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (ordem.chave) {
      res = [...res].sort((a, b) => {
        const av = ordem.chave === "resultado" ? calcularResultado(a) : String(a[ordem.chave] || "").toLowerCase();
        const bv = ordem.chave === "resultado" ? calcularResultado(b) : String(b[ordem.chave] || "").toLowerCase();
        return (av < bv ? -1 : av > bv ? 1 : 0) * ordem.dir;
      });
    }
    return res;
  }, [inspecoes, filtro, busca, ordem]);

  const pag = usePaginacao({ items: filtrados });

  const contagem = (f) => f === "todos" ? inspecoes.length : inspecoes.filter(i => calcularResultado(i) === f).length;

  const toggleCampo = (key) => {
    const ordem = ["pendente", "aprovado", "reprovado"];
    const atual = form[key] || "pendente";
    const idx = ordem.indexOf(atual);
    const next = ordem[(idx + 1) % ordem.length];
    setForm(prev => ({ ...prev, [key]: next }));
  };

  const handleEdit = (insp) => {
    setEditandoId(insp.id);
    setForm({ op: insp.op, cliente: insp.cliente, produto: insp.produto, responsavel: insp.responsavel || "", ...campos.reduce((acc, c) => ({ ...acc, [c.key]: insp[c.key] || "pendente" }), {}) });
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editandoId) return;
    try {
      const dados = campos.reduce((acc, c) => ({ ...acc, [c.key]: form[c.key] || "pendente" }), {});
      await salvarQualidade(editandoId, dados);
      setInspecoes(prev => prev.map(i => i.id === editandoId ? { ...i, ...dados, responsavel: form.responsavel } : i));
      setModal(false);
      addToast("Inspeção actualizada com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar inspeção", "error");
    }
  };

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-4">
      <PageHeader titulo="Controlo de Qualidade" descricao={`${inspecoes.length} inspeções registadas`} />

      <Ledger rotulo="Qualidade ledger">
        <LedgerHeader
          titulo="Inspeções"
          subtitulo={`${filtrados.length} de ${inspecoes.length} inspeções`}
          onToggleFiltros={() => setFiltrosAbertos((v) => !v)}
          filtrosAbertos={filtrosAbertos}
        />
        {filtrosAbertos && (
          <FilterRow
            campo={busca.campo}
            setCampo={(v) => setBusca((f) => ({ ...f, campo: v }))}
            campos={CAMPOS.map(({ value, label }) => ({ value, label }))}
            operador={busca.operador}
            setOperador={(v) => setBusca((f) => ({ ...f, operador: v }))}
            termo={busca.termo}
            setTermo={(v) => setBusca((f) => ({ ...f, termo: v }))}
            aoLimpar={() => setBusca((f) => ({ ...f, termo: "" }))}
            placeholder="Pesquisar inspeções por OP, cliente, produto..."
          />
        )}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
          {["todos", "aprovado", "pendente", "reprovado"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
              className={`${pillBase} ${filtro === f ? pillAtiva : pillInativa}`}
            >
              {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="text-[11px] text-muted-foreground">{contagem(f)}</span>
            </button>
          ))}
        </div>

        <LedgerTable>
          <thead>
            <tr className="border-b border-border">
              <LedgerTh onSort={() => setOrdem((p) => (p.chave === "op" ? { chave: "op", dir: -p.dir } : { chave: "op", dir: 1 }))} ativo={ordem.chave === "op"}>OP</LedgerTh>
              <LedgerTh onSort={() => setOrdem((p) => (p.chave === "resultado" ? { chave: "resultado", dir: -p.dir } : { chave: "resultado", dir: 1 }))} ativo={ordem.chave === "resultado"}>Resultado</LedgerTh>
              {campos.map((c) => (
                <LedgerTh key={c.key}>{c.label}</LedgerTh>
              ))}
              <LedgerTh className="w-32" />
            </tr>
          </thead>
          <tbody>
            {pag.visiveis.map((insp) => {
              const resultado = calcularResultado(insp);
              return (
                <LedgerTr key={insp.id}>
                  <LedgerTd className="max-w-56">
                    <IdCell id={insp.op} meta={`${insp.cliente} — ${insp.produto}`} aoAbrir={() => handleEdit(insp)} />
                  </LedgerTd>
                  <LedgerTd>
                    <StatusBadge tom={statusTom[resultado]}>{resultado}</StatusBadge>
                  </LedgerTd>
                  {campos.map((c) => (
                    <LedgerTd key={c.key}>
                      <StatusBadge tom={statusTom[insp[c.key]] || "neutral"}>{insp[c.key]}</StatusBadge>
                    </LedgerTd>
                  ))}
                  <LedgerTd>
                    <button
                      type="button"
                      onClick={() => handleEdit(insp)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      <Icon name="edit" className="text-sm" /> Inspecionar
                    </button>
                  </LedgerTd>
                </LedgerTr>
              );
            })}
          </tbody>
        </LedgerTable>
        {pag.total === 0 && <LedgerEmpty icone="verified">Nenhuma inspeção encontrada</LedgerEmpty>}
        <Paginacao {...pag} label="registos" />
      </Ledger>

      <Modal open={modal} onClose={() => setModal(false)} title="Inspeção de Qualidade" icon="verified" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button type="submit" form="form-qualidade">Concluir Inspeção</Button></>}>
        <form id="form-qualidade" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">OP</label>
              <input value={form.op} disabled className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-xs text-foreground" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Responsável</label>
              <input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className={inputCls} placeholder="Nome do inspector" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {campos.map((c) => (
              <button key={c.key} type="button" onClick={() => toggleCampo(c.key)}
                className={`p-4 rounded-xl border-2 text-center transition-all text-xs font-bold ${
                  form[c.key] === "aprovado" ? "border-success/30 bg-success/10 text-success" :
                  form[c.key] === "reprovado" ? "border-error/30 bg-error/10 text-error" :
                  "border-border bg-background text-muted-foreground"
                }`}>
                <Icon name={c.icon} className="text-xl block mb-1 mx-auto" />
                <span className="block">{c.label}</span>
                <span className="block text-[9px] mt-1 opacity-70">{form[c.key]}</span>
              </button>
            ))}
          </div>
        </form>
      </Modal>
    </div>
  );
}
