"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import MaquinaForm from "@/components/maquinas/MaquinaForm";
import useEstoque from "@/hooks/useEstoque";
import { buscarPorId, atualizar } from "@/services/maquinas";
import { blankMaquina, camposNumericosMaquina } from "@/lib/maquinas";
import { useToast } from "@/components/Toast";

export default function EditarMaquinaPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const id = params?.id;
  const { categorias, fornecedores, carregando: carregandoBase } = useEstoque();
  const [form, setForm] = useState(blankMaquina);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const m = await buscarPorId(id);
      setForm({
        codigo: m.codigo || "", nome_comum: m.nome_comum || "", nome_tecnico: m.nome_tecnico || "",
        descricao: m.descricao || "", categoria_id: m.categoria_id || "", subfamilia: m.subfamilia || "",
        fornecedor: m.fornecedor || "", unidade: m.unidade || "un",
        marca: m.marca || "", modelo: m.modelo || "", numero_serie: m.numero_serie || "",
        fabricante: m.fabricante || "", ano_fabrico: m.ano_fabrico || "", numero_patrimonial: m.numero_patrimonial || "",
        estado: m.estado || "operacional",
        capacidade_nominal: m.capacidade_nominal, capacidade_pratica: m.capacidade_pratica,
        tempo_medio_setup: m.tempo_medio_setup, horas_disponiveis_dia: m.horas_disponiveis_dia,
        horas_produtivas_dia: m.horas_produtivas_dia, producao_media: m.producao_media, eficiencia_media: m.eficiencia_media,
        materiais_consumiveis: Array.isArray(m.materiais_consumiveis) ? m.materiais_consumiveis : [],
        manutencao_tipo: m.manutencao_tipo || "", manutencao_periodicidade: m.manutencao_periodicidade || "",
        ultima_manutencao: m.ultima_manutencao || "", proxima_manutencao: m.proxima_manutencao || "",
        manutencoes: Array.isArray(m.manutencoes) ? m.manutencoes : [],
        estoque_min: m.estoque_min, estoque_max: m.estoque_max, custo_unit: m.custo_unit,
        margem: m.margem, localizacao: m.localizacao || "",
      });
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar máquina", "error");
      router.push("/maquinas");
    } finally { setCarregando(false); }
  }, [id, addToast, router]);

  useEffect(() => {
    if (id) carregar();
  }, [id, carregar]);

  const aoSubmeter = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const dadosNum = { ...form, categoria_id: Number(form.categoria_id) || null };
      camposNumericosMaquina.forEach((k) => { dadosNum[k] = Number(dadosNum[k]) || 0; });
      await atualizar(id, dadosNum);
      addToast("Máquina atualizada com sucesso", "success");
      router.push("/maquinas");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao atualizar máquina", "error");
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
            <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Editar Máquina</h1>
            <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">{form.nome_comum || "Atualizar ficha da máquina"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/maquinas")}>Cancelar</Button>
          <Button type="submit" form="form-maquina" loading={salvando}>
            <Icon name="save" className="text-lg" /> Guardar Alterações
          </Button>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="px-5 sm:px-6 py-5">
          {carregando || (carregandoBase && categorias.length === 0) ? (
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
