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

export async function aprovar(id) {
  const { data } = await api.post(`/pedidos/${id}/aprovar`);
  return data;
}

export async function rejeitar(id, motivo) {
  const { data } = await api.post(`/pedidos/${id}/rejeitar`, { motivo });
  return data;
}

export async function enviar(id) {
  const { data } = await api.post(`/pedidos/${id}/enviar`);
  return data;
}

export async function receber(id, itens) {
  const { data } = await api.post(`/pedidos/${id}/receber`, { itens });
  return data;
}
