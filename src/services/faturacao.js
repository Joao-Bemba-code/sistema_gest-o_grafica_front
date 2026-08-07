import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/faturacao", { params });
  return data;
}

export async function listarFaturas(params) {
  const { data } = await api.get("/faturacao", { params });
  return data;
}

export async function buscarFatura(id) {
  const { data } = await api.get(`/faturacao/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/faturacao", dados);
  return data;
}

export async function criarFatura(dados) {
  const { data } = await api.post("/faturacao", dados);
  return data;
}

export async function faturarOrcamento(id, dados) {
  const { data } = await api.post(`/faturacao/orcamento/${id}`, dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/faturacao/${id}`, dados);
  return data;
}

export async function atualizarFatura(id, dados) {
  const { data } = await api.put(`/faturacao/${id}`, dados);
  return data;
}

export async function marcarPaga(id, dados) {
  const { data } = await api.put(`/faturacao/${id}/pagar`, dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/faturacao/${id}`);
  return data;
}

export async function removerFatura(id) {
  const { data } = await api.delete(`/faturacao/${id}`);
  return data;
}

export async function exportarFaturas(params) {
  const { data } = await api.get("/faturacao/exportar", { params, responseType: "blob" });
  return data;
}
