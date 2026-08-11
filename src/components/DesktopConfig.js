"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

export default function DesktopConfig() {
  const [disponivel, setDisponivel] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState("local");
  const [servidorUrl, setServidorUrl] = useState("");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!window.sigrafDesktop) return;
    setDisponivel(true);
    const load = async () => {
      const cfg = await window.sigrafDesktop.getConfig();
      setInfo(cfg);
      setModo(cfg.modo || "local");
      setServidorUrl(cfg.servidor_url || "");
    };
    load();
  }, []);

  if (!disponivel) return null;

  const guardar = async () => {
    await window.sigrafDesktop.setConfig({ modo, servidor_url: servidorUrl });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 h-9 px-3 rounded-xl bg-surface-container-high/70 border border-input text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
      >
        <Icon name="settings" className="text-sm" />
        {info?.modo === "servidor" ? "Servidor" : "Local"}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setAberto(false)}>
          <div className="w-full max-w-sm border-gradient rounded-3xl bg-card shadow-2xl p-6 animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-black tracking-tight flex items-center gap-2">
                <Icon name="settings" className="text-base text-brand" />
                Modo da aplicação
              </h2>
              <button type="button" onClick={() => setAberto(false)} className="w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-surface-container-high transition-colors">
                <Icon name="close" />
              </button>
            </div>

            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${modo === "local" ? "border-primary bg-primary/5" : "border-input bg-surface-container-high/40"}`}>
                <input type="radio" name="modo" className="accent-brand mt-1" checked={modo === "local"} onChange={() => setModo("local")} />
                <div>
                  <p className="text-xs font-bold">Local (offline)</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Dados guardados neste computador. Funciona sem internet.</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${modo === "servidor" ? "border-primary bg-primary/5" : "border-input bg-surface-container-high/40"}`}>
                <input type="radio" name="modo" className="accent-brand mt-1" checked={modo === "servidor"} onChange={() => setModo("servidor")} />
                <div className="w-full">
                  <p className="text-xs font-bold">Servidor (online)</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Liga a um servidor central com os dados partilhados.</p>
                  {modo === "servidor" && (
                    <input
                      type="url"
                      value={servidorUrl}
                      onChange={(e) => setServidorUrl(e.target.value)}
                      placeholder="https://api.seudominio.com"
                      className="mt-2.5 w-full pl-3 pr-3 h-9 bg-surface-container-high/70 border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
                    />
                  )}
                </div>
              </label>

              <button
                type="button"
                onClick={guardar}
                className="w-full h-10 bg-brand hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md shadow-primary/25 transition-all active:scale-[0.98]"
              >
                Guardar e reiniciar
              </button>
              <p className="text-[10px] text-muted-foreground text-center">
                A aplicação reinicia para aplicar a alteração.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
