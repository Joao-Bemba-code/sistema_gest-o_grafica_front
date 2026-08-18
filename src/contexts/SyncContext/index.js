"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { desktopDisponivel, estadoOffline } from "@/services/offline";

const SyncContext = createContext({ syncVersion: 0 });

export function SyncProvider({ children }) {
  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    if (!desktopDisponivel()) return;
    let activo = true;
    let ultimo = 0;

    const verificar = async () => {
      try {
        const estado = await estadoOffline();
        if (!activo || !estado) return;
        const v = estado.sync_version || 0;
        if (v > ultimo && ultimo > 0) {
          setSyncVersion(v);
          window.dispatchEvent(new Event("sigraf-sync"));
        }
        ultimo = v;
      } catch (_) {}
    };

    verificar();
    const timer = setInterval(verificar, 10000);
    return () => { activo = false; clearInterval(timer); };
  }, []);

  return (
    <SyncContext.Provider value={{ syncVersion }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncRefresh(callback, deps = []) {
  useEffect(() => {
    if (!desktopDisponivel()) return;
    const handler = () => callback();
    window.addEventListener("sigraf-sync", handler);
    return () => window.removeEventListener("sigraf-sync", handler);
  }, deps);
}

export const useSync = () => useContext(SyncContext);
