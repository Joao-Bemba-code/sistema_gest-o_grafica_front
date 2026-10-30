"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { ListSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import {
  Ledger,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import { listarOrdens } from "@/services/producao";
import gerarGuiaEntregaPdf from "@/lib/entregasPdf";

const FATURA = {
  paga: { label: "Paga", tom: "success" },
  emitida: { label: "Emitida", tom: "info" },
  parcial: { label: "Parcial", tom: "warning" },
  vencida: { label: "Vencida", tom: "error" },
  cancelada: { label: "Anulada", tom: "neutral" },
};

const META_ENTREGA = {
  preparar: { rotulo: "Por preparar", tom: "warning" },
  transito: { rotulo: "Em trânsito", tom: "info" },
  entregue: { rotulo: "Entregue", tom: "success" },
};

const OPCOES_ESTADO_ENTREGA = [
  { value: "preparar", label: "Por preparar" },
  { value: "transito", label: "Em trânsito" },
  { value: "entregue", label: "Entregue" },
];

const FILTRO_ENTREGA_VAZIO = { encomenda: "", destino: "", estado: "" };

const PESO_ENTREGA = { atrasada: 0, hoje: 1, por_entregar: 2, entregue: 3 };

function formatData(v) {
  if (!v) return "—";
  const texto = String(v).slice(0, 10);
  const [ano, mes, dia] = texto.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT");
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function situacaoEntrega(op) {
  const entregue = op.estado === "entregue" || op.entrega_ok;
  const data = String(op.data_entrega || op.dataEntrega || "").slice(0, 10);
  if (entregue) return { chave: "entregue", data };
  if (data && data < hojeISO()) return { chave: "atrasada", data };
  if (data === hojeISO()) return { chave: "hoje", data };
  return { chave: "por_entregar", data };
}

// Por preparar (ainda em produção) → em trânsito (produção concluída, a
// caminho do cliente) → entregue.
function estadoEntrega(o) {
  if (o.estado === "entregue" || o.entrega_ok) return "entregue";
  if (o.estado === "finalizado") return "transito";
  return "preparar";
}

function destinoDe(o) {
  return o.cliente?.endereco || o.cliente?.empresa || o.cliente?.nome || "";
}

export default function EntregasTab({ faturas = [], mesFiltro = null, onVerFatura, empresa = {} }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState(FILTRO_ENTREGA_VAZIO);
  const [gerandoId, setGerandoId] = useState(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await listarOrdens();
        if (ativo) setOrdens(Array.isArray(dados) ? dados : dados?.data ?? []);
      } catch (err) {
        if (ativo) addToast(err.response?.data?.erro || "Erro ao carregar as entregas", "error");
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [addToast]);

  const faturasPorOrdem = useMemo(() => {
    const mapa = new Map();
    (faturas || []).forEach((f) => {
      const opId = f.ordem_producao_id || f.ordem_producao?.id;
      if (!opId) return;
      const chave = String(opId);
      const atual = mapa.get(chave);
      if (!atual) {
        mapa.set(chave, f);
        return;
      }
      const atualAnulada = atual.estado === "cancelada";
      const novaAnulada = f.estado === "cancelada";
      if (atualAnulada && !novaAnulada) mapa.set(chave, f);
      else if (!atualAnulada && !novaAnulada && Number(f.id) > Number(atual.id)) mapa.set(chave, f);
    });
    return mapa;
  }, [faturas]);

  const chaveMes = mesFiltro
    ? `${mesFiltro.getFullYear()}-${String(mesFiltro.getMonth() + 1).padStart(2, "0")}`
    : null;

  const base = useMemo(() => {
    return (ordens || [])
      .filter((o) => {
        if (!chaveMes) return true;
        return String(o.data_entrega || o.createdAt || "").slice(0, 7) === chaveMes;
      })
      .map((o) => ({
        ...o,
        _entrega: situacaoEntrega(o),
        _fatura: faturasPorOrdem.get(String(o.id)) || null,
      }))
      .sort((a, b) => {
        const pa = PESO_ENTREGA[a._entrega.chave] ?? 9;
        const pb = PESO_ENTREGA[b._entrega.chave] ?? 9;
        if (pa !== pb) return pa - pb;
        return String(a._entrega.data || "9999-12-31").localeCompare(String(b._entrega.data || "9999-12-31"));
      });
  }, [ordens, chaveMes, faturasPorOrdem]);

  const encomendas = useMemo(() => {
    const mapa = new Map();
    for (const o of base) {
      const chave = String(o.id);
      const nome = o.numero || `OP #${o.id}`;
      if (!mapa.has(chave)) mapa.set(chave, nome);
    }
    return Array.from(mapa, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, "pt")
    );
  }, [base]);

  const destinos = useMemo(() => {
    const nomes = new Set();
    for (const o of base) {
      const destino = destinoDe(o);
      if (destino) nomes.add(destino);
    }
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt"));
  }, [base]);

  const entregasFiltradas = useMemo(
    () =>
      base.filter((o) => {
        if (filtro.encomenda && String(o.id) !== filtro.encomenda) return false;
        if (filtro.destino && destinoDe(o) !== filtro.destino) return false;
        if (filtro.estado && estadoEntrega(o) !== filtro.estado) return false;
        return true;
      }),
    [base, filtro]
  );

  const contagem = useMemo(() => {
    const total = { preparar: 0, transito: 0, entregue: 0 };
    for (const o of entregasFiltradas) total[estadoEntrega(o)] += 1;
    return total;
  }, [entregasFiltradas]);

  const pag = usePaginacao({ items: entregasFiltradas, tamanhoInicial: 10 });

  const temFiltro = Boolean(filtro.encomenda || filtro.destino || filtro.estado);
  const limpar = () => setFiltro(FILTRO_ENTREGA_VAZIO);

  const campoCls =
    "h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/25";

  const baixarGuia = async (o) => {
    if (gerandoId) return;
    setGerandoId(o.id);
    try {
      await gerarGuiaEntregaPdf(o, empresa || {}, o._fatura || null);
    } catch (err) {
      addToast(err?.message || "Erro ao gerar a guia de entrega", "error");
    } finally {
      setGerandoId(null);
    }
  };

  const kpis = [
    { label: "Por preparar", valor: contagem.preparar, icone: "hourglass_top", tom: "bg-warning/10 text-warning" },
    { label: "Em trânsito", valor: contagem.transito, icone: "local_shipping", tom: "bg-info/10 text-info" },
    { label: "Entregues", valor: contagem.entregue, icone: "task_alt", tom: "bg-success/10 text-success" },
  ];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-3" aria-label="Resumo das entregas">
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

      <Ledger rotulo="Entregas">
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Filtros</p>
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex min-w-40 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Encomenda</span>
              <select
                value={filtro.encomenda}
                onChange={(e) => setFiltro((f) => ({ ...f, encomenda: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todas</option>
                {encomendas.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-40 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Destino</span>
              <select
                value={filtro.destino}
                onChange={(e) => setFiltro((f) => ({ ...f, destino: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {destinos.map((destino) => (
                  <option key={destino} value={destino}>{destino}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-36 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Estado</span>
              <select
                value={filtro.estado}
                onChange={(e) => setFiltro((f) => ({ ...f, estado: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {OPCOES_ESTADO_ENTREGA.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </label>

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
                  <LedgerTh>Guia</LedgerTh>
                  <LedgerTh>Encomenda</LedgerTh>
                  <LedgerTh>Destino</LedgerTh>
                  <LedgerTh>Data</LedgerTh>
                  <LedgerTh>Estado</LedgerTh>
                  <LedgerTh>Ficha</LedgerTh>
                </tr>
              </thead>
              <tbody>
                {pag.visiveis.map((o) => {
                  const estado = META_ENTREGA[estadoEntrega(o)];
                  const fat = o._fatura;
                  const cliente = o.cliente?.empresa || o.cliente?.nome || "";
                  return (
                    <LedgerTr key={o.id}>
                      <LedgerTd className="max-w-44">
                        {fat ? (
                          <IdCell
                            id={fat.numero || `#${fat.id}`}
                            meta={FATURA[fat.estado]?.label || fat.estado || "Documento"}
                            aoAbrir={() => onVerFatura?.(fat)}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem guia</span>
                        )}
                      </LedgerTd>
                      <LedgerTd className="max-w-44">
                        <IdCell
                          id={o.numero || `OP #${o.id}`}
                          meta={o.orcamento?.numero || o.produto || "—"}
                          aoAbrir={() => router.push("/producao")}
                        />
                      </LedgerTd>
                      <LedgerTd className="max-w-56">
                        <span className="block truncate text-sm">{destinoDe(o) || "—"}</span>
                        {o.cliente?.endereco && cliente && (
                          <span className="block truncate text-xs text-muted-foreground">{cliente}</span>
                        )}
                      </LedgerTd>
                      <LedgerTd className="whitespace-nowrap text-muted-foreground">{formatData(o.data_entrega)}</LedgerTd>
                      <LedgerTd>
                        <StatusBadge tom={estado.tom}>{estado.rotulo}</StatusBadge>
                      </LedgerTd>
                      <LedgerTd>
                        <button
                          type="button"
                          onClick={() => baixarGuia(o)}
                          disabled={gerandoId === o.id}
                          aria-label={`Ficha de entrega ${o.numero || `OP #${o.id}`}`}
                          title="Ficha de entrega (PDF)"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
                        >
                          <Icon name="picture_as_pdf" className="text-sm" />
                        </button>
                      </LedgerTd>
                    </LedgerTr>
                  );
                })}
              </tbody>
            </LedgerTable>

            {entregasFiltradas.length === 0 && (
              <LedgerEmpty icone="local_shipping">
                {ordens.length === 0
                  ? "Ainda não há ordens de produção"
                  : "Nenhuma entrega corresponde aos filtros escolhidos"}
              </LedgerEmpty>
            )}

            <Paginacao {...pag} label="entregas" />
          </>
        )}
      </Ledger>
    </div>
  );
}
