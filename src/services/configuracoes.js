import api from "./api";

export async function buscarOrganizacao() {
  const { data } = await api.get("/configuracoes/organizacao");
  return data;
}

export async function guardarOrganizacao(dados) {
  const { data } = await api.put("/configuracoes/organizacao", dados);
  return data;
}

export async function buscarSistema() {
  const { data } = await api.get("/configuracoes/sistema");
  return data;
}

export async function guardarSistema(dados) {
  const { data } = await api.put("/configuracoes/sistema", dados);
  return data;
}

export async function buscarSeguranca() {
  const { data } = await api.get("/configuracoes/seguranca");
  return data;
}

export async function guardarSeguranca(dados) {
  const { data } = await api.put("/configuracoes/seguranca", dados);
  return data;
}

export async function uploadLogo(file) {
  const form = new FormData();
  form.append("logo", file);
  const { data } = await api.post("/configuracoes/logo", form);
  return data;
}

export async function buscarUtilizadorAtual() {
  const { data } = await api.get("/configuracoes/utilizador");
  return data;
}

export async function alterarEmail(dados) {
  const { data } = await api.put("/configuracoes/alterar-email", dados);
  return data;
}

export async function alterarSenha(dados) {
  const { data } = await api.put("/configuracoes/alterar-senha", dados);
  return data;
}
