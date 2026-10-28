"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import FloatButton from "@/components/ui/FloatButton";
import { listar as listarOrcamentos, anular as anularOrcamento, mudarEstado } from "@/services/orcamentos";
import { listarFaturas, buscarFatura } from "@/services/faturacao";
import { buscarOrganizacao } from "@/services/configuracoes";
import OrcamentoModal from "@/components/vendas/OrcamentoModal";
import OrcamentoDetalhesModal from "@/components/vendas/OrcamentoDetalhesModal";
import FaturaDetalhesModal from "@/components/vendas/FaturaDetalhesModal";
import FaturaModal from "@/components/vendas/FaturaModal";
import CadastrosTab from "@/components/vendas/CadastrosTab";
import PropostasTab from "@/components/vendas/PropostasTab";
import PropostaModal from "@/components/vendas/PropostaModal";
import PropostaDetalhesModal from "@/components/vendas/PropostaDetalhesModal";
import OrcamentosTab from "@/components/vendas/OrcamentosTab";
import EncomendasTab from "@/components/vendas/EncomendasTab";
import FaturacaoTab from "@/components/vendas/FaturacaoTab";
import EntregasTab from "@/components/vendas/EntregasTab";
import AcompanhamentoTab from "@/components/vendas/AcompanhamentoTab";
import {
  listar as listarPropostas,
  buscarPorId as buscarProposta,
  anular as anularProposta,
  vincularOrcamento,
} from "@/services/propostas";

const TABS = [
  { value: "clientes", label: "Clientes", icone: "groups" },
  { value: "propostas", label: "Propostas", icone: "description" },
  { value: "orcamentos", label: "Orçamentos", icone: "request_quote" },
  { value: "pedidos", label: "Encomendas", icone: "pending_actions" },
  { value: "vendas", label: "Facturação", icone: "receipt_long" },
  { value: "entregas", label: "Entregas", icone: "local_shipping" },
  { value: "acompanhamento", label: "Acompanhamento", icone: "history" },
];

export default function AreaComercialPage() {
  return (
    <Suspense fallback={<ListSkeleton lines={8} />}>
      <ConteudoComercial />
    </Suspense>
  );
}

