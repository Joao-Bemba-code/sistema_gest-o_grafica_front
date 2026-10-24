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
import { listarMovimentos, conciliarMovimentos } from "@/services/tesouraria";
import { listarContas } from "@/services/contasBancarias";
import { podeAtual } from "@/lib/permissoes";

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function rotuloConta(conta) {
  return `${conta.banco_nome}${conta.numero_conta ? ` — ${conta.numero_conta}` : ""}`;
}

function mesAtual() {
  return new Date().toISOString().slice(0, 7);
}

const tipoLabel = { entrada: "Entrada", saida: "Saída", transferencia: "Transferência" };

export default function ConciliacaoTab() {
  const { addToast } = useToast();
  const [movimentos, setMovimentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [filtroConta, setFiltroConta] = useState("");
  const [filtroMes, setFiltroMes] = useState(mesAtual());
  const [termo, setTermo] = useState("");
  const [selecionados, setSelecionados] = useState([]);

  const podeEditar = podeAtual("tesouraria", "editar");

  const carregar = async () => {
    setLoading(true);
    try {
      const [movs, cs] = await Promise.all([
        listarMovimentos(),
        listarContas().catch(() => []),
      ]);
      const listaMov = Array.isArray(movs) ? movs : movs?.data ?? movs?.movimentos ?? [];
      const listaContas = Array.isArray(cs) ? cs : [];
      setMovimentos(listaMov);
      setContas(listaContas);
      setFiltroConta((atual) => {
        if (atual) return atual;
        const ativa = listaContas.find((c) => c.ativo !== false && c.tipo_conta !== "caixa")
          || listaContas.find((c) => c.ativo !== false);
        return ativa ? String(ativa.id) : "";
      });
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar movimentos", "error");
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    carregar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const contaSelecionada = contas.find((c) => String(c.id) === String(filtroConta));

  const filtrados = useMemo(() => {
    const busca = termo.trim().toLowerCase();
    return movimentos.filter((m) => {
      if (m.estado !== "confirmado") return false;
      if (filtroConta && String(m.conta_bancaria_id) !== String(filtroConta)) return false;
      if (filtroMes && String(m.data_movimento || "").slice(0, 7) !== filtroMes) return false;
      if (busca) {
        const alvo = `${m.descricao || ""} ${m.categoria || ""} ${m.referencia || ""}`.toLowerCase();
        if (!alvo.includes(busca)) return false;
      }
      return true;
    });
  }, [movimentos, filtroConta, filtroMes, termo]);

  const resumo = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    let conciliados = 0;
    filtrados.forEach((m) => {
      const valor = Number(m.valor || 0);
      if (m.tipo === "entrada") entradas += valor;
      else if (m.tipo === "saida") saidas += valor;
      else if (m.tipo === "transferencia") {
        if (filtroConta && String(m.conta_destino_id) === String(filtroConta)) entradas += valor;
        else if (filtroConta) saidas += valor;
      }
      if (m.conciliado) conciliados += 1;
    });
    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
      conciliados,
      pendentes: filtrados.length - conciliados,
    };
  }, [filtrados, filtroConta]);

  const { visiveis, ...pag } = usePaginacao({ items: filtrados, tamanhoInicial: 10 });

  const idsFiltrados = useMemo(() => filtrados.map((m) => m.id), [filtrados]);
  const todosSelecionados = idsFiltrados.length > 0 && idsFiltrados.every((id) => selecionados.includes(id));
  const algunsSelecionados = selecionados.length > 0 && !todosSelecionados;

  const alternarTodos = () => {
    setSelecionados(todosSelecionados ? [] : idsFiltrados);
  };

  const alternarUm = (id) => {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const aplicar = async (ids, conciliado) => {
    if (!ids.length || salvando) return;
    setSalvando(true);
    try {
      await conciliarMovimentos(ids, conciliado);
      const agora = new Date().toISOString();
      setMovimentos((prev) => prev.map((m) => (
        ids.includes(m.id)
          ? { ...m, conciliado, conciliado_em: conciliado ? agora : null }
          : m
      )));
      setSelecionados((prev) => prev.filter((id) => !ids.includes(id)));
      addToast(
        conciliado
          ? `${ids.length} movimento(s) conciliado(s) com o extrato`
          : `${ids.length} movimento(s) desmarcado(s) da conciliação`,
        "success"
      );
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao conciliar movimentos", "error");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Resumo da conciliação">
        {[
          { icon: "account_balance", label: "Saldo da conta", valor: contaSelecionada ? formatKz(contaSelecionada.saldo_atual) : "—", cor: "text-foreground", icone: "bg-primary/10 text-primary" },
          { icon: "south_west", label: "Entradas no período", valor: formatKz(resumo.entradas), cor: "text-success", icone: "bg-success/10 text-success" },
          { icon: "north_east", label: "Saídas no período", valor: formatKz(resumo.saidas), cor: "text-error", icone: "bg-error/10 text-error" },
          { icon: "fact_check", label: "Por conciliar", valor: `${resumo.pendentes} de ${filtrados.length}`, cor: "text-foreground", icone: "bg-warning/10 text-warning" },
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

      <Ledger rotulo="Conciliação bancária">
        <LedgerHeader
          titulo="Conciliação bancária"
          subtitulo={`${filtrados.length} movimentos confirmados · ${resumo.conciliados} conciliados · ${resumo.pendentes} por conciliar`}
        />

        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5">
          <select
            value={filtroConta}
            onChange={(e) => { setFiltroConta(e.target.value); setSelecionados([]); }}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label="Conta a conciliar"
          >
            <option value="">Todas as contas</option>
            {contas.filter((c) => c.ativo !== false).map((c) => (
              <option key={c.id} value={c.id}>{rotuloConta(c)}</option>
            ))}
          </select>
          <input
            type="month"
            value={filtroMes}
            onChange={(e) => { setFiltroMes(e.target.value); setSelecionados([]); }}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label="Mês a conciliar"
          />
          <input
            value={termo}
            onChange={(e) => { setTermo(e.target.value); setSelecionados([]); }}
            placeholder="Pesquisar descrição, categoria ou referência..."
            aria-label="Pesquisar movimentos"
            className="h-9 min-w-0 flex-1 basis-48 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/25 sm:max-w-xs"
          />
          {termo && (
            <button type="button" onClick={() => { setTermo(""); setSelecionados([]); }} className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-foreground hover:bg-muted/60">
              Limpar
            </button>
          )}
          {(filtroMes !== mesAtual() || termo) && (
            <button type="button" onClick={() => { setFiltroMes(mesAtual()); setTermo(""); setSelecionados([]); }} className="h-9 px-2 text-xs font-medium text-primary hover:underline">
              Repor filtros
            </button>
          )}
          {podeEditar && (
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => aplicar(selecionados, true)}
                disabled={!selecionados.length || salvando}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success/15 px-3 text-sm font-semibold text-success transition-colors hover:bg-success/20 disabled:pointer-events-none disabled:opacity-50"
              >
                <Icon name="task_alt" className="text-base" /> Conciliar ({selecionados.length})
              </button>
              <button
                type="button"
                onClick={() => aplicar(selecionados, false)}
                disabled={!selecionados.length || salvando}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50"
              >
                <Icon name="undo" className="text-base" /> Desmarcar
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-4"><ListSkeleton count={6} /></div>
        ) : (
          <>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  {podeEditar && (
                    <LedgerTh className="w-10">
                      <input
                        type="checkbox"
                        checked={todosSelecionados}
                        ref={(el) => { if (el) el.indeterminate = algunsSelecionados; }}
                        onChange={alternarTodos}
                        aria-label="Selecionar todos os movimentos filtrados"
                        className="h-4 w-4 cursor-pointer accent-blue-600"
                      />
                    </LedgerTh>
                  )}
                  <LedgerTh>Data</LedgerTh>
                  <LedgerTh>Descrição</LedgerTh>
                  <LedgerTh>Conta</LedgerTh>
                  <LedgerTh>Tipo</LedgerTh>
                  <LedgerTh className="text-right">Valor (Kz)</LedgerTh>
                  <LedgerTh>Conciliação</LedgerTh>
                  {podeEditar && <LedgerTh className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((m) => {
                  const conta = contas.find((c) => String(c.id) === String(m.conta_bancaria_id));
                  const isEntrada = m.tipo === "entrada";
                  const isSaida = m.tipo === "saida";
                  return (
                    <LedgerTr key={m.id} className={selecionados.includes(m.id) ? "bg-primary/5" : undefined}>
                      {podeEditar && (
                        <LedgerTd>
                          <input
                            type="checkbox"
                            checked={selecionados.includes(m.id)}
                            onChange={() => alternarUm(m.id)}
                            aria-label={`Selecionar ${m.descricao || m.id}`}
                            className="h-4 w-4 cursor-pointer accent-blue-600"
                          />
                        </LedgerTd>
                      )}
                      <LedgerTd className="whitespace-nowrap text-muted-foreground">{formatData(m.data_movimento)}</LedgerTd>
                      <LedgerTd className="max-w-56">
                        <IdCell id={m.descricao || "—"} meta={[m.categoria, m.referencia && `Ref: ${m.referencia}`].filter(Boolean).join(" · ") || "—"} />
                      </LedgerTd>
                      <LedgerTd className="max-w-40"><span className="block truncate text-muted-foreground">{conta ? rotuloConta(conta) : "—"}</span></LedgerTd>
                      <LedgerTd className="whitespace-nowrap text-slate-700">{tipoLabel[m.tipo] || m.tipo}</LedgerTd>
                      <LedgerTd className="text-right tabular-nums whitespace-nowrap">
                        <span className={`font-bold ${isEntrada ? "text-success" : isSaida ? "text-error" : "text-foreground"}`}>
                          {m.tipo === "entrada" ? "+" : m.tipo === "saida" ? "−" : ""}{Math.round(Number(m.valor || 0)).toLocaleString("pt-AO")}
                        </span>
                      </LedgerTd>
                      <LedgerTd>
                        <div className="flex flex-col items-start gap-0.5">
                          <StatusBadge tom={m.conciliado ? "success" : "warning"}>
                            {m.conciliado ? "Conciliado" : "Pendente"}
                          </StatusBadge>
                          {m.conciliado && m.conciliado_em && (
                            <span className="text-[10px] text-muted-foreground">{new Date(m.conciliado_em).toLocaleDateString("pt-BR")}</span>
                          )}
                        </div>
                      </LedgerTd>
                      {podeEditar && (
                        <LedgerTd>
                          <RowMenu
                            ariaLabel="Ações de conciliação"
                            itens={[
                              m.conciliado
                                ? { icone: "undo", rotulo: "Desmarcar conciliação", onClick: () => aplicar([m.id], false) }
                                : { icone: "task_alt", rotulo: "Marcar como conciliado", onClick: () => aplicar([m.id], true) },
                            ]}
                          />
                        </LedgerTd>
                      )}
                    </LedgerTr>
                  );
                })}
              </tbody>
            </LedgerTable>
            {filtrados.length === 0 && (
              <LedgerEmpty icone="fact_check">
                {movimentos.length === 0
                  ? "Nenhum movimento registado na tesouraria"
                  : "Nenhum movimento confirmado para os filtros escolhidos"}
              </LedgerEmpty>
            )}
            <Paginacao {...pag} label="movimentos" />
          </>
        )}
      </Ledger>
    </div>
  );
}
