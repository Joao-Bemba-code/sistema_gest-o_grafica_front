"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { inputCls } from "@/lib/estoque";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import FloatButton from "@/components/ui/FloatButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Avatar from "@/components/ui/Avatar";
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
import {
  listar,
  criar,
  atualizar,
  anular,
  listarDocumentos,
  anexarDocumentos,
  anularDocumento,
  abrirDocumento,
} from "@/services/clientes";
import { listarFaturas } from "@/services/faturacao";
import { buscarOrganizacao } from "@/services/configuracoes";
import gerarFichaClientePdf from "@/lib/fichaClientePdf";
import ClienteForm from "./ClienteForm";
import ClienteDetalhes from "./ClienteDetalhes";

const initialForm = {
  tipo: "cliente", nome: "", empresa: "", nif: "", telefone: "",
  whatsapp: "", email: "", endereco: "",
  pessoa_contacto: "", pessoa_funcao: "", pessoa_telefone: "", pessoa_email: "",
  dataCadastro: new Date().toISOString().split("T")[0],
  // Ficha de registro de clientes (COM-CLI-01)
  tipo_cliente: "", nome_comercial: "", segmento: "", unidade_negocio: "",
  unidades_secundarias: [], pais: "Angola", provincia: "", municipio: "", bairro: "",
  rua: "", numero_porta: "", categoria: "", setor_atividade: "", fonte_origem: "",
  referencia_interna: "", observacoes: "", ativo: true,
};

const FILTRO_VAZIO = { termo: "", segmento: "", estado: "" };

const SEGMENTOS = [
  { value: "cliente", label: "Cliente" },
  { value: "fornecedor", label: "Fornecedor" },
];

const ESTADOS = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
];

const campoCls =
  "h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/25";

function formatBytes(n) {
  const v = Number(n || 0);
  if (!v) return "—";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-AO");
}

function iconeDocumento(doc) {
  const mime = String(doc.mime || "").toLowerCase();
  return mime.includes("pdf") ? "picture_as_pdf" : "image";
}

