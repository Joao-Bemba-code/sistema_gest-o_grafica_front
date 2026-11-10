"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import Icon from "./Icon";

const ToastContext = createContext();

const variants = {
  success: { chip: "bg-success/15 text-success-ink", icon: "check_circle", role: "status" },
  error: { chip: "bg-error/15 text-error-ink", icon: "warning", role: "alert" },
  warning: { chip: "bg-warning/15 text-warning-ink", icon: "warning", role: "alert" },
  info: { chip: "bg-info/15 text-info-ink", icon: "info", role: "status" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "success", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    const t = setTimeout(() => removeToast(id), duration);
    timers.current.set(id, t);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-20 right-4 sm:right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none items-end">
        {toasts.map((toast) => {
          const v = variants[toast.type] || variants.success;
          return (
            <div
              key={toast.id}
              role={v.role}
              onMouseEnter={() => clearTimeout(timers.current.get(toast.id))}
              onMouseLeave={() => {
                const t = setTimeout(() => removeToast(toast.id), 3500);
                timers.current.set(toast.id, t);
              }}
              className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold shadow-md`}
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
