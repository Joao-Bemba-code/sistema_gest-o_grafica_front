"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import MaquinaForm from "@/components/maquinas/MaquinaForm";
import useEstoque from "@/hooks/useEstoque";
import { criar } from "@/services/maquinas";
import { blankMaquina, camposNumericosMaquina } from "@/lib/maquinas";
import { useToast } from "@/components/Toast";

export default function NovaMaquinaPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { categorias, fornecedores, carregando } = useEstoque();
  const [form, setForm] = useState(blankMaquina);
  const [salvando, setSalvando] = useState(false);

  const aoSubmeter = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const dadosNum = { ...form, categoria_id: Number(form.categoria_id) || null };
      camposNumericosMaquina.forEach((k) => { dadosNum[k] = Number(dadosNum[k]) || 0; });
      await criar(dadosNum);
      addToast("Máquina registada com sucesso", "success");
      router.push("/maquinas");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao registar máquina", "error");
    } finally { setSalvando(false); }
  };

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-primary">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/maquinas")}
            aria-label="Voltar à maquinária"
            className="w-10 h-10 rounded bg-surface-variant border border-outline-variant flex items-center justify-center text-on-surface hover:border-primary hover:text-primary transition-colors shrink-0"
          >
            <Icon name="arrow_back" className="text-xl" />
          </button>
          <div>
            <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Nova Máquina</h1>
            <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Registar nova máquina no parque industrial</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/maquinas")}>Cancelar</Button>
          <Button type="submit" form="form-maquina" loading={salvando}>
            <Icon name="save" className="text-lg" /> Guardar Máquina
          </Button>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="px-5 sm:px-6 py-5">
          {carregando && categorias.length === 0 ? (
            <div className="space-y-3" aria-label="A carregar formulário">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <MaquinaForm
              formId="form-maquina"
              form={form}
              onChange={(campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))}
              onSubmit={aoSubmeter}
              categorias={categorias}
              fornecedores={fornecedores}
            />
          )}
        </div>
      </div>
    </div>
  );
}