export default function CadastrosTab({ apenas, mesFiltro = null, faturas } = {}) {
  const tipoPadrao = apenas || "cliente";
  const ehCliente = apenas === "cliente";
  const formVazio = { ...initialForm, tipo: tipoPadrao };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [clientes, setClientes] = useState([]);
  const [faturasLocal, setFaturasLocal] = useState([]);
  const [rascunho, setRascunho] = useState(FILTRO_VAZIO);
  const [aplicado, setAplicado] = useState(FILTRO_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [detalhes, setDetalhes] = useState(null);
  const [cadastroAnular, setCadastroAnular] = useState(null);
  const [motivoCadastroAnular, setMotivoCadastroAnular] = useState("");
  const [anulandoCadastro, setAnulandoCadastro] = useState(false);
  // Documentos: anexados no formulário (enviados logo após guardar), mostrados
  // nos detalhes e anulados — nunca eliminados.
  const [ficheirosForm, setFicheirosForm] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [carregandoDocs, setCarregandoDocs] = useState(false);
  const [ficheirosDetalhe, setFicheirosDetalhe] = useState([]);
  const [enviandoDocs, setEnviandoDocs] = useState(false);
  const [docAnular, setDocAnular] = useState(null);
  const [anulando, setAnulando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const { addToast } = useToast();

  const carregar = useCallback(async () => {
    try {
      const data = await listar({});
      setClientes(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar clientes", "error");
      setClientes([]);
    } finally { setCarregando(false); }
  }, [addToast]);

  useEffect(() => {
    let ativo = true;
    listar({})
      .then((data) => { if (ativo) setClientes(Array.isArray(data) ? data : data?.data ?? []); })
      .catch((err) => {
        if (!ativo) return;
        addToast(err.response?.data?.erro || "Erro ao carregar clientes", "error");
        setClientes([]);
      })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [addToast]);

  // Na página Clientes (fora do Comercial) ainda não há faturas carregadas:
  // busca-as aqui para calcular as pendências. No Comercial chegam por prop.
  useEffect(() => {
    if (!ehCliente || Array.isArray(faturas)) return undefined;
    let ativo = true;
    listarFaturas()
      .then((d) => { if (ativo) setFaturasLocal(Array.isArray(d) ? d : d?.data ?? []); })
      .catch(() => { if (ativo) setFaturasLocal([]); });
    return () => { ativo = false; };
  }, [ehCliente, faturas]);

  const base = useMemo(
    () => (apenas ? clientes.filter((c) => (c.tipo === "fornecedor" ? "fornecedor" : "cliente") === apenas) : clientes),
    [clientes, apenas]
  );

  const totalClientes = clientes.filter((c) => c.tipo === "cliente").length;
  const totalFornecedores = clientes.filter((c) => c.tipo === "fornecedor").length;

  const faturasDisponiveis = Array.isArray(faturas) ? faturas : faturasLocal;

  const periodo = useMemo(() => {
    const ref = mesFiltro instanceof Date ? mesFiltro : new Date();
    const chave = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
    const rotulo = ref.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
    return { chave, rotulo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1) };
  }, [mesFiltro]);

  const totalAtivos = useMemo(() => base.filter((c) => c.ativo !== false).length, [base]);
  const totalInativos = useMemo(() => base.filter((c) => c.ativo === false).length, [base]);

  const novosNoPeriodo = useMemo(
    () => base.filter((c) => String(c.dataCadastro || c.data_cadastro || "").startsWith(periodo.chave)).length,
    [base, periodo.chave]
  );

  // Saldo em aberto por cliente: faturas não pagas/anuladas e recibos não contam.
  const dividaPorCliente = useMemo(() => {
    const mapa = new Map();
    for (const f of faturasDisponiveis) {
      if (!f || ["recibo", "proforma", "nota_credito"].includes(f.tipo) || ["paga", "cancelada"].includes(f.estado)) continue;
      const cid = Number(f.cliente_id ?? f.cliente?.id);
      if (!Number.isInteger(cid) || cid <= 0) continue;
      const saldo = Number(f.total ?? f.valor ?? 0) - Number(f.valor_pago ?? 0);
      if (saldo <= 0) continue;
      mapa.set(cid, (mapa.get(cid) || 0) + saldo);
    }
    return mapa;
  }, [faturasDisponiveis]);

  const clientesComPendencia = useMemo(
    () => base.filter((c) => (dividaPorCliente.get(Number(c.id)) || 0) > 0).length,
    [base, dividaPorCliente]
  );

  const resultado = useMemo(() => {
    const termo = aplicado.termo.trim().toLowerCase();
    let res = [...base];
    if (termo) {
      res = res.filter((c) =>
        `${c.nome || ""} ${c.nif || ""} ${c.codigo || ""}`.toLowerCase().includes(termo)
      );
    }
    if (aplicado.segmento) {
      res = res.filter((c) => (c.tipo === "fornecedor" ? "fornecedor" : "cliente") === aplicado.segmento);
    }
    if (aplicado.estado === "ativo") res = res.filter((c) => c.ativo !== false);
    if (aplicado.estado === "inativo") res = res.filter((c) => c.ativo === false);
    return res;
  }, [base, aplicado]);

  const temFiltro = Boolean(aplicado.termo || aplicado.segmento || aplicado.estado);
  const aplicar = () => setAplicado({ ...rascunho });
  const limpar = () => {
    setRascunho(FILTRO_VAZIO);
    setAplicado(FILTRO_VAZIO);
  };

  const pag = usePaginacao({ items: resultado });

  const abrirNovo = () => {
    setEditando(null);
    setForm(formVazio);
    setFicheirosForm([]);
    setShowForm(true);
  };

  const carregarDocumentos = useCallback(async (clienteId) => {
    if (!clienteId) {
      setDocumentos([]);
      return;
    }
    setCarregandoDocs(true);
    try {
      const data = await listarDocumentos(clienteId);
      setDocumentos(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar documentos", "error");
      setDocumentos([]);
    } finally {
      setCarregandoDocs(false);
    }
  }, [addToast]);

  const abrirDetalhes = (item) => {
    setDetalhes(item);
    setFicheirosDetalhe([]);
    setDocumentos([]);
    carregarDocumentos(item?.id);
  };

  const fecharDetalhes = () => {
    setDetalhes(null);
    setDocumentos([]);
    setFicheirosDetalhe([]);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(formVazio);
    setFicheirosForm([]);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rotulo = form.tipo === "fornecedor" ? "Fornecedor" : "Cliente";
    try {
      // O endereço completo continua a alimentar os PDFs e as entregas.
      const payload = form.tipo === "fornecedor"
        ? form
        : {
            ...form,
            endereco: [form.rua, form.numero_porta, form.bairro, form.municipio, form.provincia]
              .map((v) => String(v || "").trim())
              .filter(Boolean)
              .join(", "),
          };
      const salvo = editando ? await atualizar(editando, payload) : await criar(payload);
      addToast(`${rotulo} ${editando ? "atualizado" : "cadastrado"} com sucesso`, "success");
      if (ficheirosForm.length && salvo?.id) {
        try {
          await anexarDocumentos(salvo.id, ficheirosForm);
          addToast(
            `${ficheirosForm.length} documento${ficheirosForm.length > 1 ? "s" : ""} anexado${ficheirosForm.length > 1 ? "s" : ""}`,
            "success"
          );
        } catch (err) {
          addToast(
            err.response?.data?.erro || `${rotulo} guardado, mas os documentos não foram anexados`,
            "error"
          );
        }
      }
      fecharForm();
      carregar();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  const abrirAnulacao = (item) => {
    setCadastroAnular(item);
    setMotivoCadastroAnular("");
  };

  const confirmarAnulacaoCadastro = async () => {
    if (!cadastroAnular) return;
    const motivo = motivoCadastroAnular.trim();
    if (!motivo) {
      addToast("Indique o motivo da anulação", "error");
      return;
    }
    setAnulandoCadastro(true);
    try {
      await anular(cadastroAnular.id, motivo);
      addToast("Cadastro anulado com sucesso", "success");
      carregar();
      setCadastroAnular(null);
      setMotivoCadastroAnular("");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    } finally {
      setAnulandoCadastro(false);
    }
  };

  const abrirDocumentoGuardado = async (doc) => {
    try {
      await abrirDocumento(doc.id);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao abrir o documento", "error");
    }
  };

  const baixarFichaPdf = async () => {
    if (!detalhes) return;
    setGerandoPdf(true);
    try {
      let org = empresa;
      if (!org) {
        org = (await buscarOrganizacao().catch(() => null)) || null;
        setEmpresa(org);
      }
      await gerarFichaClientePdf(detalhes, org || {}, documentos);
    } catch (err) {
      addToast(err?.message || "Erro ao gerar o PDF da ficha", "error");
    } finally {
      setGerandoPdf(false);
    }
  };

  const anexarNoDetalhe = async () => {
    if (!detalhes?.id || !ficheirosDetalhe.length) return;
    setEnviandoDocs(true);
    try {
      await anexarDocumentos(detalhes.id, ficheirosDetalhe);
      addToast(
        `${ficheirosDetalhe.length} documento${ficheirosDetalhe.length > 1 ? "s" : ""} anexado${ficheirosDetalhe.length > 1 ? "s" : ""}`,
        "success"
      );
      setFicheirosDetalhe([]);
      await carregarDocumentos(detalhes.id);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao anexar documentos", "error");
    } finally {
      setEnviandoDocs(false);
    }
  };

  const confirmarAnulacao = async () => {
    if (!docAnular) return;
    setAnulando(true);
    try {
      const atualizado = await anularDocumento(docAnular.id);
      setDocumentos((prev) => prev.map((d) => (d.id === atualizado.id ? atualizado : d)));
      addToast("Documento anulado — mantém-se no histórico", "success");
      setDocAnular(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao anular documento", "error");
    } finally {
      setAnulando(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      tipo: item.tipo || tipoPadrao, codigo: item.codigo || "", nome: item.nome || "", empresa: item.empresa || "",
      nif: item.nif || "", telefone: item.telefone || "", whatsapp: item.whatsapp || "",
      email: item.email || "", endereco: item.endereco || "",
      pessoa_contacto: item.pessoa_contacto || "", pessoa_funcao: item.pessoa_funcao || "",
      pessoa_telefone: item.pessoa_telefone || "", pessoa_email: item.pessoa_email || "",
      dataCadastro: item.dataCadastro ? item.dataCadastro.split("T")[0] : new Date().toISOString().split("T")[0],
      tipo_cliente: item.tipo_cliente || "", nome_comercial: item.nome_comercial || "",
      segmento: item.segmento || "", unidade_negocio: item.unidade_negocio || "",
      unidades_secundarias: Array.isArray(item.unidades_secundarias) ? item.unidades_secundarias : [],
      pais: item.pais || "Angola", provincia: item.provincia || "", municipio: item.municipio || "",
      bairro: item.bairro || "", rua: item.rua || "", numero_porta: item.numero_porta || "",
      categoria: item.categoria || "", setor_atividade: item.setor_atividade || "",
      fonte_origem: item.fonte_origem || "", referencia_interna: item.referencia_interna || "",
      observacoes: item.observacoes || "", ativo: item.ativo !== false,
    });
    setFicheirosForm([]);
    setEditando(item._id || item.id || item.codigo);
    setShowForm(true);
  };

  const titulo = apenas === "fornecedor" ? "Fornecedores" : apenas === "cliente" ? "Clientes" : "Cadastros";
  const rotuloSingular = apenas === "fornecedor" ? "Fornecedor" : apenas === "cliente" ? "Cliente" : "Cadastro";
  const subtitulo = apenas
    ? `${base.length} ${apenas === "fornecedor" ? "fornecedores" : "clientes"}`
    : `Clientes e fornecedores · ${clientes.length} registos (${totalClientes} clientes, ${totalFornecedores} fornecedores)`;

  return (
    <div className="space-y-4">
      {ehCliente && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-4">
          {[
            { label: "CLIENTES ACTIVOS", valor: totalAtivos, icone: "groups", tom: "bg-primary/10 text-primary" },
            { label: "NOVOS NO PERÍODO", valor: novosNoPeriodo, icone: "person_add", tom: "bg-info/10 text-info", legenda: periodo.rotulo },
            { label: "COM PENDÊNCIAS", valor: clientesComPendencia, icone: "pending_actions", tom: "bg-warning/10 text-warning" },
            { label: "CLIENTES INACTIVOS", valor: totalInativos, icone: "person_off", tom: "bg-muted text-muted-foreground" },
          ].map((k) => (
            <div key={k.label} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${k.tom}`}>
                <Icon name={k.icone} className="text-xl" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-black leading-tight tracking-tight text-foreground tabular-nums">{k.valor}</p>
                {k.legenda && <p className="text-[10px] font-medium text-muted-foreground">{k.legenda}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Ledger rotulo={`${titulo} ledger`}>
        <LedgerHeader titulo={titulo} subtitulo={subtitulo} />

        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Filtros</p>
          <div className="flex flex-wrap items-end gap-2.5">
            <label className="flex min-w-44 flex-1 flex-col gap-1 sm:max-w-64 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Nome / NIF</span>
              <input
                value={rascunho.termo}
                onChange={(e) => setRascunho((f) => ({ ...f, termo: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") aplicar(); }}
                placeholder="Pesquisar nome ou NIF"
                aria-label="Nome ou NIF"
                className={campoCls}
              />
            </label>

            <label className="flex min-w-36 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Segmento</span>
              <select
                value={rascunho.segmento}
                onChange={(e) => setRascunho((f) => ({ ...f, segmento: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {SEGMENTOS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>

            <label className="flex min-w-32 flex-1 flex-col gap-1 sm:flex-none">
              <span className="text-[11px] font-medium text-muted-foreground">Estado</span>
              <select
                value={rascunho.estado}
                onChange={(e) => setRascunho((f) => ({ ...f, estado: e.target.value }))}
                className={campoCls}
              >
                <option value="">Todos</option>
                {ESTADOS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
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
        {carregando ? (
          <div className="p-4"><ListSkeleton count={5} /></div>
        ) : (
          <>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh>Código</LedgerTh>
                  <LedgerTh>{apenas === "fornecedor" ? "Fornecedor" : "Cliente"}</LedgerTh>
                  <LedgerTh>NIF</LedgerTh>
                  <LedgerTh>Contacto</LedgerTh>
                  <LedgerTh>Estado</LedgerTh>
                  <LedgerTh className="w-10" />
                </tr>
              </thead>
              <tbody>
                {pag.visiveis.map((item) => (
                  <LedgerTr key={item.id ?? item.codigo} onClick={() => abrirDetalhes(item)}>
                    <LedgerTd className="max-w-40">
                      <IdCell id={item.codigo || "—"} aoAbrir={() => abrirDetalhes(item)} />
                    </LedgerTd>
                    <LedgerTd className="max-w-56">
                      <span className="flex items-center gap-2.5">
                        <Avatar nome={item.nome} tamanho="sm" />
                        <span className="block min-w-0 truncate text-sm">{item.nome || "—"}</span>
                      </span>
                    </LedgerTd>
                    <LedgerTd className="whitespace-nowrap font-mono text-xs text-muted-foreground">{item.nif || "—"}</LedgerTd>
                    <LedgerTd className="max-w-44 whitespace-nowrap">
                      <span className="block truncate">{item.telefone || item.whatsapp || item.email || "—"}</span>
                    </LedgerTd>
                    <LedgerTd>
                      <StatusBadge tom={item.anulado ? "error" : item.ativo === false ? "neutral" : "success"}>
                        {item.anulado ? "Anulado" : item.ativo === false ? "Inativo" : "Ativo"}
                      </StatusBadge>
                    </LedgerTd>
                    <LedgerTd>
                      <RowMenu
                        ariaLabel="Ações do cadastro"
                        itens={[
                          { icone: "visibility", rotulo: "Ver detalhes", onClick: () => abrirDetalhes(item) },
                          { icone: "edit", rotulo: "Editar", onClick: () => handleEdit(item) },
                          ...(item.anulado
                            ? []
                            : [{ icone: "block", rotulo: "Anular", danger: true, onClick: () => abrirAnulacao(item) }]),
                        ]}
                      />
                    </LedgerTd>
                  </LedgerTr>
                ))}
              </tbody>
            </LedgerTable>
            {pag.total === 0 && <LedgerEmpty icone="search_off">Nenhum {apenas === "fornecedor" ? "fornecedor" : apenas === "cliente" ? "cliente" : "cadastro"} encontrado</LedgerEmpty>}
            <Paginacao {...pag} label="cadastros" />
          </>
        )}
      </Ledger>

      <Modal open={showForm} onClose={fecharForm} title={editando ? `Editar ${rotuloSingular}` : `Novo ${rotuloSingular}`} icon={apenas === "fornecedor" ? "local_shipping" : "person_add"} size="2xl"
        footer={<><Button type="button" variant="outline" onClick={fecharForm}>Cancelar</Button><Button type="submit" form="form-cliente">Guardar {form.tipo === "cliente" ? "Cliente" : "Fornecedor"}</Button></>}>
        <form id="form-cliente" onSubmit={handleSubmit} className="space-y-5">
          {form.tipo !== "fornecedor" ? (
            <ClienteForm
              formId="form-cliente"
              form={form}
              onChange={(campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))}
              ficheiros={ficheirosForm}
              onFicheiros={setFicheirosForm}
              existentes={clientes}
            />
          ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {!apenas && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo de Cadastro *</label>
                <div className="flex gap-2">
                  {["cliente", "fornecedor"].map((t) => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, tipo: t })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-xs font-bold ${
                        form.tipo === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-muted/50 text-muted-foreground"
                      }`}>
                      <Icon name={t === "cliente" ? "person" : "local_shipping"} className="text-lg" />
                      {t === "cliente" ? "Cliente" : "Fornecedor"}
                    </button>
                  ))}
                </div>
              </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: "nome", label: "Nome Completo / Razão Social *", placeholder: form.tipo === "cliente" ? "Ex: João Matos" : "Ex: Papelaria Angola Lda", required: true },
                  { name: "empresa", label: "Empresa", placeholder: "Ex: Gráfica Expresso" },
                  { name: "nif", label: "NIF *", placeholder: "Ex: 541236987", required: true },
                  { name: "telefone", label: "Telefone *", placeholder: "Ex: +244 923 456 789", required: true },
                  { name: "whatsapp", label: "WhatsApp", placeholder: "Ex: +244 923 456 789" },
                  { name: "email", label: "Email", placeholder: "Ex: contato@email.com", type: "email" },
                ].map((f) => (
                  <div key={f.name} className={f.name === "email" ? "sm:col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"}>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{f.label}</label>
                    <input required={f.required} name={f.name} type={f.type || "text"} value={form[f.name]} onChange={handleChange}
                      className={inputCls}
                      placeholder={f.placeholder} />
                  </div>
                ))}
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Endereço</label>
                  <input name="endereco" value={form.endereco} onChange={handleChange}
                    className={inputCls}
                    placeholder="Ex: Rua Major Kanhangulo, 145 - Luanda" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data de Cadastro</label>
                  <input name="dataCadastro" type="date" value={form.dataCadastro} onChange={handleChange}
                    className={inputCls} />
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pessoa de contacto
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { name: "pessoa_contacto", label: "Nome da pessoa", placeholder: "Ex: Ana Domingos" },
                    { name: "pessoa_funcao", label: "Função / Cargo", placeholder: "Ex: Directora financeira" },
                    { name: "pessoa_telefone", label: "Telefone da pessoa", placeholder: "Ex: +244 923 456 789" },
                    { name: "pessoa_email", label: "Email da pessoa", placeholder: "Ex: ana@empresa.ao", type: "email" },
                  ].map((f) => (
                    <div key={f.name} className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{f.label}</label>
                      <input name={f.name} type={f.type || "text"} value={form[f.name]} onChange={handleChange}
                        className={inputCls} placeholder={f.placeholder} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Documentos do cadastro
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFicheirosForm(Array.from(e.target.files || []))}
                  className={inputCls}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  PDF ou imagem (JPG, PNG, WEBP), até 10 MB cada. Os documentos não podem ser eliminados — só anulados, ficando no histórico.
                </p>
                {ficheirosForm.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {ficheirosForm.map((f, i) => (
                      <p key={i} className="truncate text-[11px] text-foreground">{f.name} · {formatBytes(f.size)}</p>
                    ))}
                    <p className="text-[10px] text-muted-foreground">
                      Serão anexados ao guardar o {rotuloSingular.toLowerCase()}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(detalhes)}
        onClose={fecharDetalhes}
        title={`Detalhes do ${detalhes?.tipo === "fornecedor" ? "fornecedor" : "cliente"}`}
        icon={detalhes?.tipo === "fornecedor" ? "local_shipping" : "person"}
        size={detalhes && detalhes.tipo !== "fornecedor" ? "2xl" : "md"}
        footer={detalhes && (
          <>
            {detalhes.tipo !== "fornecedor" && (
              <Button
                type="button"
                variant="outline"
                onClick={baixarFichaPdf}
                loading={gerandoPdf}
              >
                <Icon name="picture_as_pdf" className="text-base" /> Ficha PDF
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const item = detalhes;
                fecharDetalhes();
                handleEdit(item);
              }}
            >
              <Icon name="edit" className="text-base" /> Editar
            </Button>
            {!detalhes.anulado && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  const item = detalhes;
                  fecharDetalhes();
                  abrirAnulacao(item);
                }}
              >
                <Icon name="block" className="text-base" /> Anular
              </Button>
            )}
          </>
        )}
      >
        {detalhes && (detalhes.tipo !== "fornecedor" ? (
          <ClienteDetalhes
            cliente={detalhes}
            documentos={documentos}
            carregandoDocs={carregandoDocs}
            ficheirosNovos={ficheirosDetalhe}
            onFicheirosNovos={setFicheirosDetalhe}
            enviandoDocs={enviandoDocs}
            onAnexar={anexarNoDetalhe}
            onAbrirDocumento={abrirDocumentoGuardado}
            onAnularDocumento={setDocAnular}
          />
        ) : (
          <>
            <dl className="divide-y divide-border/50">
              {[
                { label: "Código", value: detalhes.codigo },
                { label: "Tipo", value: detalhes.tipo === "fornecedor" ? "Fornecedor" : "Cliente" },
                { label: "Estado", value: detalhes.anulado ? "Anulado" : detalhes.ativo === false ? "Inativo" : "Ativo" },
                ...(detalhes.anulado
                  ? [
                      { label: "Anulado por", value: detalhes.anulado_por || "—" },
                      { label: "Anulado em", value: formatData(detalhes.data_anulacao) },
                      { label: "Motivo da anulação", value: detalhes.motivo_anulacao || "—" },
                    ]
                  : []),
                { label: "Nome", value: detalhes.nome },
                { label: "Empresa", value: detalhes.empresa || "—" },
                { label: "NIF", value: detalhes.nif || "—" },
                { label: "Telefone", value: detalhes.telefone || "—" },
                { label: "WhatsApp", value: detalhes.whatsapp || "—" },
                { label: "Email", value: detalhes.email || "—" },
                { label: "Endereço", value: detalhes.endereco || "—" },
                { label: "Pessoa de contacto", value: detalhes.pessoa_contacto || "—" },
                { label: "Função da pessoa", value: detalhes.pessoa_funcao || "—" },
                { label: "Telefone da pessoa", value: detalhes.pessoa_telefone || "—" },
                { label: "Email da pessoa", value: detalhes.pessoa_email || "—" },
                ...(detalhes.tipo !== "fornecedor"
                  ? [
                      { label: "Tipo de cliente", value: detalhes.tipo_cliente || "—" },
                      { label: "Nome comercial", value: detalhes.nome_comercial || "—" },
                      { label: "Segmento", value: detalhes.segmento || "—" },
                      { label: "Unidade de negócio", value: detalhes.unidade_negocio || "—" },
                      {
                        label: "Unidades secundárias",
                        value: Array.isArray(detalhes.unidades_secundarias) && detalhes.unidades_secundarias.length
                          ? detalhes.unidades_secundarias.join(", ")
                          : "—",
                      },
                      { label: "País", value: detalhes.pais || "—" },
                      { label: "Província", value: detalhes.provincia || "—" },
                      { label: "Município", value: detalhes.municipio || "—" },
                      { label: "Bairro", value: detalhes.bairro || "—" },
                      { label: "Rua / Avenida", value: detalhes.rua || "—" },
                      { label: "N.º / Porta", value: detalhes.numero_porta || "—" },
                      { label: "Categoria", value: detalhes.categoria || "—" },
                      { label: "Setor de atividade", value: detalhes.setor_atividade || "—" },
                      { label: "Fonte de origem", value: detalhes.fonte_origem || "—" },
                      { label: "Referência interna", value: detalhes.referencia_interna || "—" },
                      { label: "Observações", value: detalhes.observacoes || "—" },
                    ]
                  : []),
                { label: "Data de cadastro", value: detalhes.dataCadastro ? new Date(detalhes.dataCadastro).toLocaleDateString("pt-BR") : "—" },
              ].map((linha) => (
                <div key={linha.label} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {linha.label}
                  </dt>
                  <dd className="min-w-0 truncate text-right font-medium text-foreground">
                    {linha.label === "Tipo" || linha.label === "Estado" ? (
                      <StatusBadge
                        tom={
                          linha.label === "Tipo"
                            ? detalhes.tipo === "fornecedor" ? "info" : "success"
                            : detalhes.anulado ? "error" : detalhes.ativo === false ? "neutral" : "success"
                        }
                      >
                        {linha.value}
                      </StatusBadge>
                    ) : (
                      linha.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            {detalhes.id && (
              <div className="mt-5 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Documentos
                  </p>
                  {carregandoDocs && (
                    <span className="text-[10px] text-muted-foreground">a carregar…</span>
                  )}
                </div>

                {documentos.length === 0 && !carregandoDocs ? (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    Ainda não há documentos anexados a este cadastro.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {documentos.map((doc) => (
                      <div
                        key={doc.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border border-border/60 p-2.5",
                          doc.anulado && "bg-muted/40"
                        )}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon name={iconeDocumento(doc)} className="text-[16px] text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "truncate text-xs font-semibold",
                            doc.anulado ? "text-muted-foreground line-through" : "text-foreground"
                          )}>
                            {doc.nome_original}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatBytes(doc.tamanho)} · {formatData(doc.createdAt)}
                            {doc.anulado
                              ? ` · Anulado em ${formatData(doc.anulado_em)}${doc.anulado_por ? ` por ${doc.anulado_por}` : ""}`
                              : doc.anexado_por ? ` · Anexado por ${doc.anexado_por}` : ""}
                          </p>
                        </div>
                        {doc.anulado && <StatusBadge tom="neutral">Anulado</StatusBadge>}
                        <button
                          type="button"
                          onClick={() => abrirDocumentoGuardado(doc)}
                          className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                          title="Abrir documento"
                        >
                          <Icon name="open_in_new" className="text-[16px]" />
                        </button>
                        {!doc.anulado && (
                          <button
                            type="button"
                            onClick={() => setDocAnular(doc)}
                            className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                            title="Anular documento"
                          >
                            <Icon name="block" className="text-[16px]" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setFicheirosDetalhe(Array.from(e.target.files || []))}
                    className={inputCls}
                  />
                  {ficheirosDetalhe.length > 0 && (
                    <Button size="sm" onClick={anexarNoDetalhe} loading={enviandoDocs} className="mt-2">
                      <Icon name="upload" className="text-[14px]" />
                      Anexar {ficheirosDetalhe.length > 1 ? `${ficheirosDetalhe.length} ficheiros` : "ficheiro"}
                    </Button>
                  )}
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    PDF ou imagem, até 10 MB cada. Os documentos não podem ser eliminados; podem ser anulados e ficam no histórico.
                  </p>
                </div>
              </div>
            )}
          </>
        ))}
      </Modal>

      <ConfirmDialog
        open={Boolean(cadastroAnular)}
        onClose={() => { setCadastroAnular(null); setMotivoCadastroAnular(""); }}
        onConfirm={confirmarAnulacaoCadastro}
        loading={anulandoCadastro}
        confirmDisabled={!motivoCadastroAnular.trim()}
        title="Anular cadastro"
        icon="block"
        confirmLabel="Anular cadastro"
        description={
          cadastroAnular
            ? `Anular o cadastro "${cadastroAnular.nome}"? O registo não é apagado: fica no sistema, marcado como anulado.`
            : ""
        }
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Motivo da anulação *
          </span>
          <textarea
            value={motivoCadastroAnular}
            onChange={(e) => setMotivoCadastroAnular(e.target.value)}
            rows={3}
            placeholder="Indique o motivo da anulação"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(docAnular)}
        onClose={() => setDocAnular(null)}
        onConfirm={confirmarAnulacao}
        loading={anulando}
        title="Anular documento"
        icon="block"
        confirmLabel="Anular documento"
        description={
          docAnular
            ? `Anular o documento "${docAnular.nome_original}"? O ficheiro não é apagado: fica guardado no histórico, marcado como anulado.`
            : ""
        }
      />

      <FloatButton onClick={abrirNovo} label={`Novo ${rotuloSingular}`} icon={apenas === "fornecedor" ? "local_shipping" : "person_add"} />
    </div>
  );
}
