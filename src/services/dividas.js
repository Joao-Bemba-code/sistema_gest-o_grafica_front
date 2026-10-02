import api from "./api";

export async function listar(params = {}) {
  const { data } = await api.get("/dividas", { params });
  return data;
}

export async function buscar(id) {
  const { data } = await api.get(`/dividas/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/dividas", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/dividas/${id}`, dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/dividas/${id}`);
  return data;
}

// Baixa total, parcial ou de uma parcela. O backend cria o movimento de
// tesouraria e mexe no saldo da conta, por isso não se regista nada na aba
// de Movimentos ao dar baixa aqui.
export async function pagar(id, dados) {
  const { data } = await api.put(`/dividas/${id}/pagar`, dados);
  return data;
}

export async function resumo() {
  const { data } = await api.get("/dividas/resumo");
  return data;
}