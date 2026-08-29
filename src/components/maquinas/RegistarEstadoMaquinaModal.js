"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";
import { atualizar } from "@/services/maquinas";
import { estadoMaquinaOptions, estadoMaquinaCfg } from "@/lib/maquinas";
import { inputCls } from "@/lib/estoque";
import { useToast } from "@/components/Toast";

const estadoVariant = (e) =>
  e === "operacional" ? "success" : e === "manutencao" ? "warning" : e === "avariada" ? "destructive" : "secondary";

export default function RegistrarEstadoMaquinaModal({ open, maquinas, maquinaInicialId = null, onClose, onSaved }) {
  const { addToast } = useToast();
  const [maquinaId, setMaquinaId] = useState("");
  const [estado, setEstado] = useState("operacional");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setMaquinaId(maquinaInicialId ? String(maquinaInicialId) : "");
      setEstado("operacional");
      setMotivo("");
    }
  }, [open, maquinaInicialId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const maquina = (Array.isArray(maquinas) ? maquinas : []).find((m) => String(m.id) === String(maquinaId));

  const aoSubmeter = async (e) => {
    e.preventDefault();
    if (!maquinaId) {
      addToast("Seleccione a máquina", "error");
      return;
    }
    setSalvando(true);
    try {
      const dados = { estado };
      if (estado !== maquina?.estado) {
        if (motivo.trim()) dados.motivo_estado = motivo.trim();
      } else {
        addToast("A máquina já está nesse estado", "warning");
        return;
      }
      await atualizar(Number(maquinaId), dados);
      addToast(`Estado da máquina atualizado`, "success");
      onSaved();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao atualizar o estado", "error");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registar Estado"
      icon="swap_horiz"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-estado-maquina" loading={salvando}>
            <Icon name="save" className="text-lg" /> Guardar Estado
          </Button>
        </>
      }
    >
      <form id="form-estado-maquina" onSubmit={aoSubmeter} className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg bg-primary/10 border border-primary/30 p-3">
          <Icon name="swap_horiz" className="text-primary mt-0.5" />
          <p className="text-xs text-foreground">
            Regista a mudança de estado da máquina — fica guardada no histórico (manutenções, uso e mudanças de estado).
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Máquina</label>
          <select value={maquinaId} onChange={(e) => setMaquinaId(e.target.value)} className={inputCls}>
            <option value="">Seleccione a máquina...</option>
            {(Array.isArray(maquinas) ? maquinas : []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.codigo ? `${m.codigo} — ` : ""}{m.nome_comum}{m.localizacao ? ` (${m.localizacao})` : ""}
              </option>
            ))}
          </select>
          {maquina && (
            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
              <span>Estado atual:</span>
              <Badge variant={estadoVariant(maquina.estado)} className="text-[10px]">
                {estadoMaquinaCfg[maquina.estado]?.label || maquina.estado || "—"}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Novo estado</label>
          <div className="grid grid-cols-2 gap-2">
            {estadoMaquinaOptions.map((o) => {
              const selecionado = estado === o.valor;
              const atual = maquina && maquina.estado === o.valor;
              return (
                <button
                  key={o.valor}
                  type="button"
                  onClick={() => setEstado(o.valor)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    selecionado
                      ? "border-primary bg-primary/15 text-primary shadow"
                      : atual
                        ? "border-border bg-muted/50 text-muted-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon name={o.valor === "operacional" ? "check_circle" : o.valor === "manutencao" ? "handyman" : o.valor === "avariada" ? "error" : "block"} className="text-[15px]" />
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Motivo (opcional)</label>
          <input
            className={inputCls}
            placeholder="Ex.: mudança de turno, avaria detetada, manutenção preventiva..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}