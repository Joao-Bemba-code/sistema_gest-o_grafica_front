import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/pedidos", { params });
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/pedidos", dados);
  return data;
}

export async function cancelar(id) {
  const { data } = await api.post(`/pedidos/${id}/cancelar`);
  return data;
}

export async function receber(id, itens) {
  const { data } = await api.post(`/pedidos/${id}/receber`, { itens });
  return data;
}
