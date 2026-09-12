"use client";
import { createContext, useContext, useState, useCallback } from "react";
import Icon from "./Icon";

const ToastContext = createContext();

const variants = {
  success: { chip: "bg-success/10 text-success", icon: "check_circle" },
  error: { chip: "bg-error/10 text-error", icon: "warning" },
  warning: { chip: "bg-warning/10 text-warning", icon: "warning" },
  info: { chip: "bg-info/10 text-info", icon: "info" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-20 right-4 sm:right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none items-end" aria-live="polite">
        {toasts.map((toast) => {
          const v = variants[toast.type] || variants.success;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold shadow-md animate-slide-down`}
              role="alert"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${v.chip}`}>
                <Icon name={v.icon} className="text-base" />
              </span>
              <span className="flex-1 min-w-0 text-foreground">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground opacity-60 hover:opacity-100 hover:bg-muted transition-all duration-200 ease-in-out shrink-0 self-start"
                aria-label="Fechar notificação"
              >
                <Icon name="close" className="text-sm" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
