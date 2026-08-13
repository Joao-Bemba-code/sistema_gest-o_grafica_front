"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import Icon from "@/components/Icon";

function Toggle({ ativo, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 ${
        ativo ? "bg-primary" : "bg-muted-foreground/25"
      }`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${ativo ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function SectionHeader({ icon, title, desc }) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon name={icon} className="text-primary" />
      </div>
      <div>
        <p className="text-base font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export default function SyncConfig() {
  const { addToast } = useToast() || {};
  const [disponivel, setDisponivel] = useState(false);
  const [syncAtivo, setSyncAtivo] = useState(false);
  const [syncUrl, setSyncUrl] = useState("");
  const [syncEmail, setSyncEmail] = useState("");
  const [syncSenha, setSyncSenha] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const notificar = (texto, tipo = "success") => addToast?.(texto, tipo);

  useEffect(() => {
    if (!window.sigrafDesktop) return;
    setDisponivel(true);
    (async () => {
      const cfg = await window.sigrafDesktop.getConfig();
      setSyncAtivo(!!cfg.sync_ativo);
      setSyncUrl(cfg.sync_url || "");
      setSyncEmail(cfg.sync_email || "");
      setSyncSenha(cfg.sync_senha || "");
    })();
  }, []);

  if (!disponivel) return null;

  const guardar = async () => {
    setGuardando(true);
    try {
      await window.sigrafDesktop.setSyncConfig({
        sync_ativo: syncAtivo,
        sync_url: syncUrl,
        sync_email: syncEmail,
        sync_senha: syncSenha,
      });
      notificar(syncAtivo ? "Sincronização ativada. As alterações passam a valer de imediato." : "Sincronização desativada.", "success");
    } catch (e) {
      notificar("Não foi possível guardar a configuração.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const sincronizarAgora = async () => {
    setSincronizando(true);
    try {
      const r = await window.sigrafDesktop.syncNow();
      if (r && r.ok) {
        notificar(r.mensagem || "Sincronização concluída", "success");
      } else {
        notificar((r && r.erro) || "Falha ao sincronizar.", "error");
      }
    } catch (e) {
      notificar("Falha ao sincronizar. Verifica a ligação à internet.", "error");
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <SectionHeader icon="sync" title="Sincronização Online" desc="Liga este computador ao site" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4 transition-all hover:bg-muted/50">
          <div className="flex items-start gap-3 min-w-0">
            <Icon name="cloud_sync" className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Sincronização automática</p>
              <p className="text-xs text-muted-foreground">
                Sempre que houver internet, os dados são sincronizados nos dois sentidos (a cada 5 minutos).
                O computador continua a ser o principal.
              </p>
            </div>
          </div>
          <Toggle ativo={syncAtivo} onClick={() => setSyncAtivo(!syncAtivo)} />
        </div>

        {syncAtivo && (
          <>
            <FormField label="URL do servidor (site)">
              <Input
                type="url"
                value={syncUrl}
                onChange={(e) => setSyncUrl(e.target.value)}
                placeholder="https://sistema-gest-o-grafica-back.onrender.com"
              />
            </FormField>
            <FormField label="Email de acesso ao site">
              <Input
                type="email"
                value={syncEmail}
                onChange={(e) => setSyncEmail(e.target.value)}
                placeholder="admin@minhagrafica.com"
              />
            </FormField>
            <FormField label="Senha de acesso ao site">
              <Input
                type="password"
                value={syncSenha}
                onChange={(e) => setSyncSenha(e.target.value)}
                placeholder="••••••••"
              />
            </FormField>
            <p className="text-[11px] text-muted-foreground">
              Usa as mesmas credenciais com que entras no site online.
            </p>

            <div className="flex items-center gap-3">
              <Button onClick={guardar} loading={guardando} className="flex-1">
                <Icon name="save" className="text-sm" />
                {guardando ? "A guardar..." : "Guardar"}
              </Button>
              <Button variant="outline" onClick={sincronizarAgora} loading={sincronizando} className="flex-1">
                <Icon name="sync" className="text-sm" />
                {sincronizando ? "A sincronizar..." : "Sincronizar agora"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
