import axios from "axios";

const DESKTOP_API =
  typeof window !== "undefined" ? window.sigrafDesktop?.apiBase : null;

const api = axios.create({
  baseURL: DESKTOP_API || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  timeout: 15000,
  headers: {
    "Cache-Control": "no-cache",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.sessionStorage.getItem("sigraf_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const rota = config.url || "";
    const metodo = (config.method || "get").toLowerCase();
    const ehEscrita = ["post", "put", "patch", "delete"].includes(metodo);
    const permitida = /^\/auth\/(login|registrar)/.test(rota);
    if (ehEscrita && !window.sigrafDesktop && !permitida) {
      const erro = new Error(
        "Modo leitura: a versão web só permite consultar dados e gerar PDF. As alterações são feitas na aplicação desktop."
      );
      erro.response = { status: 403, data: { erro: erro.message } };
      return Promise.reject(erro);
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (typeof window !== "undefined" && window.sigrafDesktop) {
      const metodo = (res.config?.method || "get").toLowerCase();
      const rota = res.config?.url || "";
      const isEscrita = ["post", "put", "patch", "delete"].includes(metodo);
      const isSync = /\/auth\/|\/offline\/|\/sync\//.test(rota);
      if (isEscrita && !isSync) {
        const base = (DESKTOP_API || "").replace(/\/api$/, "");
        axios.post(base + "/api/offline/sync/agora", {}).catch(() => {});
      }
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      window.sessionStorage.removeItem("sigraf_token");
      window.sessionStorage.removeItem("sigraf_usuario");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
