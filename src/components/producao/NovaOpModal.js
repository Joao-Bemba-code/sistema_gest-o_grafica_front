"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { inputCls } from "@/lib/estoque";
import { listar as listarOrcamentos } from "@/services/orcamentos";
import { listar as listarClientes } from "@/services/clientes";
import { criarOrdem } from "@/services/producao";

const hoje = () => new Date().toISOString().split("T")[0];

function clienteLabel(c) {
  if (!c) return "";
  if (!c.nome && !c.empresa) return "Sem cliente associado";
  return c.empresa ? `${c.empresa} · ${c.nome}` : c.nome;
}

// Lista todos os artigos/produtos do orçamento (um orçamento pode ter vários itens).
function produtosDe(orc) {
  const nomes = (orc?.itens || [])
    .map((i) => String(i.descricao || "").trim())
    .filter(Boolean);
  const espec = String(orc?.especificacao?.produto || "").trim();
  if (nomes.length === 0 && espec) return [espec];
  return nomes;
}

// O campo produto da OP é guardado em STRING(200) no backend.
function produtoDe(orc) {
  const nomes = produtosDe(orc);
  if (nomes.length === 0) return orc ? `Orçamento ${orc.numero}` : "";
  const texto = nomes.join(" · ");
  return texto.length > 190 ? `${texto.slice(0, 189).trimEnd()}…` : texto;
}

function quantidadeDe(orc) {
  return (orc?.itens || []).reduce((s, i) => s + (Number(i.quantidade) || 0), 0);
}

// Agrega os materiais do orçamento exatamente como o backend faz na OP:
// soma por material, multiplicando pela tiragem de cada item e respeitando
// a regra de consumo (toner / uso parcial / por unidade).
function materiaisDe(orc) {
  const mapa = new Map();
  for (const item of orc?.itens || []) {
    const qtdItem = parseInt(item.quantidade, 10) || 0;
    for (const m of item.materiais || []) {
      const mid = Number(m.material_id);
      if (!mid) continue;
      const porUnidade = m.tipo_material === "toner"
        ? Number(m.quantidade) || 0
        : m.usar_parcial
          ? Number(m.quantidade_folhas) || Number(m.quantidade) || 0
          : Number(m.quantidade) || 0;
      const qtd = porUnidade * (qtdItem || 1);
      const atual = mapa.get(mid);
      if (atual) {
        atual.quantidade += qtd;
      } else {
        mapa.set(mid, {
          material_id: mid,
          descricao: m.descricao || `Material #${mid}`,
          unidade: m.unidade || "",
          quantidade: qtd,
          reserva: Boolean(m.mover_estoque),
        });
      }
    }
  }
  return Array.from(mapa.values());
}

