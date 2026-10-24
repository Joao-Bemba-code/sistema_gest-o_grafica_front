"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import RowMenu from "@/components/ui/RowMenu";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
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
import { listarRateios } from "@/services/rateios";
import { podeAtual } from "@/lib/permissoes";
import RateioModal from "@/components/financeiro/RateioModal";

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function arredondar(v) { return Number(Number(v || 0).toFixed(2)); }

export default function CustosRateiosTab() {
  const { addToast } = useToast();
  const [dados, setDados] = useState({ movimentos: [], ordens: [] });
  const [loading, setLoading] = useState(true);
  const [termo, setTermo] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroOrdem, setFiltroOrdem] = useState("");
  const [apenasPendentes, setApenasPendentes] = useState(false);
  const [ratearItem, setRatearItem] = useState(null);

  const podeEditar = podeAtual("faturacao", "editar")
    || podeAtual("tesouraria", "editar")
    || podeAtual("financeiro", "editar");

  const carregar = async () => {
    try {
      const resposta = await listarRateios();
      setDados({
        movimentos: Array.isArray(resposta?.movimentos) ? resposta.movimentos : [],
        ordens: Array.isArray(resposta?.ordens) ? resposta.ordens : [],
      });
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar custos e rateios", "error");
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    carregar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtrados = useMemo(() => {
    const busca = termo.trim().toLowerCase();
    return (dados.movimentos || []).filter((m) => {
      if (filtroMes && String(m.data_movimento || "").slice(0, 7) !== filtroMes) return false;
      if (filtroOrdem && !(m.rateios || []).some((r) => String(r.ordem_producao_id) === String(filtroOrdem))) return false;
      if (apenasPendentes && Number(m.restante || 0) <= 0.004) return false;
      if (busca) {
        const alvo = [
          m.descricao,
          m.categoria,
          m.referencia,
          ...(m.rateios || []).map((r) => `${r.ordem?.numero || ""} ${r.ordem?.produto || ""}`),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!alvo.includes(busca)) return false;
      }
      return true;
    });
  }, [dados.movimentos, termo, filtroMes, filtroOrdem, apenasPendentes]);

  const resumo = useMemo(() => {
    let totalDespesas = 0;
    let totalRateado = 0;
    const ops = new Set();
    filtrados.forEach((m) => {
      totalDespesas += Number(m.valor || 0);
      totalRateado += Number(m.total_rateado || 0);
      (m.rateios || []).forEach((r) => ops.add(String(r.ordem_producao_id)));
    });
    return {
      totalDespesas: arredondar(totalDespesas),
      totalRateado: arredondar(totalRateado),
      totalPorRatear: arredondar(totalDespesas - totalRateado),
      ordens: ops.size,
    };
  }, [filtrados]);

  const totaisPorOrdem = useMemo(() => {
    const mapa = new Map();
    filtrados.forEach((m) => {
      (m.rateios || []).forEach((r) => {
        const chave = String(r.ordem_producao_id);
        const atual = mapa.get(chave) || {
          ordem_producao_id: r.ordem_producao_id,
          numero: r.ordem?.numero || `OP ${r.ordem_producao_id}`,
          produto: r.ordem?.produto || "",
          total: 0,
          despesas: new Set(),
        };
        atual.total = arredondar(atual.total + Number(r.valor || 0));
        atual.despesas.add(m.id);
        mapa.set(chave, atual);
      });
    });
    return [...mapa.values()]
      .map((t) => ({ ...t, despesas: t.despesas.size }))
      .sort((a, b) => b.total - a.total);
  }, [filtrados]);

  const { visiveis, ...pag } = usePaginacao({ items: filtrados, tamanhoInicial: 10 });
  const { visiveis: opsVisiveis, ...pagOps } = usePaginacao({ items: totaisPorOrdem, tamanhoInicial: 10 });

  const limparFiltros = () => {
    setTermo("");
    setFiltroMes("");
    setFiltroOrdem("");
    setApenasPendentes(false);
  };
  const temFiltros = Boolean(termo || filtroMes || filtroOrdem || apenasPendentes);

  const podeRatear = (m) => podeEditar && m.estado !== "anulado";

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-4" aria-label="Resumo de custos e rateios">
        {[
          { icon: "receipt_long", label: "Despesas no filtro", valor: formatKz(resumo.totalDespesas), icone: "bg-error/10 text-error", cor: "text-foreground" },
          { icon: "call_split", label: "Atribuído a OPs", valor: formatKz(resumo.totalRateado), icone: "bg-primary/10 text-primary", cor: "text-foreground" },
          { icon: "pending_actions", label: "Por ratear", valor: formatKz(resumo.totalPorRatear), icone: "bg-warning/10 text-warning", cor: resumo.totalPorRatear > 0 ? "text-warning" : "text-foreground" },
        ].map((k) => (
          <div key={k.label} className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl ${k.icone}`}>
              <Icon name={k.icon} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight text-muted-foreground">{k.label}</p>
              <p className={`truncate text-lg font-black leading-tight tabular-nums tracking-tight ${k.cor}`}>{k.valor}</p>
            </div>
          </div>
        ))}
      </section>

      <Ledger rotulo="Custos e rateios">
        <LedgerHeader
          titulo="Custos e Rateios"
          subtitulo={`${filtrados.length} despesas · ${resumo.ordens} ordens de produção com custo atribuído`}
        />
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5">
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Pesquisar despesa, categoria ou OP..."
            aria-label="Pesquisar despesas"
            className="h-9 min-w-0 flex-1 basis-48 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/25 sm:max-w-xs"
          />
          <input
            type="month"
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            aria-label="Filtrar por mês"
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
          <select
            value={filtroOrdem}
            onChange={(e) => setFiltroOrdem(e.target.value)}
            aria-label="Filtrar por ordem de produção"
            className="h-9 max-w-52 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <option value="">Todas as OPs</option>
            {dados.ordens.map((o) => (
              <option key={o.id} value={o.id}>OP {o.numero}{o.produto ? ` · ${o.produto}` : ""}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setApenasPendentes((v) => !v)}
            aria-pressed={apenasPendentes}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors ${
              apenasPendentes
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <Icon name="pending_actions" className="text-base" /> Só por ratear
          </button>
          {temFiltros && (
            <button type="button" onClick={limparFiltros} className="h-9 px-2 text-xs font-medium text-primary hover:underline">
              Limpar
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-4"><ListSkeleton count={6} /></div>
        ) : (
          <>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh>Data</LedgerTh>
                  <LedgerTh>Despesa</LedgerTh>
                  <LedgerTh className="text-right">Valor (Kz)</LedgerTh>
                  <LedgerTh className="text-right">Rateado</LedgerTh>
                  <LedgerTh className="text-right">Por ratear</LedgerTh>
                  <LedgerTh>Ordens de produção</LedgerTh>
                  {podeEditar && <LedgerTh className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((m) => {
                  const restante = Number(m.restante || 0);
                  return (
                    <LedgerTr key={m.id}>
                      <LedgerTd className="whitespace-nowrap text-muted-foreground">{formatData(m.data_movimento)}</LedgerTd>
                      <LedgerTd className="max-w-56">
                        <IdCell
                          id={m.descricao || "—"}
                          meta={[m.categoria, m.conta?.banco_nome, m.referencia && `Ref: ${m.referencia}`].filter(Boolean).join(" · ") || "—"}
                        />
                      </LedgerTd>
                      <LedgerTd className="text-right tabular-nums whitespace-nowrap font-semibold">{Math.round(Number(m.valor || 0)).toLocaleString("pt-AO")}</LedgerTd>
                      <LedgerTd className="text-right tabular-nums whitespace-nowrap text-primary">{Math.round(Number(m.total_rateado || 0)).toLocaleString("pt-AO")}</LedgerTd>
                      <LedgerTd className="text-right whitespace-nowrap">
                        {restante > 0.004 ? (
                          <StatusBadge tom="warning">{Math.round(restante).toLocaleString("pt-AO")} Kz</StatusBadge>
                        ) : (
                          <StatusBadge tom="success">Completo</StatusBadge>
                        )}
                      </LedgerTd>
                      <LedgerTd className="max-w-64">
                        {(m.rateios || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {m.rateios.map((r) => (
                              <span key={r.id} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                                OP {r.ordem?.numero || r.ordem_producao_id}
                                <span className="tabular-nums text-muted-foreground">{Number(r.percentagem || 0).toFixed(0)}%</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem rateio</span>
                        )}
                      </LedgerTd>
                      {podeEditar && (
                        <LedgerTd>
                          {podeRatear(m) ? (
                            <RowMenu
                              ariaLabel="Ações da despesa"
                              itens={[
                                { icone: "call_split", rotulo: (m.rateios || []).length ? "Editar rateio" : "Ratear por OP", onClick: () => setRatearItem(m) },
                              ]}
                            />
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </LedgerTd>
                      )}
                    </LedgerTr>
                  );
                })}
              </tbody>
            </LedgerTable>
            {filtrados.length === 0 && (
              <LedgerEmpty icone="call_split">
                {dados.movimentos.length === 0
                  ? "Nenhuma despesa registada na tesouraria"
                  : "Nenhuma despesa corresponde aos filtros escolhidos"}
              </LedgerEmpty>
            )}
            <Paginacao {...pag} label="despesas" />
          </>
        )}
      </Ledger>

      <Ledger rotulo="Custo por ordem de produção">
        <LedgerHeader
          titulo="Custo por OP"
          subtitulo="Somatório das despesas atribuídas a cada ordem de produção no período filtrado"
        />
        <LedgerTable>
          <thead>
            <tr className="border-b border-border">
              <LedgerTh>Ordem de produção</LedgerTh>
              <LedgerTh>Produto</LedgerTh>
              <LedgerTh className="text-right">Despesas</LedgerTh>
              <LedgerTh className="text-right">Custo atribuído (Kz)</LedgerTh>
              <LedgerTh className="text-right">% do total</LedgerTh>
            </tr>
          </thead>
          <tbody>
            {opsVisiveis.map((t) => (
              <LedgerTr key={t.ordem_producao_id}>
                <LedgerTd className="whitespace-nowrap font-semibold text-foreground">OP {t.numero}</LedgerTd>
                <LedgerTd className="max-w-64"><span className="block truncate text-muted-foreground">{t.produto || "—"}</span></LedgerTd>
                <LedgerTd className="text-right tabular-nums text-muted-foreground">{t.despesas}</LedgerTd>
                <LedgerTd className="text-right tabular-nums whitespace-nowrap font-bold text-foreground">{t.total.toLocaleString("pt-AO")}</LedgerTd>
                <LedgerTd className="text-right tabular-nums whitespace-nowrap text-muted-foreground">
                  {resumo.totalRateado > 0 ? `${((t.total / resumo.totalRateado) * 100).toFixed(1)}%` : "—"}
                </LedgerTd>
              </LedgerTr>
            ))}
          </tbody>
        </LedgerTable>
        {totaisPorOrdem.length === 0 && (
          <LedgerEmpty icone="precision_manufacturing">Ainda não há custos atribuídos a ordens de produção</LedgerEmpty>
        )}
        <Paginacao {...pagOps} label="ordens" />
      </Ledger>

      {ratearItem && (
        <RateioModal
          movimento={ratearItem}
          ordens={dados.ordens}
          onClose={() => setRatearItem(null)}
          onSaved={carregar}
        />
      )}
    </div>
  );
}
