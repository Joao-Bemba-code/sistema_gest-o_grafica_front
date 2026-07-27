"use client";

import { useEffect, useCallback } from "react";
import Icon from "./Icon";

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  full: "max-w-[calc(100vw-2rem)]",
};

export default function Modal({ open, onClose, title, icon, children, size = "lg" }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const widthClass = sizes[size] || sizes.lg;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[8vh] px-3 pb-8 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${widthClass} bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-[fade-up_0.2s_ease-out]`}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Icon name={icon} className="text-base text-blue-600 dark:text-blue-400" />
              </span>
            )}
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors text-zinc-400 dark:text-zinc-500 shrink-0"
          >
            <Icon name="close" className="text-base" />
          </button>
        </div>
        <div className="p-5 max-h-[65vh] overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}
