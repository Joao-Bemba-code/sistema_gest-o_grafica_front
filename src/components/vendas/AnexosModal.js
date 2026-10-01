"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { inputCls } from "@/lib/estoque";
import { anexarFicheiros, removerAnexo, abrirAnexo } from "@/services/tesouraria";

function formatBytes(n) {
  const v = Number(n || 0);
  if (!v) return "—";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

function formatData(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-AO");
}

function iconeAnexo(anexo) {
  const mime = String(anexo.mime || "").toLowerCase();
  return mime.includes("pdf") ? "picture_as_pdf" : "image";
}

export default function AnexosModal({ movimento, open, onClose, onMudou }) {
  const [ficheiros, setFicheiros] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [aRemover, setARemover] = useState(null);
  const [removendo, setRemovendo] = useState(false);
  const { addToast } = useToast();

  const fechar = () => {
    setFicheiros([]);
    if (onClose) onClose();
  };

  const anexos = Array.isArray(movimento?.anexos) ? movimento.anexos : [];

  const enviar = async () => {
    if (!movimento || !ficheiros.length) return;
    setEnviando(true);
    try {
      await anexarFicheiros(movimento.id, ficheiros);
      addToast("Recibo(s) anexado(s) com sucesso", "success");
      setFicheiros([]);
      if (onMudou) await onMudou();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao anexar ficheiros", "error");
    } finally {
      setEnviando(false);
    }
  };

  const abrir = async (a) => {
    try {
      await abrirAnexo(a.id);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao abrir ficheiro", "error");
    }
  };

  const confirmarRemocao = async () => {
    if (!aRemover) return;
    setRemovendo(true);
    try {
      await removerAnexo(aRemover.id);
      addToast("Anexo removido", "success");
      setARemover(null);
      if (onMudou) await onMudou();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao remover anexo", "error");
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={fechar}
        title="Recibos / Anexos"
        icon="attach_file"
        size="sm"
        footer={<Button variant="outline" onClick={fechar}>Fechar</Button>}
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <p className="text-xs text-muted-foreground">
            Movimento: <span className="font-semibold text-foreground">{movimento?.descricao || movimento?.categoria || `#${movimento?.id}`}</span>
          </p>

          {anexos.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Ainda não há ficheiros anexados a este movimento.</p>
          )}

          {anexos.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon name={iconeAnexo(a)} className="text-primary text-[16px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{a.nome_original}</p>
                <p className="text-[10px] text-muted-foreground">{formatBytes(a.tamanho)} · {formatData(a.createdAt)}</p>
              </div>
              <button type="button" onClick={() => abrir(a)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors shrink-0" title="Abrir ficheiro">
                <Icon name="open_in_new" className="text-[16px]" />
              </button>
              <button type="button" onClick={() => setARemover(a)} className="p-1.5 rounded hover:bg-error/10 text-muted-foreground hover:text-error transition-colors shrink-0" title="Remover anexo">
                <Icon name="delete" className="text-[16px]" />
              </button>
            </div>
          ))}

          <div className="border-t pt-4">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Anexar novo(s) ficheiro(s)</label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFicheiros(Array.from(e.target.files || []))}
              className={`${inputCls} mt-1.5`}
            />
            <p className="text-[10px] text-muted-foreground mt-1">PDF ou imagem (JPG, PNG, WEBP), até 10 MB cada.</p>
            {ficheiros.length > 0 && (
              <div className="mt-2 space-y-1">
                {ficheiros.map((f, i) => (
                  <p key={i} className="text-[11px] text-foreground truncate">{f.name} · {formatBytes(f.size)}</p>
                ))}
                <Button size="sm" onClick={enviar} loading={enviando} className="mt-1">
                  <Icon name="upload" className="text-[14px]" /> Anexar {ficheiros.length > 1 ? `${ficheiros.length} ficheiros` : "ficheiro"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(aRemover)}
        onClose={() => setARemover(null)}
        onConfirm={confirmarRemocao}
        loading={removendo}
        title="Remover anexo"
        description={aRemover ? `Remover o ficheiro "${aRemover.nome_original}"? O ficheiro será apagado do sistema.` : ""}
      />
    </>
  );
}
