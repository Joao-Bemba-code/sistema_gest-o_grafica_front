"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
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
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import { inputCls } from "@/lib/estoque";
import { listarOrdens, salvarAcabamento } from "@/services/producao";

const servicos = [
  { id: "corte", label: "Corte", icon: "content_cut" },
  { id: "dobra", label: "Dobra", icon: "flip" },
  { id: "encadernacao", label: "Encadernação", icon: "menu_book" },
  { id: "laminacao", label: "Laminação", icon: "layers" },
  { id: "verniz", label: "Verniz", icon: "format_paint" },
  { id: "hot_stamping", label: "Hot Stamping", icon: "star" },
  { id: "ilhos", label: "Ilhós", icon: "circle" },
];

const processoOptions = ["pendente", "em_execucao", "concluido"];
const processoLabels = { pendente: "Pendente", em_execucao: "Em Execução", concluido: "Concluído" };
const processoVariants = { pendente: "neutral", em_execucao: "warning", concluido: "success" };
const initialForm = { op: "", cliente: "", produto: "", prazo: "", responsavel: "" };
const initialServicos = Object.fromEntries(servicos.map(s => [s.id, "pendente"]));

const estadoMeta = {
  concluido: { label: "Concluído", tom: "success" },
  em_execucao: { label: "Em Andamento", tom: "warning" },
  pendente: { label: "Pendente", tom: "neutral" },
};

const ESTADOS = [
  { value: "todos", label: "Todos" },
  { value: "concluido", label: "Concluídos" },
  { value: "em_execucao", label: "Em Andamento" },
  { value: "pendente", label: "Pendentes" },
];

const CAMPOS = [
  { value: "geral", label: "Todos os campos", obter: (o) => [o.id, o.cliente, o.produto, o.responsavel].join(" ") },
  { value: "id", label: "OP", obter: (o) => o.id || "" },
  { value: "cliente", label: "Cliente", obter: (o) => o.cliente || "" },
  { value: "produto", label: "Produto", obter: (o) => o.produto || "" },
  { value: "responsavel", label: "Responsável", obter: (o) => o.responsavel || "" },
];

const pillBase = "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-colors";
const pillAtiva = "border-primary/40 bg-primary/10 text-primary";
const pillInativa = "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground";

const estadoOrdem = (op) => {
  const todosConcluidos = servicos.every(s => op.servicos[s.id] === "concluido");
  const algumExec = servicos.some(s => op.servicos[s.id] === "em_execucao");
  return todosConcluidos ? "concluido" : algumExec ? "em_execucao" : "pendente";
};

