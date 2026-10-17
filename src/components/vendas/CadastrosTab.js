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
  FilterRow,
  LedgerTable,
  LedgerTh,
  LedgerTr,
  LedgerTd,
  IdCell,
  StatusBadge,
  LedgerEmpty,
} from "@/components/ui/Ledger";
import { listar, criar, atualizar, remover } from "@/services/clientes";

const initialForm = {
  tipo: "cliente", nome: "", empresa: "", nif: "", telefone: "",
  whatsapp: "", email: "", endereco: "",
  dataCadastro: new Date().toISOString().split("T")[0],
};

const CAMPOS = [
  { value: "geral", label: "Todos os campos", obter: (c) => `${c.nome || ""} ${c.empresa || ""} ${c.codigo || ""} ${c.nif || ""}` },
  { value: "nome", label: "Nome", obter: (c) => c.nome || "" },
  { value: "empresa", label: "Empresa", obter: (c) => c.empresa || "" },
  { value: "nif", label: "NIF", obter: (c) => c.nif || "" },
  { value: "tipo", label: "Tipo", obter: (c) => (c.tipo === "fornecedor" ? "fornecedor" : "cliente") },
];

export default function CadastrosTab({ apenas } = {}) {
  const tipoPadrao = apenas || "cliente";
  const formVazio = { ...initialForm, tipo: tipoPadrao };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState({ campo: "geral", operador: "contem", termo: "" });
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [detalhes, setDetalhes] = useState(null);
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const { addToast } = useToast();

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await listar({});
      setClientes(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar clientes", "error");
      setClientes([]);
    } finally { setCarregando(false); }
  }, [addToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const campos = useMemo(() => (apenas ? CAMPOS.filter((c) => c.value !== "tipo") : CAMPOS), [apenas]);
  const base = useMemo(
    () => (apenas ? clientes.filter((c) => (c.tipo === "fornecedor" ? "fornecedor" : "cliente") === apenas) : clientes),
    [clientes, apenas]
  );

  const totalClientes = clientes.filter((c) => c.tipo === "cliente").length;
  const totalFornecedores = clientes.filter((c) => c.tipo === "fornecedor").length;

  const resultado = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...base];
    if (termo) {
      const cfg = campos.find((c) => c.value === filtro.campo) || campos[0];
      res = res.filter((c) => {
        const alvo = String(cfg.obter(c) || "").toLowerCase();
        if (filtro.operador === "igual") return alvo === termo;
        if (filtro.operador === "comeca") return alvo.startsWith(termo);
        return alvo.includes(termo);
      });
    }
    if (ordem.chave) {
      res.sort((a, b) => {
        const av = String(a[ordem.chave] || "").toLowerCase();
        const bv = String(b[ordem.chave] || "").toLowerCase();
        return (av < bv ? -1 : av > bv ? 1 : 0) * ordem.dir;
      });
    }
    return res;
  }, [base, filtro, ordem, campos]);

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
      <Ledger rotulo={`${titulo} ledger`}>
        <LedgerHeader
          titulo={titulo}
          subtitulo={subtitulo}
          novo={apenas === "fornecedor" ? "Novo fornecedor" : apenas === "cliente" ? "Novo cliente" : "Novo cadastro"}
          aoNovo={abrirNovo}
          onToggleFiltros={() => setFiltrosAbertos((v) => !v)}
          filtrosAbertos={filtrosAbertos}
        />
        {filtrosAbertos && (
          <FilterRow
            campo={filtro.campo}
            setCampo={(v) => setFiltro((f) => ({ ...f, campo: v }))}
            campos={campos.map(({ value, label }) => ({ value, label }))}
            operador={filtro.operador}
            setOperador={(v) => setFiltro((f) => ({ ...f, operador: v }))}
            termo={filtro.termo}
            setTermo={(v) => setFiltro((f) => ({ ...f, termo: v }))}
            aoLimpar={() => setFiltro((f) => ({ ...f, termo: "" }))}
            placeholder="Pesquisar..."
          />
        )}
        {carregando ? (
          <div className="p-4"><ListSkeleton count={5} /></div>
        ) : (
          <>
            <LedgerTable>
              <thead>
                <tr className="border-b border-border">
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "codigo" ? { chave: "codigo", dir: -p.dir } : { chave: "codigo", dir: 1 }))} ativo={ordem.chave === "codigo"}>Código</LedgerTh>
                  <LedgerTh onSort={() => setOrdem((p) => (p.chave === "nome" ? { chave: "nome", dir: -p.dir } : { chave: "nome", dir: 1 }))} ativo={ordem.chave === "nome"}>Nome</LedgerTh>
                  <LedgerTh>Empresa</LedgerTh>
                  <LedgerTh>NIF</LedgerTh>
                  <LedgerTh>Telefone</LedgerTh>
                  <LedgerTh>Email</LedgerTh>
                  <LedgerTh className="w-10" />
                </tr>
              </thead>
              <tbody>
                {pag.visiveis.map((item) => (
                  <LedgerTr key={item.id ?? item.codigo} onClick={() => setDetalhes(item)}>
                    <LedgerTd className="max-w-36">
                      <IdCell
                        id={item.codigo || "—"}
                        meta={item.tipo === "fornecedor" ? "Fornecedor" : "Cliente"}
                        aoAbrir={() => setDetalhes(item)}
                      />
                    </LedgerTd>
                    <LedgerTd className="max-w-56">
                      <span className="flex items-center gap-2.5">
                        <Avatar nome={item.nome} tamanho="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm">{item.nome || "—"}</span>
                        </span>
                      </span>
                    </LedgerTd>
                    <LedgerTd className="max-w-48"><span className="block truncate">{item.empresa || "—"}</span></LedgerTd>
                    <LedgerTd className="font-mono text-xs text-muted-foreground">{item.nif || "—"}</LedgerTd>
                    <LedgerTd className="text-muted-foreground">{item.telefone || "—"}</LedgerTd>
                    <LedgerTd className="max-w-44"><span className="block truncate text-muted-foreground">{item.email || "—"}</span></LedgerTd>
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

      <Modal open={Boolean(detalhes)} onClose={() => setDetalhes(null)} title="Detalhes do cadastro" icon={detalhes?.tipo === "fornecedor" ? "local_shipping" : "person"} size="sm">
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
