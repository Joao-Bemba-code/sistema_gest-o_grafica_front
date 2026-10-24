"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import SugestaoSelect from "@/components/ui/SugestaoSelect";
import NumeroInput from "@/components/ui/NumeroInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { inputCls } from "@/lib/estoque";
import { listarContas, criarConta } from "@/services/contasBancarias";
import { criarMovimento, anexarFicheiros } from "@/services/tesouraria";

const CATEGORIAS_BASE = [
  "Despesa",
  "Compra",
  "Salário",
  "Imposto",
  "Aluguel",
  "Utilidades",
  "Empréstimo",
  "Levantamento",
];

const METODOS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
  { value: "ordem_saida", label: "Ordem de Saque" },
  { value: "deposito", label: "Depósito" },
  { value: "multicaixa", label: "Multicaixa" },
  { value: "referencia", label: "Referência" },
  { value: "cheque", label: "Cheque" },
  { value: "tpa", label: "TPA" },
];

// As categorias fixas são mostradas com acentos e maiúsculas, mas guardadas
// com os mesmos valores que a Tesouraria já usa (ex.: "despesa", "salario").
const CATEGORIAS_CANONICAS = {
  despesa: "despesa",
  compra: "compra",
  salario: "salario",
  imposto: "imposto",
  aluguel: "aluguel",
  utilidades: "utilidades",
  emprestimo: "emprestimo",
  levantamento: "levantamento",
};

function hoje() {
  return new Date().toISOString().split("T")[0];
}

