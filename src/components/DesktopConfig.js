"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

export default function DesktopConfig() {
  const [disponivel, setDisponivel] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState("local");
  const [servidorUrl, setServidorUrl] = useState("");
  const [syncAtivo, setSyncAtivo] = useState(false);
  const [syncUrl, setSyncUrl] = useState("");
  const [syncEmail, setSyncEmail] = useState("");
  const [syncSenha, setSyncSenha] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!window.sigrafDesktop) return;
    setDisponivel(true);
    const load = async () => {
      const cfg = await window.sigrafDesktop.getConfig();
      setInfo(cfg);
      setModo(cfg.modo || "local");
      setServidorUrl(cfg.servidor_url || "");
      setSyncAtivo(!!cfg.sync_ativo);
      setSyncUrl(cfg.sync_url || "");
      setSyncEmail(cfg.sync_email || "");
      setSyncSenha(cfg.sync_senha || "");
    };
    load();
  }, []);

  if (!disponivel) return null;

  const guardar = async () => {
    setResultado(null);
    await window.sigrafDesktop.setConfig({
      modo,
      servidor_url: servidorUrl,
      sync_ativo: syncAtivo,
      sync_url: syncUrl,
      sync_email: syncEmail,
      sync_senha: syncSenha,
    });
  };

  const sincronizarAgora = async () => {
    setSincronizando(true);
    setResultado(null);
    try {
      const r = await window.sigrafDesktop.syncNow();
      setResultado(r && r.ok ? { ok: true, texto: r.mensagem || "Sincronização concluída" } : { ok: false, texto: (r && r.erro) || "Falhou" });
    } catch (e) {
      setResultado({ ok: false, texto: e.message || "Falhou" });
    } finally {
      setSincronizando(false);
    }
  };

  const inputCls =
    "mt-2.5 w-full pl-3 pr-3 h-9 bg-surface-container-high/70 border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary";

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 h-9 px-3 rounded-xl bg-surface-container-high/70 border border-input text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
      >
        <Icon name="settings" className="text-sm" />
        {info?.modo === "servidor" ? "Servidor" : "Local"}
        {info?.sync_ativo && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Sincronização ativa" />
        )}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setAberto(false)}>
          <div className="w-full max-w-md border-gradient rounded-3xl bg-card shadow-2xl p-6 animate-pop max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-black tracking-tight flex items-center gap-2">
                <Icon name="settings" className="text-base text-brand" />
                Definições da aplicação
              </h2>
              <button type="button" onClick={() => setAberto(false)} className="w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-surface-container-high transition-colors">
                <Icon name="close" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Modo da aplicação</p>
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
                        className={inputCls}
                      />
                    )}
                  </div>
                </label>
              </div>

              {modo === "local" && (
                <div className="space-y-3 rounded-2xl border border-input bg-surface-container-high/40 p-3.5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="accent-brand mt-0.5" checked={syncAtivo} onChange={(e) => setSyncAtivo(e.target.checked)} />
                    <div>
                      <p className="text-xs font-bold">Sincronizar com a versão online</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Sempre que houver internet, os dados são sincronizados nos dois sentidos
                        (a cada 5 minutos). O computador continua a ser o principal.
                      </p>
                    </div>
                  </label>
                  {syncAtivo && (
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="url"
                        value={syncUrl}
                        onChange={(e) => setSyncUrl(e.target.value)}
                        placeholder="https://sistema-gest-o-grafica-back.onrender.com"
                        className={inputCls}
                      />
                      <input
                        type="email"
                        value={syncEmail}
                        onChange={(e) => setSyncEmail(e.target.value)}
                        placeholder="Email de acesso ao site (ex: admin@minhagrafica.com)"
                        className={inputCls}
                      />
                      <input
                        type="password"
                        value={syncSenha}
                        onChange={(e) => setSyncSenha(e.target.value)}
                        placeholder="Senha de acesso ao site"
                        className={inputCls}
                      />
                      <p className="text-[10px] text-muted-foreground pt-1">
                        Use as mesmas credenciais com que entra no site online.
                      </p>
                    </div>
                  )}
                </div>
              )}

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

              {modo === "local" && (
                <div className="border-t border-input pt-3">
                  <button
                    type="button"
                    onClick={sincronizarAgora}
                    disabled={sincronizando}
                    className="w-full h-9 rounded-xl border border-primary/30 bg-primary/5 text-xs font-bold text-foreground hover:bg-primary/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Icon name={sincronizando ? "hourglass_empty" : "sync"} className="text-sm" />
                    {sincronizando ? "A sincronizar..." : "Sincronizar agora"}
                  </button>
                  {resultado && (
                    <p className={`text-[11px] mt-2 text-center font-semibold ${resultado.ok ? "text-green-600" : "text-red-500"}`}>
                      {resultado.texto}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
