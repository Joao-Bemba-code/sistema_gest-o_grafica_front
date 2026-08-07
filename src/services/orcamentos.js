import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/orcamentos", { params });
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/orcamentos/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/orcamentos", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/orcamentos/${id}`, dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/orcamentos/${id}`);
  return data;
}

export async function mudarEstado(id, estado) {
  const { data } = await api.put(`/orcamentos/${id}`, { estado });
  return data;
}
