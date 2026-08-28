"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import OrcamentoForm, {
  blankForm,
  blankItem,
  blankMaterial,
  blankServico,
  custoUnitItem,
  recalcularItem,
  recalcularServico,
} from "@/components/orcamentos/OrcamentoForm";
import { buscarPorId, criar, atualizar } from "@/services/orcamentos";
import { listar as listarClientes } from "@/services/clientes";
import { listar as listarMateriais } from "@/services/materiais";
import { listar as listarServicos } from "@/services/servicos";

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

export default function OrcamentoModal({ open, editingId, onClose, onSaved }) {
  const { addToast } = useToast();

  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [servicosCatalogo, setServicosCatalogo] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ ...blankForm, itens: [{ ...blankItem, materiais: [{ ...blankMaterial }] }], servicos: [{ ...blankServico }] });

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    (async () => {
      setCarregando(true);
      setForm({ ...blankForm, itens: [{ ...blankItem, materiais: [{ ...blankMaterial }] }], servicos: [{ ...blankServico }] });
      try {
        const [cliData, matData, srvData] = await Promise.all([
          listarClientes({ tipo: "cliente" }),
          listarMateriais().catch(() => []),
          listarServicos().catch(() => []),
        ]);
        if (!ativo) return;
        setClientes(Array.isArray(cliData) ? cliData : cliData?.data ?? []);
        setMateriais(Array.isArray(matData) ? matData : matData?.data ?? []);
        setServicosCatalogo(Array.isArray(srvData) ? srvData : srvData?.data ?? []);
        if (editingId) {
          try {
            const o = await buscarPorId(editingId);
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
              servicos: (Array.isArray(o.servicos) && o.servicos.length ? o.servicos : [blankServico]).map((sv) => ({
                servico_id: sv.servico_id || "",
                descricao: sv.descricao || "",
                mob: Number(sv.mob) || 1,
                prazoExecucao: Number(sv.prazoExecucao || sv.prazo_execucao) || 1,
                valorHora: Number(sv.valorHora || sv.valor_hora) || 0,
                duracaoHoras: Number(sv.duracaoHoras || sv.duracao_horas) || 8,
                total: Number(sv.total) || 0,
              })),
              iva: String(o.iva ?? ""), desconto: String(o.desconto ?? ""), prazoExecucao: o.prazoExecucao || "",
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
  }, [open, editingId]);

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

  const subtotalCalc = form.itens.reduce((s, it) => s + (Number(it.total) || 0), 0) + (form.servicos || []).reduce((s, sv) => s + (Number(sv.total) || 0), 0);
  const descontoCalc = Number(form.desconto) || 0;
  const ivaCalc = Number(form.iva) || 0;
  const totalCalc = subtotalCalc - descontoCalc + ivaCalc;

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
      servicos: (form.servicos || []).map((sv) => {
        const calc = recalcularServico(sv);
        return {
          servico_id: sv.servico_id || null,
          descricao: sv.descricao,
          mob: Number(sv.mob) || 1,
          prazoExecucao: Number(sv.prazoExecucao) || 1,
          duracaoHoras: calc.duracaoHoras,
          valor_hora: Number(sv.valorHora) || 0,
          total: calc.total,
        };
      }).filter((sv) => sv.descricao),
      subtotal: subtotalCalc,
      desconto: descontoCalc,
      iva: ivaCalc,
      prazoExecucao: form.prazoExecucao,
      condicoesPagamento: form.condicoesPagamento,
      observacoes: form.observacoes,
    };
    try {
      if (editingId) {
        await atualizar(editingId, dados);
        addToast("Orçamento atualizado com sucesso", "success");
      } else {
        await criar(dados);
        addToast("Orçamento criado com sucesso", "success");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
      setSalvando(false);
    }
  };

  const primeiroItem = form.itens[0];

  return (
    <Modal open={open} onClose={onClose} title={editingId ? "Editar Orçamento" : "Novo Orçamento"} icon="request_quote" size="full"
      footer={<>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="form-orcamento" loading={salvando}>
          <Icon name="save" className="text-lg" /> Guardar Orçamento
        </Button>
      </>}>
      {carregando ? (
        <div className="space-y-3" aria-label="A carregar formulário">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2">
            <OrcamentoForm
              formId="form-orcamento"
              form={form}
              setField={setField}
              setForm={setForm}
              onSubmit={aoSubmeter}
              onClienteSelect={handleClienteSelect}
              clientes={clientes}
              materiais={materiais}
              servicosCatalogo={servicosCatalogo}
            />
          </div>

          <aside className="lg:col-span-1 obsidian-glass cyber-border rounded-xl p-5 lg:sticky lg:top-0 space-y-4" aria-label="Pré-visualização do orçamento">
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
              {(form.servicos || []).filter((sv) => sv.descricao).map((sv, i) => (
                <PreviewLinha key={`sv-${i}`} label={`Serviço ${i + 1}`} valor={`${sv.descricao} · ${sv.mob || 1}×${sv.duracaoHoras || 8}h · ${formatKz(sv.total || 0)}`} />
              ))}
              <PreviewLinha label="Subtotal" valor={formatKz(subtotalCalc)} />
              {descontoCalc > 0 && <PreviewLinha label="Desconto" valor={`-${formatKz(descontoCalc)}`} />}
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
      )}
    </Modal>
  );
}