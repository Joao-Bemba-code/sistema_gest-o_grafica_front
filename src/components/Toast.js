"use client";
import { createContext, useContext, useState, useCallback } from "react";
import Icon from "./Icon";

const ToastContext = createContext();

const variants = {
  success: { bg: "bg-primary text-primary-foreground shadow-md", icon: "check_circle" },
  error: { bg: "bg-destructive text-destructive-foreground shadow-md", icon: "warning" },
  warning: { bg: "bg-warning text-white shadow-md", icon: "warning" },
  info: { bg: "bg-secondary text-secondary-foreground shadow-md", icon: "info" },
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
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold animate-slide-down border border-black/10 ${v.bg}`}
              role="alert"
            >
              <Icon name={v.icon} className="text-lg shrink-0" />
              <span className="flex-1 min-w-0">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="w-6 h-6 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-white/10 transition-all shrink-0"
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
