"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/Icon";
import MaquinaForm from "@/components/maquinas/MaquinaForm";
import useEstoque from "@/hooks/useEstoque";
import { buscarPorId, criar, atualizar } from "@/services/maquinas";
import { blankMaquina, camposNumericosMaquina, estadoMaquinaCfg } from "@/lib/maquinas";
import { useToast } from "@/components/Toast";

export default function MaquinaModal({ open, maquinaId, onClose, onSaved }) {
  const { addToast } = useToast();
  const { categorias, fornecedores, carregando: carregandoBase } = useEstoque();
  const [form, setForm] = useState(() => ({ ...blankMaquina }));
  const [estadoOriginal, setEstadoOriginal] = useState("");
  const [motivoEstado, setMotivoEstado] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !maquinaId) return;
    let ativo = true;
    (async () => {
      setCarregando(true);
      try {
        const m = await buscarPorId(maquinaId);
        if (!ativo) return;
        setEstadoOriginal(m.estado || "operacional");
        setMotivoEstado("");
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
        if (ativo) addToast(err.response?.data?.erro || "Erro ao carregar máquina", "error");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [open, maquinaId, addToast]);

  const aoSubmeter = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const dadosNum = { ...form, categoria_id: Number(form.categoria_id) || null };
      camposNumericosMaquina.forEach((k) => { dadosNum[k] = Number(dadosNum[k]) || 0; });
      if (maquinaId) {
        if (form.estado !== estadoOriginal && motivoEstado.trim()) {
          dadosNum.motivo_estado = motivoEstado.trim();
        }
        await atualizar(maquinaId, dadosNum);
        addToast("Máquina atualizada com sucesso", "success");
      } else {
        await criar(dadosNum);
        addToast("Máquina registada com sucesso", "success");
      }
      onSaved();
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao guardar máquina", "error");
    } finally { setSalvando(false); }
  };

  const aCarregar = (carregando && maquinaId) || (carregandoBase && categorias.length === 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={maquinaId ? "Editar Máquina" : "Nova Máquina"}
      icon="precision_manufacturing"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-maquina" loading={salvando}>
            <Icon name="save" className="text-lg" /> {maquinaId ? "Guardar Alterações" : "Guardar Máquina"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="precision_manufacturing" className="text-primary" />
          <p className="text-sm font-semibold text-foreground">
            {maquinaId ? `Atualizar ficha da máquina` : "Registar nova máquina no parque industrial"}
          </p>
        </div>
        {aCarregar ? (
          <div className="space-y-3" aria-label="A carregar formulário">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {maquinaId && estadoOriginal && form.estado !== estadoOriginal && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-warning flex items-center gap-1.5">
                  <Icon name="swap_horiz" className="text-sm" />
                  Mudança de estado: {estadoMaquinaCfg[estadoOriginal]?.label || estadoOriginal} → {estadoMaquinaCfg[form.estado]?.label || form.estado}
                </p>
                <input
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  placeholder="Motivo da mudança de estado (opcional)"
                  value={motivoEstado}
                  onChange={(e) => setMotivoEstado(e.target.value)}
                />
              </div>
            )}
            <MaquinaForm
            formId="form-maquina"
            form={form}
            onChange={(campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))}
            onSubmit={aoSubmeter}
            categorias={categorias}
            fornecedores={fornecedores}
          />
          </>
        )}
      </div>
    </Modal>
  );
}