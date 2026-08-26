"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { especificacoesObjeto, formatKz, familias, normalizarFamilia, statusCfg, toNum } from "@/lib/estoque";

const textoStatus = {
  ok: { label: "Saudável", cor: "text-primary" },
  repor: { label: "Abaixo Mínimo", cor: "text-warning" },
  esgotado: { label: "Repor Urgente", cor: "text-error" },
};

function RadialMini({ pct, status }) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const cor = status === "ok" ? "var(--primary)" : status === "repor" ? "var(--warning)" : "var(--error)";
  const track = status === "ok" ? "var(--surface-variant)" : status === "repor" ? "color-mix(in srgb, var(--warning) 20%, transparent)" : "var(--error)";
  return (
    <div className="relative w-8 h-8 shrink-0" role="img" aria-label={`Nível de disponibilidade: ${Math.round(clamped)}%`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={track} strokeWidth="3" />
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={cor} strokeWidth="3" strokeDasharray={`${clamped}, 100`} strokeLinecap="round" />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold ${status === "ok" ? "text-on-surface" : status === "repor" ? "text-warning" : "text-error"}`}>
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

function BotaoIcone({ icon, label, onClick, critico, cor }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-8 h-8 rounded border flex items-center justify-center transition-colors ${
        critico
          ? "border-error/30 bg-error/10 hover:bg-error hover:text-white text-error"
          : cor === "saida"
            ? "border-outline-variant bg-surface-variant hover:border-error hover:text-error text-on-surface-variant"
            : "border-outline-variant bg-surface-variant hover:border-primary hover:text-primary text-on-surface-variant"
      }`}
    >
      <Icon name={icon} className="text-[16px]" />
    </button>
  );
}

