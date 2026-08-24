"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import MaterialForm from "./MaterialForm";
import { toNum, especificacoesObjeto } from "@/lib/estoque";

function deItem(item) {
  return {
    codigo: item.codigo || "",
    nome: item.nome || "",
    nome_tecnico: item.nome_tecnico || "",
    categoria_id: item.categoria_id != null ? String(item.categoria_id) : "",
    fornecedor: item.fornecedor || "",
    unidade: item.unidade || "un",
    formato: item.formato || "",
    gramagem: item.gramagem || "",
    tipo_estoque: item.tipo_estoque || "unidade",
    largura: item.largura || "",
    altura: item.altura || "",
    controla_lote: !!item.controla_lote,
    percentual_quebra: item.percentual_quebra || "",
    estoque_min: item.estoque_min || "",
    estoque_max: item.estoque_max || "",
    ponto_ressuprimento: item.ponto_ressuprimento || "",
    custo_unit: toNum(item.custo_unitario) || item.custo_unit || "",
    margem: item.margem || "",
    lucro: item.lucro || "",
    descricao: item.descricao || "",
    especificidade: item.especificidade || "",
    condicao_armazenagem: item.condicao_armazenagem || "",
    localizacao: item.localizacao || "",
    especificacoes: especificacoesObjeto(item.especificacoes),
  };
}

export default function EditMaterialModal({ open, item, categorias, fornecedores, formatos, materiais = [], onClose, onSave }) {
  const [form, setForm] = useState(() => deItem(item || {}));
  const [submetendo, setSubmetendo] = useState(false);

  const onChange = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const aoSubmeter = async (e) => {
    e.preventDefault();
    setSubmetendo(true);
    const ok = await onSave(form, item?.id);
    setSubmetendo(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Editar Material" : "Novo Material"}
      icon="edit"
      size="xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-material" loading={submetendo}>Guardar Material</Button>
        </>
      }
    >
      <MaterialForm
        formId="form-material"
        form={form}
        onChange={onChange}
        onSubmit={aoSubmeter}
        categorias={categorias}
        fornecedores={fornecedores}
        formatos={formatos}
        materiais={materiais}
      />
    </Modal>
  );
}
