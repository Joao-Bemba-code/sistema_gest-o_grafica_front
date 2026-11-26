import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/orcamentos", { params });
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/orcamentos/${id}`);
  return data;
}

// Saldo em aberto do cliente face ao limite global de dívida.
export async function saldoCliente(clienteId) {
  const { data } = await api.get(`/orcamentos/saldo-cliente/${clienteId}`);
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

export async function anular(id, motivo) {
  const { data } = await api.post(`/orcamentos/${id}/anular`, { motivo });
  return data;
}

export async function mudarEstado(id, estado, dados) {
  const { data } = await api.put(`/orcamentos/${id}`, { estado, ...dados });
  return data;
}

export async function enviarProducao(id) {
  const { data } = await api.post(`/orcamentos/${id}/enviar-producao`);
  return data;
}
