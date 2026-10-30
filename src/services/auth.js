import api from "./api";

// A sessão real vive num cookie HttpOnly: o browser nunca guarda nem envia o
// JWT em JavaScript. Mantemos apenas o perfil público do utilizador para
// renderização; é sempre revalidado junto do servidor em cada arranque.
const CHAVE_USUARIO = "sigraf_usuario";
const CHAVE_TOKEN_LEGADO = "sigraf_token";

function storage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function limparTokenLegado() {
  // Versões antigas guardavam o JWT aqui (acessível a XSS). Remove sempre.
  storage()?.removeItem(CHAVE_TOKEN_LEGADO);
}

function guardarSessao(data) {
  limparTokenLegado();
  storage()?.setItem(CHAVE_USUARIO, JSON.stringify(data.usuario));
  return data;
}

export async function login(email, senha) {
  const { data } = await api.post("/auth/login", { email, senha });
  return guardarSessao(data);
}

export async function registrar(dados) {
  const { data } = await api.post("/auth/registrar", dados);
  return guardarSessao(data);
}

export async function carregarPerfil() {
  const { data } = await api.get("/auth/perfil");
  return data;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {}
  limparTokenLegado();
  storage()?.removeItem(CHAVE_USUARIO);
  window.location.href = "/login";
}

export function getUsuario() {
  const raw = storage()?.getItem(CHAVE_USUARIO);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAutenticado() {
  // Só há indício local de sessão; a validação definitiva é carregarPerfil().
  return !!getUsuario();
}
