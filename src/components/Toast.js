"use client";
import { createContext, useContext, useState, useCallback } from "react";
import Icon from "./Icon";

const ToastContext = createContext();

const variants = {
  success: { bg: "bg-primary text-white shadow-lg shadow-primary/30", icon: "check_circle" },
  error: { bg: "bg-destructive text-white shadow-lg shadow-destructive/30", icon: "warning" },
  warning: { bg: "bg-amber-500 text-white shadow-lg shadow-amber-500/30", icon: "warning" },
  info: { bg: "bg-secondary text-white shadow-lg shadow-secondary/30", icon: "info" },
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
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none" aria-live="polite">
        {toasts.map((toast) => {
          const v = variants[toast.type] || variants.success;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold animate-slide-up border ${
                toast.type === "error" ? "border-destructive/20" : "border-white/10"
              } ${v.bg}`}
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
      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
