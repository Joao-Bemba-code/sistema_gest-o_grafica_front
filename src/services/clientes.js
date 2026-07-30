import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/clientes", { params });
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/clientes/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/clientes", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/clientes/${id}`, dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/clientes/${id}`);
  return data;
}
