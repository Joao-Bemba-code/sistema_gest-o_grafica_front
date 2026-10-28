import axios from "axios";

// Instância axios exclusiva do painel de suporte técnico.
// Usa chaves de sessão próprias: nunca partilha token com o SIGRAF.
export const CHAVE_TOKEN = "sigraf_suporte_token";
export const CHAVE_USUARIO = "sigraf_suporte_usuario";

const apiSuporte = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || "http://[::1]:8000/api"}/suporte`,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Cache-Control": "no-cache",
  },
});

apiSuporte.interceptors.request.use((config) => {
  // Reserva para ambientes locais onde o browser não envia o cookie
  // (origens diferentes em http); em produção a sessão vai só no cookie HttpOnly.
  if (typeof window !== "undefined") {
    const token = window.sessionStorage.getItem(CHAVE_TOKEN);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiSuporte.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      window.sessionStorage.removeItem(CHAVE_TOKEN);
      window.sessionStorage.removeItem(CHAVE_USUARIO);
      const emLogin = window.location.pathname.startsWith("/suporte/login");
      if (!emLogin) {
        window.location.href = "/suporte/login";
      }
    }
    return Promise.reject(err);
  }
);

export default apiSuporte;
