import api from "./api";

export async function listar() {
  const { data } = await api.get("/maquinas");
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/maquinas/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/maquinas", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/maquinas/${id}`, dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/maquinas/${id}`);
  return data;
}
