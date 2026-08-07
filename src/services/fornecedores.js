import api from "./api";

export async function listar() {
  const { data } = await api.get("/clientes", { params: { tipo: "fornecedor" } });
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/clientes", { ...dados, tipo: "fornecedor" });
  return data;
}

export async function remover(id) {
  const { data } = await api.delete(`/clientes/${id}`);
  return data;
}
