import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/faturacao", { params });
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/faturacao", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/faturacao/${id}`, dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/faturacao/${id}`);
  return data;
}