function MaterialCard({ item, index = 0, onEntrada, onSaida, onReservas, onEditar, onFichaPdf, onPedido, onEliminar, onTransferencia, onPerda, onDesperdicio }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef(null);
  const familiaCfg = familias[normalizarFamilia(item.categoria?.familia)];
  const pct = toNum(item.estoque_max) > 0 ? (toNum(item.estoque_disponivel) / toNum(item.estoque_max)) * 100 : 100;
  const critico = item.status === "repor" || item.status === "esgotado";
  const stText = textoStatus[item.status] || textoStatus.ok;
  const unidade = item.unidade?.toUpperCase() || "UN";

  useEffect(() => {
    if (!menuAberto) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuAberto]);

  const executar = useCallback((fn, arg) => {
    setMenuAberto(false);
    if (fn) fn(arg);
  }, []);

  return (
    <article
      className={`relative overflow-visible obsidian-glass rounded-lg p-4 transition-all duration-300 group animate-card-in ${critico ? "border border-error/50 bg-error/5" : "cyber-border"}`}
      style={{ "--stagger": `${Math.min(index, 14) * 60}ms` }}
    >
      {critico && <div className="absolute top-0 left-0 w-1 h-full bg-error" aria-hidden="true" />}
      <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative ${critico ? "pl-2" : ""}`}>
        {/* Col 1: Detalhes */}
        <div className="md:col-span-5 flex gap-4 items-center min-w-0">
          <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 border ${critico ? "bg-error/10 border-error/30 animate-pulse" : "bg-surface-variant border-outline-variant group-hover:border-primary/50"} transition-colors`}>
            <Icon name={familiaCfg.icon} className={`text-[20px] ${critico ? "text-error" : "text-primary"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 min-w-0">
              <h3 className="font-sans text-base text-on-surface tracking-wide font-medium truncate">{item.nome}</h3>
              <span className={`px-1.5 py-0.5 rounded-sm border text-[9px] font-mono tracking-widest bg-surface-variant shrink-0 ${critico ? "border-error/50 text-error bg-error/10" : "border-outline-variant text-on-surface-variant"}`}>
                {familiaCfg.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-on-surface-variant">
              <span>SKU: <span className={critico ? "text-error/80" : "text-primary/80"}>{item.codigo || "—"}</span></span>
              {(() => {
                const espec = especificacoesObjeto(item.especificacoes);
                const sub = String(espec.subfamilia || item.categoria?.subfamilia || "").trim();
                return sub ? (
                  <>
                    <span className="w-1 h-1 rounded-full bg-outline-variant" />
                    <span>SUB: <span className={critico ? "text-error/80" : "text-primary/80"}>{sub}</span></span>
                  </>
                ) : null;
              })()}
              {item.localizacao ? (
                <>
                  <span className="w-1 h-1 rounded-full bg-outline-variant" />
                  <span>LOC: <span className={critico ? "text-error/80" : "text-primary/80"}>{item.localizacao}</span></span>
                </>
              ) : null}
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              <span className="truncate max-w-[160px]" title={item.fornecedor || ""}>FRN: {item.fornecedor || "—"}</span>
            </div>
          </div>
        </div>

        {/* Col 2: Stock */}
        <div className="md:col-span-3 flex flex-col md:border-l md:border-outline-variant/30 md:pl-4">
          <p className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${critico ? "text-error/80" : "text-on-surface-variant"}`}>Qtd. Disponível</p>
          <div className="flex items-baseline gap-1">
            <p className={`font-mono text-xl font-bold ${critico ? "text-error" : "text-on-surface"}`}>{toNum(item.estoque_disponivel).toLocaleString("pt-AO")}</p>
            <span className={`text-[10px] font-mono uppercase ${critico ? "text-error" : "text-primary"}`}>{unidade}</span>
          </div>
          {item.preco_venda > 0 && (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[10px] font-mono text-muted-foreground">Venda:</span>
              <span className="text-[11px] font-mono font-bold text-primary">{formatKz(item.preco_venda)}/{unidade}</span>
            </div>
          )}
        </div>

        {/* Col 3: Progresso */}
        <div className="md:col-span-2 flex items-center gap-3 md:border-l md:border-outline-variant/30 md:pl-4">
          <RadialMini pct={pct} status={item.status} />
          <div>
            <p className={`text-[9px] font-mono uppercase tracking-widest ${critico ? "text-error/80" : "text-on-surface-variant"}`}>Pt. Encomenda</p>
            <p className={`text-[11px] font-mono font-bold ${stText.cor}`}>{stText.label}</p>
          </div>
        </div>

        {/* Col 4: Ações */}
        <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/30">
          <div className="flex gap-1.5">
            <BotaoIcone icon="add" label="Entrada" critico={critico} onClick={() => onEntrada(item)} />
            <BotaoIcone icon="remove" label="Saída" cor="saida" critico={critico} onClick={() => onSaida(item)} />
            <BotaoIcone icon="description" label="Ver ficha do material (PDF)" critico={critico} onClick={() => onFichaPdf(item)} />
            <div className="relative" ref={menuRef}>
              <BotaoIcone icon="more_vert" label="Mais opções" critico={critico} onClick={() => setMenuAberto((v) => !v)} />
              {menuAberto && (
                <div className="absolute right-0 bottom-full mb-1 z-[60] w-48 bg-popover border border-border rounded-xl shadow-2xl overflow-y-auto max-h-[80vh]">
                  <MenuItem icon="swap_horiz" label="Transferência" onClick={() => executar(onTransferencia, item)} />
                  <MenuItem icon="warning" label="Registar perda" onClick={() => executar(onPerda, item)} />
                  <MenuItem icon="delete_sweep" label="Registar desperdício" onClick={() => executar(onDesperdicio, item)} />
                  <MenuItem icon="lock" label="Reservas" onClick={() => executar(onReservas, item)} />
                  <MenuItem icon="edit" label="Editar" onClick={() => executar(onEditar, item)} />
                  {onEliminar && <MenuItem icon="delete" label="Remover" onClick={() => executar(onEliminar, item)} />}
                </div>
              )}
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-primary md:hidden">{formatKz(item.preco_venda)}</span>
        </div>
      </div>
    </article>
  );
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors text-left"
    >
      <Icon name={icon} className="text-lg text-muted-foreground" />
      {label}
    </button>
  );
}

function MaterialCardSkeleton() {
  return (
    <div className="obsidian-glass rounded-lg p-4 animate-pulse" aria-hidden="true">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-5 flex gap-4 items-center">
          <div className="w-10 h-10 rounded bg-surface-variant" />
          <div className="space-y-2">
            <div className="h-4 w-44 bg-surface-variant rounded" />
            <div className="h-3 w-32 bg-surface-variant/70 rounded" />
          </div>
        </div>
        <div className="md:col-span-3 space-y-2">
          <div className="h-3 w-20 bg-surface-variant rounded" />
          <div className="h-6 w-16 bg-surface-variant rounded" />
        </div>
        <div className="md:col-span-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-variant" />
          <div className="space-y-2">
            <div className="h-3 w-16 bg-surface-variant rounded" />
            <div className="h-3 w-12 bg-surface-variant/70 rounded" />
          </div>
        </div>
        <div className="md:col-span-2 flex justify-end gap-1.5">
          {[0, 1, 2].map((i) => <div key={i} className="w-8 h-8 rounded bg-surface-variant" />)}
        </div>
      </div>
    </div>
  );
}

export default memo(MaterialCard);
export { MaterialCardSkeleton };
