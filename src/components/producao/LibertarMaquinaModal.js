"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import { inputCls } from "@/lib/estoque";

function Campo({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}

function agoraLocal(offsetMin = 0) {
  const d = new Date(Date.now() + offsetMin * 60000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LibertarMaquinaModal({ open, op, maquinas, onClose, onConfirm, nomeUsuario }) {
  const [maquinaId, setMaquinaId] = useState("");
  const [operador, setOperador] = useState(nomeUsuario || "");
  const [inicio, setInicio] = useState(() => agoraLocal());
  const [erro, setErro] = useState("");
  const [submetendo, setSubmetendo] = useState(false);

  const operacionais = (Array.isArray(maquinas) ? maquinas : []).filter((m) => m.estado === "operacional");

  const confirmar = async () => {
    if (!maquinaId) {
      setErro("Selecione o operacional para a produção");
      return;
    }
    setErro("");
    setSubmetendo(true);
    const ok = await onConfirm({
      maquina_id: Number(maquinaId),
      operador: operador.trim() || null,
      data_inicio: inicio || new Date().toISOString(),
    });
    setSubmetendo(false);
    if (ok) {
      onClose();
      setMaquinaId("");
      setOperador(nomeUsuario || "");
      setInicio(agoraLocal());
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Libertar para o operacional"
      icon="print"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} loading={submetendo}>
            <Icon name="rocket_launch" className="text-lg" /> Libertar para produção
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-muted/50 rounded-xl p-4 space-y-1 border border-border/60">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">OP #{op?.id}</p>
            <Badge variant="success">Materiais libertados</Badge>
          </div>
          <p className="text-base font-bold text-foreground">{op?.produto || "—"}</p>
          <p className="text-xs text-muted-foreground">
            Cliente: <strong>{op?.cliente || "—"}</strong> • Quantidade: <strong>{op?.quantidade || "—"}</strong>
          </p>
        </div>

        <Campo label="Operacional">
          <select value={maquinaId} onChange={(e) => setMaquinaId(e.target.value)} className={inputCls}>
            <option value="">Seleccionar operacional disponível...</option>
            {operacionais.map((m) => (
              <option key={m.id} value={m.id}>{m.nome_comum}{m.localizacao ? ` — ${m.localizacao}` : ""}</option>
            ))}
          </select>
          {operacionais.length === 0 && (
            <p className="text-[10px] text-amber-600">
              Nenhum operacional disponível. Registe a máquina no parque de máquinas.
            </p>
          )}
        </Campo>

        <Campo label="Operador">
          <input value={operador} onChange={(e) => setOperador(e.target.value)} className={inputCls} placeholder="Nome do operador" />
        </Campo>

        <Campo label="Início previsto">
          <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} className={inputCls} />
        </Campo>

        {erro && (
          <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl px-3 py-2.5 animate-msg-in">
            <Icon name="error" className="text-base" /> {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}