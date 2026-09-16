// ═══════════════════════════════════════════════════════════════
// src/services/producao.js
// ═══════════════════════════════════════════════════════════════
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

// ─── Requisição e aprovação de materiais ───
export async function requisitarMateriais(id, dados = {}) {
  const { data } = await api.post(`/producao/ordens/${id}/requisitar-materiais`, dados);
  return data;
}

export async function aprovarMateriais(id, dados = {}) {
  const { data } = await api.post(`/producao/ordens/${id}/aprovar-materiais`, dados);
  return data;
}

// ─── Libertar para máquina (rota correta do backend) ───
export async function libertarParaMaquina(id, dados = {}) {
  const { data } = await api.post(`/producao/ordens/${id}/libertar-maquina`, dados);
  return data;
}

// ─── Manter compatibilidade: alias com nome antigo ───
// Quem já chamava `libertarMateriais` continua a funcionar,
// mas agora aponta para a rota correta.
export async function libertarMateriais(id, dados = {}) {
  return libertarParaMaquina(id, dados);
}

// ─── Processos de produção ───
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