export default function AcabamentoPage() {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [servicosForm, setServicosForm] = useState(initialServicos);
  const [filtro, setFiltro] = useState({ campo: "geral", operador: "contem", termo: "" });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const { addToast } = useToast();

  useEffect(() => {
    listarOrdens().then(data => {
      const arr = Array.isArray(data) ? data : data?.ordens || [];
      setOrdens(arr.map(o => {
        const acMap = (Array.isArray(o.acabamentos) ? o.acabamentos : []).reduce((acc, r) => ({ ...acc, [r.servico]: r.estado }), {});
        return {
          id: o.id, cliente: o.cliente?.nome || o.cliente || "—", produto: o.produto || "—",
          prazo: o.data_entrega || o.prazo || "—", responsavel: o.responsavel_acabamento || "",
          servicos: servicos.reduce((acc, s) => ({ ...acc, [s.id]: acMap[s.id] || "pendente" }), {}),
        };
      }));
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const toggleServico = (opId, servId) => {
    setOrdens(prev => prev.map(o => {
      if (o.id !== opId) return o;
      const atual = o.servicos[servId];
      const idx = processoOptions.indexOf(atual);
      const next = processoOptions[(idx + 1) % processoOptions.length];
      return { ...o, servicos: { ...o.servicos, [servId]: next } };
    }));
  };

  const handleSave = async (opId) => {
    const op = ordens.find(o => o.id === opId);
    if (!op) return;
    try {
      await salvarAcabamento(opId, op.servicos);
      addToast("Acabamento actualizado com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar acabamento", "error");
    }
  };

  const handleEdit = (op) => {
    setForm({ op: op.id, cliente: op.cliente, produto: op.produto, prazo: op.prazo, responsavel: op.responsavel });
    setServicosForm({ ...op.servicos });
    setSelected(op.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await salvarAcabamento(form.op, servicosForm);
      setOrdens(prev => prev.map(o => o.id === form.op ? { ...o, servicos: { ...servicosForm }, responsavel: form.responsavel } : o));
      setModalOpen(false);
      addToast("Acabamento actualizado com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar acabamento", "error");
    }
  };

  const filtrados = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...ordens];
    if (estadoFiltro !== "todos") res = res.filter((o) => estadoOrdem(o) === estadoFiltro);
    if (termo) {
      const cfg = CAMPOS.find((c) => c.value === filtro.campo) || CAMPOS[0];
      res = res.filter((o) => {
        const alvo = String(cfg.obter(o) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    return res;
  }, [ordens, filtro, estadoFiltro]);

  const pag = usePaginacao({ items: filtrados });

  const contagemEstado = (v) => v === "todos" ? ordens.length : ordens.filter((o) => estadoOrdem(o) === v).length;

  if (loading) return <CardSkeleton lines={6} />;
  if (error) return <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center font-semibold">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <h1 className="text-base font-normal text-foreground">Acabamento</h1>
        <p className="mt-1 text-xs text-muted-foreground">Acompanhamento dos serviços de acabamento</p>
      </div>

      <Ledger rotulo="Acabamento ledger">
        <LedgerHeader
          titulo="Acabamento"
          subtitulo={`${filtrados.length} de ${ordens.length} ordens`}
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
            placeholder="Pesquisar ordens por OP, cliente, produto, responsável..."
          />
        )}

        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
          {ESTADOS.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => setEstadoFiltro(e.value)}
              aria-pressed={estadoFiltro === e.value}
              className={`${pillBase} ${estadoFiltro === e.value ? pillAtiva : pillInativa}`}
            >
              {e.label}
              <span className="text-[11px] text-muted-foreground">{contagemEstado(e.value)}</span>
            </button>
          ))}
        </div>

        <LedgerTable>
          <thead>
            <tr className="border-b border-border">
              <LedgerTh>Ordem</LedgerTh>
              <LedgerTh>Estado</LedgerTh>
              <LedgerTh>Responsável</LedgerTh>
              <LedgerTh>Prazo</LedgerTh>
            </tr>
          </thead>
          <tbody>
            {pag.visiveis.map((op) => {
              const est = estadoMeta[estadoOrdem(op)];
              return (
                <Fragment key={op.id}>
                  <LedgerTr onClick={() => setSelected(selected === op.id ? null : op.id)}>
                    <LedgerTd className="max-w-56">
                      <IdCell id={op.id} meta={`${op.cliente} — ${op.produto}`} />
                    </LedgerTd>
                    <LedgerTd>
                      <StatusBadge tom={est.tom}>{est.label}</StatusBadge>
                    </LedgerTd>
                    <LedgerTd className="text-muted-foreground">{op.responsavel || "—"}</LedgerTd>
                    <LedgerTd className="whitespace-nowrap text-muted-foreground">{op.prazo}</LedgerTd>
                  </LedgerTr>

                  {selected === op.id && (
                    <LedgerTr>
                      <LedgerTd colSpan={4} className="bg-muted/20">
                        <div className="py-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
                            {servicos.map((s) => {
                              const val = op.servicos[s.id];
                              return (
                                <button key={s.id} type="button" onClick={() => toggleServico(op.id, s.id)}
                                  className={`p-3 rounded-lg border text-center transition-colors ${
                                    val === "concluido" ? "border-success/30 bg-success/10 text-success" :
                                    val === "em_execucao" ? "border-warning/30 bg-warning/10 text-warning" :
                                    "border-border bg-muted/50 text-muted-foreground"
                                  }`}>
                                  <Icon name={s.icon} className="text-lg block mb-1 mx-auto" />
                                  <span className="block text-[11px] font-medium">{s.label}</span>
                                  <span className="block text-[11px] mt-0.5 opacity-70">{processoLabels[val]}</span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSave(op.id)}>Guardar</Button>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(op)}><Icon name="edit" className="text-sm" /> Editar Tudo</Button>
                          </div>
                        </div>
                      </LedgerTd>
                    </LedgerTr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </LedgerTable>

        {pag.total === 0 && (
          <LedgerEmpty icone="handyman">Nenhuma ordem de acabamento encontrada</LedgerEmpty>
        )}

        <Paginacao {...pag} label="ordens" />
      </Ledger>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Editar Acabamento" icon="handyman" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" form="form-acabamento">Guardar</Button></>}>
        <form id="form-acabamento" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">OP</label>
              <input value={form.op} disabled className="w-full px-3 py-2.5 bg-muted border border-input rounded-xl text-xs text-foreground" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Responsável</label>
              <input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className={inputCls} placeholder="Nome do responsável" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {servicos.map((s) => {
              const val = servicosForm[s.id];
              return (
                <button key={s.id} type="button" onClick={() => {
                  const idx = processoOptions.indexOf(val);
                  const next = processoOptions[(idx + 1) % processoOptions.length];
                  setServicosForm(prev => ({ ...prev, [s.id]: next }));
                }}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    val === "concluido" ? "border-success/30 bg-success/10 text-success" :
                    val === "em_execucao" ? "border-warning/30 bg-warning/10 text-warning" :
                    "border-border bg-background text-muted-foreground"
                  }`}>
                  <Icon name={s.icon} className="text-lg block mb-1 mx-auto" />
                  <span className="text-[11px] block">{s.label}</span>
                  <StatusBadge tom={processoVariants[val]} className="mt-1">{processoLabels[val]}</StatusBadge>
                </button>
              );
            })}
          </div>
        </form>
      </Modal>
    </div>
  );
}
