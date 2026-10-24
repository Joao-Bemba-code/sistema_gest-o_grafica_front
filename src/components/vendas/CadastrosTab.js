"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { inputCls } from "@/lib/estoque";
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
import { listar, criar, atualizar, remover } from "@/services/clientes";
import { listarFaturas } from "@/services/faturacao";

const initialForm = {
  tipo: "cliente", nome: "", empresa: "", nif: "", telefone: "",
  whatsapp: "", email: "", endereco: "",
  dataCadastro: new Date().toISOString().split("T")[0],
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
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
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
    setShowForm(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rotulo = form.tipo === "fornecedor" ? "Fornecedor" : "Cliente";
    try {
      if (editando) {
        await atualizar(editando, form);
        addToast(`${rotulo} atualizado com sucesso`, "success");
      } else {
        await criar(form);
        addToast(`${rotulo} cadastrado com sucesso`, "success");
      }
      setForm(formVazio); setShowForm(false); setEditando(null);
      carregar();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  const confirmarEliminacao = async () => {
    if (!eliminarItem) return;
    setDeletando(true);
    try {
      await remover(eliminarItem.id ?? eliminarItem.codigo);
      addToast("Cadastro removido com sucesso", "success");
      carregar();
      setEliminarItem(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    } finally {
      setDeletando(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      tipo: item.tipo || tipoPadrao, nome: item.nome || "", empresa: item.empresa || "",
      nif: item.nif || "", telefone: item.telefone || "", whatsapp: item.whatsapp || "",
      email: item.email || "", endereco: item.endereco || "",
      dataCadastro: item.dataCadastro ? item.dataCadastro.split("T")[0] : new Date().toISOString().split("T")[0],
    });
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
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {[
            { label: "Clientes ativos", valor: totalAtivos, icone: "groups", tom: "bg-primary/10 text-primary" },
            { label: "Novos no período", valor: novosNoPeriodo, icone: "person_add", tom: "bg-info/10 text-info", legenda: periodo.rotulo },
            { label: "Pendências", valor: clientesComPendencia, icone: "pending_actions", tom: "bg-warning/10 text-warning" },
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
                  <LedgerTr key={item.id ?? item.codigo} onClick={() => setDetalhes(item)}>
                    <LedgerTd className="max-w-40">
                      <IdCell id={item.codigo || "—"} aoAbrir={() => setDetalhes(item)} />
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
                      <StatusBadge tom={item.ativo === false ? "neutral" : "success"}>
                        {item.ativo === false ? "Inativo" : "Ativo"}
                      </StatusBadge>
                    </LedgerTd>
                    <LedgerTd>
                      <RowMenu
                        ariaLabel="Ações do cadastro"
                        itens={[
                          { icone: "visibility", rotulo: "Ver detalhes", onClick: () => setDetalhes(item) },
                          { icone: "edit", rotulo: "Editar", onClick: () => handleEdit(item) },
                          { icone: "delete", rotulo: "Remover", danger: true, onClick: () => setEliminarItem(item) },
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

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditando(null); setForm(formVazio); }} title={editando ? `Editar ${rotuloSingular}` : `Novo ${rotuloSingular}`} icon={apenas === "fornecedor" ? "local_shipping" : "person_add"} size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditando(null); setForm(formVazio); }}>Cancelar</Button><Button type="submit" form="form-cliente">Guardar {form.tipo === "cliente" ? "Cliente" : "Fornecedor"}</Button></>}>
        <form id="form-cliente" onSubmit={handleSubmit} className="space-y-5">
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
              <div key={f.name} className={f.name === "endereco" || f.name === "email" ? "sm:col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"}>
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
        </form>
      </Modal>

      <Modal
        open={Boolean(detalhes)}
        onClose={() => setDetalhes(null)}
        title="Detalhes do cadastro"
        icon={detalhes?.tipo === "fornecedor" ? "local_shipping" : "person"}
        size="sm"
        footer={detalhes && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const item = detalhes;
                setDetalhes(null);
                handleEdit(item);
              }}
            >
              <Icon name="edit" className="text-base" /> Editar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const item = detalhes;
                setDetalhes(null);
                setEliminarItem(item);
              }}
            >
              <Icon name="delete" className="text-base" /> Eliminar
            </Button>
          </>
        )}
      >
        {detalhes && (
          <dl className="divide-y divide-border/50">
            {[
              { label: "Código", value: detalhes.codigo },
              { label: "Tipo", value: detalhes.tipo === "fornecedor" ? "Fornecedor" : "Cliente" },
              { label: "Nome", value: detalhes.nome },
              { label: "Empresa", value: detalhes.empresa || "—" },
              { label: "NIF", value: detalhes.nif || "—" },
              { label: "Telefone", value: detalhes.telefone || "—" },
              { label: "WhatsApp", value: detalhes.whatsapp || "—" },
              { label: "Email", value: detalhes.email || "—" },
              { label: "Endereço", value: detalhes.endereco || "—" },
              { label: "Data de cadastro", value: detalhes.dataCadastro ? new Date(detalhes.dataCadastro).toLocaleDateString("pt-BR") : "—" },
            ].map((linha) => (
              <div key={linha.label} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {linha.label}
                </dt>
                <dd className="min-w-0 truncate text-right font-medium text-foreground">
                  {linha.label === "Tipo" ? (
                    <StatusBadge tom={detalhes.tipo === "fornecedor" ? "info" : "success"}>{linha.value}</StatusBadge>
                  ) : (
                    linha.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(eliminarItem)}
        onClose={() => setEliminarItem(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title="Eliminar cadastro"
        description={
          eliminarItem
            ? `Tem a certeza que deseja eliminar "${eliminarItem.nome}"? Esta ação não pode ser desfeita e removerá o cadastro de forma definitiva.`
            : ""
        }
      />

      <FloatButton onClick={abrirNovo} label={`Novo ${rotuloSingular}`} icon={apenas === "fornecedor" ? "local_shipping" : "person_add"} />
    </div>
  );
}
