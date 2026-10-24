import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/propostas", { params });
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/propostas/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/propostas", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/propostas/${id}`, dados);
  return data;
}

export async function mudarEstado(id, estado, extra = {}) {
  const { data } = await api.put(`/propostas/${id}/estado`, { estado, ...extra });
  return data;
}

export async function vincularOrcamento(id, orcamentoId) {
  const { data } = await api.put(`/propostas/${id}/orcamento`, { orcamento_id: orcamentoId });
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/propostas/${id}`);
  return data;
}

export const UNIDADES = [
  { value: "UN-01", sigla: "AG", label: "UN-01 · Artes Gráficas" },
  { value: "UN-02", sigla: "FP", label: "UN-02 · Formação Profissional" },
  { value: "UN-03", sigla: "SD", label: "UN-03 · Solução Digital" },
];

export const ESTADOS_PROPOSTA = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "recebida", label: "Recebida" },
  { value: "avaliada", label: "Avaliada" },
  { value: "aprovada", label: "Aprovada" },
  { value: "rejeitada", label: "Rejeitada" },
];

export const META_ESTADO = {
  rascunho: { rotulo: "Rascunho", tom: "warning", icone: "edit" },
  enviada: { rotulo: "Enviada", tom: "info", icone: "send" },
  recebida: { rotulo: "Recebida", tom: "neutral", icone: "email" },
  avaliada: { rotulo: "Avaliada", tom: "primary", icone: "hourglass_top" },
  aprovada: { rotulo: "Aprovada", tom: "success", icone: "verified" },
  rejeitada: { rotulo: "Rejeitada", tom: "error", icone: "block" },
};
