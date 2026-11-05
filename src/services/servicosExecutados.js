import api from "./api";

// Registo de serviços executados pela equipa (módulo Recursos Humanos).
export async function listar() {
  const { data } = await api.get("/servicos-executados");
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/servicos-executados", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/servicos-executados/${id}`, dados);
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/servicos-executados/${id}`);
  return data;
}