function ConteudoComercial() {
  const searchParams = useSearchParams();
  // A aba vem sempre do URL (?tab=…) para o menu lateral e a barra de abas
  // navegarem em sintonia, sem perder o separador ao recarregar a página.
  const tabUrl = searchParams.get("tab");
  const tab = TABS.some((t) => t.value === tabUrl) ? tabUrl : "orcamentos";
  const [orcamentos, setOrcamentos] = useState([]);
  const [propostas, setPropostas] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [empresa, setEmpresa] = useState({ nome: "", nif: "", endereco: "", telefone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [anularItem, setAnularItem] = useState(null);
  const [motivoAnulacao, setMotivoAnulacao] = useState("");
  const [anulando, setAnulando] = useState(false);
  const [orcForm, setOrcForm] = useState({ open: false, id: null });
  const [orcPrefill, setOrcPrefill] = useState(null);
  const [propForm, setPropForm] = useState({ open: false, proposta: null });
  const [propDetalhe, setPropDetalhe] = useState(null);
  const [orcDetalhe, setOrcDetalhe] = useState(null);
  const [fatDetalhe, setFatDetalhe] = useState(null);
  const [fatFormOpen, setFatFormOpen] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(null);
  const [menuMesAberto, setMenuMesAberto] = useState(false);
  const menuMesRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      try {
        const [orcData, propData, fatData, empData] = await Promise.all([
          listarOrcamentos().catch(() => []),
          listarPropostas().catch(() => []),
          listarFaturas().catch(() => []),
          buscarOrganizacao().catch(() => null),
        ]);
        if (!ativo) return;
        setOrcamentos(Array.isArray(orcData) ? orcData : orcData?.data ?? []);
        setPropostas(Array.isArray(propData) ? propData : propData?.data ?? []);
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

  const atualizarOrcamentos = async () => {
    const d = await listarOrcamentos().catch(() => []);
    setOrcamentos(Array.isArray(d) ? d : d?.data ?? []);
  };

  const atualizarPropostas = async () => {
    const d = await listarPropostas().catch(() => []);
    setPropostas(Array.isArray(d) ? d : d?.data ?? []);
  };

  const atualizarFaturas = async () => {
    const d = await listarFaturas().catch(() => []);
    setFaturas(Array.isArray(d) ? d : d?.data ?? []);
  };

  useEffect(() => {
    if (!menuMesAberto) return undefined;
    const fecharFora = (e) => {
      if (menuMesRef.current && !menuMesRef.current.contains(e.target)) setMenuMesAberto(false);
    };
    const fecharTecla = (e) => {
      if (e.key === "Escape") setMenuMesAberto(false);
    };
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharTecla);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharTecla);
    };
  }, [menuMesAberto]);

  const chaveMes = mesFiltro
    ? `${mesFiltro.getFullYear()}-${String(mesFiltro.getMonth() + 1).padStart(2, "0")}`
    : null;
  const noMes = (valor) => !chaveMes || String(valor || "").startsWith(chaveMes);
  const orcamentosVisiveis = orcamentos.filter((o) => noMes(o.data || o.createdAt));
  const propostasVisiveis = propostas.filter((p) => noMes(p.criada_em || p.data_envio));
  const faturasVisiveis = faturas.filter((f) => noMes(f.data_emissao || f.data || f.createdAt));

  const abrirOrcDetalhe = (o) => {
    setOrcDetalhe(o);
    setOrcForm({ open: false, id: null });
  };

  const abrirEdicaoOrc = (o) => {
    setOrcDetalhe(null);
    setOrcPrefill(null);
    setOrcForm({ open: true, id: o.id });
  };

  const fecharOrcForm = () => {
    setOrcForm({ open: false, id: null });
    setOrcPrefill(null);
  };

  const abrirProposta = async (p) => {
    setPropForm({ open: false, proposta: null });
    setPropDetalhe(p);
    try {
      const fresca = await buscarProposta(p.id);
      if (fresca?.id) setPropDetalhe(fresca);
    } catch {
      // mantém os dados já carregados da lista
    }
  };

  const abrirEdicaoProposta = (p) => {
    setPropDetalhe(null);
    setPropForm({ open: true, proposta: p });
  };

  const fecharPropostaForm = () => setPropForm({ open: false, proposta: null });

  const atualizarDetalheProposta = (atual) => {
    setPropDetalhe(atual);
    setPropostas((prev) => prev.map((x) => (x.id === atual.id ? atual : x)));
  };

  const criarOrcamentoDeProposta = (p) => {
    const observacoes = [`Proposta ${p.numero} — ${p.objecto}`, p.descricao]
      .filter(Boolean)
      .join("\n");
    setPropDetalhe(null);
    setOrcPrefill({
      proposta_id: p.id,
      cliente_id: p.cliente_id,
      objecto: p.objecto || "",
      prazoExecucao: p.prazo_execucao || "",
      validade: p.validade,
      observacoes,
    });
    setOrcForm({ open: true, id: null });
  };

  const aoGuardarOrcamento = async (salvo) => {
    await atualizarOrcamentos();
    if (orcPrefill?.proposta_id && salvo?.id) {
      try {
        const atual = await vincularOrcamento(orcPrefill.proposta_id, salvo.id);
        setPropostas((prev) => prev.map((x) => (x.id === atual.id ? atual : x)));
        addToast(`Orçamento ${salvo.numero || salvo.id} associado à proposta`, "success");
      } catch (err) {
        addToast(
          err.response?.data?.erro || "Orçamento criado, mas não foi possível associá-lo à proposta",
          "error"
        );
      }
    }
  };

  const mudarEstadoOrc = async (o, novoEstado) => {
    if (!novoEstado || novoEstado === o.estado) return;
    try {
      const atualizado = await mudarEstado(o.id, novoEstado);
      setOrcamentos((prev) => prev.map((x) => (x.id === o.id ? { ...x, ...atualizado } : x)));
      setOrcDetalhe((prev) => (prev && prev.id === o.id ? { ...prev, ...atualizado } : prev));
      addToast(`Orçamento ${o.numero || o.id} marcado como ${novoEstado}`, "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao mudar o estado", "error");
    }
  };

  const abrirFaturaDetalhe = async (f) => {
    setFatDetalhe(f);
    try {
      const fresca = await buscarFatura(f.id);
      if (fresca && fresca.id) setFatDetalhe(fresca);
    } catch {
      // mantém os dados já carregados da lista
    }
  };

  const pedidosAprovados = orcamentosVisiveis.filter((o) => o.estado === "aprovado");

  const mesLabel = (() => {
    const m = new Date().toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
    return m.charAt(0).toUpperCase() + m.slice(1);
  })();

  const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const opcoesMes = [
    { rotulo: "Todos os meses", valor: null },
    ...Array.from({ length: 12 }, (_, i) => {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - (11 - i), 1);
      return {
        rotulo: capitalizar(d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })),
        valor: d,
      };
    }),
  ];
  const rotuloMes = mesFiltro
    ? capitalizar(mesFiltro.toLocaleDateString("pt-PT", { month: "long", year: "numeric" }))
    : mesLabel;

  const abrirAnulacao = (item) => {
    setAnularItem(item);
    setMotivoAnulacao("");
  };

  const confirmarAnulacao = async () => {
    if (!anularItem) return;
    const motivo = motivoAnulacao.trim();
    if (!motivo) {
      addToast("Indique o motivo da anulação", "error");
      return;
    }
    setAnulando(true);
    try {
      if (anularItem._tipo === "proposta") {
        const atual = await anularProposta(anularItem.id, motivo);
        setPropostas((prev) => prev.map((p) => (p.id === atual.id ? atual : p)));
        setPropDetalhe((prev) => (prev && prev.id === atual.id ? atual : prev));
        addToast("Proposta anulada com sucesso", "success");
      } else {
        const atual = await anularOrcamento(anularItem.id, motivo);
        setOrcamentos((prev) => prev.map((o) => (o.id === atual.id ? atual : o)));
        setOrcDetalhe((prev) => (prev && prev.id === atual.id ? atual : prev));
        addToast("Orçamento anulado com sucesso", "success");
      }
      setAnularItem(null);
      setMotivoAnulacao("");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao anular", "error");
    } finally {
      setAnulando(false);
    }
  };

  if (loading) return <ListSkeleton lines={8} />;

  return (
    <div className="space-y-4">
      {/* Faixa do módulo — identificação comercial (brandGreen) */}
      <div className="flex items-center justify-between rounded-xl bg-[#0a6b3f] px-5 py-2.5 text-white shadow-sm">
        <span className="text-lg font-black tracking-wide drop-shadow-sm">2. COMERCIAL</span>
        <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-emerald-100 sm:block">
          Sistema de Gestão Integrada • KAMGEST
        </span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Gestão Comercial</h2>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">Clientes, propostas, orçamentos, encomendas, facturação, entregas e acompanhamento.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative self-start sm:self-auto" ref={menuMesRef}>
              <button
                type="button"
                onClick={() => setMenuMesAberto((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/60"
              >
                <Icon name="calendar_month" className="h-4 w-4 text-muted-foreground" />
                <span>{rotuloMes}</span>
                <Icon name="expand_more" className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {menuMesAberto && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-dropdown">
                  {opcoesMes.map((o) => {
                    const ativo = o.valor
                      ? mesFiltro && mesFiltro.getFullYear() === o.valor.getFullYear() && mesFiltro.getMonth() === o.valor.getMonth()
                      : !mesFiltro;
                    return (
                      <button
                        key={o.rotulo}
                        type="button"
                        onClick={() => {
                          setMesFiltro(o.valor);
                          setMenuMesAberto(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-colors hover:bg-muted",
                          ativo ? "font-semibold text-primary" : "text-foreground"
                        )}
                      >
                        <span>{o.rotulo}</span>
                        {ativo && <Icon name="check" className="text-sm" />}
                      </button>
                    );
                  })}
                </div>
              )}
          </div>
        </div>
      </div>

      {tab === "pedidos" && (
        <EncomendasTab encomendas={pedidosAprovados} onAbrir={abrirOrcDetalhe} />
      )}

      {tab === "orcamentos" && (
        <OrcamentosTab
          orcamentos={orcamentosVisiveis}
          onAbrir={abrirOrcDetalhe}
          onEditar={abrirEdicaoOrc}
          onAnular={(o) => abrirAnulacao({ ...o, _tipo: "orcamento" })}
        />
      )}

      {tab === "propostas" && (
        <PropostasTab
          propostas={propostasVisiveis}
          onAbrir={abrirProposta}
          onEditar={abrirEdicaoProposta}
          onAnular={(p) => abrirAnulacao({ ...p, _tipo: "proposta" })}
        />
      )}

      {tab === "vendas" && (
        <FaturacaoTab
          faturas={faturasVisiveis}
          todasFaturas={faturas}
          orcamentos={orcamentosVisiveis}
          onAbrir={abrirFaturaDetalhe}
        />
      )}

      {tab === "clientes" && <CadastrosTab apenas="cliente" faturas={faturas} mesFiltro={mesFiltro} />}

      {tab === "entregas" && (
        <EntregasTab
          faturas={faturas}
          mesFiltro={mesFiltro}
          onVerFatura={abrirFaturaDetalhe}
          empresa={empresa}
        />
      )}

      {tab === "acompanhamento" && (
        <AcompanhamentoTab
          orcamentos={orcamentos}
          faturas={faturas}
          onAbrirOrcamento={abrirOrcDetalhe}
          onAbrirFatura={abrirFaturaDetalhe}
        />
      )}

      <OrcamentoModal
        open={orcForm.open}
        editingId={orcForm.id}
        prefill={orcPrefill}
        onClose={fecharOrcForm}
        onSaved={aoGuardarOrcamento}
      />

      {propForm.open && (
        <PropostaModal
          open
          proposta={propForm.proposta}
          onClose={fecharPropostaForm}
          onSaved={(salva) => {
            atualizarPropostas();
            if (salva?.id) setPropDetalhe(salva);
          }}
        />
      )}

      <PropostaDetalhesModal
        proposta={propDetalhe}
        empresa={empresa}
        onClose={() => setPropDetalhe(null)}
        onEditar={abrirEdicaoProposta}
        onAnular={(p) => {
          setPropDetalhe(null);
          abrirAnulacao({ ...p, _tipo: "proposta" });
        }}
        onAtualizada={atualizarDetalheProposta}
        onCriarOrcamento={criarOrcamentoDeProposta}
        onVerOrcamento={(o) => {
          setPropDetalhe(null);
          setOrcDetalhe(o);
        }}
      />

      <OrcamentoDetalhesModal
        orcamento={orcDetalhe}
        empresa={empresa}
        onClose={() => setOrcDetalhe(null)}
        onEditar={abrirEdicaoOrc}
        onAnular={(o) => { setOrcDetalhe(null); abrirAnulacao({ ...o, _tipo: "orcamento" }); }}
        onEstado={mudarEstadoOrc}
      />

      <FaturaDetalhesModal
        fatura={fatDetalhe}
        empresa={empresa}
        onClose={() => setFatDetalhe(null)}
        onChanged={(atual) => {
          setFatDetalhe(atual);
          setFaturas((prev) => prev.map((x) => (x.id === atual.id ? atual : x)));
        }}
      />

      <FaturaModal
        open={fatFormOpen}
        onClose={() => setFatFormOpen(false)}
        onSaved={() => atualizarFaturas()}
      />

      <ConfirmDialog
        open={Boolean(anularItem)}
        onClose={() => { setAnularItem(null); setMotivoAnulacao(""); }}
        onConfirm={confirmarAnulacao}
        loading={anulando}
        confirmDisabled={!motivoAnulacao.trim()}
        title={anularItem?._tipo === "proposta" ? "Anular proposta" : "Anular orçamento"}
        icon="block"
        confirmLabel={anularItem?._tipo === "proposta" ? "Anular proposta" : "Anular orçamento"}
        description={
          anularItem
            ? anularItem._tipo === "proposta"
              ? `Anular a proposta "${anularItem.numero}"? O registo não é apagado: fica no sistema, marcado como anulado.`
              : `Anular o orçamento "${anularItem.numero}"? O registo não é apagado: fica no sistema, marcado como anulado.`
            : ""
        }
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Motivo da anulação *
          </span>
          <textarea
            value={motivoAnulacao}
            onChange={(e) => setMotivoAnulacao(e.target.value)}
            rows={3}
            placeholder="Indique o motivo da anulação"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </label>
      </ConfirmDialog>


      {tab === "orcamentos" && (
        <FloatButton
          onClick={() => {
            setOrcPrefill(null);
            setOrcForm({ open: true, id: null });
          }}
          label="Novo Orçamento"
          icon="request_quote"
        />
      )}

      {tab === "propostas" && (
        <FloatButton
          onClick={() => setPropForm({ open: true, proposta: null })}
          label="Nova Proposta"
          icon="description"
        />
      )}

      {tab === "vendas" && (
        <FloatButton
          onClick={() => setFatFormOpen(true)}
          label="Nova Fatura"
          icon="receipt_long"
        />
      )}
    </div>
  );
}
