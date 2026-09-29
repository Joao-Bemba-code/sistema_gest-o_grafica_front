"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import Paginacao, { usePaginacao } from "@/components/ui/Paginacao";
import { podeAtual } from "@/lib/permissoes";
import { getUsuario } from "@/services/auth";
import { listar, auxiliares, criar, cancelar as cancelarRequisicao } from "@/services/requisicoesMaterial";
import RequisicaoMaterialFormModal from "./RequisicaoMaterialFormModal";

const ESTADO_META = {
  pendente: { label: "Pendente", icon: "hourglass_top", classe: "text-amber-500 bg-amber-500/10" },
  aprovada: { label: "Aprovada", icon: "check_circle", classe: "text-emerald-500 bg-emerald-500/10" },
  rejeitada: { label: "Rejeitada", icon: "cancel", classe: "text-error bg-error/10" },
  cancelada: { label: "Cancelada", icon: "block", classe: "text-muted-foreground bg-muted/50" },
  consumida: { label: "Concluída", icon: "inventory", classe: "text-blue-500 bg-blue-500/10" },
};

// O backend etiqueta consumo interno assim; não é um cliente.
const CONSUMO_INTERNO = "Consumo interno / produção";

const FILTROS = [
  { value: "todas", label: "Todas" },
  { value: "pendente", label: "Pendentes" },
  { value: "aprovada", label: "Aprovadas" },
  { value: "rejeitada", label: "Rejeitadas" },
];

