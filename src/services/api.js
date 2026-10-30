import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://[::1]:8000/api",
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Cache-Control": "no-cache",
  },
});

api.interceptors.response.use(
  (res) => {
    return res;
  },
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      // Limpa também chaves antigas de versões que guardavam o JWT em
      // sessionStorage (expostas a XSS). A sessão real é o cookie HttpOnly.
      window.sessionStorage.removeItem("sigraf_token");
      window.sessionStorage.removeItem("sigraf_usuario");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
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
