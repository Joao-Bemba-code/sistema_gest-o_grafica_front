// ─────────────────────────────────────────────────────────────
// components/Modal.jsx
// ─────────────────────────────────────────────────────────────
"use client";

import { useEffect } from "react";
import Icon from "@/components/Icon";

export default function Modal({
  open,
  onClose,
  title,
  icon,
  size = "md",
  footer,
  children,
  dragPos,
  dragging = false,
  onHeaderMouseDown,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const maxW =
    size === "sm" ? "max-w-md" :
    size === "lg" ? "max-w-2xl" :
    size === "xl" ? "max-w-4xl" :
    "max-w-lg";

  const arrastavel = Boolean(onHeaderMouseDown);

  const x = dragPos?.x || 0;
  const y = dragPos?.y || 0;

  return (
    <div
      className={
        arrastavel
          ? "fixed inset-0 z-50 pointer-events-none"
          : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      }
      onClick={arrastavel ? undefined : onClose}
    >
      <div
        className={`pointer-events-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] ${
          arrastavel
            ? `absolute left-1/2 top-1/2 w-[calc(100%-2rem)] ${maxW}`
            : `w-full ${maxW}`
        } ${dragging ? "select-none" : ""}`}
        style={
          arrastavel
            ? {
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                transition: dragging ? "none" : "transform 0.15s ease-out",
              }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onMouseDown={onHeaderMouseDown}
          className={`flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-card shrink-0 ${
            arrastavel ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon name={icon} className="text-base text-muted-foreground" />
              </span>
            )}
            <h3 className="font-semibold text-foreground truncate">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors shrink-0"
            aria-label="Fechar"
          >
            <Icon name="close" className="text-lg text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-border bg-muted/30 flex flex-wrap justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}