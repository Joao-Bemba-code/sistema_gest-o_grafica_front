import api from "./api";

export async function listar() {
  const { data } = await api.get("/usuarios");
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/usuarios", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/usuarios/${id}`, dados);
  return data;
}

export async function listarPerfis() {
  const { data } = await api.get("/usuarios/perfis");
  return data;
}

export async function listarAcessos(id) {
  const { data } = await api.get(`/usuarios/${id}/acessos`);
  return data;
}