export default function NovaOpModal({ open, onClose, onCriada }) {
  const { addToast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [selecionadoId, setSelecionadoId] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    setCarregando(true);
    setClienteId("");
    setSelecionadoId("");
    Promise.all([
      listarClientes().catch(() => []),
      listarOrcamentos({ estado: "aprovado" }).catch(() => []),
    ])
      .then(([clientesData, orcData]) => {
        if (!ativo) return;
        const listaOrc = (Array.isArray(orcData) ? orcData : orcData?.data ?? []).filter((o) => !o.ordem_producao);
        const listaCli = Array.isArray(clientesData) ? clientesData : clientesData?.clientes ?? clientesData?.data ?? [];
        setClientes(listaCli);
        setOrcamentos(listaOrc);
        if (listaCli.length === 1) setClienteId(String(listaCli[0].id));
      })
      .catch(() => {
        if (ativo) addToast("Erro ao carregar clientes e orçamentos aprovados", "error");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, [open, addToast]);

  const orcamentosDoCliente = useMemo(
    () => orcamentos.filter((o) => String(o.cliente_id) === String(clienteId)),
    [orcamentos, clienteId]
  );
  const orcamento = useMemo(
    () => orcamentosDoCliente.find((o) => String(o.id) === String(selecionadoId)) || null,
    [orcamentosDoCliente, selecionadoId]
  );
  const materiais = useMemo(() => materiaisDe(orcamento), [orcamento]);
  const quantidade = useMemo(() => quantidadeDe(orcamento), [orcamento]);
  const produtos = useMemo(() => produtosDe(orcamento), [orcamento]);
  const produto = useMemo(() => produtoDe(orcamento), [orcamento]);

  const submeter = async (e) => {
    e.preventDefault();
    if (!clienteId) {
      addToast("Selecione o cliente", "error");
      return;
    }
    if (!orcamento) {
      addToast("Selecione o orçamento da encomenda", "error");
      return;
    }
    const itens_materiais = materiais
      .filter((m) => m.reserva)
      .map((m) => ({ material_id: m.material_id, quantidade: m.quantidade }));
    setSalvando(true);
    try {
      const criada = await criarOrdem({
        orcamento_id: orcamento.id,
        cliente_id: orcamento.cliente_id || null,
        produto,
        quantidade,
        dataEntrada: hoje(),
        dataEntrega: dataEntrega || null,
        observacoes: observacoes.trim() || `Orçamento ${orcamento.numero}`,
        itens_materiais: itens_materiais.length ? itens_materiais : undefined,
      });
      addToast(`Ordem de produção ${criada?.numero || ""} criada`, "success");
      onCriada?.(criada);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao criar a ordem de produção", "error");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova Ordem de Produção"
      icon="construction"
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-nova-op" disabled={salvando || !orcamento}>
            {salvando ? "A criar..." : "Criar OP"}
          </Button>
        </>
      }
    >
      <form id="form-nova-op" onSubmit={submeter} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Cliente *</label>
            <select
              value={clienteId}
              onChange={(e) => { setClienteId(e.target.value); setSelecionadoId(""); }}
              className={inputCls}
              disabled={carregando}
            >
              <option value="">
                {carregando ? "A carregar clientes..." : "Selecione o cliente"}
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{clienteLabel(c)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Orçamento (encomenda) *</label>
            <select
              value={selecionadoId}
              onChange={(e) => setSelecionadoId(e.target.value)}
              className={inputCls}
              disabled={carregando || !clienteId}
            >
              <option value="">
                {!clienteId
                  ? "Escolha primeiro o cliente"
                  : carregando
                    ? "A carregar orçamentos..."
                    : orcamentosDoCliente.length === 0
                      ? "Sem orçamentos aprovados"
                      : "Selecione o orçamento aprovado"}
              </option>
              {orcamentosDoCliente.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.numero} · {produtoDe(o)} ({quantidadeDe(o)})
                </option>
              ))}
            </select>
            {clienteId && !carregando && orcamentosDoCliente.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Este cliente não tem orçamentos aprovados sem ordem de produção. Aprove um orçamento no Comercial primeiro.
              </p>
            )}
          </div>
        </div>

        {!clienteId && !carregando && clientes.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Não há clientes registados. Registe um cliente no Comercial primeiro.
          </p>
        )}

        {orcamento && (
          <>
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Cliente</p>
                <p className="text-sm text-foreground">{clienteLabel(orcamento.cliente)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Artigo / Produto</p>
                {produtos.length > 0 ? (
                  <ul className="space-y-0.5">
                    {produtos.map((nome, i) => (
                      <li key={`${nome}-${i}`} className="text-sm text-foreground">{nome}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-foreground">{produto}</p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Tiragem</p>
                <p className="text-sm text-foreground">{quantidade}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="text-[11px] font-semibold text-muted-foreground">Materiais da encomenda</p>
                <span className="text-xs text-muted-foreground">{materiais.length} material(is)</span>
              </div>
              {materiais.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted-foreground">Este orçamento não tem materiais associados.</p>
              ) : (
                <div className="max-h-56 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/60 text-left text-[11px] text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Material</th>
                        <th className="px-3 py-2 font-semibold">Quantidade</th>
                        <th className="px-3 py-2 font-semibold">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materiais.map((m) => (
                        <tr key={m.material_id} className="border-t border-border/60">
                          <td className="px-3 py-2 text-foreground">{m.descricao}</td>
                          <td className="px-3 py-2 text-foreground">
                            {m.quantidade}{m.unidade ? ` ${m.unidade}` : ""}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{m.reserva ? "Reserva" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Data de entrega</label>
                <input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Nº do orçamento</label>
                <input value={orcamento.numero || ""} readOnly className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Observações</label>
                <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} className={inputCls} placeholder="Notas para o chão de fábrica..." />
              </div>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
