"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import SugestaoSelect from "@/components/ui/SugestaoSelect";
import { listar as listarClientes } from "@/services/clientes";
import { listar as listarMateriais } from "@/services/materiais";
import { ehArtigoOuProduto } from "@/lib/estoque";
import {
  criar,
  atualizar,
  anexarDocumentos,
  UNIDADES,
  TIPOS_PROPOSTA,
  ORIGENS_PROPOSTA,
  FAMILIAS_PRODUTO,
  FORMATOS_SUGERIDOS,
  CORES_SUGERIDAS,
  ACABAMENTOS_SUGERIDOS,
  MODELOS_DOCUMENTAIS,
  ESTADOS_DOCUMENTAIS,
} from "@/services/propostas";

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TABS = [
  { key: "identificacao", label: "01 Identificação", icon: "description" },
  { key: "especificacao", label: "02 Especificação", icon: "segment" },
  { key: "condicoes", label: "03 Condições", icon: "payments" },
  { key: "documentos", label: "04 Documentos & Acessos", icon: "attach_file" },
];

const VAZIO = {
  unidade: "UN-01",
  versao: "1.0",
  cliente_id: "",
  objecto: "",
  tipo: "",
  origem: "",
  familia: "",
  produtos: [{ nome: "", quantidade: "" }],
  formato: "",
  cores: "",
  acabamento: "",
  data_emissao: hojeISO(),
  validade_data: "",
  valor: "",
  condicoes_pagamento: "",
  prazo_execucao: "",
  prazo_entrega: "",
  local_entrega: "",
  condicoes_entrega: "",
  observacoes: "",
  estado_documental: "Em preparação",
  modelo_documental: "",
  responsavel_comercial: "",
};

function produtosIniciais(proposta) {
  const lista = Array.isArray(proposta?.produtos) ? proposta.produtos : [];
  const validas = lista.filter((p) => p && String(p.nome || "").trim());
  if (validas.length) {
    return validas.map((p) => ({ nome: String(p.nome || "").trim(), quantidade: String(p.quantidade || "").trim() }));
  }
  // Propostas antigas guardavam um único produto nas colunas produto/quantidade.
  if (proposta?.produto) return [{ nome: proposta.produto, quantidade: proposta.quantidade || "" }];
  return [{ nome: "", quantidade: "" }];
}

function formInicial(proposta) {
  if (!proposta?.id) return VAZIO;
  return {
    unidade: proposta.unidade || "UN-01",
    versao: proposta.versao || "1.0",
    cliente_id: proposta.cliente_id ? String(proposta.cliente_id) : "",
    objecto: proposta.objecto || "",
    tipo: proposta.tipo || "",
    origem: proposta.origem || "",
    familia: proposta.familia || "",
    produtos: produtosIniciais(proposta),
    formato: proposta.formato || "",
    cores: proposta.cores || "",
    acabamento: proposta.acabamento || "",
    data_emissao: String(proposta.data_emissao || proposta.criada_em || "").slice(0, 10),
    validade_data: String(proposta.validade_data || "").slice(0, 10),
    valor: proposta.valor ? String(proposta.valor) : "",
    condicoes_pagamento: proposta.condicoes_pagamento || "",
    prazo_execucao: proposta.prazo_execucao || "",
    prazo_entrega: proposta.prazo_entrega || "",
    local_entrega: proposta.local_entrega || "",
    condicoes_entrega: proposta.condicoes_entrega || "",
    observacoes: proposta.observacoes || "",
    estado_documental: proposta.estado_documental || "Em preparação",
    modelo_documental: proposta.modelo_documental || "",
    responsavel_comercial: proposta.responsavel_comercial || "",
  };
}

const campoCls =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/25";

function Campo({ label, children, obrigatorio, full }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-medium text-muted-foreground">
        {label} {obrigatorio && <span className="text-destructive" aria-hidden="true">*</span>}
      </span>
      {children}
    </label>
  );
}

