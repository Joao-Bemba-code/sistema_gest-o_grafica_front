"use client";

import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { entradasEspecificacao } from "@/lib/estoque";
import gerarOrcamentoPdf from "@/lib/orcamentoPdf";

const estadoColors = {
  aprovado: "success",
  pendente: "warning",
  cancelado: "secondary",
  rejeitado: "destructive",
};

const ESTADOS = ["pendente", "aprovado", "cancelado", "rejeitado"];

function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

export default function OrcamentoDetalhesModal({ orcamento, empresa, onClose, onEditar, onEliminar, onEstado }) {
  const { addToast } = useToast();
  const o = orcamento;
  if (!o) return null;

  const handleWhatsApp = () => {
    const tel = String(o.cliente?.telefone || o.cliente?.whatsapp || "").replace(/\D/g, "");
    if (!tel) {
      addToast("Cliente sem telefone registado", "error");
      return;
    }
    const msg = encodeURIComponent(`Olá ${o.cliente?.nome || ""}! Segue o seu orçamento ${o.numero || o.id} da ${empresa?.nome || "SIGRAF"}.`);
    window.open(`https://wa.me/${tel}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const handleGerarPdf = () => {
    try {
      gerarOrcamentoPdf(o, empresa || {});
      addToast("PDF gerado com sucesso", "success");
    } catch {
      addToast("Erro ao gerar PDF", "error");
    }
  };

  return (
    <Modal open={Boolean(o)} onClose={onClose} title={`Detalhes — ${o.numero || o.id}`} icon="description" size="lg"
      footer={<>
        <Button variant="outline" onClick={() => onEditar(o)}><Icon name="edit" className="text-[16px]" /> Editar</Button>
        <Button variant="outline" onClick={() => onEliminar(o)} className="text-error hover:text-error"><Icon name="delete" className="text-[16px]" /> Eliminar</Button>
        <Button variant="outline" onClick={handleGerarPdf}><Icon name="picture_as_pdf" className="text-[16px]" /> PDF</Button>
        <Button variant="outline" onClick={handleWhatsApp}><Icon name="chat" className="text-[16px]" /> WhatsApp</Button>
        <Button onClick={onClose}>Fechar</Button>
      </>}>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground">Data</p>
            <p className="font-semibold text-foreground text-sm">{o.data ? new Date(o.data).toLocaleDateString("pt-BR") : "—"}</p>
          </div>
          <Badge variant={estadoColors[o.estado] || "secondary"} className="text-[10px]">{o.estado}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dados do Cliente</h3>
            <div className="space-y-1.5 text-sm">
              {["nome", "empresa", "nif", "telefone", "email"].map((campo) => (
                <div key={campo} className="flex justify-between gap-3">
                  <span className="text-muted-foreground capitalize">{campo}:</span>
                  <span className="font-medium text-foreground text-right">{o.cliente?.[campo] || "—"}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Especificação Técnica</h3>
            {entradasEspecificacao(o.especificacao).length > 0 ? (
              <div className="space-y-1.5 text-sm">
                {entradasEspecificacao(o.especificacao).map((e) => (
                  <div key={e.rotulo} className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{e.rotulo}:</span>
                    <span className="font-medium text-foreground text-right break-words">{e.valor}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem especificação técnica.</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Descrição dos Serviços</h3>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-bold text-muted-foreground uppercase">Descrição</th>
                  <th className="text-center px-3 py-2 font-bold text-muted-foreground uppercase">Qtd</th>
                  <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Valor Unit.</th>
                  <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {(o.itens || []).map((it, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="px-3 py-2 text-foreground">{it.descricao}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{it.quantidade}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatKz(it.valorUnitario)}</td>
                    <td className="px-3 py-2 text-right font-bold text-foreground">{formatKz(it.total)}</td>
                  </tr>
                ))}
                {(o.itens || []).length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-3 text-center text-muted-foreground">Sem itens</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-3">
            <div className="w-64 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{formatKz(o.subtotal)}</span></div>
              {o.valorIva > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IVA ({o.iva}%):</span><span className="font-medium">{formatKz(o.valorIva)}</span></div>}
              <div className="flex justify-between border-t pt-1 font-bold text-sm"><span>Total:</span><span className="text-primary">{formatKz(o.total || o.subtotal + o.valorIva)}</span></div>
            </div>
          </div>

          {(o.itens || []).filter((it) => (it.materiais || []).length).length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Materiais por item</h4>
              {(o.itens || []).filter((it) => (it.materiais || []).length).map((it) => {
                const custoUn = (it.materiais || []).reduce((s, m) => s + (Number(m.quantidade) || 0) * (Number(m.custo_unit) || 0), 0);
                return (
                  <div key={it.id || it.descricao} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-bold text-foreground">{it.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Custo materiais/un.: <span className="font-bold text-foreground">{formatKz(custoUn)}</span>
                      </p>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left px-2 py-1.5 font-bold text-muted-foreground uppercase">Material</th>
                            <th className="text-center px-2 py-1.5 font-bold text-muted-foreground uppercase">Qtd/un.</th>
                            <th className="text-right px-2 py-1.5 font-bold text-muted-foreground uppercase">Preço Venda</th>
                            <th className="text-right px-2 py-1.5 font-bold text-muted-foreground uppercase">Total</th>
                            <th className="text-center px-2 py-1.5 font-bold text-muted-foreground uppercase">Estoque</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(it.materiais || []).map((m, mi) => (
                            <tr key={mi} className="border-b border-border/20">
                              <td className="px-2 py-1.5 text-foreground">{m.descricao}</td>
                              <td className="px-2 py-1.5 text-center text-muted-foreground">{m.quantidade} {m.unidade}</td>
                              <td className="px-2 py-1.5 text-right text-muted-foreground">{formatKz(m.custo_unit)}</td>
                              <td className="px-2 py-1.5 text-right font-semibold text-foreground">{formatKz(m.custo_total || (Number(m.quantidade) * Number(m.custo_unit)))}</td>
                              <td className="px-2 py-1.5 text-center">
                                {m.mover_estoque
                                  ? <Badge variant="success" className="text-[9px]">Move estoque</Badge>
                                  : <Badge variant="outline" className="text-[9px]">Não move</Badge>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(o.servicos || []).length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Serviços (Mão de Obra)</h4>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-bold text-muted-foreground uppercase">Descrição</th>
                      <th className="text-center px-3 py-2 font-bold text-muted-foreground uppercase">MOB</th>
                      <th className="text-center px-3 py-2 font-bold text-muted-foreground uppercase">Prazo</th>
                      <th className="text-center px-3 py-2 font-bold text-muted-foreground uppercase">Horas</th>
                      <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Valor/Hora</th>
                      <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(o.servicos || []).map((sv, i) => (
                      <tr key={i} className="border-b border-border/20">
                        <td className="px-3 py-2 text-foreground">{sv.descricao}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{sv.mob || 1}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{sv.prazoExecucao || 1} dia{Number(sv.prazoExecucao) !== 1 ? "s" : ""}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{sv.duracaoHoras || 8}h</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{formatKz(sv.valorHora)}</td>
                        <td className="px-3 py-2 text-right font-bold text-foreground">{formatKz(sv.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Prazo de Execução", value: o.prazoExecucao },
            { label: "Condições de Pagamento", value: o.condicoesPagamento },
          ].map((item) => (
            <div key={item.label} className="bg-muted/50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{item.label}</p>
              <p className="font-medium text-foreground">{item.value || "—"}</p>
            </div>
          ))}
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Estado</p>
            <select
              value={o.estado}
              onChange={(e) => onEstado(o, e.target.value)}
              className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              {ESTADOS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {o.observacoes && (
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Observações</p>
            <p className="text-foreground text-sm">{o.observacoes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}