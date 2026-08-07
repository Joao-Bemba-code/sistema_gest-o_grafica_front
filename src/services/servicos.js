import api from "./api";

export async function listar() {
  const { data } = await api.get("/servicos");
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/servicos", dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/servicos/${id}`);
  return data;
}