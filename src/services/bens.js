import api from "./api";

export async function listar() {
  const { data } = await api.get("/bens");
  return Array.isArray(data) ? data : data?.data || [];
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/bens/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/bens", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/bens/${id}`, dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/bens/${id}`);
  return data;
}

export async function eliminarCategoria(categoria) {
  const { data } = await api.post("/bens/eliminar-categoria", { categoria });
  return data;
}
