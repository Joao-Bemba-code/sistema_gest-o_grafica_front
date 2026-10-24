"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { ListSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import {
  Ledger,
  LedgerHeader,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import { listarOrdens } from "@/services/producao";

const FILTRO_VAZIO = { responsavel: "", cliente: "", periodo: "" };

const PERIODOS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "", label: "Todo o período" },
];

const META_ESTADO = {
  atrasado: { rotulo: "Atrasado", tom: "error" },
  curso: { rotulo: "Em curso", tom: "info" },
  aguarda: { rotulo: "Aguarda cliente", tom: "warning" },
  concluido: { rotulo: "Concluído", tom: "success" },
  parado: { rotulo: "Sem movimento", tom: "neutral" },
};

const PESO_ESTADO = { atrasado: 0, curso: 1, aguarda: 2, parado: 3, concluido: 4 };

const ESTADO_PROPOSTA = {
  pendente: "em aberto",
  aprovado: "aprovada",
  rejeitado: "recusada",
  cancelado: "anulada",
};

const ESTADO_OP = {
  aguardando: "por iniciar",
  em_producao: "em produção",
  finalizado: "concluída",
  entregue: "entregue",
};

const ESTADO_FATURA = {
  emitida: "emitida",
  paga: "paga",
  parcial: "parcial",
  vencida: "vencida",
  cancelada: "anulada",
};

const SEM_RESPONSAVEL = "__sem__";

function formatData(v) {
  if (!v) return "—";
  const texto = String(v).slice(0, 10);
  const [ano, mes, dia] = texto.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT");
}

function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hojeISO() {
  return isoLocal(new Date());
}

// Soma dias a uma data "AAAA-MM-DD" mantendo o fuso local (toISOString em
// Angola cairia para o dia anterior).
function somarDias(iso, dias) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return isoLocal(d);
}

