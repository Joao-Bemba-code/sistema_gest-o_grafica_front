import apiSuporte, { CHAVE_TOKEN, CHAVE_USUARIO } from "./apiSuporte";

function storage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export async function login(email, senha) {
  const { data } = await apiSuporte.post("/login", { email, senha });
  storage()?.setItem(CHAVE_TOKEN, data.token);
  storage()?.setItem(CHAVE_USUARIO, JSON.stringify(data.usuario));
  return data;
}

export function logout() {
  storage()?.removeItem(CHAVE_TOKEN);
  storage()?.removeItem(CHAVE_USUARIO);
  window.location.href = "/suporte/login";
}

export function getSuporte() {
  const raw = storage()?.getItem(CHAVE_USUARIO);
  return raw ? JSON.parse(raw) : null;
}

export function isAutenticadoSuporte() {
  return !!storage()?.getItem(CHAVE_TOKEN);
}

export async function obterResumo() {
  const { data } = await apiSuporte.get("/resumo");
  return data;
}

export async function listarOrganizacoes(params = {}) {
  const { data } = await apiSuporte.get("/organizacoes", { params });
  return data;
}

export async function criarOrganizacao(dados) {
  const { data } = await apiSuporte.post("/organizacoes", dados);
  return data;
}

export async function obterOrganizacao(id) {
  const { data } = await apiSuporte.get(`/organizacoes/${id}`);
  return data;
}

export async function atualizarOrganizacao(id, dados) {
  const { data } = await apiSuporte.put(`/organizacoes/${id}`, dados);
  return data;
}

export async function listarUsuarios(orgId) {
  const { data } = await apiSuporte.get(`/organizacoes/${orgId}/usuarios`);
  return data;
}

export async function criarUsuario(orgId, dados) {
  const { data } = await apiSuporte.post(`/organizacoes/${orgId}/usuarios`, dados);
  return data;
}

export async function atualizarUsuario(id, dados) {
  const { data } = await apiSuporte.put(`/usuarios/${id}`, dados);
  return data;
}

export async function listarAcessos(params = {}) {
  const { data } = await apiSuporte.get("/acessos", { params });
  return data;
}
