"use client";

import { useEffect, useId, useRef } from "react";
import Icon from "./Icon";

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
};

export default function Modal({ open, onClose, title, icon, children, size = "lg", footer }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleEsc = (e) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full obsidian-glass rounded-2xl shadow-xl border border-outline-variant/30 animate-[modalIn_0.2s_ease-out] ${sizes[size] || sizes.lg} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0 border-l-4 border-l-primary pl-4">
            {icon && (
              <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon name={icon} className="text-lg text-primary" />
              </span>
            )}
            <h2 id={titleId} className="text-base font-bold text-foreground truncate">{title}</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Fechar janela"
            className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground shrink-0"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto custom-scrollbar">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/20 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
