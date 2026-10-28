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

export async function anular(id, motivo) {
  const { data } = await api.post(`/propostas/${id}/anular`, { motivo });
  return data;
}

export const UNIDADES = [
  { value: "UN-01", sigla: "AG", label: "UN-01 · Artes Gráficas" },
  { value: "UN-02", sigla: "FP", label: "UN-02 · Formação Profissional" },
  { value: "UN-03", sigla: "SD", label: "UN-03 · Solução Digital" },
];

export const ESTADOS_PROPOSTA = [
  { value: "rascunho", label: "EM PREPARAÇÃO" },
  { value: "enviada", label: "ENVIADAS" },
  { value: "recebida", label: "EM REVISÃO" },
  { value: "avaliada", label: "AVALIADA" },
  { value: "aprovada", label: "ACEITES" },
  { value: "rejeitada", label: "RECUSADAS" },
  { value: "expirada", label: "EXPIRADAS" },
  { value: "anulada", label: "ANULADAS" },
];

export const META_ESTADO = {
  rascunho: { rotulo: "EM PREPARAÇÃO", tom: "warning", icone: "edit" },
  enviada: { rotulo: "ENVIADAS", tom: "info", icone: "send" },
  recebida: { rotulo: "EM REVISÃO", tom: "neutral", icone: "email" },
  avaliada: { rotulo: "AVALIADA", tom: "primary", icone: "hourglass_top" },
  aprovada: { rotulo: "ACEITES", tom: "success", icone: "verified" },
  rejeitada: { rotulo: "RECUSADAS", tom: "error", icone: "block" },
  expirada: { rotulo: "EXPIRADAS", tom: "neutral", icone: "event_busy" },
  anulada: { rotulo: "ANULADAS", tom: "error", icone: "block" },
};
