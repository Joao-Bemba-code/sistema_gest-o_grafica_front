import api from "./api";

export async function listar() {
  const { data } = await api.get("/materiais");
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/materiais/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/materiais", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/materiais/${id}`, dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/materiais/${id}`);
  return data;
}

export async function movimentar(dados) {
  const { data } = await api.post("/materiais/movimentar", dados);
  return data;
}

export async function converter(dados) {
  const { data } = await api.post("/materiais/converter", dados);
  return data;
}

export async function listarFormatos() {
  const { data } = await api.get("/materiais/formatos");
  return data;
}

export async function listarReservas(params) {
  const { data } = await api.get("/materiais/reservas", { params });
  return data;
}

export async function cancelarReserva(id) {
  const { data } = await api.delete(`/materiais/reservas/${id}`);
  return data;
}

export async function extrato() {
  const { data } = await api.get("/materiais/extrato");
  return data;
}