// Normaliza qualquer data (DATEONLY, ISO ou timestamp) para "AAAA-MM-DD",
// que compara e ordena corretamente como texto.
function dataDe(...valores) {
  for (const v of valores) {
    if (!v) continue;
    const texto = String(v).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function quandoDe(doc) {
  return doc.createdAt || doc.data_emissao || doc.data || doc.updatedAt || null;
}

function menor(...listas) {
  const valores = listas.flat().filter(Boolean).sort();
  return valores[0] || null;
}

// A validade de uma proposta é guardada em dias a contar da emissão.
function validadeDe(o) {
  const inicio = dataDe(o.data_emissao, o.data, o.createdAt);
  if (!inicio) return null;
  return somarDias(inicio, Number(o.validade) || 30);
}

function chaveCliente(doc) {
  const id = doc.cliente_id ?? doc.cliente?.id;
  if (id) return String(id);
  return doc.cliente?.empresa || doc.cliente?.nome || "";
}

function responsavelDe(orcs) {
  const comResponsavel = [...orcs]
    .filter((o) => o.responsavel)
    .sort((a, b) => new Date(quandoDe(b) || 0) - new Date(quandoDe(a) || 0));
  return comResponsavel[0]?.responsavel || "";
}

/**
 * Resume um cliente numa linha de acompanhamento: o que aconteceu por último,
 * qual é a próxima acção e até quando. As regras seguem a prioridade do dia a
 * dia comercial — dinheiro vencido primeiro, atrasos de produção, propostas
 * paradas e só depois o trabalho que está a andar.
 */
function analisarCliente(registo, orcs, fats, ordens, hoje) {
  const vencimento = (f) => dataDe(f.data_vencimento, f.dataVencimento);
  const dataEntrega = (op) => dataDe(op.data_entrega, op.dataEntrega);
  const entregue = (op) => op.estado === "entregue" || op.entrega_ok;

  const propostasAbertas = orcs.filter((o) => o.estado === "pendente");
  const propostasExpiradas = propostasAbertas.filter((o) => {
    const v = validadeDe(o);
    return v && v < hoje;
  });
  const faturasAbertas = fats.filter((f) => !["paga", "cancelada"].includes(f.estado));
  const faturasVencidas = faturasAbertas.filter((f) => {
    const v = vencimento(f);
    return v && v < hoje;
  });
  const opsAbertas = ordens.filter((op) => !entregue(op) && op.estado !== "finalizado");
  const opsAtrasadas = opsAbertas.filter((op) => {
    const d = dataEntrega(op);
    return d && d < hoje;
  });
  const opsProducao = ordens.filter((op) => op.estado === "em_producao" || op.estado === "aguardando");
  const opsFinalizadas = ordens.filter((op) => op.estado === "finalizado");
  const aprovadasSemOp = orcs.filter(
    (o) =>
      o.estado === "aprovado" &&
      !o.ordem_producao &&
      !ordens.some((op) => op.orcamento_id && Number(op.orcamento_id) === Number(o.id))
  );

  let accao;
  if (faturasVencidas.length) {
    accao = { accao: "Cobrar fatura", estado: "atrasado", pendente: true, prazo: menor(faturasVencidas.map(vencimento)) };
  } else if (opsAtrasadas.length) {
    accao = { accao: "Resolver atraso", estado: "atrasado", pendente: true, prazo: menor(opsAtrasadas.map(dataEntrega)) };
  } else if (propostasExpiradas.length) {
    accao = { accao: "Rever proposta", estado: "atrasado", pendente: true, prazo: menor(propostasExpiradas.map(validadeDe)) };
  } else if (aprovadasSemOp.length) {
    accao = { accao: "Criar encomenda", estado: "curso", pendente: true, prazo: null };
  } else if (opsProducao.length) {
    accao = { accao: "Acompanhar produção", estado: "curso", pendente: true, prazo: menor(opsProducao.map(dataEntrega)) };
  } else if (opsFinalizadas.length) {
    accao = { accao: "Agendar entrega", estado: "curso", pendente: true, prazo: menor(opsFinalizadas.map(dataEntrega)) };
  } else if (faturasAbertas.length) {
    accao = { accao: "Acompanhar cobrança", estado: "curso", pendente: true, prazo: menor(faturasAbertas.map(vencimento)) };
  } else if (propostasAbertas.length) {
    accao = { accao: "Aguarda cliente", estado: "aguarda", pendente: false, prazo: menor(propostasAbertas.map(validadeDe)) };
  } else if (orcs.length || fats.length || ordens.length) {
    accao = { accao: "Sem acção", estado: "concluido", pendente: false, prazo: null };
  } else {
    accao = { accao: "Sem movimento", estado: "parado", pendente: false, prazo: null };
  }

  const eventos = [
    ...orcs.map((o) => ({
      quando: quandoDe(o),
      texto: `Proposta ${o.numero || o.id} ${ESTADO_PROPOSTA[o.estado] || o.estado || "registada"}`,
      doc: { tipo: "orcamento", valor: o },
    })),
    ...fats.map((f) => ({
      quando: quandoDe(f),
      texto: `Fatura ${f.numero || f.id} ${ESTADO_FATURA[f.estado] || f.estado || "emitida"}`,
      doc: { tipo: "fatura", valor: f },
    })),
    ...ordens.map((op) => ({
      quando: quandoDe(op),
      texto: `OP ${op.numero || op.id} ${ESTADO_OP[op.estado] || op.estado || ""}`.trim(),
      doc: { tipo: "ordem", valor: op },
    })),
  ].filter((e) => e.quando);

  eventos.sort((a, b) => new Date(b.quando) - new Date(a.quando));
  const recente = eventos[0] || null;

  return {
    ...registo,
    atividade: recente?.texto || "Sem actividade registada",
    atividadeData: recente ? dataDe(recente.quando) : null,
    doc: recente?.doc || null,
    responsavel: responsavelDe(orcs),
    propostasAbertas: propostasAbertas.length,
    ...accao,
  };
}

export default function AcompanhamentoTab({ orcamentos = [], faturas = [], onAbrirOrcamento, onAbrirFatura }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rascunho, setRascunho] = useState(FILTRO_VAZIO);
  const [aplicado, setAplicado] = useState(FILTRO_VAZIO);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await listarOrdens();
        if (ativo) setOrdens(Array.isArray(dados) ? dados : dados?.data ?? []);
      } catch (err) {
        if (ativo) addToast(err.response?.data?.erro || "Erro ao carregar o acompanhamento", "error");
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [addToast]);

  // Registo de clientes construído a partir dos próprios documentos: assim o
  // acompanhamento mostra exactamente quem tem movimento, sem depender de uma
  // listagem de clientes separada.
  const base = useMemo(() => {
    const hoje = hojeISO();
    const registos = new Map();
    const juntar = (doc) => {
      const chave = chaveCliente(doc);
      if (!chave) return;
      if (!registos.has(chave)) {
        registos.set(chave, {
          chave,
          nome: doc.cliente?.nome || "",
          empresa: doc.cliente?.empresa || "",
        });
      }
    };
    orcamentos.forEach(juntar);
    faturas.forEach(juntar);
    ordens.forEach(juntar);

    return Array.from(registos.values())
      .map((registo) => {
        const doCliente = (lista) => lista.filter((doc) => chaveCliente(doc) === registo.chave);
        return analisarCliente(
          registo,
          doCliente(orcamentos),
          doCliente(faturas),
          doCliente(ordens),
          hoje
        );
      })
      .sort((a, b) => {
        const pa = PESO_ESTADO[a.estado] ?? 9;
        const pb = PESO_ESTADO[b.estado] ?? 9;
        if (pa !== pb) return pa - pb;
        const prazo = String(a.prazo || "9999-12-31").localeCompare(String(b.prazo || "9999-12-31"));
        if (prazo !== 0) return prazo;
        return (a.empresa || a.nome).localeCompare(b.empresa || b.nome, "pt");
      });
  }, [orcamentos, faturas, ordens]);

  const responsaveis = useMemo(() => {
    const nomes = new Set();
    let semResponsavel = false;
    for (const l of base) {
      if (l.responsavel) nomes.add(l.responsavel);
      else semResponsavel = true;
    }
    const opcoes = Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt")).map((n) => ({ value: n, label: n }));
    return semResponsavel ? [...opcoes, { value: SEM_RESPONSAVEL, label: "Sem responsável" }] : opcoes;
  }, [base]);

  const clientes = useMemo(
    () =>
      base
        .map((l) => ({ value: l.chave, label: l.empresa || l.nome || `Cliente ${l.chave}` }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt")),
    [base]
  );

  const filtrados = useMemo(() => {
    const limite = aplicado.periodo ? somarDias(hojeISO(), -Number(aplicado.periodo)) : null;
    return base.filter((l) => {
      if (aplicado.cliente && l.chave !== aplicado.cliente) return false;
      if (aplicado.responsavel === SEM_RESPONSAVEL && l.responsavel) return false;
      if (aplicado.responsavel && aplicado.responsavel !== SEM_RESPONSAVEL && l.responsavel !== aplicado.responsavel) return false;
      if (limite && (!l.atividadeData || l.atividadeData < limite)) return false;
      return true;
    });
  }, [base, aplicado]);

  const resumo = useMemo(
    () => ({
      acoes: filtrados.filter((l) => l.pendente).length,
      propostas: filtrados.reduce((s, l) => s + l.propostasAbertas, 0),
      atrasos: filtrados.filter((l) => l.estado === "atrasado").length,
    }),
    [filtrados]
  );

  const pag = usePaginacao({ items: filtrados, tamanhoInicial: 10 });

  const temFiltro = Boolean(aplicado.responsavel || aplicado.cliente || aplicado.periodo);
  const aplicar = () => setAplicado({ ...rascunho });
  const limpar = () => {
    setRascunho(FILTRO_VAZIO);
    setAplicado(FILTRO_VAZIO);
  };

  const abrir = (l) => {
    if (!l.doc) return;
    if (l.doc.tipo === "orcamento") onAbrirOrcamento?.(l.doc.valor);
    else if (l.doc.tipo === "fatura") onAbrirFatura?.(l.doc.valor);
    else router.push("/producao");
  };

  const campoCls =
    "h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/25";

  const kpis = [
    { label: "Acções pendentes", valor: resumo.acoes, icone: "pending_actions", tom: "bg-warning/10 text-warning" },
    { label: "Propostas abertas", valor: resumo.propostas, icone: "description", tom: "bg-primary/10 text-primary" },
    { label: "Atrasos", valor: resumo.atrasos, icone: "warning", tom: "bg-error/10 text-error" },
  ];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-3" aria-label="Resumo do acompanhamento">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${k.tom}`}>
              <Icon name={k.icone} className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-black leading-tight tracking-tight text-foreground tabular-nums">{k.valor}</p>
            </div>
          </div>
        ))}
      </section>

      <Ledger rotulo="Acompanhamento">
        <LedgerHeader
          titulo="Acompanhamento"
          subtitulo={`${filtrados.length} clientes em acompanhamento · ${resumo.acoes} acções pendentes · ${resumo.atrasos} atrasos`}
        />

        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Filtros</p>
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex min-w-40 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Responsável</span>
              <select
                value={rascunho.responsavel}
                onChange={(e) => setRascunho((f) => ({ ...f, responsavel: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {responsaveis.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-40 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</span>
              <select
                value={rascunho.cliente}
                onChange={(e) => setRascunho((f) => ({ ...f, cliente: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {clientes.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-40 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Período</span>
              <select
                value={rascunho.periodo}
                onChange={(e) => setRascunho((f) => ({ ...f, periodo: e.target.value }))}
                className={campoCls}
              >
                {PERIODOS.map((p) => (
                  <option key={p.value || "todos"} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={aplicar}
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.98]"
            >
              Aplicar
            </button>
            {temFiltro && (
              <button
                type="button"
                onClick={limpar}
                className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
              >
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
                  <LedgerTh>Cliente</LedgerTh>
                  <LedgerTh>Actividade</LedgerTh>
                  <LedgerTh>Próxima acção</LedgerTh>
                  <LedgerTh>Prazo</LedgerTh>
                  <LedgerTh>Estado</LedgerTh>
                </tr>
              </thead>
              <tbody>
                {pag.visiveis.map((l) => {
                  const meta = META_ESTADO[l.estado] || META_ESTADO.parado;
                  const atrasado = l.estado === "atrasado";
                  return (
                    <LedgerTr key={l.chave} onClick={l.doc ? () => abrir(l) : undefined}>
                      <LedgerTd className="max-w-48">
                        <span className="block truncate text-sm font-medium">{l.empresa || l.nome || "Sem cliente"}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {l.empresa && l.nome ? l.nome : l.responsavel || "Sem responsável"}
                        </span>
                      </LedgerTd>
                      <LedgerTd className="max-w-56">
                        <span className="block truncate text-sm">{l.atividade}</span>
                        <span className="block truncate text-xs text-muted-foreground">{formatData(l.atividadeData)}</span>
                      </LedgerTd>
                      <LedgerTd className={atrasado ? "text-error" : "text-foreground"}>
                        <span className={`block truncate text-sm ${atrasado ? "font-semibold" : ""}`}>{l.accao}</span>
                      </LedgerTd>
                      <LedgerTd className={`whitespace-nowrap tabular-nums ${atrasado ? "font-semibold text-error" : "text-muted-foreground"}`}>
                        {formatData(l.prazo)}
                      </LedgerTd>
                      <LedgerTd>
                        <StatusBadge tom={meta.tom}>{meta.rotulo}</StatusBadge>
                      </LedgerTd>
                    </LedgerTr>
                  );
                })}
              </tbody>
            </LedgerTable>

            {filtrados.length === 0 && (
              <LedgerEmpty icone="history">
                {base.length === 0
                  ? "Ainda não há movimento comercial para acompanhar"
                  : "Nenhum cliente corresponde aos filtros escolhidos"}
              </LedgerEmpty>
            )}

            <Paginacao {...pag} label="clientes" />
          </>
        )}
      </Ledger>
    </div>
  );
}
