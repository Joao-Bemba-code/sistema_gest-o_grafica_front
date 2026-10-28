import apiSuporte, { CHAVE_TOKEN, CHAVE_USUARIO } from "./apiSuporte";

function storage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export async function login(email, senha, codigo) {
  const { data } = await apiSuporte.post("/login", { email, senha, ...(codigo ? { codigo } : {}) });
  storage()?.setItem(CHAVE_TOKEN, data.token);
  storage()?.setItem(CHAVE_USUARIO, JSON.stringify(data.usuario));
  return data;
}

export async function logout() {
  try {
    await apiSuporte.post("/logout");
  } catch {}
  storage()?.removeItem(CHAVE_TOKEN);
  storage()?.removeItem(CHAVE_USUARIO);
  window.location.href = "/suporte/login";
}

// Valida a sessão junto do servidor (cookie HttpOnly). Devolve true/false.
export async function verificarSessaoSuporte() {
  try {
    const { data } = await apiSuporte.get("/estado");
    if (data?.usuario) storage()?.setItem(CHAVE_USUARIO, JSON.stringify(data.usuario));
    return true;
  } catch {
    return false;
  }
}

export async function totpEstado() {
  const { data } = await apiSuporte.get("/totp/estado");
  return data;
}

export async function totpGerar() {
  const { data } = await apiSuporte.post("/totp/gerar");
  return data;
}

export async function totpConfirmar(codigo) {
  const { data } = await apiSuporte.post("/totp/confirmar", { codigo });
  return data;
}

export async function totpDesactivar(senha) {
  const { data } = await apiSuporte.post("/totp/desactivar", { senha });
  return data;
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

export async function listarAuditoria(params = {}) {
  const { data } = await apiSuporte.get("/auditoria", { params });
  return data;
}
