"use client";

import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import FilterBar, { useFilter } from "@/components/ui/FilterBar";
import { ListSkeleton } from "@/components/Skeleton";
import { listarMovimentos, removerAnexo, urlAnexo } from "@/services/tesouraria";

const POR_PAGINA = 9;

const tipoCfg = {
  entrada: { label: "Entrada", variant: "success" },
  saida: { label: "Saída", variant: "destructive" },
  transferencia: { label: "Transferência", variant: "info" },
};

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
  const [pagina, setPagina] = useState(1);
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
            clienteNome: m.cliente ? (m.cliente.empresa || m.cliente.nome || "") : "",
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

  const filterConfig = useMemo(() => [
    { value: "todos", label: "Todos", icon: "filter_list", count: itens.length },
    { value: "entrada", label: "Entradas", icon: "south_west", field: "tipo", count: itens.filter((i) => i.tipo === "entrada").length },
    { value: "saida", label: "Saídas", icon: "north_east", field: "tipo", count: itens.filter((i) => i.tipo === "saida").length },
    { value: "transferencia", label: "Transferências", icon: "swap_horiz", field: "tipo", count: itens.filter((i) => i.tipo === "transferencia").length },
  ], [itens]);

  const { search, setSearch, activeFilter, setActiveFilter, filtered, total } = useFilter({
    items: itens,
    searchFields: ["nome_original", "descricao", "clienteNome", "contaNome", "categoria"],
    filterConfig,
  });

  const filtrados = useMemo(() => {
    const cfg = PERIODOS.find((p) => p.value === periodo) || PERIODOS[0];
    return filtered.filter(cfg.test);
  }, [filtered, periodo]);

  const mudarBusca = (v) => { setSearch(v); setPagina(1); };
  const mudarFiltro = (f) => { setActiveFilter(f); setPagina(1); };
  const mudarPeriodo = (v) => { setPeriodo(v); setPagina(1); };

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const paginados = filtrados.slice(inicio, inicio + POR_PAGINA);
  const paginasVisiveis = [];
  for (let n = 1; n <= totalPaginas; n++) {
    if (n === 1 || n === totalPaginas || (n >= paginaAtual - 1 && n <= paginaAtual + 1)) paginasVisiveis.push(n);
  }

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
      <FilterBar
        search={search}
        onSearchChange={mudarBusca}
        placeholder="Pesquisar por ficheiro, descrição, cliente ou conta..."
        filters={filterConfig}
        activeFilter={activeFilter}
        onFilterChange={mudarFiltro}
        count={total}
        countLabel="comprovativos"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="date_range" className="text-sm text-muted-foreground" />
          <select
            value={periodo}
            onChange={(e) => mudarPeriodo(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 cursor-pointer"
          >
            {PERIODOS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {filtrados.length > 0
            ? `Mostrando ${inicio + 1}–${Math.min(inicio + POR_PAGINA, filtrados.length)} de ${filtrados.length}`
            : "Nenhum comprovativo"}
        </p>
      </div>

      {loading ? <ListSkeleton count={6} /> : (
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginados.map((i) => {
            const tc = tipoCfg[i.tipo] || { label: i.tipo, variant: "outline" };
            const ehPdf = String(i.mime || "").toLowerCase().includes("pdf");
            return (
              <Card key={i.id} className="hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${ehPdf ? "bg-error/10" : "bg-primary/10"}`}>
                        <Icon name={ehPdf ? "picture_as_pdf" : "image"} className={`text-[20px] ${ehPdf ? "text-error" : "text-primary"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate" title={i.nome_original}>{i.nome_original}</p>
                        <p className="text-[10px] text-muted-foreground">{formatBytes(i.tamanho)} · {formatData(i.createdAt)}</p>
                      </div>
                    </div>
                    <Badge variant={tc.variant} className="text-[9px] shrink-0">{tc.label}</Badge>
                  </div>

                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-muted-foreground truncate" title={i.descricao}>{i.descricao || i.categoria || "—"}</p>
                    <p className="text-sm font-bold text-foreground">{formatKz(i.valor)} · {formatData(i.movimento?.data_movimento)}</p>
                    {(i.clienteNome || i.contaNome) && (
                      <p className="text-[10px] text-muted-foreground truncate">{[i.clienteNome, i.contaNome].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <a
                      href={urlAnexo(i.caminho)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
                    >
                      <Icon name="open_in_new" className="text-[13px]" /> Abrir ficheiro
                    </a>
                    <button
                      type="button"
                      onClick={() => setARemover(i)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-error transition-colors"
                      title="Remover comprovativo"
                    >
                      <Icon name="delete" className="text-[14px]" /> Remover
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filtrados.length === 0 && (
            <div className="col-span-full text-center p-12 text-muted-foreground">
              <Icon name="description" className="text-4xl block mx-auto mb-2 opacity-30" />
              <p className="font-medium">Nenhum comprovativo encontrado</p>
              <p className="text-xs mt-1">Anexe recibos aos movimentos na aba Movimentos para os ver aqui.</p>
            </div>
          )}
        </div>
      )}

      {!loading && filtrados.length > 0 && totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
          <p className="text-xs text-muted-foreground font-mono">
            Página {paginaAtual} de {totalPaginas}
          </p>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" disabled={paginaAtual <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))} className="h-8 w-8 p-0" title="Anterior">
              <Icon name="chevron_left" className="text-[14px]" />
            </Button>
            {paginasVisiveis.map((n, idx) => (
              <span key={n} className="flex items-center gap-1.5">
                {idx > 0 && paginasVisiveis[idx - 1] !== n - 1 && <span className="text-muted-foreground text-xs">…</span>}
                <Button type="button" variant={n === paginaAtual ? "default" : "outline"} size="sm" onClick={() => setPagina(n)} className="h-8 w-8 p-0 text-xs">
                  {n}
                </Button>
              </span>
            ))}
            <Button type="button" variant="outline" size="sm" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} className="h-8 w-8 p-0" title="Seguinte">
              <Icon name="chevron_right" className="text-[14px]" />
            </Button>
          </div>
        </div>
      )}

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
