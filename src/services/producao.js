import api from "./api";

export async function listarOrdens(params) {
  const { data } = await api.get("/producao/ordens", { params });
  return data;
}

export async function buscarOrdem(id) {
  const { data } = await api.get(`/producao/ordens/${id}`);
  return data;
}

export async function criarOrdem(dados) {
  const { data } = await api.post("/producao/ordens", dados);
  return data;
}

export async function atualizarOrdem(id, dados) {
  const { data } = await api.put(`/producao/ordens/${id}`, dados);
  return data;
}

export async function removerOrdem(id) {
  const { data } = await api.delete(`/producao/ordens/${id}`);
  return data;
}

export async function libertarMateriais(id, dados = {}) {
  const { data } = await api.post(`/producao/ordens/${id}/libertar-materiais`, dados);
  return data;
}

export async function salvarPreImpressao(ordemProducaoId, dados) {
  const { data } = await api.put(`/producao/pre-impressao/${ordemProducaoId}`, dados);
  return data;
}

export async function salvarImpressao(ordemProducaoId, dados) {
  const { data } = await api.put(`/producao/impressao/${ordemProducaoId}`, dados);
  return data;
}

export async function salvarAcabamento(ordemProducaoId, dados) {
  const { data } = await api.put(`/producao/acabamento/${ordemProducaoId}`, dados);
  return data;
}

export async function salvarQualidade(ordemProducaoId, dados) {
  const { data } = await api.put(`/producao/qualidade/${ordemProducaoId}`, dados);
  return data;
}
