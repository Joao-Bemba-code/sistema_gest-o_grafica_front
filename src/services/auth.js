import api from "./api";

export async function login(email, senha) {
  const { data } = await api.post("/auth/login", { email, senha });
  localStorage.setItem("sigraf_token", data.token);
  localStorage.setItem("sigraf_usuario", JSON.stringify(data.usuario));
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
  localStorage.removeItem("sigraf_token");
  localStorage.removeItem("sigraf_usuario");
  window.location.href = "/login";
}

export function getToken() {
  if (typeof window !== "undefined") return localStorage.getItem("sigraf_token");
  return null;
}

export function getUsuario() {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem("sigraf_usuario");
    return raw ? JSON.parse(raw) : null;
  }
  return null;
}

export function isAutenticado() {
  return !!getToken();
}