function fmtData(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function RequisicoesTab() {
  const { addToast } = useToast();
  const [requisicoes, setRequisicoes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [sessao, setSessao] = useState(0);
  const [cancelando, setCancelando] = useState(null);

  const podeCriar = podeAtual("producao", "criar");

  const carregar = useCallback(async () => {
    const [reqs, aux] = await Promise.allSettled([listar(), auxiliares()]);
    if (reqs.status === "fulfilled") {
      setRequisicoes(Array.isArray(reqs.value) ? reqs.value : []);
    } else {
      setRequisicoes([]);
      const proibido = reqs.reason?.response?.status === 403;
      addToast(
        proibido
          ? "Não tem permissão para ver as requisições de material"
          : reqs.reason?.response?.data?.erro || "Erro ao carregar as requisições de material",
        "error"
      );
    }
    if (aux.status === "fulfilled") {
      setClientes(Array.isArray(aux.value?.clientes) ? aux.value.clientes : []);
      setMateriais(Array.isArray(aux.value?.materiais) ? aux.value.materiais : []);
    } else {
      setClientes([]);
      setMateriais([]);
      const proibido = aux.reason?.response?.status === 403;
      addToast(
        proibido
          ? "Não tem permissão para ver os clientes e materiais da requisição"
          : aux.reason?.response?.data?.erro || "Erro ao carregar clientes e materiais",
        "error"
      );
    }
  }, [addToast]);

  useEffect(() => {
    let activo = true;
    (async () => {
      await carregar();
      if (activo) setLoading(false);
    })();
    return () => { activo = false; };
  }, [carregar]);

  const abrirFormulario = () => {
    setSessao((s) => s + 1);
    setAberto(true);
  };

  const confirmarCriacao = async (dados) => {
    try {
      await criar(dados);
      await carregar();
      addToast("Requisição enviada — aguarda aprovação do Estoque", "success");
      return true;
    } catch (err) {
      const proibido = err.response?.status === 403;
      addToast(
        proibido
          ? "Não tem permissão para criar requisições de material"
          : err.response?.data?.erro || "Erro ao enviar a requisição",
        "error"
      );
      return false;
    }
  };

  const confirmarCancelamento = async () => {
    if (!cancelando) return;
    try {
      await cancelarRequisicao(cancelando.id);
      await carregar();
      addToast(`Requisição ${cancelando.numero} cancelada`, "success");
      setCancelando(null);
    } catch (err) {
      const proibido = err.response?.status === 403;
      addToast(
        proibido
          ? "Não tem permissão para cancelar requisições de material"
          : err.response?.data?.erro || "Erro ao cancelar a requisição",
        "error"
      );
    }
  };

  const contagens = useMemo(() => {
    const c = { todas: requisicoes.length };
    for (const f of FILTROS) {
      if (f.value !== "todas") c[f.value] = requisicoes.filter((r) => r.estado === f.value).length;
    }
    return c;
  }, [requisicoes]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return requisicoes.filter((r) => {
      if (filtro !== "todas" && r.estado !== filtro) return false;
      if (!termo) return true;
      return (
        String(r.numero || "").toLowerCase().includes(termo) ||
        String(r.cliente_nome || "").toLowerCase().includes(termo) ||
        String(r.solicitado_por || "").toLowerCase().includes(termo) ||
        (r.itens || []).some((i) => String(i.nome || "").toLowerCase().includes(termo))
      );
    });
  }, [requisicoes, filtro, busca]);

  const { visiveis, ...pag } = usePaginacao({ items: filtradas });
  const pendentes = requisicoes.filter((r) => r.estado === "pendente").length;

  if (loading) return <CardSkeleton lines={6} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border border-border shadow-card rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center shrink-0">
            <Icon name="inventory_2" className="text-2xl text-primary" />
          </span>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground tracking-tight">Requisições de Material</h2>
              {pendentes > 0 && (
                <span className="pill pill-primary">
                  <Icon name="hourglass_top" className="text-sm" /> {pendentes} pendente{pendentes === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Peça ao Estoque material para um cliente ou para consumo interno da fábrica. A aprovação e a saída de stock
              são feitas no módulo de Estoque.
            </p>
          </div>
        </div>
        {podeCriar && (
          <Button onClick={abrirFormulario}>
            <Icon name="add_shopping_cart" className="text-lg" /> Nova requisição
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltro(f.value)}
              aria-pressed={filtro === f.value}
              className={`pill transition-colors ${filtro === f.value ? "nav-pill" : "pill-muted hover:border-primary hover:text-primary"}`}
            >
              {f.label}
              <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] ${filtro === f.value ? "bg-primary/20" : "bg-muted"}`}>
                {contagens[f.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procurar por nº, cliente ou material..."
            className="form-input h-9 pl-9 pr-3 text-xs"
            aria-label="Pesquisar requisições"
          />
        </div>
      </div>

      {requisicoes.length > 0 && filtradas.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground">
          <Icon name="search_off" className="text-4xl block mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhuma requisição corresponde ao filtro</p>
          <p className="text-xs mt-1">Ajuste a pesquisa ou mude o filtro acima.</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground">
          <Icon name="inventory" className="text-4xl block mx-auto mb-2 opacity-30" />
          <p className="font-medium">Nenhuma requisição de material</p>
          <p className="text-xs mt-1">
            {podeCriar
              ? "Use “Nova requisição” para pedir material ao Estoque — para um cliente ou para consumo interno."
              : "Não tem permissão para criar requisições."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visiveis.map((r) => {
            const meta = ESTADO_META[r.estado] || ESTADO_META.pendente;
            return (
              <div key={r.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-primary">{r.numero}</span>
                      <span className={`pill ${meta.classe}`}>
                        <Icon name={meta.icon} className="text-sm" /> {meta.label}
                      </span>
                    </div>
                    {r.cliente_id ? (
                      <p className="text-sm text-foreground mt-1 font-semibold">{r.cliente_nome}</p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-sm text-foreground mt-1 font-semibold">
                        <Icon name="factory" className="text-base text-muted-foreground" />
                        {r.cliente_nome || CONSUMO_INTERNO}
                        <span className="pill pill-muted text-[9px]">Sem cliente</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Solicitado por {r.solicitado_por || "—"} em {fmtData(r.data_requisicao)}
                    </p>
                  </div>
                  {r.estado === "pendente" && podeAtual("producao", "editar") && (
                    <Button variant="outline" size="sm" onClick={() => setCancelando(r)}>
                      <Icon name="close" className="text-base" /> Cancelar
                    </Button>
                  )}
                </div>

                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 font-semibold">Material</th>
                        <th className="px-3 py-2 font-semibold text-right">Pedido</th>
                        <th className="px-3 py-2 font-semibold text-right">Atendido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(r.itens || []).map((i) => (
                        <tr key={i.id}>
                          <td className="px-3 py-2 text-foreground">
                            <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{i.codigo}</span>
                            {i.nome}
                            {i.observacoes ? <span className="block text-[10px] text-muted-foreground">{i.observacoes}</span> : null}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {i.quantidade} {i.unidade}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                            {i.quantidade_atendida > 0 ? `${i.quantidade_atendida} ${i.unidade}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {r.observacoes && (
                  <p className="text-xs text-muted-foreground">Obs: {r.observacoes}</p>
                )}
                {r.motivo_rejeicao && (
                  <p className="text-xs text-error font-semibold">Rejeitada — {r.motivo_rejeicao}</p>
                )}
                {r.aprovado_por && r.estado !== "pendente" && (
                  <p className="text-xs text-muted-foreground">
                    Processada por <strong>{r.aprovado_por}</strong> em {fmtData(r.data_aprovacao)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filtradas.length > 0 && <Paginacao {...pag} label="requisições" />}

      <RequisicaoMaterialFormModal
        key={`req-${sessao}`}
        open={aberto}
        onClose={() => setAberto(false)}
        clientes={clientes}
        materiais={materiais}
        nomeUsuario={getUsuario()?.nome || ""}
        onConfirm={confirmarCriacao}
      />

      {cancelando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-card">
            <h3 className="text-base font-semibold text-foreground">Cancelar requisição</h3>
            <p className="text-sm text-muted-foreground">
              Tem a certeza que deseja cancelar a requisição <strong>{cancelando.numero}</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelando(null)}>Voltar</Button>
              <Button variant="destructive" onClick={confirmarCancelamento}>Cancelar requisição</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
