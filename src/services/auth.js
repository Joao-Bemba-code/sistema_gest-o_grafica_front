import api, { CHAVE_TOKEN_RESERVA } from "./api";

// A sessão principal vive num cookie HttpOnly: o browser nunca expõe o JWT a
// JavaScript. Mantemos apenas o perfil público do utilizador para renderização
// (sempre revalidado no servidor em cada arranque) e o token de reserva, usado
// apenas quando o browser bloqueia o cookie cross-site (Safari/Brave/Firefox).
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
  if (data.token) storage()?.setItem(CHAVE_TOKEN_RESERVA, data.token);
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
  storage()?.removeItem(CHAVE_TOKEN_RESERVA);
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
