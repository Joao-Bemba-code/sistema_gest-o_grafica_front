"use client";

import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import { formatHora, toNum } from "@/lib/estoque";

const filtros = [
  ["todos", "Todas"],
  ["entrada", "Entradas"],
  ["saida", "Saídas"],
];

export default function MovimentacoesModal({ open, onClose, movimentos, filtrados, visiveis, temMais, carregarMais, carregando, filtro, setFiltro, busca, setBusca, gerarPDF, pdfId }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Movimentações — Entradas e Saídas"
      icon="swap_vert"
      size="lg"
      footer={<Button variant="outline" onClick={onClose}>Fechar</Button>}
    >
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex gap-1 flex-wrap obsidian-glass rounded-lg p-1" role="group" aria-label="Filtrar movimentações">
            {filtros.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFiltro(k)}
                aria-pressed={filtro === k}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all duration-200 font-mono uppercase tracking-wider ${filtro === k ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[10rem]">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs focus-visible:outline-none transition-all"
              placeholder="Pesquisar material, cliente, lote..."
            />
          </div>
        </div>

        {carregando ? (
          <div className="space-y-1.5" aria-label="A carregar movimentações">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
            {visiveis.map((m) => {
              const ehEntrada = m.tipo === "entrada";
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 obsidian-glass rounded-lg px-3 py-2.5 border border-outline-variant/30">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={ehEntrada ? "success" : "destructive"} className="text-[9px]">{ehEntrada ? "Entrada" : "Saída"}</Badge>
                      <span className="text-xs font-bold text-foreground truncate">{m.material?.nome || "—"}</span>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {formatHora(m.createdAt)} • {ehEntrada ? `Fornecedor: ${m.fornecedor_nome || "—"}` : `Cliente: ${m.cliente_nome || "—"}`}
                      {m.lote ? ` • Lote ${m.lote}` : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Responsável: {m.solicitado_por || "—"} • Autorizado por: {m.permitido_por || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono text-sm font-bold ${ehEntrada ? "text-success" : "text-destructive"}`}>
                      {ehEntrada ? "+" : "−"}{toNum(m.quantidade)} {m.material?.unidade || "un"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px]"
                      loading={pdfId === m.id}
                      onClick={() => gerarPDF(m)}
                      aria-label={`Gerar PDF da ${ehEntrada ? "entrada" : "saída"} de ${m.material?.nome || ""}`}
                    >
                      <Icon name="print" className="text-sm" /> PDF
                    </Button>
                  </div>
                </div>
              );
            })}
            {movimentos.length === 0 && !carregando && (
              <p className="text-center p-6 text-muted-foreground">Sem movimentações registadas</p>
            )}
            {movimentos.length > 0 && visiveis.length === 0 && (
              <p className="text-center p-6 text-muted-foreground">Nenhuma movimentação para este filtro</p>
            )}
            {temMais && (
              <Button type="button" variant="outline" size="sm" className="w-full mt-1" onClick={carregarMais}>
                Carregar mais ({filtrados.length - visiveis.length} restantes)
              </Button>
            )}
          </div>
        )}
        {!carregando && filtrados.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-right">
            {filtrados.length} movimentação{filtrados.length === 1 ? "" : "ões"}
          </p>
        )}
      </div>
    </Modal>
  );
}
