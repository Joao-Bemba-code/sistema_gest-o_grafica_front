import api from "./api";

const CHAVE_TOKEN = "sigraf_token";
const CHAVE_USUARIO = "sigraf_usuario";

function storage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function decodificarToken(token) {
  if (!token) return null;
  try {
    const parte = token.split(".")[1];
    if (!parte) return null;
    const base64 = parte.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    return JSON.parse(atob(base64 + pad));
  } catch {
    return null;
  }
}

export async function login(email, senha) {
  const { data } = await api.post("/auth/login", { email, senha });
  storage()?.setItem(CHAVE_TOKEN, data.token);
  storage()?.setItem(CHAVE_USUARIO, JSON.stringify(data.usuario));
  return data;
}

export async function registrar(dados) {
  const { data } = await api.post("/auth/registrar", dados);
  return data;
}

export async function carregarPerfil() {
  const { data } = await api.get("/auth/perfil");
  return data;
}

export function logout() {
  storage()?.removeItem(CHAVE_TOKEN);
  storage()?.removeItem(CHAVE_USUARIO);
  window.location.href = "/login";
}

export function getToken() {
  return storage()?.getItem(CHAVE_TOKEN) ?? null;
}

export function getUsuario() {
  const raw = storage()?.getItem(CHAVE_USUARIO);
  return raw ? JSON.parse(raw) : null;
}

export function isAutenticado() {
  return !!getToken();
}
