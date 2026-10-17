"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { inputCls } from "@/lib/estoque";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
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
import { listarContas, criarConta, atualizarConta, removerConta } from "@/services/contasBancarias";
import { listarMovimentos } from "@/services/tesouraria";

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

const tiposConta = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Conta Poupança" },
  { value: "caixa", label: "Caixa" },
  { value: "investimento", label: "Investimento" },
];

const TIPO_TOM = { corrente: "info", poupanca: "info", caixa: "success", investimento: "warning" };

const CAMPOS = [
  { value: "geral", label: "Todos os campos", obter: (c) => `${c.banco_nome || ""} ${c.titular || ""} ${c.numero_conta || ""} ${c.iban || ""}` },
  { value: "banco", label: "Banco", obter: (c) => c.banco_nome || "" },
  { value: "titular", label: "Titular", obter: (c) => c.titular || "" },
  { value: "numero", label: "Número", obter: (c) => c.numero_conta || "" },
  { value: "iban", label: "IBAN", obter: (c) => c.iban || "" },
];

const formVazio = { banco_nome: "", tipo_conta: "corrente", numero_conta: "", iban: "", titular: "" };

export default function ContasBancariasTab() {
  const { addToast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [contas, setContas] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [form, setForm] = useState(formVazio);
  const [editando, setEditando] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState({ campo: "geral", operador: "contem", termo: "" });
  const [ordem, setOrdem] = useState({ chave: "", dir: 1 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);

  const carregar = () => Promise.all([
    listarContas().catch(() => []),
    listarMovimentos().catch(() => []),
  ])
    .then(([contasDados, movDados]) => {
      setContas(Array.isArray(contasDados) ? contasDados : []);
      setMovimentos(Array.isArray(movDados) ? movDados : movDados?.data ?? movDados?.movimentos ?? []);
    })
    .catch(() => addToast?.("Erro ao carregar contas bancárias", "error"))
    .finally(() => setCarregando(false));

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notificar = (msg, tipo = "success") => addToast?.(msg, tipo);

  const abrirNovo = () => {
    setEditando(null);
    setForm(formVazio);
    setMostrarForm(true);
  };

  const abrirEdicao = (conta) => {
    setForm({
      banco_nome: conta.banco_nome || "",
      tipo_conta: conta.tipo_conta || "corrente",
      numero_conta: conta.numero_conta || "",
      iban: conta.iban || "",
      titular: conta.titular || "",
    });
    setEditando(conta);
    setMostrarForm(true);
  };

  const handleGuardar = async () => {
    const tipoConta = form.tipo_conta || "corrente";
    const bancoNome = form.banco_nome.trim();
    if (!bancoNome) {
      notificar("Indique o nome do banco", "error");
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        banco_nome: bancoNome,
        tipo_conta: tipoConta,
        numero_conta: tipoConta === "caixa" ? null : form.numero_conta.trim(),
        iban: tipoConta === "caixa" ? null : form.iban.trim(),
        titular: tipoConta === "caixa" ? null : form.titular.trim(),
      };
      if (editando) {
        await atualizarConta(editando.id, dados);
        notificar(tipoConta === "caixa" ? "Caixa atualizado com sucesso" : "Conta bancária atualizada com sucesso");
      } else {
        await criarConta(dados);
        notificar(tipoConta === "caixa" ? "Caixa criado com sucesso" : "Conta bancária criada com sucesso");
      }
      await carregar();
      setForm(formVazio);
      setEditando(null);
      setMostrarForm(false);
    } catch (e) {
      notificar(e?.response?.data?.erro || "Erro ao guardar conta bancária", "error");
    } finally {
      setSalvando(false);
    }
  };

  const handleEliminar = async (conta) => {
    try {
      await removerConta(conta.id);
      setContas((prev) => prev.filter((c) => c.id !== conta.id));
      notificar("Conta bancária removida com sucesso");
    } catch (e) {
      notificar(e?.response?.data?.erro || "Erro ao remover conta", "error");
    }
  };

  const contasAtivas = useMemo(() => contas.filter((c) => c.ativo !== false), [contas]);

  const resumoPorConta = useMemo(() => contasAtivas.map((c) => {
    const ms = movimentos.filter((m) => String(m.conta_bancaria_id) === String(c.id));
    const entradas = ms.filter((m) => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor || 0), 0);
    const saidas = ms.filter((m) => m.tipo === "saida" || (m.tipo === "transferencia" && String(m.conta_destino_id) !== String(c.id))).reduce((s, m) => s + Number(m.valor || 0), 0);
    const ultimo = ms.sort((a, b) => new Date(b.data_movimento || b.data || 0) - new Date(a.data_movimento || a.data || 0))[0];
    return { ...c, entradas, saidas, ultimo };
  }), [contasAtivas, movimentos]);

  const resultado = useMemo(() => {
    const termo = filtro.termo.trim().toLowerCase();
    let res = [...contas];
    if (termo) {
      const cfg = CAMPOS.find((c) => c.value === filtro.campo) || CAMPOS[0];
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
  }, [contas, filtro, ordem]);

  const pag = usePaginacao({ items: resultado });

  if (carregando) return <CardSkeleton lines={4} />;

  return (
    <div className="space-y-4">
      {resumoPorConta.length > 0 && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Resumo por conta">
          {resumoPorConta.map((c) => {
            const caixa = c.tipo_conta === "caixa";
            const fmt = (v) => Math.round(Number(v || 0)).toLocaleString("pt-AO");
            return (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl ${caixa ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}`}>
                      <Icon name={caixa ? "savings" : "account_balance"} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{c.banco_nome || "Conta"}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{caixa ? "Dinheiro em espécie" : `${c.numero_conta ? `Conta ${c.numero_conta}` : "—"}${c.iban ? ` · ${c.iban}` : ""}`}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-medium text-muted-foreground">Saldo</p>
                    <p className="text-lg font-black tabular-nums tracking-tight text-foreground">
                      {fmt(c.saldo_atual)}<span className="ml-1 text-xs font-bold text-muted-foreground">Kz</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Entradas</p>
                    <p className="text-sm font-bold tabular-nums text-success">
                      {fmt(c.entradas)}<span className="ml-0.5 text-[10px] font-semibold text-success">Kz</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Saídas</p>
                    <p className="text-sm font-bold tabular-nums text-error">
                      {fmt(c.saidas)}<span className="ml-0.5 text-[10px] font-semibold text-error">Kz</span>
                    </p>
                  </div>
                </div>
                {c.ultimo && (
                  <p className="mt-3 truncate text-[11px] text-muted-foreground">
                    Último: <span className="font-semibold text-foreground">{c.ultimo.descricao}</span> · {formatKz(c.ultimo.valor)} · {formatData(c.ultimo.data_movimento || c.ultimo.data)}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      <Ledger rotulo="Contas e Caixa ledger">
        <LedgerHeader
          titulo="Contas e Caixa"
          subtitulo={`${contas.length} conta${contas.length === 1 ? "" : "s"} · usadas nos movimentos de tesouraria, faturas e recibos`}
          novo="Nova conta"
          aoNovo={abrirNovo}
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
            placeholder="Pesquisar contas por banco, titular, número ou IBAN..."
          />
        )}

        {mostrarForm && (
          <div className="border-b border-border bg-muted/30 px-4 py-4 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {editando ? "Editar Conta" : form.tipo_conta === "caixa" ? "Novo Caixa" : "Nova Conta Bancária"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Tipo de Conta">
                <select
                  value={form.tipo_conta}
                  disabled={Boolean(editando)}
                  title={editando ? "O tipo da conta não pode ser alterado" : "Tipo de conta"}
                  onChange={(e) => {
                    const tipoConta = e.target.value;
                    setForm((p) => ({
                      ...p,
                      tipo_conta: tipoConta,
                      banco_nome: tipoConta === "caixa" ? "Caixa" : p.tipo_conta === "caixa" ? "" : p.banco_nome,
                      numero_conta: tipoConta === "caixa" ? "" : p.numero_conta,
                      iban: tipoConta === "caixa" ? "" : p.iban,
                      titular: tipoConta === "caixa" ? "" : p.titular,
                    }));
                  }}
                  className={inputCls}
                >
                  {tiposConta.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                </select>
              </FormField>
              <FormField label={form.tipo_conta === "caixa" ? "Nome do Caixa *" : "Banco *"} obrigatorio>
                <input
                  value={form.banco_nome}
                  onChange={(e) => setForm((p) => ({ ...p, banco_nome: e.target.value }))}
                  className={inputCls}
                  placeholder={form.tipo_conta === "caixa" ? "Ex: Caixa Principal" : "Ex: BFA, BAI, BIC"}
                />
              </FormField>
              {form.tipo_conta === "caixa" ? (
                <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">Dinheiro em espécie</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Este caixa poderá receber entradas e registar saídas na Tesouraria.</p>
                </div>
              ) : (
                <>
                  <FormField label="Nº de Conta">
                    <input value={form.numero_conta} onChange={(e) => setForm((p) => ({ ...p, numero_conta: e.target.value }))} className={inputCls} placeholder="Nº da conta" />
                  </FormField>
                  <FormField label="Titular">
                    <input value={form.titular} onChange={(e) => setForm((p) => ({ ...p, titular: e.target.value }))} className={inputCls} placeholder="Nome do titular" />
                  </FormField>
                  <FormField label="IBAN">
                    <input value={form.iban} onChange={(e) => setForm((p) => ({ ...p, iban: e.target.value }))} className={inputCls} placeholder="AO06 0000 0000..." />
                  </FormField>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setMostrarForm(false); setEditando(null); }}>Cancelar</Button>
              <Button size="sm" onClick={handleGuardar} loading={salvando} disabled={!form.banco_nome.trim()}>
                <Icon name="save" className="text-sm" />
                {editando ? "Atualizar" : form.tipo_conta === "caixa" ? "Criar Caixa" : "Criar Conta"}
              </Button>
            </div>
          </div>
        )}

        <LedgerTable>
          <thead>
            <tr className="border-b border-border">
              <LedgerTh onSort={() => setOrdem((p) => (p.chave === "banco_nome" ? { chave: "banco_nome", dir: -p.dir } : { chave: "banco_nome", dir: 1 }))} ativo={ordem.chave === "banco_nome"}>Banco</LedgerTh>
              <LedgerTh onSort={() => setOrdem((p) => (p.chave === "tipo_conta" ? { chave: "tipo_conta", dir: -p.dir } : { chave: "tipo_conta", dir: 1 }))} ativo={ordem.chave === "tipo_conta"}>Tipo</LedgerTh>
              <LedgerTh>Titular</LedgerTh>
              <LedgerTh>Número / IBAN</LedgerTh>
              <LedgerTh className="w-10" />
            </tr>
          </thead>
          <tbody>
            {pag.visiveis.map((c) => {
              const caixa = c.tipo_conta === "caixa";
              const tipo = tiposConta.find((t) => t.value === c.tipo_conta);
              return (
                <LedgerTr key={c.id}>
                  <LedgerTd className="max-w-56">
                    <IdCell
                      id={c.banco_nome || "—"}
                      meta={caixa ? "Dinheiro em espécie" : c.titular || "Sem titular"}
                      aoAbrir={() => abrirEdicao(c)}
                    />
                  </LedgerTd>
                  <LedgerTd>
                    <StatusBadge tom={TIPO_TOM[c.tipo_conta] || "neutral"}>{tipo?.label || c.tipo_conta || "—"}</StatusBadge>
                  </LedgerTd>
                  <LedgerTd className="max-w-48">
                    <span className="block truncate text-muted-foreground">{caixa ? "Dinheiro em espécie" : c.titular || "—"}</span>
                  </LedgerTd>
                  <LedgerTd className="max-w-56">
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {caixa ? "—" : [c.numero_conta && `Conta: ${c.numero_conta}`, c.iban && `IBAN: ${c.iban}`].filter(Boolean).join(" • ") || "Sem dados de conta"}
                    </span>
                  </LedgerTd>
                  <LedgerTd>
                    <RowMenu
                      ariaLabel="Ações da conta"
                      itens={[
                        { icone: "edit", rotulo: "Editar", onClick: () => abrirEdicao(c) },
                        { icone: "delete", rotulo: "Remover", danger: true, onClick: () => handleEliminar(c) },
                      ]}
                    />
                  </LedgerTd>
                </LedgerTr>
              );
            })}
          </tbody>
        </LedgerTable>
        {pag.total === 0 && (
          contas.length === 0
            ? <LedgerEmpty icone="account_balance">Nenhuma conta ou caixa registada</LedgerEmpty>
            : <LedgerEmpty icone="search_off">Nenhuma conta corresponde ao filtro</LedgerEmpty>
        )}
        <Paginacao {...pag} label="contas" />
      </Ledger>
    </div>
  );
}
