"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";
import { formatKz, grupos, statusCfg, toNum } from "@/lib/estoque";

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
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={track}
          strokeWidth="3"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={cor}
          strokeWidth="3"
          strokeDasharray={`${clamped}, 100`}
          strokeLinecap="round"
        />
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

function MaterialCard({ item, index = 0, onEntrada, onSaida, onReservas, onEditar, onFichaPdf }) {
  const [menuPos, setMenuPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const st = statusCfg[item.status] || statusCfg.ok;
  const grupo = grupos[item.categoria?.grupo || "outros"] || grupos.outros;
  const pct = toNum(item.estoque_max) > 0 ? (toNum(item.estoque_disponivel) / toNum(item.estoque_max)) * 100 : 100;
  const critico = item.status === "repor" || item.status === "esgotado";
  const stText = textoStatus[item.status] || textoStatus.ok;
  const unidade = item.unidade?.toUpperCase() || "UN";

  const fecharMenu = useCallback(() => setMenuPos(null), []);

  const abrirMenu = () => {
    if (menuPos) {
      setMenuPos(null);
      return;
    }
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
  };

  useEffect(() => {
    if (!menuPos) return;
    const fechar = () => setMenuPos(null);
    const emClick = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuPos(null);
    };
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    document.addEventListener("mousedown", emClick);
    return () => {
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
      document.removeEventListener("mousedown", emClick);
    };
  }, [menuPos]);

  return (
    <article
      className={`relative obsidian-glass rounded-lg p-4 transition-all duration-300 group animate-card-in ${critico ? "border border-error/50 bg-error/5" : "cyber-border"}`}
      style={{ "--stagger": `${Math.min(index, 14) * 60}ms` }}
    >
      {critico && <div className="absolute top-0 left-0 w-1 h-full bg-error" aria-hidden="true" />}
      <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative z-10 ${critico ? "pl-2" : ""}`}>
        {/* Col 1: Detalhes */}
        <div className="md:col-span-5 flex gap-4 items-center min-w-0">
          <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 border ${critico ? "bg-error/10 border-error/30 animate-pulse" : "bg-surface-variant border-outline-variant group-hover:border-primary/50"} transition-colors`}>
            <Icon name={grupo.icon} className={`text-[20px] ${critico ? "text-error" : "text-primary"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-sans text-base text-on-surface tracking-wide font-medium truncate">{item.nome}</h3>
              <span className={`px-1.5 py-0.5 rounded-sm border text-[9px] font-mono tracking-widest bg-surface-variant ${critico ? "border-error/50 text-error bg-error/10" : "border-outline-variant text-on-surface-variant"}`}>
                {grupo.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-on-surface-variant">
              <span>SKU: <span className={critico ? "text-error/80" : "text-primary/80"}>{item.codigo || "—"}</span></span>
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              <span>FRN: {item.fornecedor || "—"}</span>
            </div>
          </div>
        </div>

        {/* Col 2: Stock */}
        <div className="md:col-span-3 flex flex-col border-l border-outline-variant/30 pl-4">
          <p className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${critico ? "text-error/80" : "text-on-surface-variant"}`}>Qtd. Disponível</p>
          <div className="flex items-baseline gap-1">
            <p className={`font-mono text-xl font-bold ${critico ? "text-error" : "text-on-surface"}`}>{toNum(item.estoque_disponivel).toLocaleString("pt-AO")}</p>
            <span className={`text-[10px] font-mono uppercase ${critico ? "text-error" : "text-primary"}`}>{unidade}</span>
          </div>
        </div>

        {/* Col 3: Progresso */}
        <div className="md:col-span-2 flex items-center gap-3 border-l border-outline-variant/30 pl-4">
          <RadialMini pct={pct} status={item.status} />
          <div>
            <p className={`text-[9px] font-mono uppercase tracking-widest ${critico ? "text-error/80" : "text-on-surface-variant"}`}>Pt. Encomenda</p>
            <p className={`text-[11px] font-mono font-bold ${stText.cor}`}>{stText.label}</p>
          </div>
        </div>

        {/* Col 4: Ações */}
        <div className="md:col-span-2 flex justify-end gap-1.5">
          <BotaoIcone icon="add" label="Entrada" critico={critico} onClick={() => onEntrada(item)} />
          <BotaoIcone icon="remove" label="Saída" cor="saida" critico={critico} onClick={() => onSaida(item)} />
          <div className="relative" ref={btnRef}>
            <BotaoIcone icon="more_vert" label="Mais opções" critico={critico} onClick={abrirMenu} />
            {menuPos &&
              createPortal(
                <div
                  ref={menuRef}
                  role="menu"
                  className="fixed z-[90] w-44 obsidian-glass rounded-xl border overflow-hidden animate-scale-in shadow-xl"
                  style={{ top: menuPos.top, right: menuPos.right }}
                >
                  <MenuItem icon="lock" label="Reservas" onClick={() => { fecharMenu(); onReservas(item); }} />
                  <MenuItem icon="edit" label="Editar" onClick={() => { fecharMenu(); onEditar(item); }} />
                  <MenuItem icon="print" label="Ficha PDF" onClick={() => { fecharMenu(); onFichaPdf(item); }} />
                  <div className="border-t border-outline-variant/40 px-4 py-1.5 text-[10px] font-mono text-on-surface-variant">{formatKz(item.preco_venda)}</div>
                </div>,
                document.body
              )}
          </div>
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
      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-accent transition-colors text-left"
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
