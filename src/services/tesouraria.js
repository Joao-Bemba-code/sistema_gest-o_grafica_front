import api from "./api";

export async function listarMovimentos(params = {}) {
  const { data } = await api.get("/tesouraria", { params });
  return data;
}

export async function buscarMovimento(id) {
  const { data } = await api.get(`/tesouraria/${id}`);
  return data;
}

export async function criarMovimento(dados) {
  const { data } = await api.post("/tesouraria", dados);
  return data;
}

export async function atualizarMovimento(id, dados) {
  const { data } = await api.put(`/tesouraria/${id}`, dados);
  return data;
}

export async function removerMovimento(id) {
  const { data } = await api.delete(`/tesouraria/${id}`);
  return data;
}

export async function resumoTesouraria(params = {}) {
  const { data } = await api.get("/tesouraria/resumo", { params });
  return data;
}

export async function exportarTesouraria(params = {}) {
  const { data } = await api.get("/tesouraria/exportar", { params, responseType: "blob" });
  return data;
}
