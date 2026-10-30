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
  encontrarProdutoArquivo,
  materiaisDaComposicao,
  recalcularItem,
  recalcularServico,
  totalQuantidadeItem,
} from "@/components/orcamentos/OrcamentoForm";
import { buscarPorId, criar, atualizar } from "@/services/orcamentos";
import { listar as listarClientes } from "@/services/clientes";
import { listar as listarMateriais } from "@/services/materiais";
import { listar as listarServicos } from "@/services/servicos";
import { buscarOrganizacao } from "@/services/configuracoes";

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

// "5.000 unidades" → "5000"; "2,5" → "2.5"; "" quando não há número.
function quantidadeNumerica(v) {
  const t = String(v || "").trim();
  if (!t) return "";
  const n = t.replace(/\s+/g, "").replace(",", ".");
  if (/^\d{1,3}(\.\d{3})+$/.test(n)) return String(parseInt(n.replace(/\./g, ""), 10));
  const num = Number(n);
  return Number.isNaN(num) ? "" : String(num);
}

function PreviewLinha({ label, valor, acento }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="cyber-label">{label}</span>
      <span className={`text-sm font-bold font-mono truncate text-right ${acento || "text-foreground"}`}>{valor || "—"}</span>
    </div>
  );
}

export default function OrcamentoModal({ open, editingId, prefill, onClose, onSaved }) {
  const { addToast } = useToast();

  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [servicosCatalogo, setServicosCatalogo] = useState([]);
  const [valorHoraServicos, setValorHoraServicos] = useState(0);
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
        const [cliData, matData, srvData, orgData] = await Promise.all([
          listarClientes({ tipo: "cliente" }),
          listarMateriais().catch(() => []),
          listarServicos().catch(() => []),
          buscarOrganizacao().catch(() => null),
        ]);
        if (!ativo) return;
        setClientes(Array.isArray(cliData) ? cliData : cliData?.data ?? []);
        setMateriais(Array.isArray(matData) ? matData : matData?.data ?? []);
        setServicosCatalogo(Array.isArray(srvData) ? srvData : srvData?.data ?? []);
        setValorHoraServicos(Number(orgData?.valor_hora_servicos) || 0);
        if (!editingId && prefill) {
          // Orçamento criado a partir de uma proposta: herda cliente, prazo e
          // os produtos + quantidades. Cada produto é procurado no cadastro
          // (stock); se existir, o item fica com a descrição, a quantidade e a
          // composição — a mesma lógica de escrever o nome do produto no campo
          // de descrição. Se o nome bater com um serviço do catálogo, o
          // primeiro serviço é preenchido. O objecto fica só nas observações.
          const listaClientes = Array.isArray(cliData) ? cliData : cliData?.data ?? [];
          const listaMateriais = Array.isArray(matData) ? matData : matData?.data ?? [];
          const listaServicos = Array.isArray(srvData) ? srvData : srvData?.data ?? [];
          const cli = listaClientes.find((c) => String(c.id) === String(prefill.cliente_id));
          const produtosProposta = Array.isArray(prefill.produtos)
            ? prefill.produtos.filter((pr) => pr && String(pr.nome || "").trim())
            : [];
          setForm((p) => {
            let itens = [...p.itens];
            const servicos = [...(p.servicos || [])];
            if (produtosProposta.length) {
              itens = produtosProposta.map((pr, i) => {
                const nome = String(pr.nome || "").trim();
                const qtd = quantidadeNumerica(pr.quantidade);
                const mat = encontrarProdutoArquivo(listaMateriais, nome);
                const base = i === 0 ? { ...p.itens[0] } : { ...blankItem, materiais: [{ ...blankMaterial }] };
                const item = { ...base, descricao: nome, quantidade: qtd || base.quantidade };
                if (mat) {
                  item.descricao = mat.nome || mat.nome_tecnico || nome;
                  item.materiais = materiaisDaComposicao(mat, Number(qtd) || 1, listaMateriais);
                  item.produtoAplicado = mat.id;
                  item.valorUnitario = Number(mat.preco_venda) || Number(mat.custo_unit) || 0;
                }
                item.total = totalQuantidadeItem(item);
                return item;
              });
            } else {
              const produtoTexto = String(prefill.produto || "").trim();
              const qtdTexto = quantidadeNumerica(prefill.quantidade);
              const produto = produtoTexto ? encontrarProdutoArquivo(listaMateriais, produtoTexto) : null;
              const servico = !produto && produtoTexto
                ? listaServicos.find((s) => String(s.nome || "").trim().toLowerCase() === produtoTexto.toLowerCase()) || null
                : null;
              if (produto) {
                const comp = materiaisDaComposicao(produto, Number(qtdTexto) || 1, listaMateriais);
                itens[0] = {
                  ...itens[0],
                  descricao: produto.nome || produto.nome_tecnico || produtoTexto,
                  quantidade: qtdTexto || itens[0].quantidade,
                  materiais: comp,
                  produtoAplicado: produto.id,
                  valorUnitario: Number(produto.preco_venda) || Number(produto.custo_unit) || 0,
                };
                itens[0].total = totalQuantidadeItem(itens[0]);
              } else if (servico) {
                servicos[0] = {
                  ...servicos[0],
                  servico_id: servico.id,
                  descricao: servico.nome,
                  valorHora: Number(orgData?.valor_hora_servicos) || 0,
                };
                const calc = recalcularServico(servicos[0]);
                servicos[0].duracaoHoras = calc.duracaoHoras;
                servicos[0].total = calc.total;
              } else if (produtoTexto) {
                itens[0] = { ...itens[0], descricao: produtoTexto, quantidade: qtdTexto || itens[0].quantidade };
              }
            }
            return {
              ...p,
              cliente_id: prefill.cliente_id ? String(prefill.cliente_id) : p.cliente_id,
              cliente: cli?.nome || p.cliente,
              empresa: cli?.empresa || p.empresa,
              nif: cli?.nif || p.nif,
              telefone: cli?.telefone || p.telefone,
              email: cli?.email || p.email,
              prazoExecucao: prefill.prazoExecucao || p.prazoExecucao,
              observacoes: prefill.observacoes || p.observacoes,
              itens,
              servicos,
            };
          });
        }
        if (editingId) {
          try {
            const o = await buscarPorId(editingId);
            if (!ativo || !o) return;
            setForm({
              cliente_id: o.cliente_id ? String(o.cliente_id) : "",
              cliente: o.cliente?.nome || "", empresa: o.cliente?.empresa || "", nif: o.cliente?.nif || "",
              telefone: o.cliente?.telefone || "", email: o.cliente?.email || "",
              itens: (Array.isArray(o.itens) && o.itens.length ? o.itens : [blankItem]).map((it) => {
                const qtdItem = Number(it.quantidade) || 0;
                const valU = Number(it.valorUnitario) || 0;
                return {
                  descricao: it.descricao || "",
                  quantidade: String(it.quantidade ?? ""),
                  valorUnitario: String(it.valorUnitario ?? ""),
                  total: qtdItem > 0 ? Number((qtdItem * valU).toFixed(2)) : Number(it.total) || 0,
                materiais: (it.materiais || []).map((m) => {
                  const pecasPorFolha = Number(m.pecas_por_folha) || 1;
                  const usar_parcial = Boolean(m.usar_parcial);
                  const qtdFolhas = Number(m.quantidade_folhas) || Number(m.quantidade) || 0;
                  const qtdPorUnidade = usar_parcial && pecasPorFolha > 1
                    ? (Number(m.quantidade_pecas) || (qtdFolhas * pecasPorFolha))
                    : qtdFolhas;
                  const fator = qtdItem > 0 ? qtdItem : 1;
                  return {
                    material_id: m.material_id ? String(m.material_id) : "",
                    descricao: m.descricao || "",
                    unidade: m.unidade || "un",
                    quantidade: String(Number((qtdPorUnidade * fator).toFixed(4)) || ""),
                    preco_venda: Number(m.preco_folha) || Number(m.custo_unit) || 0,
                    custo_total: Number(((Number(m.custo_total) || 0) * fator).toFixed(2)),
                    mover_estoque: Boolean(m.mover_estoque),
                    usar_parcial: usar_parcial,
                    formato_final: m.formato_final || "",
                    largura_final: m.largura_final != null ? String(m.largura_final) : "",
                    altura_final: m.altura_final != null ? String(m.altura_final) : "",
                    pecas_por_folha: pecasPorFolha,
                    preco_folha: Number(m.preco_folha) || Number(m.custo_unit) || 0,
                    formato: m.formato || "",
                    largura_mm: m.largura_mm != null ? m.largura_mm : "",
                    altura_mm: m.altura_mm != null ? m.altura_mm : "",
                    especificacoes: m.especificacoes || {},
                  };
                }),
              }}),
              servicos: (Array.isArray(o.servicos) && o.servicos.length ? o.servicos : [blankServico]).map((sv) => ({
                servico_id: sv.servico_id || "",
                descricao: sv.descricao || "",
                mob: Number(sv.mob) || 1,
                prazoExecucao: Number(sv.prazoExecucao || sv.prazo_execucao) || 1,
                prazoUnidade: sv.prazoUnidade || sv.prazo_unidade || "dias",
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
  }, [open, editingId, prefill]);

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
    try {
      const dados = {
        cliente_id: form.cliente_id,
        cliente: { nome: form.cliente, empresa: form.empresa, nif: form.nif, telefone: form.telefone, email: form.email },
        itens: form.itens.map((it) => {
          const qtdItem = Number(it.quantidade) || 1;
          const materiais = (it.materiais || [])
            .map((m) => {
              const pecasPorFolha = Number(m.pecas_por_folha) || 1;
              const qtdPecasTotal = Number(m.quantidade) || 0;
              const qtdFolhasTotal = m.usar_parcial && pecasPorFolha > 1
                ? Math.ceil(qtdPecasTotal / pecasPorFolha)
                : qtdPecasTotal;
              // A interface mostra totais do serviço; aqui guarda por unidade do item.
              const qtdFolhas = Number((qtdFolhasTotal / qtdItem).toFixed(4));
              const qtdPecas = Number((qtdPecasTotal / qtdItem).toFixed(4));
              return {
                material_id: m.material_id,
                descricao: m.descricao,
                unidade: m.unidade || "un",
                quantidade: qtdFolhas,
                custo_unit: Number(m.preco_venda) || 0,
                custo_total: Number(((Number(m.custo_total) || 0) / qtdItem).toFixed(4)),
                mover_estoque: Boolean(m.mover_estoque),
                usar_parcial: Boolean(m.usar_parcial),
                formato_final: m.formato_final || "",
                largura_final: m.largura_final || "",
                altura_final: m.altura_final || "",
                pecas_por_folha: pecasPorFolha,
                preco_folha: Number(m.preco_folha) || Number(m.preco_venda) || 0,
                formato: m.formato || "",
                largura_mm: m.largura_mm || "",
                altura_mm: m.altura_mm || "",
                quantidade_folhas: qtdFolhas,
                quantidade_pecas: m.usar_parcial && pecasPorFolha > 1 ? qtdPecas : 0,
              };
            })
            .filter((m) => m.material_id);
          const calc = recalcularItem(it);
          const temMateriais = materiais.length > 0;
          const precoDisplay = Number(it.valorUnitario) || 0;
          const qtd = Number(it.quantidade) || 0;
          const valorUnitario = precoDisplay > 0 ? precoDisplay : (temMateriais ? calc.valorUnitario : 0);
          const total = qtd > 0 ? Number((qtd * valorUnitario).toFixed(2)) : valorUnitario;
          return {
            descricao: it.descricao,
            quantidade: qtd,
            valorUnitario,
            total,
            composto: temMateriais,
            margem: 0,
            materiais,
          };
        }),
        servicos: (form.servicos || []).map((sv) => {
          const calc = recalcularServico(sv);
          return {
            servico_id: sv.servico_id || null,
            descricao: sv.descricao,
            mob: Number(sv.mob) || 1,
            prazoExecucao: Number(sv.prazoExecucao) || 1,
            prazo_unidade: sv.prazoUnidade || "dias",
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
      if (!editingId && prefill?.validade) dados.validade = Number(prefill.validade) || 0;
      let salvo;
      if (editingId) {
        salvo = await atualizar(editingId, dados);
        addToast("Orçamento atualizado com sucesso", "success");
      } else {
        salvo = await criar(dados);
        addToast("Orçamento criado com sucesso", "success");
      }
      onSaved?.(salvo);
      onClose();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    } finally {
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
              valorHoraServicos={valorHoraServicos}
            />
          </div>

          <aside className="lg:col-span-1 bg-card border border-border rounded-xl p-5 lg:sticky lg:top-0 space-y-4" aria-label="Pré-visualização do orçamento">
            <div className="flex items-center justify-between">
              <p className="cyber-label flex items-center gap-1.5">
                <Icon name="visibility" className="text-sm text-primary" /> Pré-visualização
              </p>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" aria-hidden="true" />
            </div>

            <div className="relative w-24 h-24 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto">
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