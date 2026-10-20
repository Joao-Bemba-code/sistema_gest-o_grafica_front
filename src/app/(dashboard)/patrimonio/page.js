"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import RowMenu from "@/components/ui/RowMenu";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CardSkeleton } from "@/components/Skeleton";
import { Button } from "@/components/ui/Button";
import {
  Ledger,
  LedgerHeader,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import { useToast } from "@/components/Toast";
import {
  listar as listarBens,
  criar as criarBem,
  atualizar as atualizarBem,
  remover as removerBem,
} from "@/services/bens";
import { formatKz, toNum, inputCls } from "@/lib/estoque";
import { podeAtual } from "@/lib/permissoes";

const ESTADOS = {
  ativo: { label: "Em uso", tom: "neutral", badge: "bg-emerald-50 text-emerald-600" },
  manutencao: { label: "Em manutenção", tom: "neutral", badge: "bg-red-50 text-red-600" },
  avariado: { label: "Avariado", tom: "neutral", badge: "bg-amber-50 text-amber-700" },
  abate: { label: "Abatido", tom: "neutral", badge: "bg-slate-100 text-slate-600" },
};

const OPCOES_ESTADO = [
  { valor: "ativo", label: "Em uso" },
  { valor: "manutencao", label: "Em manutenção" },
  { valor: "avariado", label: "Avariado" },
  { valor: "abate", label: "Abatido" },
];

const CATEGORIAS_PADRAO = [
  "Maquinaria e Equipamento Industrial",
  "Equipamentos Informáticos",
  "Equipamento Administrativo",
  "Logística e Movimentação",
  "Ferramentas e Instrumentais",
  "Segurança e Proteção",
  "Instalações e Benfeitorias",
  "Comunicação",
  "Activos Intangíveis",
  "Outros Activos",
];

const CATEGORIA_ICONE = {
  equipamentos: "precision_manufacturing",
  equipamento: "precision_manufacturing",
  mobiliario: "chair",
  "mobiliário": "chair",
  ferramentas: "handyman",
  ferramenta: "handyman",
  veiculos: "local_shipping",
  "veículos": "local_shipping",
  "maquinaria e equipamento industrial": "precision_manufacturing",
  "equipamentos informáticos": "devices",
  "equipamento administrativo": "chair",
  "logística e movimentação": "local_shipping",
  "ferramentas e instrumentais": "handyman",
  "segurança e proteção": "shield",
  "instalações e benfeitorias": "apartment",
  "comunicação": "chat",
  "activos intangíveis": "bolt",
  "outros activos": "category",
};

// Vida útil estimada usada no cálculo da depreciação (método linear).
const VIDA_UTIL_ANOS = 5;

const tabClsBase =
  "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-2 text-sm font-medium transition-colors";
const tabClsAtiva = "border-blue-600 font-bold text-blue-600";
const tabClsInativa = "border-transparent text-muted-foreground hover:text-foreground";

function tituloCategoria(c) {
  const s = String(c || "").trim();
  if (!s) return "Sem categoria";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function iconeCategoria(c) {
  const k = String(c || "").trim().toLowerCase();
  return CATEGORIA_ICONE[k] || "category";
}

function anosDesde(data) {
  if (!data) return 0;
  const d = new Date(data);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

function bemParaForm(bem) {
  return {
    codigo: bem?.codigo || "",
    nome: bem?.nome || "",
    categoria: bem?.categoria || "",
    familia: bem?.familia || "",
    subfamilia: bem?.subfamilia || "",
    grupo: bem?.grupo || "",
    tipo: bem?.tipo || "",
    valor_aquisicao: bem?.valor_aquisicao ?? "",
    data_aquisicao: bem?.data_aquisicao || "",
    estado: bem?.estado || "ativo",
    localizacao: bem?.localizacao || "",
    observacoes: bem?.observacoes || "",
  };
}

function BemModal({ open, bem, categorias, familias, subfamilias, guardando, onClose, onConfirm }) {
  const [form, setForm] = useState(() => bemParaForm(bem));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submeter = (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    onConfirm({
      ...form,
      codigo: form.codigo.trim(),
      nome: form.nome.trim(),
      categoria: form.categoria.trim(),
      valor_aquisicao: toNum(form.valor_aquisicao),
      data_aquisicao: form.data_aquisicao || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={bem ? "Editar bem" : "Novo bem"}
      icon="category"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="bem-form" loading={guardando}>
            {bem ? "Guardar" : "Registar"}
          </Button>
        </>
      }
    >
      <form id="bem-form" onSubmit={submeter} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {bem ? (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Código</span>
            <input className={inputCls} value={form.codigo} disabled readOnly />
          </label>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Código</span>
            <div className="flex h-11 items-center rounded-lg border border-dashed border-border bg-muted/40 px-3 text-sm text-muted-foreground">
              Gerado automaticamente (ex.: KPAT-MEI-0001)
            </div>
          </div>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Categoria</span>
          <input list="bem-categorias" className={inputCls} value={form.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="Escreva ou escolha uma existente" />
          <datalist id="bem-categorias">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Família</span>
          <input list="bem-familias" className={inputCls} value={form.familia} onChange={(e) => set("familia", e.target.value)} placeholder="Escreva ou escolha uma existente" />
          <datalist id="bem-familias">
            {familias.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Subfamília</span>
          <input list="bem-subfamilias" className={inputCls} value={form.subfamilia} onChange={(e) => set("subfamilia", e.target.value)} placeholder="Escreva ou escolha uma existente" />
          <datalist id="bem-subfamilias">
            {subfamilias.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Grupo</span>
          <input className={inputCls} value={form.grupo} onChange={(e) => set("grupo", e.target.value)} placeholder="Ex.: Produção" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Tipo</span>
          <input className={inputCls} value={form.tipo} onChange={(e) => set("tipo", e.target.value)} placeholder="Ex.: Digital" />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] font-semibold text-muted-foreground">Descrição</span>
          <input className={inputCls} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Descrição do bem" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Valor de Aquisição (Kz)</span>
          <input type="number" min="0" step="0.01" className={inputCls} value={form.valor_aquisicao} onChange={(e) => set("valor_aquisicao", e.target.value)} placeholder="0" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Data de Aquisição</span>
          <input type="date" className={inputCls} value={form.data_aquisicao} onChange={(e) => set("data_aquisicao", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Estado</span>
          <select className={inputCls} value={form.estado} onChange={(e) => set("estado", e.target.value)}>
            {OPCOES_ESTADO.map((o) => (
              <option key={o.valor} value={o.valor}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Localização</span>
          <input className={inputCls} value={form.localizacao} onChange={(e) => set("localizacao", e.target.value)} placeholder="Ex.: Sala de impressão" />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] font-semibold text-muted-foreground">Observações</span>
          <textarea rows={3} className={inputCls} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Notas adicionais..." />
        </label>
      </form>
    </Modal>
  );
}

export default function PatrimonioPage() {
  const { addToast } = useToast();

  const [bens, setBens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [formModal, setFormModal] = useState({ open: false, bem: null, sessao: 0, aGuardar: false });
  const [remocao, setRemocao] = useState({ open: false, bem: null, aRemover: false });
  const [infoTipo, setInfoTipo] = useState("");

  const recarregar = useCallback(async () => {
    try {
      const lista = await listarBens();
      setBens(Array.isArray(lista) ? lista : []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar o património", "error");
    }
  }, [addToast]);

  useEffect(() => {
    let activo = true;
    (async () => {
      await recarregar();
      if (activo) setCarregando(false);
    })();
    return () => {
      activo = false;
    };
  }, [recarregar]);

  const podeCriar = podeAtual("patrimonio", "criar");
  const podeEditar = podeAtual("patrimonio", "editar");
  const podeEliminar = podeAtual("patrimonio", "eliminar");

  const categorias = useMemo(() => {
    const set = new Set();
    bens.forEach((b) => {
      const c = String(b.categoria || "").trim();
      if (c) set.add(c);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "pt"));
  }, [bens]);

  const familias = useMemo(() => {
    const set = new Set();
    bens.forEach((b) => {
      const f = String(b.familia || "").trim();
      if (f) set.add(f);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "pt"));
  }, [bens]);

  const subfamilias = useMemo(() => {
    const set = new Set();
    bens.forEach((b) => {
      const s = String(b.subfamilia || "").trim();
      if (s) set.add(s);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "pt"));
  }, [bens]);

  const totalValor = useMemo(() => bens.reduce((s, b) => s + toNum(b.valor_aquisicao), 0), [bens]);
  const emUso = useMemo(() => bens.filter((b) => b.estado === "ativo").length, [bens]);
  const emManutencao = useMemo(() => bens.filter((b) => b.estado === "manutencao").length, [bens]);

  const termo = busca.trim().toLowerCase();
  const filtrados = useMemo(() => {
    return bens.filter((b) => {
      if (categoriaAtiva && String(b.categoria || "").trim() !== categoriaAtiva) return false;
      if (estadoFiltro && b.estado !== estadoFiltro) return false;
      if (termo) {
        const alvo = `${b.codigo || ""} ${b.nome || ""} ${b.categoria || ""} ${b.localizacao || ""}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [bens, categoriaAtiva, estadoFiltro, termo]);

  const { visiveis, ...pag } = usePaginacao({ items: filtrados });

  const tabs = useMemo(() => {
    const padrao = CATEGORIAS_PADRAO.map((c) => ({ id: c, label: tituloCategoria(c), icon: iconeCategoria(c) }));
    const extras = categorias
      .filter((c) => !CATEGORIAS_PADRAO.includes(c))
      .map((c) => ({ id: c, label: tituloCategoria(c), icon: iconeCategoria(c) }));
    return [{ id: "", label: "Todos", icon: "category" }, ...padrao, ...extras];
  }, [categorias]);

  const kpis = useMemo(
    () => [
      { key: "total", icon: "category", label: "Total de Bens", valor: String(bens.length), icone: "bg-error/10 text-error", cor: "text-foreground" },
      { key: "valor", icon: "apartment", label: "Valor de Aquisição", valor: Math.round(totalValor).toLocaleString("pt-AO"), sufixo: "Kz", icone: "bg-blue-50 text-blue-600", cor: "text-blue-600", sufixoCor: "text-blue-600" },
      { key: "uso", icon: "verified", label: "Em Uso", valor: String(emUso), icone: "bg-emerald-50 text-emerald-600", cor: "text-emerald-600" },
      { key: "manut", icon: "build", label: "Em Manutenção", valor: String(emManutencao), icone: "bg-red-50 text-red-500", cor: "text-red-600" },
    ],
    [bens.length, totalValor, emUso, emManutencao]
  );

  const historico = useMemo(() => {
    const mapa = new Map();
    bens.forEach((b) => {
      const ano = b.data_aquisicao ? String(b.data_aquisicao).slice(0, 4) : "";
      if (!ano) return;
      const cur = mapa.get(ano) || { ano, quantidade: 0, valor: 0 };
      cur.quantidade += 1;
      cur.valor += toNum(b.valor_aquisicao);
      mapa.set(ano, cur);
    });
    return [...mapa.values()].sort((a, b) => b.ano.localeCompare(a.ano));
  }, [bens]);

  const depreciacao = useMemo(() => {
    const anual = 1 / VIDA_UTIL_ANOS;
    return bens
      .map((b) => {
        const valor = toNum(b.valor_aquisicao);
        const anos = Math.min(VIDA_UTIL_ANOS, anosDesde(b.data_aquisicao));
        const acumulada = valor * anual * anos;
        return { ...b, valor, anos, acumulada, residual: Math.max(0, valor - acumulada) };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [bens]);

  const totalResidual = useMemo(() => depreciacao.reduce((s, b) => s + b.residual, 0), [depreciacao]);

  const abrirNovo = useCallback(() => setFormModal((s) => ({ open: true, bem: null, sessao: s.sessao + 1, aGuardar: false })), []);
  const abrirEditar = useCallback((bem) => setFormModal((s) => ({ open: true, bem, sessao: s.sessao + 1, aGuardar: false })), []);

  const guardar = useCallback(
    async (dados) => {
      const bem = formModal.bem;
      setFormModal((s) => ({ ...s, aGuardar: true }));
      try {
        if (bem) {
          await atualizarBem(bem.id, dados);
          addToast("Bem atualizado com sucesso", "success");
        } else {
          await criarBem(dados);
          addToast("Bem registado com sucesso", "success");
        }
        await recarregar();
        setFormModal({ open: false, bem: null, sessao: 0, aGuardar: false });
      } catch (err) {
        addToast(err.response?.data?.erro || "Erro ao guardar o bem", "error");
        setFormModal((s) => ({ ...s, aGuardar: false }));
      }
    },
    [formModal.bem, recarregar, addToast]
  );

  const alterarEstado = useCallback(
    async (bem, estado) => {
      try {
        await atualizarBem(bem.id, { estado });
        await recarregar();
        addToast("Estado atualizado", "success");
      } catch (err) {
        addToast(err.response?.data?.erro || "Erro ao atualizar o estado", "error");
      }
    },
    [recarregar, addToast]
  );

  const confirmarRemocao = useCallback(async () => {
    if (!remocao.bem) return;
    setRemocao((s) => ({ ...s, aRemover: true }));
    try {
      await removerBem(remocao.bem.id);
      await recarregar();
      addToast("Bem removido com sucesso", "success");
      setRemocao({ open: false, bem: null, aRemover: false });
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao remover o bem", "error");
      setRemocao((s) => ({ ...s, aRemover: false }));
    }
  }, [remocao.bem, recarregar, addToast]);

  const filtrarManutencao = useCallback(() => {
    setCategoriaAtiva("");
    setEstadoFiltro("manutencao");
  }, []);

  const carregandoInicial = carregando && bens.length === 0;
  const vazio = !carregandoInicial && visiveis.length === 0;
  const temFiltro = Boolean(termo || estadoFiltro || categoriaAtiva);

  return (
    <div className="space-y-4">
      {/* Faixa do módulo - identificação património (castanho) */}
      <div className="flex items-center justify-between rounded-xl bg-[#8d5b3d] px-5 py-2.5 text-white shadow-sm">
        <span className="text-lg font-extrabold uppercase tracking-wide">8. PATRIMÓNIO</span>
        <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-amber-100 sm:block">
          Sistema Integrado de Gestão Empresarial
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Gestão Patrimonial</h1>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">equipamentos, mobiliário e manutenção.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {podeCriar && (
            <button
              type="button"
              onClick={abrirNovo}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#d9531e] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b45309]"
            >
              <Icon name="add" className="text-base" /> Novo Bem
            </button>
          )}
          <button
            type="button"
            onClick={filtrarManutencao}
            title="Mostrar bens em manutenção"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e8d5c4] bg-[#faeee5] px-4 text-sm font-semibold text-[#8d5b3d] transition-colors hover:bg-amber-100"
          >
            <Icon name="build" className="text-base" /> Manutenção
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores do património">
        {kpis.map((k) => (
          <div key={k.key} className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl ${k.icone}`}>
              <Icon name={k.icon} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">{k.label}</p>
              <p className={`text-xl font-bold leading-tight tabular-nums tracking-tight ${k.cor}`}>
                {k.valor}
                {k.sufixo && <span className={`ml-1 text-xs font-semibold ${k.sufixoCor}`}>{k.sufixo}</span>}
              </p>
            </div>
          </div>
        ))}
      </section>

      <Ledger rotulo="Património ledger">
        <LedgerHeader titulo="Bens" subtitulo={`${filtrados.length} de ${bens.length} bens`} />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border px-4">
          {tabs.map((t) => (
            <button
              key={t.id || "todos"}
              type="button"
              onClick={() => setCategoriaAtiva(t.id)}
              aria-pressed={categoriaAtiva === t.id}
              className={`${tabClsBase} ${categoriaAtiva === t.id ? tabClsAtiva : tabClsInativa}`}
            >
              <Icon name={t.icon} className="text-base" /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5">
          <select
            value={categoriaAtiva}
            onChange={(e) => setCategoriaAtiva(e.target.value)}
            aria-label="Filtrar por categoria"
            className="h-8 rounded-lg border border-border bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25 cursor-pointer"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS_PADRAO.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            {categorias
              .filter((c) => !CATEGORIAS_PADRAO.includes(c))
              .map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
          </select>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            aria-label="Filtrar por estado"
            className="h-8 rounded-lg border border-border bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25 cursor-pointer"
          >
            <option value="">Todos os estados</option>
            {OPCOES_ESTADO.map((o) => (
              <option key={o.valor} value={o.valor}>{o.label}</option>
            ))}
          </select>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por código, descrição ou localização..."
            aria-label="Pesquisar bens"
            className="h-8 min-w-0 ml-auto w-full basis-40 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/25 transition-colors sm:w-64 sm:basis-auto"
          />
          {temFiltro && (
            <button
              type="button"
              onClick={() => {
                setBusca("");
                setEstadoFiltro("");
                setCategoriaAtiva("");
              }}
              className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-foreground whitespace-nowrap transition-colors hover:bg-muted/60"
            >
              Limpar
            </button>
          )}
        </div>

        {carregandoInicial ? (
          <div className="p-4">
            <CardSkeleton lines={6} />
          </div>
        ) : (
          <>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh>Código</LedgerTh>
                  <LedgerTh>Descrição</LedgerTh>
                  <LedgerTh>Categoria</LedgerTh>
                  <LedgerTh>Estado</LedgerTh>
                  <LedgerTh className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visiveis.map((b) => {
                  const st = ESTADOS[b.estado] || ESTADOS.ativo;
                  const itens = [];
                  if (podeEditar) {
                    itens.push({ icone: "edit", rotulo: "Editar", onClick: () => abrirEditar(b) });
                    if (b.estado === "ativo") {
                      itens.push({ icone: "build", rotulo: "Marcar em manutenção", onClick: () => alterarEstado(b, "manutencao") });
                      itens.push({ icone: "warning", rotulo: "Marcar avariado", onClick: () => alterarEstado(b, "avariado") });
                    } else {
                      itens.push({ icone: "check_circle", rotulo: "Marcar em uso", onClick: () => alterarEstado(b, "ativo") });
                    }
                  }
                  if (podeEliminar) {
                    itens.push({ icone: "delete", rotulo: "Eliminar", danger: true, onClick: () => setRemocao({ open: true, bem: b, aRemover: false }) });
                  }
                  return (
                    <LedgerTr key={b.id}>
                      <LedgerTd>
                        <IdCell
                          id={b.codigo || `BEM-${b.id}`}
                          meta={b.localizacao || undefined}
                          aoAbrir={podeEditar ? () => abrirEditar(b) : undefined}
                        />
                      </LedgerTd>
                      <LedgerTd className="max-w-64">
                        <span className="block truncate">{b.nome}</span>
                      </LedgerTd>
                      <LedgerTd className="whitespace-nowrap text-muted-foreground">{b.categoria || "—"}</LedgerTd>
                      <LedgerTd>
                        <StatusBadge tom={st.tom} className={st.badge}>{st.label}</StatusBadge>
                      </LedgerTd>
                      <LedgerTd>
                        <RowMenu ariaLabel="Ações do bem" itens={itens} />
                      </LedgerTd>
                    </LedgerTr>
                  );
                })}
              </tbody>
            </LedgerTable>
            {vazio && (
              <LedgerEmpty icone="category">
                {temFiltro ? "Nenhum bem corresponde aos filtros" : "Nenhum bem patrimonial registado"}
              </LedgerEmpty>
            )}
            <Paginacao {...pag} label="bens" />
          </>
        )}
      </Ledger>

      <BemModal
        key={`bem-${formModal.sessao}`}
        open={formModal.open}
        bem={formModal.bem}
        categorias={categorias}
        familias={familias}
        subfamilias={subfamilias}
        guardando={formModal.aGuardar}
        onClose={() => setFormModal((s) => ({ ...s, open: false }))}
        onConfirm={guardar}
      />

      <ConfirmDialog
        open={remocao.open}
        onClose={() => setRemocao({ open: false, bem: null, aRemover: false })}
        onConfirm={confirmarRemocao}
        loading={remocao.aRemover}
        title="Eliminar bem"
        description={remocao.bem ? `Tem a certeza que deseja eliminar "${remocao.bem.nome}"?` : ""}
      />

      <Modal
        open={infoTipo !== ""}
        onClose={() => setInfoTipo("")}
        title={infoTipo === "depreciacao" ? "Depreciação estimada" : "Histórico de aquisições"}
        icon={infoTipo === "depreciacao" ? "calculate" : "history"}
        size="lg"
      >
        {infoTipo === "historico" ? (
          historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem aquisições com data registada.</p>
          ) : (
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh>Ano</LedgerTh>
                  <LedgerTh className="text-right">Nº de Bens</LedgerTh>
                  <LedgerTh className="text-right">Valor (Kz)</LedgerTh>
                </tr>
              </thead>
              <tbody>
                {historico.map((r) => (
                  <LedgerTr key={r.ano}>
                    <LedgerTd className="font-medium">{r.ano}</LedgerTd>
                    <LedgerTd className="text-right tabular-nums">{r.quantidade}</LedgerTd>
                    <LedgerTd className="text-right tabular-nums">{r.valor.toLocaleString("pt-AO")}</LedgerTd>
                  </LedgerTr>
                ))}
              </tbody>
            </LedgerTable>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Estimativa por método linear com vida útil de {VIDA_UTIL_ANOS} anos. Valor residual total:{" "}
              <span className="font-semibold text-foreground">{formatKz(totalResidual)}</span>.
            </p>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh>Bem</LedgerTh>
                  <LedgerTh className="text-right">Aquisição (Kz)</LedgerTh>
                  <LedgerTh className="text-right">Idade</LedgerTh>
                  <LedgerTh className="text-right">Dep. Acumulada</LedgerTh>
                  <LedgerTh className="text-right">Residual</LedgerTh>
                </tr>
              </thead>
              <tbody>
                {depreciacao.map((b) => (
                  <LedgerTr key={b.id}>
                    <LedgerTd className="max-w-48"><span className="block truncate">{b.nome}</span></LedgerTd>
                    <LedgerTd className="text-right tabular-nums">{b.valor.toLocaleString("pt-AO")}</LedgerTd>
                    <LedgerTd className="text-right tabular-nums whitespace-nowrap">{b.anos.toFixed(1)} a</LedgerTd>
                    <LedgerTd className="text-right tabular-nums text-muted-foreground">{Math.round(b.acumulada).toLocaleString("pt-AO")}</LedgerTd>
                    <LedgerTd className="text-right tabular-nums font-medium">{Math.round(b.residual).toLocaleString("pt-AO")}</LedgerTd>
                  </LedgerTr>
                ))}
              </tbody>
            </LedgerTable>
          </div>
        )}
      </Modal>
    </div>
  );
}
