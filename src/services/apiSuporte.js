import axios from "axios";

// Instância axios exclusiva do painel de suporte técnico.
// A sessão principal vive no cookie HttpOnly `sigraf_suporte_token`; o token de
// reserva (Bearer) só é usado quando o browser bloqueia o cookie cross-site.
export const CHAVE_USUARIO = "sigraf_suporte_usuario";
const CHAVE_TOKEN_LEGADO = "sigraf_suporte_token";
export const CHAVE_TOKEN_RESERVA = "sigraf_suporte_token_reserva";

const apiSuporte = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || "http://[::1]:8000/api"}/suporte`,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Cache-Control": "no-cache",
  },
});

let usarBearer = false;

apiSuporte.interceptors.request.use((config) => {
  if (!usarBearer || typeof window === "undefined") return config;
  const token = window.sessionStorage.getItem(CHAVE_TOKEN_RESERVA);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiSuporte.interceptors.response.use(
  (res) => res,
  async (err) => {
    const { response, config } = err;
    if (response?.status !== 401 || typeof window === "undefined") {
      return Promise.reject(err);
    }
    const token = window.sessionStorage.getItem(CHAVE_TOKEN_RESERVA);
    // O cookie pode ter sido bloqueado: repete uma vez com o token de reserva.
    // O backend valida o Bearer antes do cookie, por isso o pedido falhado
    // nunca chegou a executar — repetir um POST é seguro.
    if (token && config && !config.__comBearer) {
      usarBearer = true;
      config.__comBearer = true;
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      return apiSuporte(config);
    }
    window.sessionStorage.removeItem(CHAVE_TOKEN_RESERVA);
    window.sessionStorage.removeItem(CHAVE_TOKEN_LEGADO);
    window.sessionStorage.removeItem(CHAVE_USUARIO);
    const emLogin = window.location.pathname.startsWith("/suporte/login");
    if (!emLogin) {
      window.location.href = "/suporte/login";
    }
    return Promise.reject(err);
  }
);

export default apiSuporte;
