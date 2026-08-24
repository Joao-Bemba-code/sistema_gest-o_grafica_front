"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import OrcamentoForm, {
  blankForm,
  blankItem,
  blankMaterial,
  SPEC_DEFAULT_LINES,
  custoUnitItem,
  recalcularItem,
} from "@/components/orcamentos/OrcamentoForm";
import { entradasEspecificacao } from "@/lib/estoque";
import {
  listar as listarOrcamentos,
  buscarPorId,
  criar,
  atualizar,
} from "@/services/orcamentos";
import { listar as listarClientes } from "@/services/clientes";
import { listar as listarMateriais } from "@/services/materiais";

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

function PreviewLinha({ label, valor, acento }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="cyber-label">{label}</span>
      <span className={`text-sm font-bold font-mono truncate text-right ${acento || "text-foreground"}`}>{valor || "—"}</span>
    </div>
  );
}

function NovoOrcamentoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const editandoId = idParam ? String(idParam) : null;
  const { addToast } = useToast();

  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ ...blankForm, itens: [{ ...blankItem, materiais: [{ ...blankMaterial }] }] });

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true);
      try {
        const [cliData, matData] = await Promise.all([
          listarClientes({ tipo: "cliente" }),
          listarMateriais().catch(() => []),
        ]);
        if (!ativo) return;
        setClientes(Array.isArray(cliData) ? cliData : cliData?.data ?? []);
        setMateriais(Array.isArray(matData) ? matData : matData?.data ?? []);
        if (editandoId) {
          try {
            const o = await buscarPorId(editandoId);
            if (!ativo || !o) return;
            setForm({
              cliente_id: o.cliente_id ? String(o.cliente_id) : "",
              cliente: o.cliente?.nome || "", empresa: o.cliente?.empresa || "", nif: o.cliente?.nif || "",
              telefone: o.cliente?.telefone || "", email: o.cliente?.email || "",
              itens: (Array.isArray(o.itens) && o.itens.length ? o.itens : [blankItem]).map((it) => ({
                descricao: it.descricao || "",
                quantidade: String(it.quantidade ?? ""),
                valorUnitario: String(it.valorUnitario ?? ""),
                materiais: (it.materiais || []).map((m) => ({
                  material_id: m.material_id ? String(m.material_id) : "",
                  descricao: m.descricao || "",
                  unidade: m.unidade || "un",
                  quantidade: String(m.quantidade ?? ""),
                  preco_venda: Number(m.custo_unit) || 0,
                  custo_total: Number(m.custo_total) || 0,
                  mover_estoque: Boolean(m.mover_estoque),
                })),
              })),
              specLines: (() => {
                const linhas = entradasEspecificacao(o.especificacao);
                return linhas.length ? linhas.map((l) => ({ ...l })) : SPEC_DEFAULT_LINES.map((l) => ({ ...l }));
              })(),
              iva: String(o.iva ?? ""), prazoExecucao: o.prazoExecucao || "",
              condicoesPagamento: o.condicoesPagamento || "", observacoes: o.observacoes || "",
            });
          } catch {
            if (ativo) addToast("Orçamento não encontrado", "error");
          }
        }
      } catch (err) {
        if (ativo) addToast(err.response?.data?.erro || "Erro ao carregar dados", "error");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editandoId]);

  const setField = (name, val) => setForm((p) => ({ ...p, [name]: val }));

  const handleClienteSelect = (e) => {
    const id = e.target.value;
    if (!id) {
      setForm((p) => ({ ...p, cliente_id: "", cliente: "", empresa: "", nif: "", telefone: "", email: "" }));
      return;
    }
    const cli = clientes.find((c) => String(c.id) === id);
    if (cli) {
      setForm((p) => ({
        ...p,
        cliente_id: id,
        cliente: cli.nome || cli.razao_social || "",
        empresa: cli.empresa || "",
        nif: cli.nif || "",
        telefone: cli.telefone || "",
        email: cli.email || "",
      }));
    }
  };

  const subtotalCalc = form.itens.reduce((s, it) => s + (Number(it.total) || 0), 0);
  const ivaCalc = Number(form.iva) || 0;
  const totalCalc = subtotalCalc + ivaCalc;

  const aoSubmeter = async (e) => {
    e.preventDefault();
    setSalvando(true);
    const dados = {
      cliente_id: form.cliente_id,
      cliente: { nome: form.cliente, empresa: form.empresa, nif: form.nif, telefone: form.telefone, email: form.email },
      itens: form.itens.map((it) => {
        const calc = recalcularItem(it);
        return {
          descricao: it.descricao,
          quantidade: Number(it.quantidade),
          valorUnitario: calc.valorUnitario,
          total: calc.total,
          composto: (it.materiais || []).filter((m) => m.material_id).length > 0,
          margem: 0,
          materiais: (it.materiais || [])
            .map((m) => ({
              material_id: m.material_id,
              descricao: m.descricao,
              unidade: m.unidade || "un",
              quantidade: Number(m.quantidade) || 0,
              custo_unit: Number(m.preco_venda) || 0,
              mover_estoque: Boolean(m.mover_estoque),
            }))
            .filter((m) => m.material_id),
        };
      }),
      especificacao: Object.fromEntries(
        (form.specLines || [])
          .filter((l) => l.rotulo?.trim() && l.valor?.trim())
          .map((l) => [l.rotulo.trim(), l.valor.trim()])
      ),
      subtotal: subtotalCalc,
      iva: ivaCalc,
      prazoExecucao: form.prazoExecucao,
      condicoesPagamento: form.condicoesPagamento,
      observacoes: form.observacoes,
    };
    try {
      if (editandoId) {
        await atualizar(editandoId, dados);
        addToast("Orçamento atualizado com sucesso", "success");
      } else {
        await criar(dados);
        addToast("Orçamento criado com sucesso", "success");
      }
      router.push("/orcamentos");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
      setSalvando(false);
    }
  };

  const primeiroItem = form.itens[0];
  const specsPreenchidas = (form.specLines || []).filter((l) => l.rotulo?.trim() && l.valor?.trim());

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-primary">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/orcamentos")}
            aria-label="Voltar aos orçamentos"
            className="w-10 h-10 rounded bg-surface-variant border border-outline-variant flex items-center justify-center text-on-surface hover:border-primary hover:text-primary transition-colors shrink-0"
          >
            <Icon name="arrow_back" className="text-xl" />
          </button>
          <div>
            <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">{editandoId ? "Editar Orçamento" : "Novo Orçamento"}</h1>
            <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">
              {editandoId ? `Atualizar orçamento #${editandoId}` : "Criar orçamento para cliente // ORC"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/orcamentos")}>Cancelar</Button>
          <Button type="submit" form="form-orcamento" loading={salvando}>
            <Icon name="save" className="text-lg" /> Guardar Orçamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="px-5 sm:px-6 py-5">
              {carregando ? (
                <div className="space-y-3" aria-label="A carregar formulário">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <OrcamentoForm
                  formId="form-orcamento"
                  form={form}
                  setField={setField}
                  setForm={setForm}
                  onSubmit={aoSubmeter}
                  onClienteSelect={handleClienteSelect}
                  clientes={clientes}
                  materiais={materiais}
                />
              )}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-1 obsidian-glass cyber-border rounded-xl p-5 lg:sticky lg:top-24 space-y-4" aria-label="Pré-visualização do orçamento">
          <div className="flex items-center justify-between">
            <p className="cyber-label flex items-center gap-1.5">
              <Icon name="visibility" className="text-sm text-primary" /> Pré-visualização
            </p>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" aria-hidden="true" />
          </div>

          <div className="relative w-24 h-24 rounded-2xl obsidian-glass cyber-border flex items-center justify-center mx-auto">
            <Icon name="request_quote" className="text-4xl text-primary" />
            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-success flex items-center justify-center">
              <Icon name="check" className="text-sm text-on-success" />
            </span>
          </div>

          <div className="text-center">
            <p className="text-lg font-extrabold text-foreground truncate">{primeiroItem?.descricao || "Novo Orçamento"}</p>
            <p className="text-xs font-mono text-primary">{form.cliente || "SEM CLIENTE"}</p>
          </div>

          <div>
            <PreviewLinha label="Empresa" valor={form.empresa} />
            <PreviewLinha label="NIF" valor={form.nif} />
            <PreviewLinha label="Telefone" valor={form.telefone} />
            {form.itens.map((it, i) => (
              <PreviewLinha key={i} label={`Item ${i + 1}`} valor={`${it.descricao || "—"} · ${it.quantidade || 0}× ${formatKz(it.total || 0)}`} />
            ))}
            {specsPreenchidas.slice(0, 4).map((l) => (
              <PreviewLinha key={l.rotulo + l.valor} label={l.rotulo} valor={l.valor} />
            ))}
            <PreviewLinha label="Subtotal" valor={formatKz(subtotalCalc)} />
            {ivaCalc > 0 && <PreviewLinha label="IVA" valor={formatKz(ivaCalc)} />}
            <PreviewLinha label="Total" valor={formatKz(totalCalc)} acento="text-primary" />
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border/40 flex-wrap">
            <Icon name="bolt" className="text-sm text-warning" />
            {form.prazoExecucao ? `Prazo: ${form.prazoExecucao}` : "Sem prazo definido"}
            {" • "}
            Custo mat.: {formatKz(form.itens.reduce((s, it) => s + custoUnitItem(it), 0))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function NovoOrcamentoPage() {
  return (
    <Suspense fallback={<div className="space-y-3" aria-label="A carregar">{Array.from({ length: 6 }).map((_, i) => (<div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />))}</div>}>
      <NovoOrcamentoInner />
    </Suspense>
  );
}