function formatBytes(n) {
  const v = Number(n || 0);
  if (!v) return "0 B";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PropostaModal({ open, proposta, existentes = [], onClose, onSaved }) {
  const { addToast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [form, setForm] = useState(() => formInicial(proposta));
  const [tab, setTab] = useState("identificacao");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ficheiros, setFicheiros] = useState([]);

  const editando = Boolean(proposta?.id);

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    (async () => {
      setCarregando(true);
      try {
        const [dados, mats] = await Promise.all([
          listarClientes({ tipo: "cliente" }),
          listarMateriais().catch(() => []),
        ]);
        if (!ativo) return;
        setClientes(Array.isArray(dados) ? dados : dados?.data ?? []);
        setMateriais(Array.isArray(mats) ? mats : mats?.data ?? []);
      } catch {
        if (ativo) addToast("Erro ao carregar clientes", "error");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [open, addToast]);

  const sugestoes = useMemo(() => {
    const fundir = (lista, campo) => {
      const mapa = new Map();
      const adicionar = (valor) => {
        const texto = String(valor || "").trim();
        if (texto) mapa.set(texto.toLowerCase(), texto);
      };
      lista.forEach(adicionar);
      for (const p of existentes) adicionar(p[campo]);
      return [...mapa.values()].sort((a, b) => a.localeCompare(b, "pt"));
    };
    const responsaveis = new Map();
    for (const c of clientes) {
      const v = String(c.responsavel_comercial || "").trim();
      if (v) responsaveis.set(v.toLowerCase(), v);
    }
    for (const p of existentes) {
      const v = String(p.responsavel_comercial || "").trim();
      if (v) responsaveis.set(v.toLowerCase(), v);
    }
    // Produtos e famílias vêm do stock (cadastro de materiais). A lista de
    // produtos mostra só artigos/produtos acabados — a matéria-prima não é
    // oferecida ao cliente como produto.
    const nomesArtigos = new Map();
    const familiasStock = new Map();
    for (const m of materiais) {
      if (ehArtigoOuProduto(m)) {
        const nome = String(m.nome || m.nome_tecnico || "").trim();
        if (nome) nomesArtigos.set(nome.toLowerCase(), nome);
      }
      const fam = String(m.categoria?.familia || m.categoria?.tipo || "").trim();
      if (fam) familiasStock.set(fam.toLowerCase(), fam);
    }
    return {
      tipos: fundir(TIPOS_PROPOSTA, "tipo"),
      origens: fundir(ORIGENS_PROPOSTA, "origem"),
      familias: fundir([...FAMILIAS_PRODUTO, ...familiasStock.values()], "familia"),
      produtos: fundir([...nomesArtigos.values()], "produto"),
      formatos: fundir(FORMATOS_SUGERIDOS, "formato"),
      cores: fundir(CORES_SUGERIDAS, "cores"),
      acabamentos: fundir(ACABAMENTOS_SUGERIDOS, "acabamento"),
      modelos: fundir(MODELOS_DOCUMENTAIS, "modelo_documental"),
      estadosDocumentais: fundir(ESTADOS_DOCUMENTAIS, "estado_documental"),
      responsaveis: [...responsaveis.values()].sort((a, b) => a.localeCompare(b, "pt")),
    };
  }, [clientes, existentes, materiais]);

  const setField = (nome, valor) => setForm((p) => ({ ...p, [nome]: valor }));

  const setProduto = (i, campo, valor) =>
    setForm((p) => {
      const produtos = [...(p.produtos || [])];
      produtos[i] = { ...produtos[i], [campo]: valor };
      return { ...p, produtos };
    });
  const addProduto = () =>
    setForm((p) => ({ ...p, produtos: [...(p.produtos || []), { nome: "", quantidade: "" }] }));
  const removeProduto = (i) =>
    setForm((p) =>
      p.produtos.length <= 1 ? p : { ...p, produtos: p.produtos.filter((_, x) => x !== i) }
    );

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.cliente_id) return addToast("Escolha o cliente da proposta", "error");
    if (!form.objecto.trim()) return addToast("Indique o objecto da proposta", "error");
    setSalvando(true);
    try {
      const produtos = (form.produtos || [])
        .map((pr) => ({ nome: String(pr?.nome || "").trim(), quantidade: String(pr?.quantidade || "").trim() }))
        .filter((pr) => pr.nome);
      const dados = {
        unidade: form.unidade,
        cliente_id: form.cliente_id,
        versao: form.versao.trim(),
        objecto: form.objecto.trim(),
        tipo: form.tipo.trim(),
        origem: form.origem.trim(),
        familia: form.familia.trim(),
        produto: produtos[0]?.nome || "",
        produtos,
        formato: form.formato.trim(),
        cores: form.cores.trim(),
        acabamento: form.acabamento.trim(),
        data_emissao: form.data_emissao,
        validade_data: form.validade_data,
        valor: Number(form.valor) || 0,
        condicoes_pagamento: form.condicoes_pagamento.trim(),
        prazo_execucao: form.prazo_execucao.trim(),
        prazo_entrega: form.prazo_entrega.trim(),
        local_entrega: form.local_entrega.trim(),
        condicoes_entrega: form.condicoes_entrega.trim(),
        observacoes: form.observacoes.trim(),
        estado_documental: form.estado_documental.trim(),
        modelo_documental: form.modelo_documental.trim(),
        responsavel_comercial: form.responsavel_comercial.trim(),
      };
      const salva = editando ? await atualizar(proposta.id, dados) : await criar(dados);
      if (ficheiros.length && salva?.id) {
        try {
          await anexarDocumentos(salva.id, ficheiros);
          addToast("Documentos anexados à proposta", "success");
        } catch {
          addToast("Proposta guardada, mas os documentos falharam", "error");
        }
      }
      addToast(editando ? "Proposta atualizada" : "Proposta criada", "success");
      onSaved?.(salva);
      onClose?.();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar a proposta", "error");
    } finally {
      setSalvando(false);
    }
  };

  const id = (sufixo) => `form-proposta-${sufixo}`;

  const sugestao = (chave, campo, icon, placeholder) => (
    <SugestaoSelect
      id={`proposta-${chave}`}
      value={form[campo] || ""}
      opcoes={sugestoes[chave]}
      onChange={(valor) => setField(campo, valor)}
      placeholder={placeholder}
      icon={icon}
    />
  );

  return (
    <Modal
      open={Boolean(open)}
      onClose={onClose}
      title={editando ? `Editar proposta ${proposta?.numero || ""}` : "Proposta Comercial"}
      icon="description"
      size="2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-proposta" loading={salvando}>
            <Icon name="save" className="text-lg" /> Guardar proposta
          </Button>
        </>
      }
    >
      {carregando ? (
        <div className="space-y-3" aria-label="A carregar formulário">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <form id="form-proposta" onSubmit={guardar} className="space-y-5">
          <div role="tablist" aria-label="Secções da proposta" className="flex gap-2 flex-wrap bg-muted/60 border border-border p-1.5 rounded-full">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                aria-controls={`${id("painel")}-${t.key}`}
                id={id(`tab-${t.key}`)}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${tab === t.key ? "nav-pill text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon name={t.icon} className="text-lg" />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Altura fixa: o modal nunca muda de tamanho ao trocar de secção */}
          <div role="tabpanel" id={`${id("painel")}-${tab}`} aria-labelledby={id(`tab-${tab}`)} className="animate-fade-up h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {tab === "identificacao" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Referência da Proposta">
                  <input
                    value={editando ? proposta?.numero || "" : "Gerado automaticamente"}
                    readOnly
                    disabled
                    className={`${campoCls} bg-muted/60 cursor-not-allowed`}
                  />
                </Campo>
                <Campo label="Versão">
                  <input
                    value={form.versao}
                    onChange={(e) => setField("versao", e.target.value)}
                    className={campoCls}
                    placeholder="Ex.: 1.0"
                    maxLength={20}
                  />
                </Campo>
                <Campo label="Cliente / Entidade" obrigatorio full>
                  <select
                    value={form.cliente_id}
                    onChange={(e) => setField("cliente_id", e.target.value)}
                    className={campoCls}
                    required
                  >
                    <option value="">Escolher cliente…</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.empresa ? `${c.empresa} · ${c.nome}` : c.nome}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Objecto da proposta / solução apresentada" obrigatorio>
                  <input
                    value={form.objecto}
                    onChange={(e) => setField("objecto", e.target.value)}
                    className={campoCls}
                    placeholder="Ex.: Impressão de 5.000 flyers A5"
                    maxLength={200}
                    required
                  />
                </Campo>
                <Campo label="Tipo de Proposta">
                  {sugestao("tipos", "tipo", "request_quote", "Selecionar ou escrever...")}
                </Campo>
                <Campo label="Responsável Comercial">
                  {sugestao("responsaveis", "responsavel_comercial", "badge", "Selecionar ou escrever...")}
                </Campo>
                <Campo label="Origem">
                  {sugestao("origens", "origem", "person_search", "Selecionar ou escrever...")}
                </Campo>
                <Campo label="Unidade de Negócio" obrigatorio>
                  <select
                    value={form.unidade}
                    onChange={(e) => setField("unidade", e.target.value)}
                    className={campoCls}
                    required
                  >
                    {UNIDADES.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Data de Emissão">
                  <input
                    type="date"
                    value={form.data_emissao}
                    onChange={(e) => setField("data_emissao", e.target.value)}
                    className={campoCls}
                  />
                </Campo>
              </div>
            )}

            {tab === "especificacao" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Família de Produto">
                  {sugestao("familias", "familia", "category", "Selecionar ou escrever...")}
                </Campo>
                <Campo label="Formato">
                  {sugestao("formatos", "formato", "straighten", "Selecionar ou escrever...")}
                </Campo>
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground">Produtos (artigos do stock)</span>
                    <Button type="button" variant="ghost" size="sm" onClick={addProduto}>
                      <Icon name="add_circle" className="text-sm" /> Adicionar produto
                    </Button>
                  </div>
                  {form.produtos.map((pr, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-8">
                        <SugestaoSelect
                          id={`proposta-produto-${i}`}
                          value={pr.nome}
                          opcoes={sugestoes.produtos}
                          onChange={(valor) => setProduto(i, "nome", valor)}
                          placeholder="Ex.: Cartões de visita, Livros"
                          icon="inventory_2"
                        />
                      </div>
                      <div className="col-span-9 sm:col-span-3">
                        <input
                          value={pr.quantidade}
                          onChange={(e) => setProduto(i, "quantidade", e.target.value)}
                          className={campoCls}
                          placeholder="Quantidade (ex.: 5.000)"
                          maxLength={100}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1 flex justify-center">
                        {form.produtos.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeProduto(i)} title="Remover produto" className="text-error">
                            <Icon name="close" className="text-sm" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Campo label="Cores">
                  {sugestao("cores", "cores", "palette", "Selecionar ou escrever...")}
                </Campo>
                <Campo label="Acabamento">
                  {sugestao("acabamentos", "acabamento", "workspace_premium", "Selecionar ou escrever...")}
                </Campo>
              </div>
            )}

            {tab === "condicoes" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Validade da Proposta">
                  <input
                    type="date"
                    value={form.validade_data}
                    onChange={(e) => setField("validade_data", e.target.value)}
                    className={campoCls}
                  />
                </Campo>
                <Campo label="Valor Proposto (KZ)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor}
                    onChange={(e) => setField("valor", e.target.value)}
                    className={campoCls}
                    placeholder="0,00"
                  />
                </Campo>
                <Campo label="Prazo de Execução">
                  <input
                    value={form.prazo_execucao}
                    onChange={(e) => setField("prazo_execucao", e.target.value)}
                    className={campoCls}
                    placeholder="Ex.: 10 dias úteis"
                    maxLength={100}
                  />
                </Campo>
                <Campo label="Prazo de Entrega">
                  <input
                    value={form.prazo_entrega}
                    onChange={(e) => setField("prazo_entrega", e.target.value)}
                    className={campoCls}
                    placeholder="Ex.: até 15 de Dezembro"
                    maxLength={100}
                  />
                </Campo>
                <Campo label="Local de Entrega">
                  <input
                    value={form.local_entrega}
                    onChange={(e) => setField("local_entrega", e.target.value)}
                    className={campoCls}
                    placeholder="Ex.: Sede do cliente, Luanda"
                    maxLength={200}
                  />
                </Campo>
                <Campo label="Condições de Entrega">
                  <input
                    value={form.condicoes_entrega}
                    onChange={(e) => setField("condicoes_entrega", e.target.value)}
                    className={campoCls}
                    placeholder="Ex.: transporte incluído"
                    maxLength={200}
                  />
                </Campo>
                <Campo label="Condições de Pagamento">
                  <input
                    value={form.condicoes_pagamento}
                    onChange={(e) => setField("condicoes_pagamento", e.target.value)}
                    className={campoCls}
                    placeholder="Ex.: 50% de adiantamento e 50% na entrega"
                    maxLength={200}
                  />
                </Campo>
                <Campo label="Observações" full>
                  <textarea
                    value={form.observacoes}
                    onChange={(e) => setField("observacoes", e.target.value)}
                    className={`${campoCls} h-auto min-h-24 resize-y py-2.5`}
                    placeholder="Notas internas ou condições adicionais…"
                  />
                </Campo>
              </div>
            )}

            {tab === "documentos" && (
              <div className="grid grid-cols-1 gap-4">
                <Campo label="Anexos" full>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const novos = Array.from(e.target.files || []);
                      if (novos.length) setFicheiros((atual) => [...atual, ...novos]);
                      e.target.value = "";
                    }}
                    className={campoCls}
                  />
                  {ficheiros.length > 0 && (
                    <ul className="mt-1 space-y-1">
                      {ficheiros.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
                          <span className="min-w-0 truncate text-foreground">
                            <Icon name="attach_file" className="mr-1.5 text-sm align-[-2px] text-muted-foreground" />
                            {f.name}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-muted-foreground">{formatBytes(f.size)}</span>
                            <button
                              type="button"
                              onClick={() => setFicheiros((atual) => atual.filter((_, j) => j !== i))}
                              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                              title="Remover ficheiro"
                            >
                              <Icon name="close" className="text-sm" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    PDF ou imagem, até 10 MB cada. Os documentos são anexados ao guardar a proposta.
                  </p>
                </Campo>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Campo label="Estado Documental">
                    {sugestao("estadosDocumentais", "estado_documental", "task_alt", "Selecionar ou escrever...")}
                  </Campo>
                  <Campo label="Modelo Documental">
                    {sugestao("modelos", "modelo_documental", "description", "Selecionar ou escrever...")}
                  </Campo>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-destructive">* Campos de preenchimento obrigatório</p>
        </form>
      )}
    </Modal>
  );
}
