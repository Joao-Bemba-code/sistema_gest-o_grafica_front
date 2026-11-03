import axios from "axios";

export const CHAVE_TOKEN_RESERVA = "sigraf_token_reserva";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://[::1]:8000/api",
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Cache-Control": "no-cache",
  },
});

// Safari, Brave e Firefox (protecção contra rastreamento) bloqueiam cookies
// cross-site mesmo com SameSite=None. Nesses browsers o cookie HttpOnly não
// chega à API e o primeiro 401 dispara a repetição do pedido com o token de
// reserva; a partir daí todos os pedidos levam o Bearer explicitamente.
let usarBearer = false;

api.interceptors.request.use((config) => {
  if (!usarBearer || typeof window === "undefined") return config;
  const token = window.sessionStorage.getItem(CHAVE_TOKEN_RESERVA);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function limparSessaoLocal() {
  window.sessionStorage.removeItem(CHAVE_TOKEN_RESERVA);
  // Limpa também chaves antigas de versões que guardavam o JWT em
  // sessionStorage (expostas a XSS). A sessão real é o cookie HttpOnly.
  window.sessionStorage.removeItem("sigraf_token");
  window.sessionStorage.removeItem("sigraf_usuario");
}

api.interceptors.response.use(
  (res) => {
    return res;
  },
  async (err) => {
    const { response, config } = err;
    if (response?.status !== 401 || typeof window === "undefined") {
      return Promise.reject(err);
    }
    const token = window.sessionStorage.getItem(CHAVE_TOKEN_RESERVA);
    // O cookie pode ter sido bloqueado: repete uma vez com o token de reserva.
    // O backend valida o Bearer antes do cookie, por isso o pedido falhado
    // nunca chegou a executar no servidor — repetir um POST é seguro.
    if (token && config && !config.__comBearer) {
      usarBearer = true;
      config.__comBearer = true;
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      return api(config);
    }
    limparSessaoLocal();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export function descricaoErroApi(err, padrao = "Erro na operação") {
  if (!err) return padrao;
  const url = err?.config?.url || "";
  const status = err?.response?.status;
  const detalhe = err?.response?.data?.erro || err?.message || "";
  const base = `${url}${status ? ` → ${status}` : ""}`;
  return base ? `${base}: ${detalhe || padrao}` : detalhe || padrao;
}

export default api;
