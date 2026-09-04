import api from "./api";

export async function listarContas(params = {}) {
  const { data } = await api.get("/contas-bancarias", { params });
  return data;
}

export async function buscarConta(id) {
  const { data } = await api.get(`/contas-bancarias/${id}`);
  return data;
}

export async function criarConta(dados) {
  const { data } = await api.post("/contas-bancarias", dados);
  return data;
}

export async function atualizarConta(id, dados) {
  const { data } = await api.put(`/contas-bancarias/${id}`, dados);
  return data;
}

export async function removerConta(id) {
  const { data } = await api.delete(`/contas-bancarias/${id}`);
  return data;
}

export async function resumoContas() {
  const { data } = await api.get("/contas-bancarias/resumo");
  return data;
}