function semAcentos(texto) {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function rotuloConta(conta) {
  return `${conta.banco_nome}${conta.numero_conta ? ` — Conta ${conta.numero_conta}` : ""}`;
}

function categoriaParaEnvio(texto) {
  const limpo = String(texto || "").trim();
  if (!limpo) return "";
  return CATEGORIAS_CANONICAS[semAcentos(limpo)] || limpo;
}

function Campo({ id, label, obrigatorio = false, className = "", hint, children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold text-foreground">
        {label}
        {obrigatorio && <span className="ml-0.5 text-error">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function DespesaModal({ onClose, onSaved, movimentos = [] }) {
  const { addToast } = useToast();
  const [contas, setContas] = useState([]);
  const [carregandoContas, setCarregandoContas] = useState(true);
  const [criandoCaixa, setCriandoCaixa] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [ficheiros, setFicheiros] = useState([]);
  const [form, setForm] = useState({
    data_movimento: hoje(),
    valor: "",
    categoria: "Despesa",
    descricao: "",
    conta_bancaria_id: "",
    metodo_pagamento: "dinheiro",
    referencia: "",
    observacoes: "",
  });

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await listarContas();
        if (!ativo) return;
        const lista = Array.isArray(dados) ? dados : dados?.data ?? dados?.contas ?? [];
        setContas(lista.filter((c) => c.ativo !== false));
      } catch {
        if (ativo) addToast("Não foi possível carregar as contas e o caixa", "error");
      } finally {
        if (ativo) setCarregandoContas(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [addToast]);

  const categorias = useMemo(() => {
    const mapa = new Map();
    const adicionar = (valor) => {
      const label = String(valor || "").trim();
      if (!label) return;
      const chave = semAcentos(label);
      if (!mapa.has(chave)) mapa.set(chave, { valor: label, label, icon: "label" });
    };
    CATEGORIAS_BASE.forEach(adicionar);
    movimentos.forEach((m) => {
      if (m.tipo === "saida") adicionar(m.categoria);
    });
    return [...mapa.values()].sort((a, b) => a.label.localeCompare(b.label, "pt"));
  }, [movimentos]);

  const alterar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const criarCaixa = async () => {
    setCriandoCaixa(true);
    try {
      const caixa = await criarConta({
        banco_nome: "Caixa Principal",
        tipo_conta: "caixa",
        numero_conta: null,
        iban: null,
        titular: null,
      });
      const dados = await listarContas();
      const lista = Array.isArray(dados) ? dados : dados?.data ?? dados?.contas ?? [];
      setContas(lista.filter((c) => c.ativo !== false));
      setForm((prev) => ({
        ...prev,
        conta_bancaria_id: String(caixa.id),
        metodo_pagamento: "dinheiro",
      }));
      addToast("Caixa criado e selecionado", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao criar o caixa", "error");
    } finally {
      setCriandoCaixa(false);
    }
  };

  const registar = async (e) => {
    e.preventDefault();
    const valorNum = Number(form.valor);
    if (!valorNum || valorNum <= 0) {
      addToast("Indique um valor válido para a despesa", "error");
      return;
    }
    if (!form.conta_bancaria_id) {
      addToast("Selecione a conta ou o caixa de onde sai o dinheiro", "error");
      return;
    }
    if (!String(form.descricao || "").trim()) {
      addToast("Escreva uma descrição para a despesa", "error");
      return;
    }

    setSalvando(true);
    try {
      const criada = await criarMovimento({
        tipo: "saida",
        categoria: categoriaParaEnvio(form.categoria),
        descricao: String(form.descricao || "").trim(),
        valor: valorNum,
        data_movimento: form.data_movimento || hoje(),
        conta_bancaria_id: Number(form.conta_bancaria_id),
        metodo_pagamento: form.metodo_pagamento,
        referencia: String(form.referencia || "").trim() || undefined,
        observacoes: String(form.observacoes || "").trim() || undefined,
      });

      if (ficheiros.length > 0 && criada?.id) {
        try {
          await anexarFicheiros(criada.id, ficheiros);
        } catch (err) {
          addToast(err.response?.data?.erro || "Despesa registada, mas os comprovativos não foram anexados", "warning");
        }
      }

      addToast("Despesa registada com sucesso", "success");
      onSaved?.();
      onClose?.();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao registar a despesa", "error");
    } finally {
      setSalvando(false);
    }
  };

  const semContas = !carregandoContas && contas.length === 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova despesa"
      icon="account_balance_wallet"
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            form="form-nova-despesa"
            loading={salvando}
            disabled={carregandoContas || semContas}
          >
            Registar despesa
          </Button>
        </>
      }
    >
      <form id="form-nova-despesa" onSubmit={registar} className="space-y-5">
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          A despesa fica registada na Tesouraria e entra logo nos resultados do Financeiro.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="despesa-data" label="Data" obrigatorio>
            <input
              id="despesa-data"
              type="date"
              required
              value={form.data_movimento}
              onChange={(e) => alterar("data_movimento", e.target.value)}
              className={inputCls}
            />
          </Campo>

          <Campo id="despesa-valor" label="Valor (Kz)" obrigatorio>
            <NumeroInput
              id="despesa-valor"
              required
              value={form.valor}
              onChange={(e) => alterar("valor", e.target.value)}
              className={inputCls}
              placeholder="Ex: 250000"
            />
          </Campo>

          <Campo id="despesa-categoria" label="Categoria">
            <SugestaoSelect
              id="despesa-categoria"
              value={form.categoria}
              opcoes={categorias}
              onChange={(valor) => alterar("categoria", valor)}
              placeholder="Pesquisar, escrever ou criar categoria..."
              icon="label"
            />
          </Campo>

          <Campo id="despesa-metodo" label="Método de pagamento" obrigatorio>
            <select
              id="despesa-metodo"
              required
              value={form.metodo_pagamento}
              onChange={(e) => alterar("metodo_pagamento", e.target.value)}
              className={inputCls}
            >
              {METODOS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </Campo>

          <Campo id="despesa-descricao" label="Descrição" obrigatorio className="sm:col-span-2">
            <input
              id="despesa-descricao"
              required
              value={form.descricao}
              onChange={(e) => alterar("descricao", e.target.value)}
              className={inputCls}
              placeholder="Ex: Pagamento de tinta ao fornecedor"
            />
          </Campo>

          <Campo
            id="despesa-conta"
            label="Conta de origem / Caixa"
            obrigatorio
            className="sm:col-span-2"
            hint={semContas ? "Ainda não há contas nem caixa. Cria um caixa para registar a despesa." : undefined}
          >
            <select
              id="despesa-conta"
              required
              value={form.conta_bancaria_id}
              onChange={(e) => alterar("conta_bancaria_id", e.target.value)}
              className={inputCls}
              disabled={carregandoContas || semContas}
            >
              <option value="">
                {carregandoContas ? "A carregar contas..." : "Selecione a conta ou o caixa"}
              </option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{rotuloConta(c)}</option>
              ))}
            </select>
            {semContas && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={criarCaixa}
                loading={criandoCaixa}
                className="self-start px-0"
              >
                <Icon name="add" className="text-sm" /> Criar caixa principal
              </Button>
            )}
          </Campo>

          <Campo id="despesa-referencia" label="Referência">
            <input
              id="despesa-referencia"
              value={form.referencia}
              onChange={(e) => alterar("referencia", e.target.value)}
              className={inputCls}
              placeholder="Ex: Nº do documento"
            />
          </Campo>

          <Campo id="despesa-observacoes" label="Observações" className="sm:col-span-2">
            <textarea
              id="despesa-observacoes"
              rows={3}
              value={form.observacoes}
              onChange={(e) => alterar("observacoes", e.target.value)}
              className={inputCls}
              placeholder="Notas adicionais..."
            />
          </Campo>

          <Campo
            id="despesa-comprovativos"
            label="Comprovativos"
            className="sm:col-span-2"
            hint="PDF ou imagem (JPG, PNG, WEBP), até 10 ficheiros e 10 MB cada."
          >
            <input
              id="despesa-comprovativos"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFicheiros(Array.from(e.target.files || []))}
              className={inputCls}
            />
            {ficheiros.length > 0 && (
              <p className="truncate text-[10px] text-foreground">
                {ficheiros.length} ficheiro(s): {ficheiros.map((f) => f.name).join(", ")}
              </p>
            )}
          </Campo>
        </div>
      </form>
    </Modal>
  );
}
