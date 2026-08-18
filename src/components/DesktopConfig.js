"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import { ligarServidor, estadoOffline } from "@/services/offline";

export default function DesktopConfig() {
  const [disponivel, setDisponivel] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [info, setInfo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!window.sigrafDesktop) return;
    setDisponivel(true);
    (async () => {
      try {
        const s = await estadoOffline();
        setInfo(s);
        if (s && s.server_url) setUrl(s.server_url);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!aberto || !disponivel) return;
    (async () => {
      try {
        const s = await estadoOffline();
        setInfo(s);
        if (s && s.server_url) setUrl(s.server_url);
      } catch {}
    })();
  }, [aberto, disponivel]);

  if (!disponivel) return null;

  const conectar = async () => {
    setErro("");
    setSucesso("");
    if (!url || !email || !senha) {
      setErro("Preencha URL, email e senha");
      return;
    }
    setGuardando(true);
    try {
      await ligarServidor({ url, email, senha });
      const s = await estadoOffline();
      setInfo(s);
      setSucesso("Servidor conectado! Os dados serão enviados como backup sempre que houver internet.");
      setSenha("");
    } catch (e) {
      setErro(e.response?.data?.erro || e.message || "Erro ao ligar ao servidor");
    } finally {
      setGuardando(false);
    }
  };

  const inputCls =
    "mt-2 w-full pl-3 pr-3 h-10 bg-surface-container-high/70 border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all";

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 h-9 px-3 rounded-xl bg-surface-container-high/70 border border-input text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
        title="Definições — Backup na nuvem"
      >
        <Icon name="cloud_upload" className="text-sm" />
        Backup
        {info?.org_id && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Ligado ao servidor" />
        )}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setAberto(false)}>
          <div className="w-full max-w-md border-gradient rounded-3xl bg-card shadow-2xl p-6 animate-pop max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-black tracking-tight flex items-center gap-2">
                <Icon name="cloud_upload" className="text-base text-brand" />
                Backup na nuvem
              </h2>
              <button type="button" onClick={() => setAberto(false)} className="w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:bg-surface-container-high transition-colors">
                <Icon name="close" />
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground mb-4">
              Configure o servidor para enviar os dados como backup sempre que houver ligação à internet. Os dados ficam sempre guardados neste computador.
            </p>

            {info?.org_id && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-4">
                <p className="text-[11px] font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                  <Icon name="check_circle" className="text-sm" />
                  Ligado ao servidor — backup ativo
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Org ID: {info.org_id} {info.org_nome ? `— ${info.org_nome}` : ""}
                </p>
                {info.last_push_time && (
                  <p className="text-[10px] text-muted-foreground">
                    Último envio: {new Date(info.last_push_time).toLocaleString("pt-AO")}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">URL do Servidor</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://sua-api.onrender.com"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email da organização</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@empresa.co.ao"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>
            </div>

            {erro && (
              <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-2.5 flex items-center gap-2 mt-4">
                <Icon name="warning" className="text-error text-sm shrink-0" />
                <p className="text-xs text-error font-medium">{erro}</p>
              </div>
            )}

            {sucesso && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2 mt-4">
                <Icon name="check_circle" className="text-green-600 text-sm shrink-0" />
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">{sucesso}</p>
              </div>
            )}

            <button
              type="button"
              onClick={conectar}
              disabled={guardando}
              className="mt-5 w-full h-10 bg-brand hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Icon name="cloud_upload" className="text-sm" />
              {guardando ? "A conectar..." : info?.org_id ? "Reconectar" : "Conectar ao servidor"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
