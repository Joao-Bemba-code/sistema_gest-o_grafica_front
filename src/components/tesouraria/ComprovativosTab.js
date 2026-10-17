"use client";

import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import RowMenu from "@/components/ui/RowMenu";
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
import { listarMovimentos, removerAnexo, abrirAnexo } from "@/services/tesouraria";

const tipoCfg = {
  entrada: { label: "Entrada", tom: "success" },
  saida: { label: "Saída", tom: "error" },
  transferencia: { label: "Transferência", tom: "info" },
};

const CAMPOS = [
  { value: "geral", label: "Todos os campos", obter: (i) => [i.nome_original, i.descricao, i.clienteNome, i.contaNome, i.categoria].join(" ") },
  { value: "ficheiro", label: "Ficheiro", obter: (i) => i.nome_original || "" },
  { value: "descricao", label: "Descrição", obter: (i) => i.descricao || "" },
  { value: "cliente", label: "Cliente", obter: (i) => i.clienteNome || "" },
  { value: "conta", label: "Conta", obter: (i) => i.contaNome || "" },
  { value: "categoria", label: "Categoria", obter: (i) => i.categoria || "" },
];

const pillBase = "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-colors";
const pillAtiva = "border-primary/40 bg-primary/10 text-primary";
const pillInativa = "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground";

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function formatBytes(n) {
  const v = Number(n || 0);
  if (!v) return "—";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

function formatData(v) {
  if (!v) return "—";
  const d = new Date(String(v).slice(0, 10) + "T00:00:00");
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-AO");
}

function dataMovimento(i) {
  const v = i.movimento?.data_movimento || i.data_movimento;
  if (!v) return null;
  const d = new Date(String(v).slice(0, 10) + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

const PERIODOS = [
  { value: "todos", label: "Todo o período", test: () => true },
  { value: "hoje", label: "Hoje", test: (i) => {
    const d = dataMovimento(i);
    if (!d) return false;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return d.getTime() === hoje.getTime();
  } },
  { value: "semana", label: "Últimos 7 dias", test: (i) => {
    const d = dataMovimento(i);
    if (!d) return false;
    const lim = new Date(); lim.setHours(0, 0, 0, 0); lim.setDate(lim.getDate() - 6);
    return d.getTime() >= lim.getTime();
  } },
  { value: "mes", label: "Este mês", test: (i) => {
    const d = dataMovimento(i);
    if (!d) return false;
    const agora = new Date();
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
  } },
  { value: "ano", label: "Este ano", test: (i) => {
    const d = dataMovimento(i);
    if (!d) return false;
    return d.getFullYear() === new Date().getFullYear();
  } },
];

export default function ComprovativosTab() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aRemover, setARemover] = useState(null);
  const [removendo, setRemovendo] = useState(false);
  const [periodo, setPeriodo] = useState("todos");
  const [filtro, setFiltro] = useState({ campo: "geral", operador: "contem", termo: "" });
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const { addToast } = useToast();

  const carregar = async () => {
    try {
      const data = await listarMovimentos();
      const movs = Array.isArray(data) ? data : data?.data ?? data?.movimentos ?? [];
      const lista = [];
      movs.forEach((m) => {
        (m.anexos || []).forEach((a) => {
          lista.push({
            ...a,
            movimento: m,
            tipo: m.tipo,
            descricao: m.descricao || "",
            categoria: m.categoria || "",
            clienteNome: m.cliente ? (m.cliente.nome || m.cliente.empresa || "") : "",
            contaNome: m.conta ? `${m.conta.banco_nome || ""}${m.conta.numero_conta ? ` (${m.conta.numero_conta})` : ""}`.trim() : "",
            valor: Number(m.valor || 0),
          });
        });
      });
      lista.sort((a, b) => {
        const da = dataMovimento(a) || new Date(a.createdAt || 0);
        const db = dataMovimento(b) || new Date(b.createdAt || 0);
        return db.getTime() - da.getTime();
      });
      setItens(lista);
    } catch {
      addToast("Erro ao carregar comprovativos", "error");
      setItens([]);
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    carregar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const contagensTipo = useMemo(() => ({
    todos: itens.length,
    entrada: itens.filter((i) => i.tipo === "entrada").length,
    saida: itens.filter((i) => i.tipo === "saida").length,
    transferencia: itens.filter((i) => i.tipo === "transferencia").length,
  }), [itens]);

  const filtrados = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...itens];
    if (termo) {
      const cfg = CAMPOS.find((c) => c.value === filtro.campo) || CAMPOS[0];
      res = res.filter((i) => {
        const alvo = String(cfg.obter(i) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (tipoFiltro !== "todos") {
      res = res.filter((i) => i.tipo === tipoFiltro);
    }
    const cfgPeriodo = PERIODOS.find((p) => p.value === periodo) || PERIODOS[0];
    res = res.filter(cfgPeriodo.test);
    if (ordem.chave === "nome") res.sort((a, b) => String(a.nome_original || "").localeCompare(String(b.nome_original || ""), "pt") * ordem.dir);
    if (ordem.chave === "data") res.sort((a, b) => ((dataMovimento(a) || new Date(a.createdAt || 0)).getTime() - (dataMovimento(b) || new Date(b.createdAt || 0)).getTime()) * ordem.dir);
    if (ordem.chave === "valor") res.sort((a, b) => (a.valor - b.valor) * ordem.dir);
    return res;
  }, [itens, filtro, tipoFiltro, periodo, ordem]);

  const pag = usePaginacao({ items: filtrados });
  const ordenar = (chave) => setOrdem((p) => (p.chave === chave ? { chave, dir: -p.dir } : { chave, dir: 1 }));

  const abrir = async (i) => {
    try {
      await abrirAnexo(i.id);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao abrir ficheiro", "error");
    }
  };

  const confirmarRemocao = async () => {
    if (!aRemover) return;
    setRemovendo(true);
    try {
      await removerAnexo(aRemover.id);
      addToast("Comprovativo removido", "success");
      setARemover(null);
      await carregar();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao remover comprovativo", "error");
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <div className="space-y-4">
      <Ledger rotulo="Comprovativos ledger">
        <LedgerHeader
          titulo="Comprovativos"
          subtitulo={`${filtrados.length} de ${itens.length} comprovativos · anexados aos movimentos`}
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
            placeholder="Pesquisar por ficheiro, descrição, cliente ou conta..."
          />
        )}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={() => setTipoFiltro("todos")}
            aria-pressed={tipoFiltro === "todos"}
            className={`${pillBase} ${tipoFiltro === "todos" ? pillAtiva : pillInativa}`}
          >
            Todos <span className="text-[11px] text-muted-foreground">{contagensTipo.todos}</span>
          </button>
          <button
            type="button"
            onClick={() => setTipoFiltro("entrada")}
            aria-pressed={tipoFiltro === "entrada"}
            className={`${pillBase} ${tipoFiltro === "entrada" ? pillAtiva : pillInativa}`}
          >
            <Icon name="south_west" className="text-sm" /> Entradas
            <span className="text-[11px] text-muted-foreground">{contagensTipo.entrada}</span>
          </button>
          <button
            type="button"
            onClick={() => setTipoFiltro("saida")}
            aria-pressed={tipoFiltro === "saida"}
            className={`${pillBase} ${tipoFiltro === "saida" ? pillAtiva : pillInativa}`}
          >
            <Icon name="north_east" className="text-sm" /> Saídas
            <span className="text-[11px] text-muted-foreground">{contagensTipo.saida}</span>
          </button>
          <button
            type="button"
            onClick={() => setTipoFiltro("transferencia")}
            aria-pressed={tipoFiltro === "transferencia"}
            className={`${pillBase} ${tipoFiltro === "transferencia" ? pillAtiva : pillInativa}`}
          >
            <Icon name="swap_horiz" className="text-sm" /> Transferências
            <span className="text-[11px] text-muted-foreground">{contagensTipo.transferencia}</span>
          </button>
          <span className="ml-auto flex items-center gap-1.5">
            <Icon name="date_range" className="text-sm text-muted-foreground" />
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              aria-label="Período"
              className="h-8 px-2 rounded-lg border border-border bg-card text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 cursor-pointer"
            >
              {PERIODOS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </span>
        </div>

        {loading ? (
          <div className="p-4"><ListSkeleton count={6} /></div>
        ) : (
          <>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh onSort={() => ordenar("nome")} ativo={ordem.chave === "nome"}>Ficheiro</LedgerTh>
                  <LedgerTh>Tipo</LedgerTh>
                  <LedgerTh>Descrição</LedgerTh>
                  <LedgerTh onSort={() => ordenar("data")} ativo={ordem.chave === "data"}>Data movimento</LedgerTh>
                  <LedgerTh onSort={() => ordenar("valor")} ativo={ordem.chave === "valor"}>Valor</LedgerTh>
                  <LedgerTh>Cliente / Conta</LedgerTh>
                  <LedgerTh className="w-10" />
                </tr>
              </thead>
              <tbody>
                {pag.visiveis.map((i) => {
                  const tc = tipoCfg[i.tipo] || { label: i.tipo, tom: "neutral" };
                  const ehPdf = String(i.mime || "").toLowerCase().includes("pdf");
                  const partido = [i.clienteNome, i.contaNome].filter(Boolean).join(" · ");
                  return (
                    <LedgerTr key={i.id}>
                      <LedgerTd className="max-w-64">
                        <span className="flex items-center gap-2">
                          <Icon
                            name={ehPdf ? "picture_as_pdf" : "image"}
                            className={`shrink-0 text-lg ${ehPdf ? "text-error" : "text-primary"}`}
                          />
                          <IdCell
                            id={i.nome_original || "—"}
                            meta={`${formatBytes(i.tamanho)} · ${formatData(i.createdAt)}`}
                            aoAbrir={() => abrir(i)}
                          />
                        </span>
                      </LedgerTd>
                      <LedgerTd>
                        <StatusBadge tom={tc.tom}>{tc.label}</StatusBadge>
                      </LedgerTd>
                      <LedgerTd className="max-w-48">
                        <span className="block truncate text-muted-foreground">{i.descricao || i.categoria || "—"}</span>
                      </LedgerTd>
                      <LedgerTd className="tabular-nums whitespace-nowrap">{formatData(i.movimento?.data_movimento)}</LedgerTd>
                      <LedgerTd className="tabular-nums whitespace-nowrap font-medium">{formatKz(i.valor)}</LedgerTd>
                      <LedgerTd className="max-w-48">
                        <span className="block truncate text-muted-foreground">{partido || "—"}</span>
                      </LedgerTd>
                      <LedgerTd>
                        <RowMenu
                          ariaLabel="Ações do comprovativo"
                          itens={[
                            { icone: "open_in_new", rotulo: "Abrir ficheiro", onClick: () => abrir(i) },
                            { icone: "delete", rotulo: "Remover", danger: true, onClick: () => setARemover(i) },
                          ]}
                        />
                      </LedgerTd>
                    </LedgerTr>
                  );
                })}
              </tbody>
            </LedgerTable>
            {pag.total === 0 && (
              itens.length === 0 ? (
                <LedgerEmpty icone="description">
                  Nenhum comprovativo encontrado
                  <span className="mt-1 block text-xs font-normal">Anexe recibos aos movimentos na aba Movimentos para os ver aqui.</span>
                </LedgerEmpty>
              ) : (
                <LedgerEmpty icone="search_off">Nenhum comprovativo corresponde ao filtro</LedgerEmpty>
              )
            )}
            <Paginacao {...pag} label="comprovativos" />
          </>
        )}
      </Ledger>

      <ConfirmDialog
        open={Boolean(aRemover)}
        onClose={() => setARemover(null)}
        onConfirm={confirmarRemocao}
        loading={removendo}
        title="Remover comprovativo"
        description={aRemover ? `Remover o ficheiro "${aRemover.nome_original}"? O ficheiro será apagado do sistema.` : ""}
      />
    </div>
  );
}
