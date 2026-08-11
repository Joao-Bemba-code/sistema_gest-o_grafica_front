import api from "./api";

export async function listar() {
  const { data } = await api.get("/categorias");
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/categorias", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/categorias/${id}`, dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/categorias/${id}`);
  return data;
}
