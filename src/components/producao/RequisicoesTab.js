"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CardSkeleton } from "@/components/Skeleton";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
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
import { podeAtual } from "@/lib/permissoes";
import { getUsuario } from "@/services/auth";
import { listar, auxiliares, criar, cancelar as cancelarRequisicao } from "@/services/requisicoesMaterial";
import RequisicaoMaterialFormModal from "./RequisicaoMaterialFormModal";

const ESTADO_META = {
  pendente: { label: "Pendente", tom: "warning" },
  aprovada: { label: "Aprovada", tom: "success" },
  rejeitada: { label: "Rejeitada", tom: "error" },
  cancelada: { label: "Cancelada", tom: "neutral" },
  consumida: { label: "Concluída", tom: "info" },
};

// O backend etiqueta consumo interno assim; não é um cliente.
const CONSUMO_INTERNO = "Consumo interno / produção";

const CAMPOS = [
  { value: "numero", label: "Número", obter: (r) => r.numero || "" },
  { value: "cliente", label: "Cliente", obter: (r) => r.cliente_nome || "" },
  { value: "solicitante", label: "Solicitante", obter: (r) => r.solicitado_por || "" },
  { value: "material", label: "Material", obter: (r) => (r.itens || []).map((i) => i.nome || "").join(" ") },
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
  const [aberto, setAberto] = useState(false);
  const [sessao, setSessao] = useState(0);
  const [cancelando, setCancelando] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [filtro, setFiltro] = useState({ campo: "numero", operador: "contem", termo: "" });
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);

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

  const resultado = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...requisicoes];
    if (termo) {
      const cfg = CAMPOS.find((c) => c.value === filtro.campo) || CAMPOS[0];
      res = res.filter((r) => {
        const alvo = String(cfg.obter(r) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (ordem.chave === "numero") res.sort((a, b) => String(a.numero || "").localeCompare(String(b.numero || ""), "pt", { numeric: true }) * ordem.dir);
    if (ordem.chave === "data") res.sort((a, b) => (new Date(a.data_requisicao || 0) - new Date(b.data_requisicao || 0)) * ordem.dir);
    return res;
  }, [requisicoes, filtro, ordem]);

  const { visiveis, ...pag } = usePaginacao({ items: resultado });
  const pendentes = requisicoes.filter((r) => r.estado === "pendente").length;

  const reqDetalhe = detalhe ? requisicoes.find((r) => r.id === detalhe) || null : null;

  if (loading) return <CardSkeleton lines={6} />;

  return (
    <div className="space-y-4">
      <Ledger rotulo="Requisições de material ledger">
        <LedgerHeader
          titulo="Requisições de material"
          subtitulo={`${requisicoes.length} requisições${pendentes > 0 ? ` · ${pendentes} pendentes` : ""} · aprovação e saída de stock feitas no módulo de Estoque`}
          novo={podeCriar ? "Nova requisição" : undefined}
          aoNovo={abrirFormulario}
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
            placeholder="Pesquisar por nº, cliente, solicitante ou material..."
          />
        )}
        <LedgerTable>
          <thead>
            <tr className="border-b border-border">
              <LedgerTh onSort={() => setOrdem((p) => (p.chave === "numero" ? { chave: "numero", dir: -p.dir } : { chave: "numero", dir: 1 }))} ativo={ordem.chave === "numero"}>Requisição</LedgerTh>
              <LedgerTh>Cliente</LedgerTh>
              <LedgerTh>Solicitada por</LedgerTh>
              <LedgerTh className="text-right">Itens</LedgerTh>
              <LedgerTh onSort={() => setOrdem((p) => (p.chave === "data" ? { chave: "data", dir: -p.dir } : { chave: "data", dir: 1 }))} ativo={ordem.chave === "data"}>Data</LedgerTh>
              <LedgerTh>Estado</LedgerTh>
              <LedgerTh className="w-10" />
            </tr>
          </thead>
          <tbody>
            {visiveis.map((r) => {
              const meta = ESTADO_META[r.estado] || ESTADO_META.pendente;
              return (
                <LedgerTr key={r.id} onClick={() => setDetalhe(r.id)}>
                  <LedgerTd className="max-w-40">
                    <IdCell id={r.numero} meta={`${(r.itens || []).length} material(is)`} aoAbrir={() => setDetalhe(r.id)} />
                  </LedgerTd>
                  <LedgerTd className="max-w-52">
                    <span className="block truncate text-sm">{r.cliente_nome || CONSUMO_INTERNO}</span>
                    {!r.cliente_id && <span className="block text-xs text-muted-foreground">Consumo interno</span>}
                  </LedgerTd>
                  <LedgerTd className="text-muted-foreground">{r.solicitado_por || "—"}</LedgerTd>
                  <LedgerTd className="text-right tabular-nums">{(r.itens || []).length}</LedgerTd>
                  <LedgerTd className="text-muted-foreground whitespace-nowrap">{fmtData(r.data_requisicao)}</LedgerTd>
                  <LedgerTd>
                    <StatusBadge tom={meta.tom}>{meta.label}</StatusBadge>
                  </LedgerTd>
                  <LedgerTd>
                    <RowMenu
                      ariaLabel="Ações da requisição"
                      itens={[
                        { icone: "visibility", rotulo: "Ver detalhes", onClick: () => setDetalhe(r.id) },
                        ...(r.estado === "pendente" && podeAtual("producao", "editar") ? [{ icone: "close", rotulo: "Cancelar requisição", danger: true, onClick: () => setCancelando(r) }] : []),
                      ]}
                    />
                  </LedgerTd>
                </LedgerTr>
              );
            })}
          </tbody>
        </LedgerTable>
        {pag.total === 0 && (
          requisicoes.length === 0
            ? <LedgerEmpty icone="inventory">{podeCriar ? "Nenhuma requisição de material — use “Nova requisição” para pedir material ao Estoque" : "Nenhuma requisição de material"}</LedgerEmpty>
            : <LedgerEmpty icone="search_off">Nenhuma requisição corresponde ao filtro</LedgerEmpty>
        )}
        <Paginacao {...pag} label="requisições" />
      </Ledger>

      <Modal
        open={Boolean(reqDetalhe)}
        onClose={() => setDetalhe(null)}
        title={`Requisição ${reqDetalhe?.numero || ""}`}
        icon="inventory_2"
        size="lg"
      >
        {reqDetalhe && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge tom={(ESTADO_META[reqDetalhe.estado] || ESTADO_META.pendente).tom}>
                {(ESTADO_META[reqDetalhe.estado] || ESTADO_META.pendente).label}
              </StatusBadge>
              {!reqDetalhe.cliente_id && <StatusBadge tom="neutral">Consumo interno</StatusBadge>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { label: "Cliente", value: reqDetalhe.cliente_nome || CONSUMO_INTERNO },
                { label: "Solicitada por", value: reqDetalhe.solicitado_por || "—" },
                { label: "Data", value: fmtData(reqDetalhe.data_requisicao) },
                { label: "Aprovada por", value: reqDetalhe.aprovado_por || "—" },
                { label: "Data de aprovação", value: fmtData(reqDetalhe.data_aprovacao) },
                { label: "Itens", value: (reqDetalhe.itens || []).length },
              ].map((f) => (
                <div key={f.label}>
                  <span className="text-muted-foreground text-xs block">{f.label}</span>
                  <span className="font-medium text-foreground">{f.value || "—"}</span>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <LedgerTh>Material</LedgerTh>
                    <LedgerTh className="text-right">Pedido</LedgerTh>
                    <LedgerTh className="text-right">Atendido</LedgerTh>
                  </tr>
                </thead>
                <tbody>
                  {(reqDetalhe.itens || []).map((i) => (
                    <LedgerTr key={i.id}>
                      <LedgerTd>
                        <span className="block truncate">{i.nome}</span>
                        {i.observacoes && <span className="block text-xs text-muted-foreground">{i.observacoes}</span>}
                      </LedgerTd>
                      <LedgerTd className="text-right tabular-nums whitespace-nowrap">{i.quantidade} {i.unidade}</LedgerTd>
                      <LedgerTd className="text-right tabular-nums text-muted-foreground whitespace-nowrap">
                        {i.quantidade_atendida > 0 ? `${i.quantidade_atendida} ${i.unidade}` : "—"}
                      </LedgerTd>
                    </LedgerTr>
                  ))}
                </tbody>
              </table>
            </div>

            {reqDetalhe.observacoes && (
              <p className="text-xs text-muted-foreground">Obs: {reqDetalhe.observacoes}</p>
            )}
            {reqDetalhe.motivo_rejeicao && (
              <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">Rejeitada — {reqDetalhe.motivo_rejeicao}</p>
            )}

            {reqDetalhe.estado === "pendente" && podeAtual("producao", "editar") && (
              <div className="flex justify-end">
                <Button variant="destructive" size="sm" onClick={() => { setDetalhe(null); setCancelando(reqDetalhe); }}>
                  <Icon name="close" className="text-[16px]" /> Cancelar requisição
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <RequisicaoMaterialFormModal
        key={`req-${sessao}`}
        open={aberto}
        onClose={() => setAberto(false)}
        clientes={clientes}
        materiais={materiais}
        nomeUsuario={getUsuario()?.nome || ""}
        onConfirm={confirmarCriacao}
      />

      <ConfirmDialog
        open={Boolean(cancelando)}
        onClose={() => setCancelando(null)}
        onConfirm={confirmarCancelamento}
        title="Cancelar requisição"
        description={cancelando ? `Tem a certeza que deseja cancelar a requisição ${cancelando.numero}? Esta ação não pode ser desfeita.` : ""}
      />
    </div>
  );
}
