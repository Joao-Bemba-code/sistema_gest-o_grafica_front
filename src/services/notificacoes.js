import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/notificacoes", { params });
  return data;
}

export async function marcarLida(id) {
  const { data } = await api.put(`/notificacoes/${id}/lida`);
  return data;
}

export async function marcarTodasLidas() {
  const { data } = await api.put("/notificacoes/ler-todas");
  return data;
}