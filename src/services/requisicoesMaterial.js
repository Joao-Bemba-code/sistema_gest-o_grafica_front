import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/requisicoes-material", { params });
  return data;
}

export async function auxiliares() {
  const { data } = await api.get("/requisicoes-material/auxiliares");
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/requisicoes-material", dados);
  return data;
}

export async function aprovar(id, extra = {}) {
  const { data } = await api.post(`/requisicoes-material/${id}/aprovar`, extra);
  return data;
}

export async function rejeitar(id, motivo) {
  const { data } = await api.post(`/requisicoes-material/${id}/rejeitar`, { motivo });
  return data;
}

export async function cancelar(id) {
  const { data } = await api.post(`/requisicoes-material/${id}/cancelar`);
  return data;
}
