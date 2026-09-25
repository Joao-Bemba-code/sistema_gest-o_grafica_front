"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { inputCls } from "@/lib/estoque";
import { useToast } from "@/components/Toast";
import { CardSkeleton } from "@/components/Skeleton";
import { listarContas, criarConta, atualizarConta, removerConta } from "@/services/contasBancarias";

const tiposConta = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Conta Poupança" },
  { value: "caixa", label: "Caixa" },
  { value: "investimento", label: "Investimento" },
];

const formVazio = { banco_nome: "", tipo_conta: "corrente", numero_conta: "", iban: "", titular: "" };

export default function ContasBancariasTab() {
  const { addToast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [contas, setContas] = useState([]);
  const [form, setForm] = useState(formVazio);
  const [editando, setEditando] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => listarContas()
    .then((dados) => setContas(Array.isArray(dados) ? dados : []))
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

  if (carregando) return <CardSkeleton lines={4} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-sans text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Icon name="account_balance" className="text-primary text-[22px]" /> Contas e Caixa
          </h2>
          <p className="text-primary mt-0.5 font-mono text-[10px] uppercase tracking-widest">
            {contas.length} conta{contas.length === 1 ? "" : "s"} · usadas nos movimentos de tesouraria, faturas e recibos
          </p>
        </div>
        <Button size="sm" onClick={abrirNovo}>
          <Icon name={mostrarForm ? "close" : "add"} className="text-base" />
          {mostrarForm ? "Cancelar" : "Nova Conta"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          {mostrarForm && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3 border border-border/60">
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

          {contas.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Icon name="account_balance" className="text-3xl block mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhuma conta ou caixa registada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contas.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3 transition-all hover:bg-muted/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon name="account_balance" className="text-primary text-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{c.banco_nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.tipo_conta === "caixa" ? (
                          "Dinheiro em espécie • disponível para a Tesouraria"
                        ) : (
                          <>
                            {c.titular && `${c.titular}${c.numero_conta || c.iban ? " • " : ""}`}
                            {c.numero_conta && `Conta: ${c.numero_conta}`}
                            {c.iban && `${c.numero_conta ? " • " : ""}IBAN: ${c.iban}`}
                            {!c.titular && !c.numero_conta && !c.iban && "Sem dados de conta"}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(c)} title="Editar"><Icon name="edit" className="text-[16px]" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEliminar(c)} title="Remover" className="text-error"><Icon name="delete" className="text-[16px]" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}