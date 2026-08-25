"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import KpiCard from "@/components/ui/KpiCard";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import FilterBar, { useFilter } from "@/components/ui/FilterBar";
import { listar as listarOrcamentos, remover as removerOrcamento } from "@/services/orcamentos";
import { listarFaturas, removerFatura, marcarPaga } from "@/services/faturacao";
import { buscarOrganizacao } from "@/services/configuracoes";
import gerarOrcamentoPdf from "@/lib/orcamentoPdf";
import gerarFaturaPdf from "@/lib/faturacaoPdf";

const ESTADOS_ORC = ["pendente", "aprovado", "cancelado", "rejeitado"];
const estadoColors = { aprovado: "success", pendente: "warning", cancelado: "secondary", rejeitado: "destructive" };

const faturaEstados = {
  emitida: { label: "Emitida", variant: "warning" },
  paga: { label: "Paga", variant: "success" },
  parcial: { label: "Parcial", variant: "info" },
  vencida: { label: "Vencida", variant: "destructive" },
  cancelada: { label: "Cancelada", variant: "outline" },
};

const tiposDoc = {
  fatura: { label: "Fatura", variant: "info" },
  factura_recibo: { label: "Factura Recibo", variant: "success" },
  recibo: { label: "Recibo", variant: "secondary" },
};

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }
function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export default function VendasPage() {
  const router = useRouter();
  const [tab, setTab] = useState("orcamentos");
  const [orcamentos, setOrcamentos] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [empresa, setEmpresa] = useState({ nome: "", nif: "", endereco: "", telefone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      try {
        const [orcData, fatData, empData] = await Promise.all([
          listarOrcamentos().catch(() => []),
          listarFaturas().catch(() => []),
          buscarOrganizacao().catch(() => null),
        ]);
        if (!ativo) return;
        setOrcamentos(Array.isArray(orcData) ? orcData : orcData?.data ?? []);
        setFaturas(Array.isArray(fatData) ? fatData : fatData?.data ?? []);
        if (empData) setEmpresa(empData);
      } catch {
        if (ativo) addToast("Erro ao carregar dados de vendas", "error");
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [addToast]);

  const orcFiltro = useMemo(() => [
    { value: "todos", label: "Todos", icon: "apps", count: orcamentos.length },
    ...ESTADOS_ORC.map((s) => ({
      value: s, label: s.charAt(0).toUpperCase() + s.slice(1),
      icon: s === "aprovado" ? "check_circle" : s === "pendente" ? "pending" : s === "cancelado" ? "cancel" : "block",
      field: "estado",
      count: orcamentos.filter((o) => o.estado === s).length,
    })),
  ], [orcamentos]);

  const fatFiltro = useMemo(() => [
    { value: "todas", label: "Todas", icon: "filter_list", count: faturas.length },
    ...Object.entries(faturaEstados).map(([k, v]) => ({
      value: k, label: v.label, field: "estado",
      icon: k === "paga" ? "check_circle" : k === "emitida" ? "pending" : k === "vencida" ? "warning" : "cancel",
    })),
  ], [faturas]);

  const orcFilter = useFilter({
    items: orcamentos,
    searchFields: ["cliente.nome", "cliente.empresa", "numero", "especificacao.produto"],
    filterConfig: orcFiltro,
    sortOptions: [
      { value: "data_desc", label: "Mais recente", field: "data", dir: "desc" },
      { value: "total_desc", label: "Maior valor", field: "total", dir: "desc" },
    ],
  });

  const fatFilter = useFilter({
    items: faturas,
    searchFields: ["numero", "cliente.nome", "cliente.empresa"],
    filterConfig: fatFiltro,
  });

  const totalOrc = orcamentos.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const totalFat = faturas.reduce((s, f) => s + Number(f.total || f.valor || 0), 0);
  const totalReceber = faturas.filter((f) => !["paga", "cancelada"].includes(f.estado)).reduce((s, f) => s + Number(f.total || f.valor || 0), 0);
  const pendentes = orcamentos.filter((o) => o.estado === "pendente").length;

  const confirmarEliminacao = async () => {
    if (!eliminarItem) return;
    setDeletando(true);
    try {
      if (eliminarItem._tipo === "orcamento") {
        await removerOrcamento(eliminarItem.id);
        setOrcamentos((prev) => prev.filter((o) => o.id !== eliminarItem.id));
        addToast("Orçamento removido com sucesso", "success");
      } else {
        await removerFatura(eliminarItem.id);
        setFaturas((prev) => prev.filter((f) => f.id !== eliminarItem.id));
        addToast("Fatura removida com sucesso", "success");
      }
      setEliminarItem(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao eliminar", "error");
    } finally {
      setDeletando(false);
    }
  };

  if (loading) return <ListSkeleton lines={8} />;

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Vendas</h1>
          <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">
            Orçamentos e facturas // VENDAS
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => router.push("/orcamentos/novo")} className="bg-primary/20 text-primary border border-primary/50 px-5 py-2 rounded font-mono flex items-center gap-2 hover:bg-primary/30 transition-all text-[11px] uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(128,213,203,0.2)] hover:shadow-[0_0_25px_rgba(128,213,203,0.4)]">
            <Icon name="add" className="text-[16px]" /> Novo Orçamento
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <KpiCard icon="request_quote" label="Orçamentos" value={orcamentos.length} iconVariant="info" />
        <KpiCard icon="pending" label="Pendentes" value={pendentes} iconVariant="warning" />
        <KpiCard icon="paid" label="Total Facturado" value={formatKz(totalFat)} iconVariant="success" />
        <KpiCard icon="account_balance" label="A Receber" value={formatKz(totalReceber)} iconVariant="error" />
      </section>

      <div className="flex gap-1.5 flex-wrap obsidian-glass cyber-border p-1.5 rounded-xl">
        {["orcamentos", "faturas"].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t ? "nav-pill shadow-none text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon name={t === "orcamentos" ? "request_quote" : "receipt_long"} className="text-lg" />
            {t === "orcamentos" ? "Orçamentos" : "Facturas"}
          </button>
        ))}
      </div>

      {tab === "orcamentos" && (
        <>
          <FilterBar
            search={orcFilter.search}
            onSearchChange={orcFilter.setSearch}
            placeholder="Pesquisar por cliente, produto, nº do orçamento..."
            filters={orcFiltro}
            activeFilter={orcFilter.activeFilter}
            onFilterChange={orcFilter.setActiveFilter}
            sortBy={orcFilter.sortBy}
            onSortChange={orcFilter.setSortBy}
            sortOptions={orcFilter.sortOptions || []}
            count={orcFilter.total}
            countLabel="orçamentos"
          />

          <div className="space-y-3">
            {orcFilter.filtered.map((o) => (
              <Card key={o.id} className="hover-lift cursor-pointer" onClick={() => router.push(`/orcamentos?id=${o.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon name="request_quote" className="text-primary text-[20px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{o.numero}</span>
                          <Badge variant={estadoColors[o.estado] || "outline"} className="text-[10px]">{o.estado}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {o.cliente?.nome || "—"}{o.especificacao?.produto ? ` • ${o.especificacao.produto}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-lg font-bold text-foreground">{formatKz(o.total)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatData(o.data)}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); gerarOrcamentoPdf(o, empresa); }} title="Baixar PDF"><Icon name="download" className="text-[16px]" /></Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEliminarItem({ ...o, _tipo: "orcamento" }); }} title="Remover"><Icon name="delete" className="text-[16px] text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {orcFilter.filtered.length === 0 && (
              <div className="text-center p-12 text-muted-foreground">
                <Icon name="request_quote" className="text-4xl block mx-auto mb-2 opacity-30" />
                <p className="font-medium">Nenhum orçamento encontrado</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "faturas" && (
        <>
          <FilterBar
            search={fatFilter.search}
            onSearchChange={fatFilter.setSearch}
            placeholder="Pesquisar por nº fatura, cliente..."
            filters={fatFiltro}
            activeFilter={fatFilter.activeFilter}
            onFilterChange={fatFilter.setActiveFilter}
            count={fatFilter.total}
            countLabel="faturas"
          />

          <div className="space-y-3">
            {fatFilter.filtered.map((f) => (
              <Card key={f.id} className="hover-lift cursor-pointer" onClick={() => router.push(`/faturacao`)}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon name="receipt_long" className="text-primary text-[20px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{f.numero}</span>
                          <Badge variant={tiposDoc[f.tipo]?.variant || "outline"} className="text-[10px]">{tiposDoc[f.tipo]?.label || f.tipo}</Badge>
                          <Badge variant={faturaEstados[f.estado]?.variant || "outline"} className="text-[10px]">{faturaEstados[f.estado]?.label || f.estado}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{f.cliente?.nome || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-lg font-bold text-foreground">{formatKz(f.total || f.valor)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatData(f.data_emissao)}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); gerarFaturaPdf(f, empresa); }} title="Baixar PDF"><Icon name="download" className="text-[16px]" /></Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEliminarItem({ ...f, _tipo: "fatura" }); }} title="Remover"><Icon name="delete" className="text-[16px] text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {fatFilter.filtered.length === 0 && (
              <div className="text-center p-12 text-muted-foreground">
                <Icon name="receipt_long" className="text-4xl block mx-auto mb-2 opacity-30" />
                <p className="font-medium">Nenhuma fatura encontrada</p>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(eliminarItem)}
        onClose={() => setEliminarItem(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title={eliminarItem?._tipo === "orcamento" ? "Remover orçamento" : "Remover fatura"}
        description={eliminarItem ? `Tem a certeza que deseja remover ${eliminarItem._tipo === "orcamento" ? `o orçamento "${eliminarItem.numero}"` : `a fatura "${eliminarItem.numero}"`}? Esta ação não pode ser desfeita.` : ""}
      />

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
